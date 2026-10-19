/* Read-only illustrations of the existing task outputs; no checking logic. */
(() => {
  "use strict";
  const svgNS = "http://www.w3.org/2000/svg";
  const node = (tag, text, className) => {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = String(text);
    if (className) element.className = className;
    return element;
  };
  const svgNode = (tag, attributes = {}, text) => {
    const element = document.createElementNS(svgNS, tag);
    Object.entries(attributes).forEach(([key, value]) =>
      element.setAttribute(key, String(value)),
    );
    if (text !== undefined) element.textContent = String(text);
    return element;
  };
  const number = (value) =>
    typeof value === "string" && value.trim() === "" ? NaN : Number(value);
  const format = (value) => String(Number(value.toFixed(2)));
  const rowsFor = (result, names) => {
    const output = result && result.output;
    if (
      !output ||
      !Array.isArray(output.headers) ||
      !Array.isArray(output.rows) ||
      !output.rows.length
    )
      return null;
    const indexes = names.map((name) => output.headers.indexOf(name));
    if (
      indexes.some((index) => index < 0) ||
      output.rows.some(
        (row) =>
          !Array.isArray(row) ||
          indexes.some((index) => row[index] === undefined),
      )
    )
      return null;
    return output.rows.map((row) => indexes.map((index) => String(row[index])));
  };

  function renderStates(result) {
    const rows = rowsFor(result, [
      "时间",
      "绑定值",
      "数据质量",
      "图示状态",
      "图示颜色",
    ]);
    if (!rows || rows.length !== 4) return null;
    const figure = node("figure", undefined, "lab-visual lab-visual-states");
    figure.append(node("figcaption", "四帧状态图示", "lab-visual-title"));
    const grid = node("div", undefined, "lab-visual-state-grid");
    rows.forEach(([time, value, quality, state, color], index) => {
      const card = node("section", undefined, "lab-status-card");
      card.append(node("p", `样本 ${index + 1} · ${time}`, "lab-status-time"));
      const heading = node("h4", undefined, "lab-status-heading");
      const colorClass =
        { 绿色: "green", 红色: "red", 灰色: "gray" }[color] || "blue";
      const dot = node(
        "span",
        undefined,
        `lab-status-dot lab-status-dot-${colorClass}`,
      );
      dot.setAttribute("aria-hidden", "true");
      heading.append(dot, node("span", state));
      card.append(heading);
      const facts = node("dl", undefined, "lab-status-facts");
      [
        ["绑定值", value],
        ["数据质量", quality],
        ["图示颜色", color],
      ].forEach(([label, content]) => {
        const row = node("div");
        row.append(node("dt", label), node("dd", content));
        facts.append(row);
      });
      card.append(facts);
      grid.append(card);
    });
    figure.append(
      grid,
      node(
        "p",
        "图示展示本次配置的实际输出；状态文字、数据质量与颜色同时保留。",
        "lab-visual-note",
      ),
    );
    return figure;
  }

  function renderAlarm(result, values = {}) {
    const rows = rowsFor(result, ["样本", "数值", "处理后状态", "新事件"]);
    if (!rows) return null;
    const points = rows.map(([sample, value, state, event]) => ({
      sample,
      value: number(value),
      state,
      event,
    }));
    const threshold = number(values.threshold),
      recovery = number(values.recoveryThreshold);
    if (
      points.length < 2 ||
      points.some((point) => !Number.isFinite(point.value)) ||
      !Number.isFinite(threshold) ||
      !Number.isFinite(recovery)
    )
      return null;

    const figure = node("figure", undefined, "lab-visual lab-visual-alarm");
    figure.append(node("figcaption", "采样曲线与事件位置", "lab-visual-title"));
    const legend = node("div", undefined, "lab-visual-legend");
    [
      ["reading", "样本读数"],
      ["alarm", `告警阈值 > ${format(threshold)}`],
      ["recovery", `恢复阈值 ≤ ${format(recovery)}`],
    ].forEach(([kind, label]) => {
      const item = node("span");
      const swatch = node(
        "i",
        undefined,
        `lab-visual-swatch lab-visual-swatch-${kind}`,
      );
      swatch.setAttribute("aria-hidden", "true");
      item.append(swatch, node("span", label));
      legend.append(item);
    });
    figure.append(legend);

    const width = Math.max(760, points.length * 48 + 96),
      height = 390;
    const left = 64,
      right = width - 28,
      top = 108,
      bottom = 308;
    const bounds = [...points.map((point) => point.value), threshold, recovery];
    const min = Math.floor((Math.min(...bounds) - 2) / 2) * 2;
    const max = Math.ceil((Math.max(...bounds) + 2) / 2) * 2;
    const x = (index) => left + (index * (right - left)) / (points.length - 1);
    const y = (value) =>
      bottom - ((value - min) * (bottom - top)) / (max - min);
    const scroll = node("div", undefined, "lab-visual-chart-scroll");
    scroll.tabIndex = 0;
    scroll.setAttribute("role", "region");
    scroll.setAttribute("aria-label", "采样与报警曲线，可横向滚动查看所有样本");
    const chart = svgNode("svg", {
      viewBox: `0 0 ${width} ${height}`,
      width,
      height,
      role: "img",
      class: "lab-visual-chart",
    });
    chart.style.minWidth = width + "px";
    const eventPoints = points
      .map((point, index) => ({ ...point, index }))
      .filter((point) => point.event && point.event !== "—");
    chart.setAttribute(
      "aria-label",
      `本次运行的${points.length}个采样点。告警阈值${format(threshold)}，恢复阈值${format(recovery)}。${eventPoints.length ? eventPoints.map((point) => `样本${point.sample}：${point.event}`).join("；") : "未产生新事件"}。逐样本状态见下方结果表。`,
    );
    chart.append(svgNode("title", {}, "本次配置的采样曲线、阈值与事件"));
    chart.append(
      svgNode(
        "text",
        { x: left, y: 96, class: "lab-chart-axis-title" },
        "教学数值（无量纲）",
      ),
    );

    for (let tick = 0; tick <= 4; tick++) {
      const value = min + (tick * (max - min)) / 4,
        py = y(value);
      chart.append(
        svgNode("line", {
          x1: left,
          x2: right,
          y1: py,
          y2: py,
          class: "lab-chart-gridline",
        }),
      );
      chart.append(
        svgNode(
          "text",
          {
            x: left - 12,
            y: py + 6,
            "text-anchor": "end",
            class: "lab-chart-tick",
          },
          format(value),
        ),
      );
    }
    chart.append(
      svgNode("line", {
        x1: left,
        x2: right,
        y1: bottom,
        y2: bottom,
        class: "lab-chart-axis",
      }),
    );
    chart.append(
      svgNode("line", {
        x1: left,
        x2: left,
        y1: top,
        y2: bottom,
        class: "lab-chart-axis",
      }),
    );
    [
      [threshold, "alarm"],
      [recovery, "recovery"],
    ].forEach(([value, kind]) =>
      chart.append(
        svgNode("line", {
          x1: left,
          x2: right,
          y1: y(value),
          y2: y(value),
          class: `lab-chart-threshold lab-chart-threshold-${kind}`,
        }),
      ),
    );
    chart.append(
      svgNode("polyline", {
        points: points
          .map((point, index) => `${x(index)},${y(point.value)}`)
          .join(" "),
        class: "lab-chart-reading",
      }),
    );

    points.forEach((point, index) => {
      chart.append(
        svgNode(
          "text",
          {
            x: x(index),
            y: bottom + 29,
            "text-anchor": "middle",
            class: "lab-chart-tick",
          },
          point.sample,
        ),
      );
      const marker = svgNode("circle", {
        cx: x(index),
        cy: y(point.value),
        r: 5,
        class: `lab-chart-point ${point.state === "告警中" ? "lab-chart-point-alarm" : ""}`,
      });
      marker.append(
        svgNode(
          "title",
          {},
          `样本${point.sample}：${format(point.value)}，${point.state}${point.event !== "—" ? "，" + point.event : ""}`,
        ),
      );
      chart.append(marker);
    });
    eventPoints.forEach((point) => {
      const recovering = point.event === "恢复",
        py = recovering ? 51 : 18;
      const center = Math.max(left + 10, Math.min(right - 38, x(point.index)));
      const kind = recovering ? "recovery" : "alarm";
      chart.append(
        svgNode("line", {
          x1: center,
          y1: py + 26,
          x2: x(point.index),
          y2: y(point.value) - 9,
          class: `lab-chart-event-guide lab-chart-event-${kind}`,
        }),
      );
      chart.append(
        svgNode("rect", {
          x: center - 49,
          y: py,
          width: 98,
          height: 27,
          rx: 3,
          class: `lab-chart-event-label lab-chart-event-label-${kind}`,
        }),
      );
      chart.append(
        svgNode(
          "text",
          {
            x: center,
            y: py + 19,
            "text-anchor": "middle",
            class: "lab-chart-event-text",
          },
          `${point.sample} · ${recovering ? "恢复" : "触发告警"}`,
        ),
      );
      chart.append(
        svgNode("circle", {
          cx: x(point.index),
          cy: y(point.value),
          r: 8,
          class: `lab-chart-event-ring lab-chart-event-${kind}`,
        }),
      );
    });
    chart.append(
      svgNode(
        "text",
        {
          x: (left + right) / 2,
          y: 372,
          "text-anchor": "middle",
          class: "lab-chart-axis-title",
        },
        "样本序号（等间隔）",
      ),
    );
    scroll.append(chart);
    figure.append(
      scroll,
      node(
        "p",
        "红色圆点表示处理后处于告警中，蓝色圆点表示正常；触发与恢复标签取自本次运行结果。窄屏可横向滚动。",
        "lab-visual-note",
      ),
    );
    return figure;
  }

  window.renderLabVisual = (taskId, result, values) => {
    if (taskId === 15) return renderStates(result);
    if (taskId === 18) return renderAlarm(result, values);
    return null;
  };
})();
