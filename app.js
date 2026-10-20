"use strict";
(() => {
  const address = new URL(location.href);
  if (address.searchParams.has("v")) {
    address.searchParams.delete("v");
    history.replaceState(
      history.state,
      "",
      address.pathname + address.search + address.hash,
    );
  }
  const tasks = (window.LAB_TASKS || []).sort((a, b) => a.id - b.id);
  const courseOutline = window.COURSE_OUTLINE;
  const courseTasks = new Map(
    (courseOutline?.tasks || []).map((task) => [task.id, task]),
  );
  tasks.forEach((task) => {
    const courseTask = courseTasks.get(task.id);
    if (courseTask) task.title = courseTask.title;
  });
  const $ = (selector) => document.querySelector(selector);
  const layoutObservers = new Map();
  const pruneLayoutObservers = () => {
    for (const [element, observer] of layoutObservers) {
      if (!element.isConnected) {
        observer.disconnect();
        layoutObservers.delete(element);
      }
    }
  };
  const el = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = String(text);
    if (className) node.className = className;
    return node;
  };
  const phases = [
    {
      title: "需求分析与对象建模",
      short: "对象建模",
      image: "scene-devices.webp",
      media: "设备定位与信息面板",
      chapter: "devices",
    },
    {
      title: "数据接入与质量治理",
      short: "数据接入",
      image: "scene-data.webp",
      media: "测点曲线与历史数据",
      chapter: "data",
    },
    {
      title: "三维映射与状态联动",
      short: "状态联动",
      image: "scene-alarms.webp",
      media: "报警与操作记录",
      chapter: "alarms",
    },
    {
      title: "AI 集成、验证与复盘",
      short: "验证交付",
      image: "scene-ai.webp",
      media: "异常分析与结果核验",
      chapter: "ai",
    },
  ];
  if (tasks.length !== 28 || new Set(tasks.map((t) => t.id)).size !== 28) {
    $("#task-title").textContent = "实验资源尚未加载完整";
    $("#task-goal").textContent =
      "请刷新页面后重试，学习记录仍保留在当前浏览器。";
    return;
  }
  const KEY = "hhu-digital-twin-lab-v1";
  const SCHEMA = "hhu-digital-twin-lab/v1";
  const fresh = () => ({
    schema: SCHEMA,
    activeTask: 1,
    drafts: {},
    records: {},
    notes: {},
  });
  let state = fresh(),
    storageOK = true,
    saveTimer;
  const cleanText = (value, max = 12000) =>
    typeof value === "string"
      ? value.slice(0, max)
      : typeof value === "number"
        ? String(value)
        : "";
  function valuesFor(task, raw = {}) {
    const values = {};
    for (const f of task.fields) {
      const value = Object.prototype.hasOwnProperty.call(raw, f.key)
        ? raw[f.key]
        : f.value;
      values[f.key] =
        f.type === "checks"
          ? Array.isArray(value)
            ? value.filter((v) => f.options.some((o) => o.value === v))
            : []
          : cleanText(value);
    }
    return values;
  }
  const signature = (task, values) => JSON.stringify(valuesFor(task, values));
  function draft(task) {
    return state.drafts[task.id] || (state.drafts[task.id] = valuesFor(task));
  }
  function status(task) {
    const record = state.records[task.id];
    if (!record) return "pending";
    if (record.invalidated) return "changed";
    if (record.signature !== signature(task, draft(task))) return "changed";
    if (
      record.result.pass &&
      task.id === 27 &&
      tasks.slice(0, 26).some((t) => status(t) !== "passed")
    )
      return "changed";
    if (record.result.pass && task.id === 28 && status(tasks[26]) !== "passed")
      return "changed";
    return record.result.pass ? "passed" : "failed";
  }
  function context() {
    return {
      passedIds: tasks.filter((t) => status(t) === "passed").map((t) => t.id),
      results: state.records,
      notes: state.notes,
    };
  }
  function check(task, values) {
    try {
      const result = task.run(values, context());
      if (
        !result ||
        typeof result.pass !== "boolean" ||
        typeof result.summary !== "string" ||
        !Array.isArray(result.details)
      )
        throw Error("Invalid result");
      return result;
    } catch {
      return {
        pass: false,
        summary: "本次检查未能完成",
        details: ["请核对输入格式后重试。你的输入已保留。"],
      };
    }
  }
  function normalize(raw) {
    if (
      !raw ||
      raw.schema !== SCHEMA ||
      typeof raw.drafts !== "object" ||
      !raw.drafts
    )
      throw Error("format");
    const clean = fresh();
    clean.activeTask =
      Number.isInteger(raw.activeTask) &&
      raw.activeTask >= 1 &&
      raw.activeTask <= 28
        ? raw.activeTask
        : 1;
    for (const task of tasks) {
      clean.drafts[task.id] = valuesFor(task, raw.drafts[task.id] || {});
      clean.notes[task.id] = cleanText(raw.notes?.[task.id], 6000);
      const record = raw.records?.[task.id];
      if (
        record &&
        typeof record === "object" &&
        typeof record.signature === "string"
      ) {
        clean.records[task.id] = {
          signature: record.signature.slice(0, 100000),
          attempts: Math.max(1, Math.min(9999, Number(record.attempts) || 1)),
          at: cleanText(record.at, 50),
          invalidated:
            record.invalidated === true ||
            record.signature !== signature(task, clean.drafts[task.id]),
          result: {
            pass: false,
            summary: "旧配置结果已失效，请重新运行检查",
            details: [],
          },
        };
      }
    }
    return clean;
  }
  function recomputeRestored() {
    for (const task of tasks) {
      if (state.records[task.id] && !state.records[task.id].invalidated)
        state.records[task.id].result = check(task, draft(task));
    }
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      state = normalize(JSON.parse(raw));
      recomputeRestored();
    }
  } catch {
    storageOK = false;
  }
  function save() {
    clearTimeout(saveTimer);
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      storageOK = true;
      $("#save-status").textContent =
        "已保存在当前浏览器 · 教学样例可反复修改、检查与复测。";
    } catch {
      storageOK = false;
      $("#save-status").textContent =
        "当前浏览器无法保存记录。请使用“备份学习进度”保留本次输入。";
    }
  }
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 250);
  }
  function table(data) {
    const figure = el("figure", undefined, "data-table");
    if (data.caption)
      figure.append(el("figcaption", data.caption, "table-caption"));
    const wrapper = el("div", undefined, "table-scroll");
    wrapper.tabIndex = 0;
    wrapper.setAttribute("role", "region");
    wrapper.setAttribute("aria-label", data.caption || "教学数据表");
    const t = el("table");
    t.setAttribute("aria-label", data.caption || "教学数据表");
    const head = el("thead"),
      hrow = el("tr");
    data.headers.forEach((s) => {
      const th = el("th", s);
      th.scope = "col";
      hrow.append(th);
    });
    head.append(hrow);
    t.append(head);
    const body = el("tbody");
    data.rows.forEach((row) => {
      const tr = el("tr");
      row.forEach((cell) => {
        const value = String(cell);
        const td = el("td", value);
        // Keep identifiers, timestamps and status codes intact. Descriptions
        // still wrap at normal word boundaries instead of widening every table.
        if (/^[A-Za-z0-9_.:/+-]+$/.test(value) && value.length <= 64)
          td.className = "table-value";
        else if (value.length > 32) td.className = "table-prose";
        tr.append(td);
      });
      body.append(tr);
    });
    t.append(body);
    wrapper.append(t);
    const hint = el("p", "左右滑动查看完整表格 →", "table-scroll-hint");
    hint.hidden = true;
    figure.append(wrapper, hint);
    if (window.ResizeObserver) {
      const observer = new window.ResizeObserver(() => {
        const overflow = wrapper.scrollWidth > wrapper.clientWidth + 1;
        hint.hidden = !overflow;
        wrapper.tabIndex = overflow ? 0 : -1;
        wrapper.setAttribute(
          "aria-label",
          (data.caption || "教学数据表") + (overflow ? "，可横向滚动" : ""),
        );
      });
      observer.observe(wrapper);
      layoutObservers.set(wrapper, observer);
    }
    return figure;
  }
  const labels = {
    pending: "待完成",
    failed: "需修改",
    changed: "待复测",
    passed: "已通过",
  };
  function renderNavigation() {
    const nav = $("#task-navigation");
    nav.replaceChildren();
    phases.forEach((phase, i) => {
      const group = el("details", undefined, "phase-group");
      group.open = tasks[state.activeTask - 1].stage === i;
      const summary = el("summary");
      const title = el(
        "span",
        `${String(i + 1).padStart(2, "0")}  ${phase.short}`,
      );
      const count = tasks.filter(
        (t) => t.stage === i && status(t) === "passed",
      ).length;
      summary.append(title, el("span", `${count}/7`, "phase-count"));
      group.append(summary);
      const list = el("ol");
      tasks
        .filter((t) => t.stage === i)
        .forEach((task) => {
          const li = el("li"),
            button = el("button");
          button.type = "button";
          button.dataset.task = task.id;
          const s = status(task);
          button.className = `task-nav-button ${s}`;
          if (task.id === state.activeTask)
            button.setAttribute("aria-current", "step");
          button.setAttribute(
            "aria-label",
            `任务 ${task.id} ${task.title}，${labels[s]}`,
          );
          button.append(
            el("span", String(task.id).padStart(2, "0"), "task-number"),
            el("span", task.title),
            el(
              "span",
              s === "passed"
                ? "✓"
                : s === "failed" || s === "changed"
                  ? "·"
                  : "",
              "nav-state",
            ),
          );
          button.addEventListener("click", () => selectTask(task.id, true));
          li.append(button);
          list.append(li);
        });
      group.append(list);
      nav.append(group);
    });
  }
  function renderProgress() {
    const passed = tasks.filter((t) => status(t) === "passed").length;
    $("#course-progress").value = passed;
    $("#course-progress").textContent = `${passed}/28`;
    $("#progress-label").textContent = `已通过 ${passed} / 28 项练习`;
    $("#report-count").textContent =
      `${passed} 项通过，${28 - passed} 项待完成`;
    const active = tasks[state.activeTask - 1];
    $("#task-status").textContent = labels[status(active)];
    $("#task-status").className = `task-status ${status(active)}`;
    $("#resume-button").replaceChildren(
      document.createTextNode(
        passed || Object.keys(state.records).length ? "继续实验 " : "开始实验 ",
      ),
      el("span", "→"),
    );
    $("#start-button").replaceChildren(
      document.createTextNode(
        Object.keys(state.records).length
          ? `继续第 ${state.activeTask} 项任务 `
          : "开始第一项任务 ",
      ),
      el("span", "→"),
    );
    const stageResults = $("#stage-results");
    stageResults.replaceChildren();
    phases.forEach((phase, i) => {
      const group = tasks.filter((t) => t.stage === i),
        done = group.filter((t) => status(t) === "passed").length;
      const button = el("button");
      button.type = "button";
      button.append(
        el("span", `阶段 ${i + 1}`),
        el("strong", phase.title),
        el("span", `${done} / 7 项通过`, "stage-score"),
      );
      button.addEventListener("click", () =>
        selectTask(
          (group.find((t) => status(t) !== "passed") || group[0]).id,
          true,
        ),
      );
      stageResults.append(button);
    });
    const output = {
      headers: ["任务", "当前状态", "检查次数", "实验记录"],
      rows: tasks.map((t) => [
        `${String(t.id).padStart(2, "0")} ${t.title}`,
        labels[status(t)],
        state.records[t.id]?.attempts || 0,
        state.notes[t.id]?.trim() ? "已填写" : "未填写",
      ]),
    };
    $("#record-table").replaceChildren(table(output));
    renderNavigation();
    pruneLayoutObservers();
  }
  function renderFields(task) {
    const fields = $("#task-fields");
    fields.replaceChildren();
    const values = draft(task);
    task.fields.forEach((f) => {
      const group = el(
        f.type === "checks" ? "fieldset" : "div",
        undefined,
        "field",
      );
      if (f.type === "checks") {
        group.append(el("legend", f.label));
        const checks = el("div", undefined, "check-options");
        f.options.forEach((option, i) => {
          const label = el("label", undefined, "check-option"),
            input = el("input");
          input.type = "checkbox";
          input.name = f.key;
          input.value = option.value;
          input.id = `field-${task.id}-${f.key}-${i}`;
          input.checked = values[f.key].includes(option.value);
          label.append(input, el("span", option.label));
          checks.append(label);
        });
        group.append(checks);
      } else {
        const id = `field-${task.id}-${f.key}`,
          label = el("label", f.label);
        label.htmlFor = id;
        group.append(label);
        let input;
        if (f.type === "select") {
          input = el("select");
          const empty = el("option", "请选择");
          empty.value = "";
          input.append(empty);
          f.options
            .filter((option) => option.value !== "")
            .forEach((option) => {
              const opt = el("option", option.label);
              opt.value = option.value;
              input.append(opt);
            });
        } else if (f.type === "textarea") {
          input = el("textarea");
          const structured = task.id !== 28;
          input.rows = structured
            ? Math.min(10, Math.max(6, values[f.key].split("\n").length + 1))
            : 4;
          if (structured) {
            input.wrap = "off";
            input.className = "structured-input";
          }
          input.maxLength = 12000;
          input.spellcheck = false;
        } else {
          input = el("input");
          input.type = f.type === "number" ? "number" : "text";
          if (f.type === "text") input.maxLength = 12000;
        }
        input.id = id;
        input.name = f.key;
        input.value = values[f.key];
        input.autocomplete = "off";
        if (f.placeholder) input.placeholder = f.placeholder;
        for (const key of ["min", "max", "step"])
          if (f[key] !== undefined) input.setAttribute(key, String(f[key]));
        group.append(input);
        if (f.type === "select" && window.ResizeObserver) {
          const detail = el("p", undefined, "selection-detail");
          detail.hidden = true;
          group.append(detail);
          const measure = document.createElement("canvas").getContext("2d");
          const showSelection = () => {
            if (!input.isConnected || !measure) return;
            const label = input.options[input.selectedIndex]?.textContent || "";
            const style = getComputedStyle(input);
            measure.font = style.font;
            const available =
              input.clientWidth -
              parseFloat(style.paddingLeft) -
              parseFloat(style.paddingRight);
            detail.textContent = `当前选择：${label}`;
            detail.hidden = measure.measureText(label).width <= available;
          };
          input.addEventListener("change", showSelection);
          const observer = new window.ResizeObserver(showSelection);
          observer.observe(input);
          layoutObservers.set(input, observer);
        }
      }
      fields.append(group);
    });
  }
  function readForm(task) {
    const values = {};
    const form = $("#task-form");
    task.fields.forEach((f) => {
      const named = form.elements.namedItem(f.key);
      values[f.key] =
        f.type === "checks"
          ? [...form.querySelectorAll('input[type="checkbox"]')]
              .filter((input) => input.name === f.key && input.checked)
              .map((input) => input.value)
          : named?.value || "";
    });
    return values;
  }
  function renderFeedback(task) {
    const record = state.records[task.id],
      s = status(task),
      box = $("#task-feedback");
    if (!record || s === "changed") {
      box.hidden = true;
      return;
    }
    const result = record.result;
    box.hidden = false;
    box.className = `feedback ${result.pass ? "pass" : "needs-work"}`;
    $("#feedback-label").textContent =
      `第 ${record.attempts} 次检查 · ${result.pass ? "本项练习通过" : "请根据反馈修正"}`;
    $("#feedback-title").textContent = result.summary;
    $("#feedback-details").replaceChildren(
      ...result.details.map((detail) => el("li", detail)),
    );
    $("#feedback-output").replaceChildren();
    const visual = window.renderLabVisual?.(task.id, result, draft(task));
    if (visual) $("#feedback-output").append(visual);
    if (result.output) $("#feedback-output").append(table(result.output));
    pruneLayoutObservers();
  }
  function renderTask() {
    const task = tasks[state.activeTask - 1],
      phase = phases[task.stage];
    const courseTask = courseTasks.get(task.id);
    $("#task-course-meta").hidden = !courseTask;
    $("#task-requirements").hidden = !courseTask;
    if (courseTask) {
      $("#task-course-meta").replaceChildren(
        el("span", `建议操作 ${courseTask.minutes} 分钟`),
        el("span", `步骤满分 ${courseTask.points} 分 · 教师评定`),
      );
      $("#course-task-goal").textContent = `课程要求：${courseTask.goal}`;
      $("#course-task-rubric").replaceChildren(
        ...courseTask.rubric.map((item) => el("li", item)),
      );
      $("#course-stage-deliverables").replaceChildren(
        ...(courseOutline.stages[task.stage]?.deliverables || []).map((item) =>
          el("li", item),
        ),
      );
    }
    $("#task-phase").textContent = `阶段 ${task.stage + 1} · ${phase.title}`;
    $("#task-title").textContent =
      `${String(task.id).padStart(2, "0")}  ${task.title}`;
    $("#task-goal").textContent = task.goal;
    $("#task-brief").textContent = task.brief;
    $("#task-concept").textContent = task.concept;
    document.querySelectorAll(".concept").forEach((section) => {
      section.open = false;
    });
    $("#task-hint").hidden = true;
    $("#task-hint").textContent = task.hint;
    $("#hint-button").setAttribute("aria-expanded", "false");
    $("#resource-title").textContent = phase.media;
    $("#task-image").src = `assets/${phase.image}`;
    $("#task-image").alt = phase.media;
    $("#resource-video").dataset.videoOpen = phase.chapter;
    $("#task-samples").replaceChildren(...(task.tables || []).map(table));
    if (!task.tables?.length) {
      const note = el("div", undefined, "sample-note");
      note.append(
        el("strong", task.id >= 27 ? "使用本次实验记录" : "本项检查依据"),
        el(
          "p",
          task.id >= 27
            ? "运行检查将读取你当前的练习结果。左侧目录显示哪些任务需要修正或复测。"
            : task.goal,
        ),
      );
      $("#task-samples").append(note);
    }
    renderFields(task);
    renderFeedback(task);
    $("#task-note").value = state.notes[task.id] || "";
    $("#previous-task").disabled = task.id === 1;
    $("#next-task").textContent =
      task.id === 28 ? "查看实验记录 →" : "下一任务 →";
    $("#task-position").textContent = `${task.id} / 28`;
    $("#mobile-step-label").textContent = `第 ${task.id} 项，共 28 项`;
    renderProgress();
  }
  function selectTask(id, focus = false) {
    state.activeTask = Math.max(1, Math.min(28, id));
    renderTask();
    $("#task-directory").classList.remove("is-open");
    $("#directory-toggle").setAttribute("aria-expanded", "false");
    save();
    if (focus) {
      $("#experiment").scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
      $("#task-title").focus({ preventScroll: true });
    }
  }
  $("#task-form").addEventListener("input", () => {
    const task = tasks[state.activeTask - 1];
    const next = readForm(task);
    if (signature(task, next) !== signature(task, draft(task))) {
      if (task.id < 27 && state.records[27])
        state.records[27].invalidated = true;
      if (task.id < 28 && state.records[28])
        state.records[28].invalidated = true;
    }
    state.drafts[task.id] = next;
    renderFeedback(task);
    renderProgress();
    scheduleSave();
  });
  $("#task-form").addEventListener("change", () => {
    const task = tasks[state.activeTask - 1];
    const next = readForm(task);
    if (signature(task, next) !== signature(task, draft(task))) {
      if (task.id < 27 && state.records[27])
        state.records[27].invalidated = true;
      if (task.id < 28 && state.records[28])
        state.records[28].invalidated = true;
    }
    state.drafts[task.id] = next;
    renderFeedback(task);
    renderProgress();
    scheduleSave();
  });
  $("#task-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const task = tasks[state.activeTask - 1],
      values = readForm(task);
    state.drafts[task.id] = values;
    const result = check(task, values);
    state.records[task.id] = {
      signature: signature(task, values),
      attempts: (state.records[task.id]?.attempts || 0) + 1,
      at: new Date().toISOString(),
      result,
    };
    save();
    renderFeedback(task);
    renderProgress();
    $("#task-feedback").scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "nearest",
    });
  });
  $("#task-note").addEventListener("input", () => {
    state.notes[state.activeTask] = $("#task-note").value;
    renderProgress();
    scheduleSave();
  });
  $("#hint-button").addEventListener("click", () => {
    const hidden = !$("#task-hint").hidden;
    $("#task-hint").hidden = hidden;
    $("#hint-button").setAttribute("aria-expanded", String(!hidden));
  });
  $("#previous-task").addEventListener("click", () =>
    selectTask(state.activeTask - 1, true),
  );
  $("#next-task").addEventListener("click", () =>
    state.activeTask === 28
      ? $("#report").scrollIntoView({ behavior: "smooth" })
      : selectTask(state.activeTask + 1, true),
  );
  $("#directory-toggle").addEventListener("click", () => {
    const open =
      $("#directory-toggle").getAttribute("aria-expanded") !== "true";
    $("#directory-toggle").setAttribute("aria-expanded", String(open));
    $("#task-directory").classList.toggle("is-open", open);
  });
  ["#start-button", "#resume-button"].forEach((id) =>
    $(id).addEventListener("click", () => selectTask(state.activeTask, true)),
  );
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      $("#task-directory").classList.contains("is-open")
    ) {
      $("#task-directory").classList.remove("is-open");
      $("#directory-toggle").setAttribute("aria-expanded", "false");
      $("#directory-toggle").focus();
    }
  });
  window.addEventListener("pagehide", save);
  function download(name, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type })),
      a = el("a");
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
  function readableValues(task) {
    const values = draft(task);
    return task.fields.map((f) => {
      let value = values[f.key];
      if (f.type === "checks")
        value = value
          .map((v) => f.options.find((o) => o.value === v)?.label || v)
          .join("、");
      else if (f.type === "select")
        value = f.options.find((o) => o.value === value)?.label || value;
      return `${f.label}：${value || "未填写"}`;
    });
  }
  $("#export-report").addEventListener("click", () => {
    save();
    const lines = [
      "# 数字孪生智能工厂实验报告",
      "",
      "实验名称：基于数字孪生的废塑料热解炼油智能工厂教学系统",
      `导出时间：${new Date().toLocaleString("zh-CN")}`,
      `当前通过：${tasks.filter((t) => status(t) === "passed").length}/28 项练习`,
      "",
      "本报告记录浏览器教学样例的操作、检查结果与学习者记录。论证质量及课程成绩由教师复核。",
      "请在实验记录中保留至少两组配置、对照结果与复测依据；步骤满分是课程评价依据，不是本页自动评分。",
      "",
    ];
    tasks.forEach((task) => {
      const record = state.records[task.id];
      const courseTask = courseTasks.get(task.id);
      lines.push(
        `## ${task.id}. ${task.title}`,
        `阶段：${phases[task.stage].title}`,
        `目标：${task.goal}`,
        ...(courseTask
          ? [
              `课程要求：${courseTask.goal}`,
              `建议操作用时：${courseTask.minutes} 分钟`,
              `步骤满分：${courseTask.points} 分（教师评定）`,
              ...courseTask.rubric.map((item) => `评分依据：${item}`),
              `阶段成果：${courseOutline.stages[task.stage].deliverables.join("；")}`,
            ]
          : []),
        `当前状态：${labels[status(task)]}`,
        `检查次数：${record?.attempts || 0}`,
        "",
        "### 当前配置",
        ...readableValues(task).map((s) => `- ${s}`),
        "",
        "### 检查反馈",
        record?.result.summary || "尚未运行检查",
        ...(record?.result.details || []).map((s) => `- ${s}`),
      );
      if (status(task) === "changed")
        lines.push(
          "注意：配置或前置结果已变更，上次结果不能作为当前通过依据。",
        );
      if (record?.result.output) {
        const output = record.result.output;
        lines.push(
          "",
          output.caption || "结果",
          ...output.rows.map((row) =>
            row.map((value, i) => `${output.headers[i]}：${value}`).join("；"),
          ),
        );
      }
      lines.push(
        "",
        "### 实验记录",
        state.notes[task.id]?.trim() || "未填写",
        "",
      );
    });
    download(
      "数字孪生实验报告.md",
      lines.join("\n"),
      "text/markdown;charset=utf-8",
    );
    $("#transfer-status").textContent =
      "已生成 Markdown 实验报告，可用文本编辑器或文档工具查看。";
  });
  $("#export-progress").addEventListener("click", () => {
    save();
    download(
      "数字孪生学习进度.json",
      JSON.stringify(state, null, 2),
      "application/json",
    );
    $("#transfer-status").textContent =
      "已生成学习进度备份，可在同一版本实验中导入。";
  });
  $("#import-progress").addEventListener("click", () =>
    $("#progress-file").click(),
  );
  $("#progress-file").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      if (file.size > 2000000) throw Error("size");
      const incoming = normalize(JSON.parse(await file.text()));
      if (
        !confirm(
          "导入会替换当前浏览器中的实验进度。请确认已经备份需要保留的记录。",
        )
      )
        return;
      state = incoming;
      recomputeRestored();
      renderTask();
      save();
      $("#transfer-status").textContent =
        "学习进度已导入，检查结果已按当前练习规则重新核验。";
    } catch {
      $("#transfer-status").textContent =
        "无法导入：请选择本实验导出的有效 JSON 进度文件（不超过 2 MB）。";
    } finally {
      event.target.value = "";
    }
  });
  renderTask();
  if (!storageOK)
    $("#save-status").textContent =
      "当前浏览器未能恢复本机记录。请使用进度备份文件继续学习。";
  // Contextual media remains a reference resource, separate from exercise checks.
  const video = $("#demo-video"),
    videoDialog = $("#video-dialog"),
    imageDialog = $("#image-dialog");
  const chapters = {
    full: { start: 0, title: "完整操作导览" },
    devices: { start: 60, title: "设备定位与联动" },
    workshop: { start: 87, title: "三维车间" },
    alarms: { start: 115, title: "报警与操作记录" },
    data: { start: 154, title: "数据中心" },
    process: { start: 193, title: "工艺流程" },
    pipes: { start: 211, title: "介质管网" },
    scada: { start: 200, title: "二维 SCADA" },
    operations: { start: 219, title: "运维界面" },
    ai: { start: 235, title: "智能分析" },
    mr: { start: 278, title: "MR 虚实交互" },
  };
  const openers = new WeakMap();
  let pending = null,
    requested = "full",
    failed = false;
  const time = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  function openDialog(dialog) {
    openers.set(dialog, document.activeElement);
    dialog.showModal();
    document.body.classList.add("dialog-open");
  }
  function seek() {
    if (pending !== null && Number.isFinite(video.duration)) {
      video.currentTime = Math.min(pending, Math.max(0, video.duration - 0.1));
      pending = null;
    }
  }
  function playChapter(key) {
    requested = Object.hasOwn(chapters, key) ? key : "full";
    const chapter = chapters[requested];
    pending = chapter.start;
    $("#video-dialog-title").textContent = `操作示例 · ${chapter.title}`;
    $("#video-context").textContent = chapter.start
      ? `从 ${time(chapter.start)} 开始 · 可继续观看后续操作`
      : "完整系统操作演示 · 05:16";
    if (failed || video.error || !video.readyState) video.load();
    else seek();
    video.play().catch(() => {});
  }
  document.querySelectorAll("[data-video-open]").forEach((button) =>
    button.addEventListener("click", () => {
      openDialog(videoDialog);
      playChapter(button.dataset.videoOpen || "full");
    }),
  );
  document
    .querySelectorAll("[data-video-chapter]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        playChapter(button.dataset.videoChapter),
      ),
    );
  video.addEventListener("loadedmetadata", seek);
  video.addEventListener("timeupdate", () => {
    const buttons = [...document.querySelectorAll("[data-video-chapter]")],
      active = buttons
        .filter(
          (b) => video.currentTime >= chapters[b.dataset.videoChapter].start,
        )
        .pop();
    buttons.forEach((b) =>
      b === active
        ? b.setAttribute("aria-current", "true")
        : b.removeAttribute("aria-current"),
    );
  });
  const onError = () => {
    failed = true;
    $(".video-error").hidden = false;
  };
  video.addEventListener("error", onError);
  video
    .querySelectorAll("source")
    .forEach((s) => s.addEventListener("error", onError));
  ["loadstart", "loadeddata"].forEach((name) =>
    video.addEventListener(name, () => {
      failed = false;
      $(".video-error").hidden = true;
    }),
  );
  $("#retry-video").addEventListener("click", () => playChapter(requested));
  $("#resource-image").addEventListener("click", () => {
    const image = $("#task-image");
    $("#expanded-image").src = image.src;
    $("#expanded-image").alt = image.alt;
    $("#image-dialog-title").textContent = image.alt;
    openDialog(imageDialog);
  });
  document.querySelectorAll("dialog").forEach((dialog) => {
    dialog
      .querySelector("[data-close-dialog]")
      .addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        const r = dialog.getBoundingClientRect();
        if (
          event.clientX < r.left ||
          event.clientX > r.right ||
          event.clientY < r.top ||
          event.clientY > r.bottom
        )
          dialog.close();
      }
    });
    dialog.addEventListener("close", () => {
      document.body.classList.remove("dialog-open");
      if (dialog === videoDialog) {
        video.pause();
        pending = null;
      }
      const opener = openers.get(dialog);
      (opener?.getClientRects().length ? opener : $("#start-button")).focus({
        preventScroll: true,
      });
    });
  });
})();
