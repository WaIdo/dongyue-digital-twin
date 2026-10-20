"use strict";

// All devices, readings, coordinates and limits below are fictional teaching data.
// These pure exercises do not communicate with equipment or a three-dimensional engine.
(() => {
  const option = (value, label) => ({ value, label });
  const text = (value) => (typeof value === "string" ? value.trim() : "");
  const isChoice = (value, allowed) => allowed.includes(text(value));
  const number = (value) => (text(value) === "" ? NaN : Number(text(value)));
  const invalid = (details, output) => ({
    pass: false,
    summary: "配置尚不能运行，请先修正输入。",
    details,
    ...(output ? { output } : {}),
  });
  const colors = { green: "绿色", gray: "灰色", red: "红色" };
  const states = {
    STOPPED: "停止",
    RUNNING: "运行",
    TRIPPED: "故障",
    UNKNOWN: "数据过期",
  };
  const task15Samples = [
    {
      time: "00:00",
      run: 0,
      fault: 0,
      temperature: 26,
      otherRun: 0,
      quality: "GOOD",
    },
    {
      time: "00:01",
      run: 1,
      fault: 0,
      temperature: 27,
      otherRun: 0,
      quality: "GOOD",
    },
    {
      time: "00:02",
      run: 1,
      fault: 1,
      temperature: 28,
      otherRun: 0,
      quality: "GOOD",
    },
    {
      time: "00:03",
      run: 1,
      fault: 0,
      temperature: 28,
      otherRun: 0,
      quality: "STALE",
    },
  ];
  const devices = [
    {
      asset: "P-101",
      model: "M-P101",
      name: "输送泵",
      point: "P101.READ",
      position: [18, 0, 12],
      current: "42",
    },
    {
      asset: "P-102",
      model: "M-P102",
      name: "输送泵",
      point: "P102.READ",
      position: [36, 0, 12],
      current: "65",
    },
    {
      asset: "T-201",
      model: "M-T201",
      name: "教学储罐",
      point: "T201.READ",
      position: [50, 0, 28],
      current: "51",
    },
  ];
  const position = (device) => device.position.join(", ");
  const cameraDistance = (a, b) =>
    Math.hypot(...a.map((value, index) => value - b[index])).toFixed(1);
  const deviceOptions = devices.map((device) =>
    option(device.asset, `${device.asset} · ${device.name}`),
  );
  const modelOptions = devices.map((device) =>
    option(device.model, device.model),
  );

  const tasks = [
    {
      id: 15,
      stage: 2,
      title: "绑定三维状态",
      goal: "让 P-101 的四帧教学图示依次显示停止、运行、故障和数据过期，并使用正确的运行颜色。",
      brief: `运行反馈与故障反馈可能同时为 1。过期读数必须可辨认，不能继续显示成正常实时状态。`,
      concept:
        "状态绑定需要明确对象、信号语义、状态优先级和数据质量。数值大于零不一定表示设备正在运行。",
      hint: "使用 P101.RUN；故障覆盖运行；运行用绿色；STALE 使用灰色并标记过期。温度值不是运行反馈。",
      tables: [
        {
          caption: "P-101 的四帧样例；温度列只是无工艺含义的教学数值",
          headers: [
            "时间",
            "P101.RUN",
            "P101.FAULT",
            "P101.TEMP",
            "P102.RUN",
            "质量",
          ],
          rows: task15Samples.map((row) => [
            row.time,
            String(row.run),
            String(row.fault),
            String(row.temperature),
            String(row.otherRun),
            row.quality,
          ]),
        },
      ],
      fields: [
        {
          key: "runSignal",
          label: "运行状态绑定信号",
          type: "select",
          options: [
            option("P101.TEMP", "P101.TEMP · 温度数值"),
            option("P101.RUN", "P101.RUN · 运行反馈"),
            option("P102.RUN", "P102.RUN · 另一台泵的反馈"),
          ],
          value: "P101.TEMP",
        },
        {
          key: "priority",
          label: "运行与故障同时出现时",
          type: "select",
          options: [
            option("run-first", "先显示运行"),
            option("fault-first", "先显示故障"),
          ],
          value: "run-first",
        },
        {
          key: "runningColor",
          label: "运行状态颜色",
          type: "select",
          options: [
            option("gray", "灰色"),
            option("green", "绿色"),
            option("red", "红色"),
          ],
          value: "gray",
        },
        {
          key: "staleBehavior",
          label: "数据过期时",
          type: "select",
          options: [
            option("keep-live", "继续按上次读数显示"),
            option("mark-stale", "灰色显示并标记数据过期"),
          ],
          value: "keep-live",
        },
      ],
      run(values = {}) {
        if (
          !isChoice(values.runSignal, ["P101.RUN", "P101.TEMP", "P102.RUN"]) ||
          !isChoice(values.priority, ["run-first", "fault-first"]) ||
          !isChoice(values.runningColor, Object.keys(colors)) ||
          !isChoice(values.staleBehavior, ["keep-live", "mark-stale"])
        ) {
          return invalid(["请选择运行信号、优先级、运行颜色与过期数据策略。"]);
        }
        const expected = ["STOPPED", "RUNNING", "TRIPPED", "UNKNOWN"];
        const actual = task15Samples.map((row) => {
          const signal =
            values.runSignal === "P101.RUN"
              ? row.run
              : values.runSignal === "P101.TEMP"
                ? row.temperature
                : row.otherRun;
          let state = "STOPPED";
          if (values.priority === "fault-first" && row.fault) state = "TRIPPED";
          else if (signal > 0) state = "RUNNING";
          else if (row.fault) state = "TRIPPED";
          if (row.quality === "STALE" && values.staleBehavior === "mark-stale")
            state = "UNKNOWN";
          const color =
            state === "RUNNING"
              ? colors[values.runningColor]
              : state === "TRIPPED"
                ? "红色"
                : "灰色";
          return { state, color, signal };
        });
        const differences = actual.flatMap((row, index) => {
          const expectedColor = ["灰色", "绿色", "红色", "灰色"][index];
          return row.state === expected[index] && row.color === expectedColor
            ? []
            : [
                `${task15Samples[index].time} 应显示「${states[expected[index]]} / ${expectedColor}」，实际为「${states[row.state]} / ${row.color}」。`,
              ];
        });
        return {
          pass: differences.length === 0,
          summary: differences.length
            ? `四帧中有 ${differences.length} 帧未满足绑定要求。`
            : "四帧状态、优先级和质量标记均正确。",
          details: differences.length
            ? differences
            : [
                "相同数据在不同绑定规则下会产生不同图示；本结果是教学计算，未驱动真实三维模型。",
              ],
          output: {
            caption: "逐帧渲染计算结果",
            headers: ["时间", "绑定值", "数据质量", "图示状态", "图示颜色"],
            rows: actual.map((row, index) => [
              task15Samples[index].time,
              String(row.signal),
              task15Samples[index].quality,
              states[row.state],
              row.color,
            ]),
          },
        };
      },
    },
    {
      id: 16,
      stage: 2,
      title: "构建双向定位",
      goal: "从 P-101 的面板定位 M-P101，再从 M-P101 返回 P-101，同时同步最新读数。",
      brief: `两台泵名称相同，请使用唯一编码。相机的目标点用样例场景坐标表示，距离单位也是教学单位。`,
      concept:
        "双向定位的两个方向必须回到同一设备编码。选中高亮、视角目标和数据面板应保持一致。",
      hint: "面板 P-101 对应 M-P101；模型 M-P101 对应面板 P-101。选择聚焦对象并读取绑定测点，不能沿用缓存的 35。",
      tables: [
        {
          caption: "资产、模型与数据的映射",
          headers: [
            "资产",
            "模型",
            "名称",
            "坐标 x, y, z",
            "测点",
            "当前样例读数",
          ],
          rows: devices.map((device) => [
            device.asset,
            device.model,
            device.name,
            position(device),
            device.point,
            device.current,
          ]),
        },
      ],
      fields: [
        {
          key: "modelTarget",
          label: "点击面板 P-101 后选中的模型",
          type: "select",
          options: modelOptions,
          value: "M-P102",
        },
        {
          key: "panelTarget",
          label: "点击模型 M-P101 后打开的面板",
          type: "select",
          options: deviceOptions,
          value: "P-102",
        },
        {
          key: "cameraMode",
          label: "相机目标点",
          type: "select",
          options: [
            option("keep", "保留旧目标点 0, 0, 0"),
            option("focus", "移动到选中模型的坐标"),
          ],
          value: "keep",
        },
        {
          key: "readoutMode",
          label: "面板读数",
          type: "select",
          options: [
            option("cached", "保留缓存读数 35"),
            option("mapped", "读取面板资产绑定的测点"),
          ],
          value: "cached",
        },
      ],
      run(values = {}) {
        const model = devices.find(
          (device) => device.model === text(values.modelTarget),
        );
        const panel = devices.find(
          (device) => device.asset === text(values.panelTarget),
        );
        if (
          !model ||
          !panel ||
          !isChoice(values.cameraMode, ["keep", "focus"]) ||
          !isChoice(values.readoutMode, ["cached", "mapped"])
        )
          return invalid(["请完整配置两个定位方向、相机策略与读数来源。"]);
        const target = devices[0];
        const camera =
          values.cameraMode === "focus" ? model.position : [0, 0, 0];
        const readout = values.readoutMode === "mapped" ? panel.current : "35";
        const errors = [];
        if (model.asset !== target.asset)
          errors.push(
            `面板 P-101 错误选中了 ${model.model}，该模型属于 ${model.asset}。`,
          );
        if (panel.asset !== target.asset)
          errors.push(`模型 M-P101 错误打开了 ${panel.asset} 的面板。`);
        if (cameraDistance(camera, target.position) !== "0.0")
          errors.push(
            `相机目标点距 P-101 仍有 ${cameraDistance(camera, target.position)} 个教学单位。`,
          );
        if (readout !== target.current || panel.point !== target.point)
          errors.push(
            `应读取 P101.READ = 42，当前面板为 ${panel.point} = ${readout}。`,
          );
        return {
          pass: errors.length === 0,
          summary: errors.length
            ? "两次点击尚未回到一致的对象与数据。"
            : "面板、模型、视角目标和读数已保持一致。",
          details: errors.length
            ? errors
            : [
                "双向定位用资产编码校验；相同显示名称不会造成混淆。此处输出的是计算后的定位目标。",
              ],
          output: {
            caption: "两次点击产生的教学定位结果",
            headers: ["触发", "实际结果", "预期结果"],
            rows: [
              ["面板 P-101 → 模型", model.model, "M-P101"],
              ["模型 M-P101 → 面板", panel.asset, "P-101"],
              ["相机目标点", camera.join(", "), position(target)],
              ["面板测点", panel.point, target.point],
              ["面板读数", readout, target.current],
            ],
          },
        };
      },
    },
    {
      id: 17,
      stage: 2,
      title: "设计设备状态机",
      goal: "补全三种状态的转换，让测试序列能够启停、进入故障、拒绝故障中启动，并在复位后重新启动。",
      brief: `状态为 STOPPED、RUNNING、TRIPPED；事件为 start、stop、trip、reset。每行输入「起始状态,事件,目标状态」。`,
      concept:
        "状态机用当前状态与事件共同决定下一状态。不存在的转换应保留原状态并生成明确的拒绝记录。",
      hint: "需要 STOPPED,start,RUNNING；RUNNING,stop,STOPPED；RUNNING,trip,TRIPPED；TRIPPED,reset,STOPPED。不要添加 TRIPPED 的 start 转换。",
      tables: [
        {
          caption: "固定测试事件及期望结果",
          headers: ["序号", "事件", "期望状态", "期望处理"],
          rows: [
            ["1", "start", "RUNNING", "通过"],
            ["2", "trip", "TRIPPED", "通过"],
            ["3", "start", "TRIPPED", "拒绝"],
            ["4", "reset", "STOPPED", "通过"],
            ["5", "start", "RUNNING", "通过"],
            ["6", "stop", "STOPPED", "通过"],
          ],
        },
      ],
      fields: [
        {
          key: "initialState",
          label: "初始状态",
          type: "select",
          options: [
            option("STOPPED", "STOPPED · 停止"),
            option("RUNNING", "RUNNING · 运行"),
            option("TRIPPED", "TRIPPED · 故障"),
          ],
          value: "STOPPED",
        },
        {
          key: "transitions",
          label: "状态转换表（每行一条，使用英文逗号）",
          type: "textarea",
          placeholder: "STOPPED,start,RUNNING",
          value:
            "STOPPED,start,RUNNING\nRUNNING,stop,STOPPED\nRUNNING,trip,TRIPPED",
        },
        {
          key: "unknownPolicy",
          label: "没有匹配转换的事件",
          type: "select",
          options: [
            option("ignore", "静默忽略"),
            option("reject", "保留状态并写入拒绝日志"),
          ],
          value: "ignore",
        },
      ],
      run(values = {}) {
        if (
          !isChoice(values.initialState, ["STOPPED", "RUNNING", "TRIPPED"]) ||
          !isChoice(values.unknownPolicy, ["ignore", "reject"])
        )
          return invalid(["请选择初始状态和无匹配事件的处理策略。"]);
        const lines = text(values.transitions)
          .split(/\r?\n/)
          .filter((line) => line.trim());
        if (!text(values.transitions) || lines.length > 30)
          return invalid([
            "请输入 1–30 条状态转换，每行用英文逗号分隔三个字段。",
          ]);
        const transitions = new Map();
        const issues = [];
        lines.forEach((line, index) => {
          const cells = line.split(",").map((cell) => cell.trim());
          const [from, event, to] = cells;
          if (
            cells.length !== 3 ||
            !["STOPPED", "RUNNING", "TRIPPED"].includes(from) ||
            !["start", "stop", "trip", "reset"].includes(event) ||
            !["STOPPED", "RUNNING", "TRIPPED"].includes(to)
          ) {
            issues.push(
              `第 ${index + 1} 行不符合「状态,事件,状态」格式或包含未知值。`,
            );
          } else {
            const key = `${from}/${event}`;
            if (transitions.has(key))
              issues.push(
                `第 ${index + 1} 行重复定义 ${key}；同一状态和事件只能有一个目标。`,
              );
            else transitions.set(key, to);
          }
        });
        if (issues.length) return invalid(issues);
        const events = ["start", "trip", "start", "reset", "start", "stop"];
        const expectedStates = [
          "RUNNING",
          "TRIPPED",
          "TRIPPED",
          "STOPPED",
          "RUNNING",
          "STOPPED",
        ];
        const expectedResults = [
          "通过",
          "通过",
          "拒绝",
          "通过",
          "通过",
          "通过",
        ];
        let state = values.initialState;
        const rows = events.map((event, index) => {
          const before = state;
          const next = transitions.get(`${state}/${event}`);
          const result = next
            ? "通过"
            : values.unknownPolicy === "reject"
              ? "拒绝"
              : "忽略";
          if (next) state = next;
          if (
            state !== expectedStates[index] ||
            result !== expectedResults[index]
          )
            issues.push(
              `第 ${index + 1} 步 ${event}：得到 ${state} / ${result}，预期 ${expectedStates[index]} / ${expectedResults[index]}。`,
            );
          return [String(index + 1), before, event, state, result];
        });
        return {
          pass: issues.length === 0,
          summary: issues.length
            ? "测试序列暴露了状态转换或拒绝日志问题。"
            : "六个事件均按预期转换，故障中启动已被拒绝。",
          details: issues.length
            ? issues
            : ["复位后可以重新启动；本次测试最终停在 STOPPED。"],
          output: {
            caption: "状态机执行轨迹",
            headers: ["步骤", "原状态", "事件", "新状态", "处理"],
            rows,
          },
        };
      },
    },
    {
      id: 18,
      stage: 2,
      title: "配置持续阈值报警",
      goal: "过滤短暂波动：让首次告警在第 5 个样本触发，第 8 个恢复；第二次在第 11 个触发，第 13 个恢复。",
      brief:
        "使用下表的无量纲教学序列。连续超过阈值才触发告警；告警中连续不高于恢复阈值才恢复。",
      concept:
        "本页用等间隔样本计数练习持续条件；实际系统需结合采样周期和事件时间定义持续时间。任一不满足条件的样本会清零对应计数。告警期间不重复产生新的告警事件。",
      hint: "可先尝试告警阈值 75、持续 3 个样本，恢复阈值 74、持续 2 个样本，再观察事件产生的样本位置。比较采用 1 个持续样本时的区别。",
      tables: [
        {
          caption: "固定教学序列；样本间隔相等",
          headers: ["样本序号", "教学数值"],
          rows: [68, 72, 76, 79, 81, 77, 74, 73, 79, 82, 84, 72, 69].map(
            (value, index) => [String(index + 1), String(value)],
          ),
        },
      ],
      fields: [
        {
          key: "threshold",
          label: "告警阈值（数值严格大于此值）",
          type: "number",
          min: 60,
          max: 90,
          step: 0.5,
          value: "75",
        },
        {
          key: "holdSamples",
          label: "告警需要连续几个样本",
          type: "number",
          min: 1,
          max: 5,
          step: 1,
          value: "1",
        },
        {
          key: "recoveryThreshold",
          label: "恢复阈值（数值不高于此值）",
          type: "number",
          min: 60,
          max: 90,
          step: 0.5,
          value: "74",
        },
        {
          key: "recoverySamples",
          label: "恢复需要连续几个样本",
          type: "number",
          min: 1,
          max: 5,
          step: 1,
          value: "1",
        },
      ],
      run(values = {}) {
        const threshold = number(values.threshold);
        const hold = number(values.holdSamples);
        const recovery = number(values.recoveryThreshold);
        const recoveryHold = number(values.recoverySamples);
        if (
          ![threshold, recovery].every(
            (value) => Number.isFinite(value) && value >= 60 && value <= 90,
          ) ||
          ![hold, recoveryHold].every(
            (value) => Number.isInteger(value) && value >= 1 && value <= 5,
          )
        )
          return invalid([
            "阈值必须是 60–90 的有限数值；持续样本数必须是 1–5 的整数。",
          ]);
        if (recovery >= threshold)
          return invalid(["恢复阈值必须低于告警阈值，形成明确的恢复区间。"]);
        let alarm = false;
        let highCount = 0;
        let lowCount = 0;
        const events = [];
        const rows = [68, 72, 76, 79, 81, 77, 74, 73, 79, 82, 84, 72, 69].map(
          (value, index) => {
            let event = "—";
            let activeCount;
            let counter;
            if (!alarm) {
              highCount = value > threshold ? highCount + 1 : 0;
              lowCount = 0;
              activeCount = highCount;
              counter = "超阈值";
              if (highCount >= hold) {
                alarm = true;
                event = "触发告警";
                events.push({ sample: index + 1, type: "alarm" });
                highCount = 0;
              }
            } else {
              lowCount = value <= recovery ? lowCount + 1 : 0;
              highCount = 0;
              activeCount = lowCount;
              counter = "恢复区间";
              if (lowCount >= recoveryHold) {
                alarm = false;
                event = "恢复";
                events.push({ sample: index + 1, type: "recover" });
                lowCount = 0;
              }
            }
            return [
              String(index + 1),
              String(value),
              `${counter} ${activeCount}/${counter === "超阈值" ? hold : recoveryHold}`,
              alarm ? "告警中" : "正常",
              event,
            ];
          },
        );
        const actual = events
          .map((event) => `${event.sample}:${event.type}`)
          .join(",");
        const pass = actual === "5:alarm,8:recover,11:alarm,13:recover";
        return {
          pass,
          summary: pass
            ? "两次告警与恢复均在目标样本处发生。"
            : "事件时点不符合目标，请对照连续样本计数。",
          details: [
            events.length
              ? `实际事件：${events.map((event) => `第 ${event.sample} 个样本${event.type === "alarm" ? "触发" : "恢复"}`).join("；")}。`
              : "当前配置没有产生告警或恢复事件。",
            "目标事件：5 触发、8 恢复、11 触发、13 恢复。阈值与时间规则仅用于此教学序列。",
          ],
          output: {
            caption: "逐样本运行结果",
            headers: ["样本", "数值", "本次连续计数", "处理后状态", "新事件"],
            rows,
          },
        };
      },
    },
    {
      id: 19,
      stage: 2,
      title: "验证拒绝逻辑",
      goal: "为教学启动请求配置校验门槛：允许合规请求，拒绝只读角色、异常状态、坏质量与重复请求，并说明原因。",
      brief: `请求只在内存中判定，不向设备发送指令。选择角色和状态可观察当前请求，再用固定探针对校验策略进行测试。`,
      concept:
        "按钮可点击不代表请求可执行。判定必须同时检查权限、状态、数据质量与请求标识，并保留拒绝原因。",
      hint: "启用四项检查。只有 operator/admin、STOPPED、GOOD 且请求标识首次出现时才允许。固定探针包含允许与拒绝两类情况。",
      fields: [
        {
          key: "role",
          label: "当前请求的角色",
          type: "select",
          options: [
            option("viewer", "viewer · 只读"),
            option("operator", "operator · 教学操作员"),
            option("admin", "admin · 教学管理员"),
          ],
          value: "viewer",
        },
        {
          key: "equipmentState",
          label: "当前请求的设备状态",
          type: "select",
          options: [
            option("STOPPED", "STOPPED · 停止"),
            option("RUNNING", "RUNNING · 已运行"),
            option("TRIPPED", "TRIPPED · 故障"),
          ],
          value: "STOPPED",
        },
        {
          key: "quality",
          label: "当前请求使用的数据质量",
          type: "select",
          options: [option("GOOD", "GOOD · 有效"), option("BAD", "BAD · 无效")],
          value: "GOOD",
        },
        {
          key: "checks",
          label: "执行前启用的检查",
          type: "checks",
          options: [
            option("role", "角色有操作权限"),
            option("state", "设备处于 STOPPED"),
            option("quality", "读数质量为 GOOD"),
            option("request", "请求标识存在且未执行过"),
          ],
          value: ["role", "state"],
        },
      ],
      run(values = {}) {
        const allowedGuards = ["role", "state", "quality", "request"];
        if (
          !isChoice(values.role, ["viewer", "operator", "admin"]) ||
          !isChoice(values.equipmentState, ["STOPPED", "RUNNING", "TRIPPED"]) ||
          !isChoice(values.quality, ["GOOD", "BAD"]) ||
          !Array.isArray(values.checks) ||
          values.checks.some((value) => !allowedGuards.includes(value))
        )
          return invalid([
            "请选择合法角色、设备状态、质量值，并用复选框配置检查策略。",
          ]);
        const enabled = new Set(values.checks);
        const probes = [
          {
            id: "REQ-CURRENT",
            title: "当前选择",
            role: values.role,
            state: values.equipmentState,
            quality: values.quality,
          },
          {
            id: "REQ-VALID",
            title: "合规启动",
            role: "operator",
            state: "STOPPED",
            quality: "GOOD",
          },
          {
            id: "REQ-READONLY",
            title: "只读角色",
            role: "viewer",
            state: "STOPPED",
            quality: "GOOD",
          },
          {
            id: "REQ-FAULT",
            title: "故障状态",
            role: "operator",
            state: "TRIPPED",
            quality: "GOOD",
          },
          {
            id: "REQ-RUNNING",
            title: "已运行状态",
            role: "operator",
            state: "RUNNING",
            quality: "GOOD",
          },
          {
            id: "REQ-BAD",
            title: "坏质量",
            role: "operator",
            state: "STOPPED",
            quality: "BAD",
          },
          {
            id: "REQ-SEEN",
            title: "重复请求",
            role: "operator",
            state: "STOPPED",
            quality: "GOOD",
          },
          {
            id: "",
            title: "无请求标识",
            role: "operator",
            state: "STOPPED",
            quality: "GOOD",
          },
        ];
        const reasonsFor = (probe, guards) => {
          const reasons = [];
          if (guards.has("role") && probe.role === "viewer")
            reasons.push("ROLE_DENIED：只读角色");
          if (guards.has("state") && probe.state !== "STOPPED")
            reasons.push(`STATE_DENIED：当前为 ${probe.state}`);
          if (guards.has("quality") && probe.quality !== "GOOD")
            reasons.push("QUALITY_DENIED：数据无效");
          if (guards.has("request") && !probe.id)
            reasons.push("REQUEST_MISSING：缺少请求标识");
          if (guards.has("request") && probe.id === "REQ-SEEN")
            reasons.push("REQUEST_DUPLICATE：标识已执行");
          return reasons;
        };
        const issues = [];
        const complete = new Set(allowedGuards);
        const rows = probes.map((probe) => {
          const reasons = reasonsFor(probe, enabled);
          const expected = reasonsFor(probe, complete);
          const accepted = reasons.length === 0;
          if (accepted !== (expected.length === 0))
            issues.push(
              `「${probe.title}」被错误允许；遗漏的检查为 ${expected.filter((reason) => !reasons.includes(reason)).join("；")}。`,
            );
          return [
            probe.title,
            probe.role,
            probe.state,
            probe.quality,
            accepted ? "允许（仅教学判定）" : "拒绝",
            reasons.length
              ? reasons.join("；")
              : `ACCEPTED：记录 ${probe.id || "无标识"}`,
          ];
        });
        return {
          pass: issues.length === 0,
          summary: issues.length
            ? `发现 ${issues.length} 类请求没有被正确拦截。`
            : "合规请求允许，其余请求均被拒绝并记录原因。",
          details: issues.length
            ? issues
            : [
                "当前选择也使用同一套策略判定；更改角色或状态会改变当前请求结果。REQ-SEEN 是预置的已执行标识。所有日志仅在本练习内计算。",
              ],
          output: {
            caption: "教学请求的判定与拒绝日志",
            headers: ["请求场景", "角色", "设备状态", "质量", "结果", "日志"],
            rows,
          },
        };
      },
    },
    {
      id: 20,
      stage: 2,
      title: "注入并定位事件",
      goal: "选择一条测试事件，将对象、模型、视角目标和历史读数都定位到事件发生的位置与时间。",
      brief: `P-101 与 P-102 同名，不能只靠名称定位。事件的历史读数与当前读数不同，必须保留事件时间。`,
      concept:
        "事件定位至少需要唯一对象编码与事件时间。只定位到相似名称或取最新读数，会失去事件发生时的上下文。",
      hint: "使用资产编码映射，采用事件发生时间并聚焦目标。可切换三条事件，检查结果是否随对象和时刻变化。",
      tables: [
        {
          caption: "待注入的教学事件",
          headers: [
            "事件",
            "资产",
            "显示名称",
            "事件时间",
            "当时读数",
            "当前读数",
          ],
          rows: [
            ["E-101", "P-101", "输送泵", "10:00:04", "78", "42"],
            ["E-102", "P-102", "输送泵", "10:00:12", "83", "65"],
            ["E-103", "T-201", "教学储罐", "10:00:20", "67", "51"],
          ],
        },
      ],
      fields: [
        {
          key: "eventId",
          label: "注入哪条教学事件",
          type: "select",
          options: [
            option("E-101", "E-101 · P-101"),
            option("E-102", "E-102 · P-102"),
            option("E-103", "E-103 · T-201"),
          ],
          value: "E-102",
        },
        {
          key: "mapping",
          label: "事件与设备的匹配方法",
          type: "select",
          options: [
            option("name", "用显示名称匹配第一个对象"),
            option("asset", "用唯一资产编码匹配"),
          ],
          value: "name",
        },
        {
          key: "timeMode",
          label: "查看哪个时刻的读数",
          type: "select",
          options: [
            option("latest", "最新时刻 10:05:00"),
            option("event", "事件发生时刻"),
          ],
          value: "latest",
        },
        {
          key: "cameraMode",
          label: "事件后的视角行为",
          type: "select",
          options: [
            option("list", "只更新事件列表"),
            option("focus", "聚焦事件对应对象"),
          ],
          value: "list",
        },
      ],
      run(values = {}) {
        const events = [
          { id: "E-101", asset: "P-101", time: "10:00:04", reading: "78" },
          { id: "E-102", asset: "P-102", time: "10:00:12", reading: "83" },
          { id: "E-103", asset: "T-201", time: "10:00:20", reading: "67" },
        ];
        const event = events.find((item) => item.id === text(values.eventId));
        if (
          !event ||
          !isChoice(values.mapping, ["name", "asset"]) ||
          !isChoice(values.timeMode, ["latest", "event"]) ||
          !isChoice(values.cameraMode, ["list", "focus"])
        )
          return invalid(["请选择事件、匹配方式、时间策略和视角行为。"]);
        const intended = devices.find((device) => device.asset === event.asset);
        const selected =
          values.mapping === "asset"
            ? intended
            : devices.find((device) => device.name === intended.name);
        const historicalReading =
          selected.asset === intended.asset ? event.reading : "41";
        const reading =
          values.timeMode === "event" ? historicalReading : selected.current;
        const time = values.timeMode === "event" ? event.time : "10:05:00";
        const camera =
          values.cameraMode === "focus" ? position(selected) : "保持旧视角";
        const errors = [];
        if (selected.asset !== event.asset)
          errors.push(
            `同名对象误匹配：事件属于 ${event.asset}，实际定位到 ${selected.asset}。`,
          );
        if (values.mapping !== "asset")
          errors.push(
            "本次对象即使恰好匹配，名称策略仍无法区分两台同名泵；请使用唯一编码。",
          );
        if (time !== event.time)
          errors.push(
            `使用了 ${time} 的最新值，丢失事件时刻 ${event.time} 的上下文。`,
          );
        if (values.cameraMode !== "focus")
          errors.push("仅更新列表，没有计算并应用事件对象的教学视角目标。");
        return {
          pass: errors.length === 0,
          summary: errors.length
            ? "事件定位尚未同时满足对象与时间一致性。"
            : `${event.id} 已定位到 ${event.asset} 的事件时刻。`,
          details: errors.length
            ? errors
            : [
                "此结果为教学图示目标与历史样本匹配，不代表真实三维相机或生产数据连接。",
              ],
          output: {
            caption: "事件注入后的定位计算",
            headers: ["项目", "实际结果", "预期结果"],
            rows: [
              ["事件", event.id, event.id],
              ["资产编码", selected.asset, intended.asset],
              ["模型", selected.model, intended.model],
              ["视角目标", camera, position(intended)],
              ["回放时间", time, event.time],
              ["测点", selected.point, intended.point],
              ["教学读数", reading, event.reading],
            ],
          },
        };
      },
    },
    {
      id: 21,
      stage: 2,
      title: "完成事件闭环",
      goal: "按确认、检查、处置、复核、关闭的顺序处理 E-201，确保记录时间递增、证据完整，并由不同人员复核。",
      brief: `E-201 初始为 NEW。每行格式为「相对秒数|动作|证据」，动作使用 ack、inspect、resolve、verify、close。这是一段教学工作流，不是真实故障处置流程。`,
      concept:
        "关闭状态应由完整流程推导，不能直接写入。被拒绝的动作不会推进状态；复核还需要恢复证据和不同人员身份。",
      hint: "依次填写 1|ack|确认事件、2|inspect|核对对象、3|resolve|记录教学处置、4|verify|复核恢复证据、5|close|归档记录；恢复结果选择稳定，复核人与操作人不同。",
      tables: [
        {
          caption: "教学闭环的状态转换",
          headers: ["当前状态", "动作", "下一状态"],
          rows: [
            ["NEW", "ack", "ACKNOWLEDGED"],
            ["ACKNOWLEDGED", "inspect", "INSPECTED"],
            ["INSPECTED", "resolve", "RESOLVED"],
            ["RESOLVED", "verify", "VERIFIED"],
            ["VERIFIED", "close", "CLOSED"],
          ],
        },
      ],
      fields: [
        {
          key: "actions",
          label: "按顺序输入动作日志",
          type: "textarea",
          placeholder: "1|ack|确认事件\n2|inspect|核对对象",
          value: "1|ack|确认事件\n2|close|直接关闭",
        },
        {
          key: "recovery",
          label: "检查得到的恢复证据",
          type: "select",
          options: [
            option("unstable", "仍存在异常波动"),
            option("stable", "样例已恢复稳定"),
          ],
          value: "unstable",
        },
        {
          key: "operator",
          label: "教学操作人标识（不填写真实姓名）",
          type: "text",
          placeholder: "student-a",
          value: "student-a",
        },
        {
          key: "reviewer",
          label: "教学复核人标识（与操作人不同）",
          type: "text",
          placeholder: "student-b",
          value: "student-a",
        },
      ],
      run(values = {}) {
        const operator = text(values.operator);
        const reviewer = text(values.reviewer);
        if (
          !/^[A-Za-z0-9_-]{1,32}$/.test(operator) ||
          !/^[A-Za-z0-9_-]{1,32}$/.test(reviewer)
        )
          return invalid([
            "人员标识使用 1–32 位英文字母、数字、下划线或连字符，例如 student-a；不需要真实个人资料。",
          ]);
        if (!isChoice(values.recovery, ["stable", "unstable"]))
          return invalid(["请选择检查得到的恢复证据。"]);
        const lines = text(values.actions)
          .split(/\r?\n/)
          .filter((line) => line.trim());
        if (!text(values.actions) || lines.length > 20)
          return invalid([
            "请输入 1–20 行动作；每行格式为「相对秒数|动作|证据」。",
          ]);
        const transitions = {
          NEW: { action: "ack", next: "ACKNOWLEDGED" },
          ACKNOWLEDGED: { action: "inspect", next: "INSPECTED" },
          INSPECTED: { action: "resolve", next: "RESOLVED" },
          RESOLVED: { action: "verify", next: "VERIFIED" },
          VERIFIED: { action: "close", next: "CLOSED" },
        };
        let state = "NEW";
        let lastLoggedTime = -1;
        const issues = [];
        const rows = lines.map((line, index) => {
          const cells = line.split("|").map((cell) => cell.trim());
          const [timeText, action, evidence = ""] = cells;
          const time = number(timeText);
          const before = state;
          const errors = [];
          if (cells.length !== 3) errors.push("格式需为秒数|动作|证据");
          if (!Number.isFinite(time) || time < 0 || time > 86400)
            errors.push("秒数应为 0–86400 的有限数值");
          else {
            if (time <= lastLoggedTime) errors.push("时间必须严格递增");
            // Even rejected actions are part of the audit timeline.
            lastLoggedTime = Math.max(lastLoggedTime, time);
          }
          if (
            !Object.values(transitions).some(
              (transition) => transition.action === action,
            )
          )
            errors.push("未知动作");
          else if (!transitions[state] || transitions[state].action !== action)
            errors.push(`${state} 不接受 ${action}`);
          if (evidence.length < 2 || evidence.length > 160)
            errors.push("每条证据需有 2–160 个字符");
          if (action === "verify" && values.recovery !== "stable")
            errors.push("恢复证据仍不稳定");
          if (
            action === "verify" &&
            reviewer.toLowerCase() === operator.toLowerCase()
          )
            errors.push("复核人与操作人必须不同");
          if (errors.length === 0) state = transitions[state].next;
          else issues.push(`第 ${index + 1} 行被拒绝：${errors.join("；")}。`);
          return [
            String(index + 1),
            timeText || "—",
            action || "—",
            action === "verify" ? reviewer : operator,
            before,
            state,
            errors.length ? `拒绝：${errors.join("；")}` : `通过：${evidence}`,
          ];
        });
        if (state !== "CLOSED")
          issues.push(`流程停在 ${state}，尚未形成已复核并关闭的闭环。`);
        return {
          pass: issues.length === 0 && state === "CLOSED",
          summary: issues.length
            ? "闭环记录尚不完整或存在被拒绝的动作。"
            : "E-201 已按顺序完成确认、检查、处置、独立复核与关闭。",
          details: issues.length
            ? issues
            : [
                "五项动作的时间递增，证据完整；复核与操作由不同教学标识完成。结果只保存在本次运行返回值中。",
              ],
          output: {
            caption: "E-201 的逐步状态与审计记录",
            headers: [
              "序号",
              "相对秒数",
              "动作",
              "人员标识",
              "原状态",
              "处理后状态",
              "结果与证据",
            ],
            rows,
          },
        };
      },
    },
  ];

  window.LAB_TASKS = window.LAB_TASKS || [];
  window.LAB_TASKS.push(...tasks);
})();
