(function () {
  "use strict";

  // All records and limits in these exercises are invented teaching fixtures.
  // They do not describe a production endpoint or safe process conditions.
  const number = (value) =>
    value === null ||
    value === undefined ||
    typeof value === "boolean" ||
    (typeof value === "string" && value.trim() === "")
      ? NaN
      : Number(value);
  const finite = (value) => Number.isFinite(value);
  const integer = (value) => Number.isInteger(value);
  const text = (value) => (typeof value === "string" ? value.trim() : "");
  const close = (a, b) => finite(a) && Math.abs(a - b) < 1e-7;
  const fmt = (value, digits = 2) =>
    finite(value) ? String(Number(value.toFixed(digits))) : "未配置";
  const option = (value, label) => ({ value, label });
  const select = (key, label, options) => ({
    key,
    label,
    type: "select",
    value: "",
    options: [option("", "请选择"), ...options],
  });
  const numeric = (key, label, min, max, step = 1) => ({
    key,
    label,
    type: "number",
    min,
    max,
    step,
    value: "",
  });
  const invalid = (message) => ({
    pass: false,
    summary: "配置尚不能运行",
    details: [message],
  });
  const result = (pass, success, failure, details, output) => ({
    pass,
    summary: pass ? success : failure,
    details,
    ...(output ? { output } : {}),
  });

  const tasks = [
    {
      id: 8,
      stage: 1,
      title: "配置数据连接",
      goal: "依据教学服务卡建立一份可接收消息的连接配置，并让心跳间隔留有余量。",
      brief:
        "这是浏览器内的离线握手模拟，不会访问任何服务器。请填写服务卡所示地址、端口和主题，使用3–24位字母、数字、短横线或下划线组成的客户端标识。",
      concept:
        "连接地址、订阅主题和客户端身份分别决定“连到哪里”“收到什么”“谁在连接”。本练习的心跳每10秒发送一次，要求超时设置为20–120秒。",
      hint: "地址不带 mqtt://；端口为1883；主题区分大小写。心跳超时30秒可以容纳3个心跳间隔。",
      tables: [
        {
          caption: "自拟教学服务卡",
          headers: ["配置项", "服务要求"],
          rows: [
            ["协议", "MQTT（仅离线模拟）"],
            ["主机", "broker.lab.invalid"],
            ["端口", "1883"],
            ["发布主题", "lab/line-a/telemetry"],
            ["消息频率", "每5秒1条；观察窗口(0,60]秒，共12条"],
            ["心跳频率", "每10秒1次；超时20–120秒"],
          ],
        },
      ],
      fields: [
        {
          key: "host",
          label: "主机地址",
          type: "text",
          placeholder: "例如 broker.lab.invalid",
          value: "",
        },
        numeric("port", "服务端口", 1, 65535),
        {
          key: "topic",
          label: "订阅主题",
          type: "text",
          placeholder: "填写服务卡中的主题",
          value: "",
        },
        {
          key: "clientId",
          label: "客户端标识",
          type: "text",
          placeholder: "例如 learner-01",
          value: "",
        },
        numeric("keepAlive", "心跳超时（秒）", 1, 120),
      ],
      run(values) {
        const v = values || {};
        const port = number(v.port),
          keepAlive = number(v.keepAlive);
        const checks = [
          [
            "主机匹配",
            text(v.host) === "broker.lab.invalid",
            text(v.host) || "未填写",
          ],
          ["端口匹配", integer(port) && port === 1883, fmt(port, 0)],
          [
            "主题匹配",
            text(v.topic) === "lab/line-a/telemetry",
            text(v.topic) || "未填写",
          ],
          [
            "客户端标识",
            /^[A-Za-z0-9_-]{3,24}$/.test(text(v.clientId)),
            text(v.clientId) || "未填写",
          ],
          [
            "心跳超时",
            finite(keepAlive) && keepAlive >= 20 && keepAlive <= 120,
            finite(keepAlive) ? fmt(keepAlive) + "秒" : "未填写",
          ],
        ];
        const pass = checks.every((check) => check[1]);
        const connectionReady = checks[0][1] && checks[1][1] && checks[3][1];
        const subscribed = connectionReady && checks[2][1];
        return result(
          pass,
          "连接配置通过：模拟接收12条消息",
          "配置仍有不匹配项，请查看握手结果",
          [
            connectionReady
              ? "主机、端口和客户端标识通过离线握手检查。"
              : "离线握手尚未通过，因此不会进入有效订阅。",
            subscribed
              ? "主题匹配：60秒窗口内可接收12条样例消息。"
              : "当前配置在60秒窗口内接收0条目标消息。",
            finite(keepAlive)
              ? "心跳超时覆盖" +
                fmt(keepAlive / 10) +
                "个心跳间隔；本题要求至少2个，且不超过12个。"
              : "请填写心跳超时后再计算心跳余量。",
          ],
          {
            caption: "离线握手检查",
            headers: ["检查项", "当前值", "结果"],
            rows: checks.map(([label, ok, current]) => [
              label,
              current,
              ok ? "通过" : "需修改",
            ]),
          },
        );
      },
    },
    {
      id: 9,
      stage: 1,
      title: "映射字段与换算单位",
      goal: "把3条原始记录统一转换为temperature_c（℃）与pressure_mpa（MPa）。",
      brief:
        "原始温度用0.1℃为一个计数单位，压力以kPa记录。选择对应字段，再填写乘数与温度偏移。运行后逐行比较转换结果。",
      concept:
        "规范字段名用于稳定接口；单位换算则改变数值含义。温度输出=原始字段×乘数+偏移；压力输出=原始字段×乘数。只改单位标签不会完成换算。",
      hint: "温度计数235应得到23.5℃；压力101.3kPa应得到0.1013MPa。",
      tables: [
        {
          caption: "自拟原始记录",
          headers: [
            "记录",
            "temp_raw（0.1℃）",
            "pressure_kpa（kPa）",
            "speed_rpm（r/min）",
          ],
          rows: [
            ["A", "235", "101.3", "1200"],
            ["B", "248", "105", "1220"],
            ["C", "261", "109.7", "1190"],
          ],
        },
      ],
      fields: [
        select("temperatureField", "温度来源字段", [
          option("temp_raw", "temp_raw"),
          option("pressure_kpa", "pressure_kpa"),
          option("speed_rpm", "speed_rpm"),
        ]),
        numeric("temperatureScale", "温度乘数", -100, 100, "any"),
        numeric("temperatureOffset", "温度偏移", -1000, 1000, "any"),
        select("pressureField", "压力来源字段", [
          option("pressure_kpa", "pressure_kpa"),
          option("temp_raw", "temp_raw"),
          option("speed_rpm", "speed_rpm"),
        ]),
        numeric("pressureScale", "压力乘数", -100, 100, "any"),
      ],
      run(values) {
        const v = values || {},
          ts = number(v.temperatureScale),
          offset = number(v.temperatureOffset),
          ps = number(v.pressureScale);
        const raw = [
          { id: "A", temp_raw: 235, pressure_kpa: 101.3, speed_rpm: 1200 },
          { id: "B", temp_raw: 248, pressure_kpa: 105, speed_rpm: 1220 },
          { id: "C", temp_raw: 261, pressure_kpa: 109.7, speed_rpm: 1190 },
        ];
        const keys = ["temp_raw", "pressure_kpa", "speed_rpm"];
        if (
          !keys.includes(v.temperatureField) ||
          !keys.includes(v.pressureField) ||
          ![ts, offset, ps].every(finite)
        )
          return invalid(
            "请选择两个来源字段，并填写温度乘数、偏移和压力乘数（偏移为0时也请填写0）。",
          );
        const converted = raw.map((row) => ({
          id: row.id,
          t: row[v.temperatureField] * ts + offset,
          p: row[v.pressureField] * ps,
          expectedT: row.temp_raw * 0.1,
          expectedP: row.pressure_kpa * 0.001,
        }));
        const pass = converted.every(
          (row) => close(row.t, row.expectedT) && close(row.p, row.expectedP),
        );
        return result(
          pass,
          "3条记录的字段与单位转换均正确",
          "转换结果与目标单位不一致",
          [
            "温度计算：" +
              v.temperatureField +
              " × " +
              fmt(ts, 6) +
              " + " +
              fmt(offset, 6) +
              "。",
            "压力计算：" + v.pressureField + " × " + fmt(ps, 6) + "。",
            "温度最大绝对误差：" +
              fmt(
                Math.max(
                  ...converted.map((row) => Math.abs(row.t - row.expectedT)),
                ),
                6,
              ) +
              "℃；压力最大绝对误差：" +
              fmt(
                Math.max(
                  ...converted.map((row) => Math.abs(row.p - row.expectedP)),
                ),
                6,
              ) +
              "MPa。",
          ],
          {
            caption: "逐条转换结果",
            headers: [
              "记录",
              "temperature_c",
              "目标（℃）",
              "pressure_mpa",
              "目标（MPa）",
            ],
            rows: converted.map((row) => [
              row.id,
              fmt(row.t, 6),
              fmt(row.expectedT, 1),
              fmt(row.p, 6),
              fmt(row.expectedP, 4),
            ]),
          },
        );
      },
    },
    {
      id: 10,
      stage: 1,
      title: "权衡采样频率与延迟",
      goal: "在0–60秒（含端点）内最多保存16条记录，并在每次变化后4秒内采到新状态。",
      brief:
        "选择整数采样周期与首次采样时刻。模拟器会生成真正的采样时刻，判断每次变化是否被捕获，并与1秒、10秒采样作比较。",
      concept:
        "更密的采样增加存储量，通常减少检测延迟；首次采样的相位也会影响结果。检测延迟是变化发生到首次采到该状态的时间，不能只用周期代替。",
      hint: "先试周期10秒，观察漏掉或较晚发现的变化；再试4秒、首次采样0秒。首次采样时刻需小于周期。",
      tables: [
        {
          caption: "自拟阶跃信号：每次变化后保持到下一次变化",
          headers: ["变化时刻（秒）", "新读数"],
          rows: [
            ["0（初始状态）", "20"],
            ["5", "23"],
            ["17", "19"],
            ["34", "25"],
            ["49", "21"],
          ],
        },
      ],
      fields: [
        numeric("period", "采样周期（整数秒）", 1, 20),
        numeric("phase", "首次采样时刻（整数秒）", 0, 19),
      ],
      run(values) {
        const v = values || {},
          period = number(v.period),
          phase = number(v.phase);
        if (
          !integer(period) ||
          period < 1 ||
          period > 20 ||
          !integer(phase) ||
          phase < 0 ||
          phase >= period
        )
          return invalid(
            "周期需为1–20的整数；首次采样时刻需为0到“周期−1”的整数。",
          );
        const changes = [
          { t: 5, value: 23 },
          { t: 17, value: 19 },
          { t: 34, value: 25 },
          { t: 49, value: 21 },
        ];
        function simulate(p, first) {
          const samples = [];
          for (let t = first; t <= 60; t += p) samples.push(t);
          const detections = changes.map((change, index) => {
            const next = changes[index + 1] ? changes[index + 1].t : 61;
            const detectedAt = samples.find((t) => t >= change.t && t < next);
            return {
              ...change,
              detectedAt,
              delay: detectedAt === undefined ? null : detectedAt - change.t,
            };
          });
          const delays = detections
            .filter((change) => change.delay !== null)
            .map((change) => change.delay);
          return {
            samples,
            detections,
            missed: detections.length - delays.length,
            maxDelay: delays.length ? Math.max(...delays) : null,
          };
        }
        const chosen = simulate(period, phase);
        const pass =
          chosen.samples.length <= 16 &&
          chosen.missed === 0 &&
          chosen.maxDelay <= 4;
        const comparisons = [
          ["1秒参考方案", 1, 0],
          ["你的方案", period, phase],
          ["10秒参考方案", 10, 0],
        ].map(([label, p, first]) => {
          const simulation = simulate(p, first);
          return [
            label,
            p + "秒",
            first + "秒",
            String(simulation.samples.length),
            simulation.maxDelay === null
              ? "无有效检测"
              : simulation.maxDelay + "秒",
            String(simulation.missed),
          ];
        });
        return result(
          pass,
          "采样方案同时满足记录量与检测延迟要求",
          "当前方案未同时满足两项要求",
          [
            "保存" +
              chosen.samples.length +
              "条（上限16条），捕获" +
              (4 - chosen.missed) +
              "/4次变化，最大已检测延迟" +
              (chosen.maxDelay === null ? "无法计算" : chosen.maxDelay + "秒") +
              "。",
            "采样时刻：" + chosen.samples.join("、") + "秒。",
            ...chosen.detections.map(
              (change) =>
                change.t +
                "秒变为" +
                change.value +
                "：" +
                (change.detectedAt === undefined
                  ? "该状态未被采到"
                  : change.detectedAt + "秒采到，延迟" + change.delay + "秒"),
            ),
          ],
          {
            caption: "同一信号下的采样方案比较",
            headers: [
              "方案",
              "周期",
              "首次采样",
              "记录数",
              "最大检测延迟",
              "漏检变化数",
            ],
            rows: comparisons,
          },
        );
      },
    },
    {
      id: 11,
      stage: 1,
      title: "校准时间并标记质量",
      goal: "修正设备快3秒的时钟，保留事件顺序信息，并把序号3识别为迟到且乱序的数据。",
      brief:
        "下表按实际接收顺序排列。请选择事件时间来源，填写校正偏移和容忍延迟；将质量差的数据标记保留，而不是悄悄改成接收时间。",
      concept:
        "事件时间记录何时发生，接收时间记录何时到达。校准时间=所选时间+偏移；接收延迟=接收时间−校准时间。超过容忍延迟为迟到；早于此前最大事件时间为乱序。",
      hint: "设备时钟快3000毫秒，需要加负偏移。容忍延迟1000毫秒可区分正常200毫秒与异常1500毫秒。",
      tables: [
        {
          caption: "自拟接收记录（毫秒，相对同一基准时刻）",
          headers: ["接收顺序", "序号", "设备时间", "接收时间"],
          rows: [
            ["1", "1", "4000", "1200"],
            ["2", "2", "5000", "2200"],
            ["3", "4", "6500", "3700"],
            ["4", "3", "6000", "4500"],
            ["5", "5", "8000", "5200"],
          ],
        },
      ],
      fields: [
        select("timeSource", "事件时间来源", [
          option("device", "设备时间"),
          option("received", "接收时间"),
        ]),
        numeric("offsetMs", "校正偏移（毫秒）", -10000, 10000),
        numeric("toleranceMs", "容忍延迟（毫秒）", 0, 10000),
        select("latePolicy", "迟到数据处理", [
          option("mark", "保留并标记质量"),
          option("drop", "丢弃迟到数据"),
        ]),
      ],
      run(values) {
        const v = values || {},
          offset = number(v.offsetMs),
          tolerance = number(v.toleranceMs);
        if (
          !["device", "received"].includes(v.timeSource) ||
          !["mark", "drop"].includes(v.latePolicy) ||
          !finite(offset) ||
          Math.abs(offset) > 10000 ||
          !finite(tolerance) ||
          tolerance < 0 ||
          tolerance > 10000
        )
          return invalid(
            "请选择时间来源和迟到处理方式，填写±10000毫秒内的偏移及0–10000毫秒的容忍延迟。",
          );
        const records = [
          { seq: 1, device: 4000, received: 1200 },
          { seq: 2, device: 5000, received: 2200 },
          { seq: 4, device: 6500, received: 3700 },
          { seq: 3, device: 6000, received: 4500 },
          { seq: 5, device: 8000, received: 5200 },
        ];
        let latest = -Infinity;
        const processed = records.map((record) => {
          const eventTime = record[v.timeSource] + offset,
            delay = record.received - eventTime;
          const outOfOrder = eventTime < latest,
            late = delay > tolerance;
          latest = Math.max(latest, eventTime);
          return {
            ...record,
            eventTime,
            delay,
            outOfOrder,
            late,
            keep: !(late && v.latePolicy === "drop"),
          };
        });
        const expected = [1000, 2000, 3500, 3000, 5000];
        const correctTimes = processed.every((record, index) =>
          close(record.eventTime, expected[index]),
        );
        const lateRecords = processed.filter((record) => record.late),
          disorder = processed.filter((record) => record.outOfOrder);
        const pass =
          correctTimes &&
          v.timeSource === "device" &&
          v.latePolicy === "mark" &&
          lateRecords.length === 1 &&
          lateRecords[0].seq === 3 &&
          disorder.length === 1 &&
          disorder[0].seq === 3;
        return result(
          pass,
          "时钟已校准，序号3被保留并标记为迟到、乱序",
          "时间校准或质量处理仍需调整",
          [
            "保留" +
              processed.filter((record) => record.keep).length +
              "/5条；迟到" +
              lateRecords.length +
              "条；乱序" +
              disorder.length +
              "条。",
            correctTimes
              ? "校准后的事件时间与样例真实发生时刻一致。"
              : "当前事件时间偏离样例发生时刻；使用接收时间会隐藏传输延迟。",
            processed.some((record) => record.delay < 0)
              ? "存在负接收延迟：校准后的事件时间落在接收之后，请检查时钟偏移。"
              : "所有记录的事件时间均不晚于接收时间。",
          ],
          {
            caption: "按原始接收顺序展示质量标记",
            headers: [
              "序号",
              "校准时间（ms）",
              "接收时间（ms）",
              "延迟（ms）",
              "质量",
              "处理",
            ],
            rows: processed.map((record) => [
              String(record.seq),
              fmt(record.eventTime),
              String(record.received),
              fmt(record.delay),
              [
                record.delay < 0 ? "未来时间" : "",
                record.late ? "迟到" : "",
                record.outOfOrder ? "乱序" : "",
              ]
                .filter(Boolean)
                .join(" / ") || "正常",
              record.keep ? "保留" : "丢弃",
            ]),
          },
        );
      },
    },
    {
      id: 12,
      stage: 1,
      title: "用明确规则清洗数据",
      goal: "按本题有效区间0–40，剔除空值、非数字和越界值，保留原本有效的4条记录。",
      brief:
        "对同一固定数组选择不同规则，观察保留数量、均值和每条记录的去向。这里的0–40只是清洗算法练习区间，不是生产控制范围。",
      concept:
        "删除、前值填充和边界截断会产生不同的数据集。填充或截断会制造替代值，需要与原始观测明确区分；本题要求只留下有效原始观测。",
      hint: "空值和bad都属于缺失/无效输入；87.5、−12属于越界值。选择“剔除”后应剩21、21.8、22.1、23。",
      tables: [
        {
          caption: "自拟原始数组（顺序固定）",
          headers: ["位置", "原始值"],
          rows: [
            ["1", "21.0"],
            ["2", "（空值）"],
            ["3", "21.8"],
            ["4", "87.5"],
            ["5", "22.1"],
            ["6", "bad"],
            ["7", "-12"],
            ["8", "23.0"],
          ],
        },
      ],
      fields: [
        numeric("lower", "有效区间下限", -100, 100, "any"),
        numeric("upper", "有效区间上限", -100, 100, "any"),
        select("missingPolicy", "空值/非数字处理", [
          option("drop", "剔除"),
          option("previous", "使用前一个保留值"),
          option("zero", "替换为0"),
        ]),
        select("outlierPolicy", "越界值处理", [
          option("drop", "剔除"),
          option("clamp", "截断到最近边界"),
          option("keep", "保留原值"),
        ]),
      ],
      run(values) {
        const v = values || {},
          lower = number(v.lower),
          upper = number(v.upper);
        if (
          !finite(lower) ||
          !finite(upper) ||
          lower >= upper ||
          lower < -100 ||
          upper > 100 ||
          !["drop", "previous", "zero"].includes(v.missingPolicy) ||
          !["drop", "clamp", "keep"].includes(v.outlierPolicy)
        )
          return invalid(
            "请输入−100到100内且下限小于上限的区间，并选择两类处理规则。",
          );
        const raw = ["21.0", "", "21.8", "87.5", "22.1", "bad", "-12", "23.0"];
        const kept = [];
        let previous;
        const rows = raw.map((original, index) => {
          let value = original.trim() === "" ? NaN : Number(original),
            action = "保留原值";
          if (!finite(value)) {
            if (v.missingPolicy === "drop")
              return [
                String(index + 1),
                original || "（空值）",
                "剔除：空值/非数字",
                "—",
              ];
            if (v.missingPolicy === "previous") {
              if (previous === undefined)
                return [
                  String(index + 1),
                  original || "（空值）",
                  "无前值可填，剔除",
                  "—",
                ];
              value = previous;
              action = "前值填充";
            } else {
              value = 0;
              action = "填0";
            }
          }
          if (value < lower || value > upper) {
            if (v.outlierPolicy === "drop")
              return [
                String(index + 1),
                original || "（空值）",
                action === "保留原值" ? "剔除：越界" : action + "后越界，剔除",
                "—",
              ];
            if (v.outlierPolicy === "clamp") {
              value = Math.max(lower, Math.min(upper, value));
              action = action === "保留原值" ? "边界截断" : action + "并截断";
            } else action += "（仍越界）";
          }
          kept.push({ index: index + 1, value });
          previous = value;
          return [
            String(index + 1),
            original || "（空值）",
            action,
            fmt(value, 4),
          ];
        });
        const expectedIndexes = [1, 3, 5, 8];
        const pass =
          close(lower, 0) &&
          close(upper, 40) &&
          v.missingPolicy === "drop" &&
          v.outlierPolicy === "drop" &&
          kept.length === 4 &&
          kept.every((row, index) => row.index === expectedIndexes[index]);
        const average = kept.length
          ? kept.reduce((sum, row) => sum + row.value, 0) / kept.length
          : NaN;
        return result(
          pass,
          "清洗完成：保留4条有效原始记录",
          "当前规则与“仅保留有效原始观测”的目标不一致",
          [
            "输入8条，保留" +
              kept.length +
              "条，剔除" +
              (8 - kept.length) +
              "条。",
            "输出数组：[" +
              kept.map((row) => fmt(row.value, 4)).join(", ") +
              "]；均值：" +
              (kept.length ? fmt(average, 4) : "无记录，不能计算") +
              "。",
            "本题目标均值为21.975；仅均值相同不能证明清洗正确，还需核对保留的位置与处理方式。",
          ],
          {
            caption: "逐条清洗记录",
            headers: ["原始位置", "原始值", "处理过程", "输出值"],
            rows,
          },
        );
      },
    },
    {
      id: 13,
      stage: 1,
      title: "生成历史回放计划",
      goal: "回放历史时间2–11秒（包含两端）的4条记录，按原时间顺序以2倍速播放。",
      brief:
        "回放不是等间隔轮播。请设置窗口、端点规则、顺序与速度，再检查每条记录应在播放器开始后的第几秒出现。",
      concept:
        "正向回放中，播放时刻=(历史时间−窗口起点)÷速度。窗口选择决定哪些记录入选，倍率改变等待时间，但不改变历史数据及其顺序。",
      hint: "正确窗口包含2、5、7、11秒；2倍速下分别在0、1.5、2.5、4.5秒出现。",
      tables: [
        {
          caption: "自拟历史记录",
          headers: ["历史时间（秒）", "读数"],
          rows: [
            ["0", "21"],
            ["2", "22"],
            ["5", "24"],
            ["7", "23"],
            ["11", "25"],
            ["14", "26"],
          ],
        },
      ],
      fields: [
        numeric("start", "窗口起点（秒）", 0, 14, "any"),
        numeric("end", "窗口终点（秒）", 0, 14, "any"),
        numeric("speed", "回放速度（倍）", 0.25, 8, 0.25),
        select("boundary", "窗口端点规则", [
          option("closed", "包含起点和终点"),
          option("left", "包含起点，不含终点"),
          option("open", "不含两端"),
        ]),
        select("order", "回放方向", [
          option("forward", "按历史时间正向"),
          option("reverse", "按历史时间倒序"),
        ]),
      ],
      run(values) {
        const v = values || {},
          start = number(v.start),
          end = number(v.end),
          speed = number(v.speed);
        if (
          ![start, end, speed].every(finite) ||
          start < 0 ||
          end > 14 ||
          start >= end ||
          speed < 0.25 ||
          speed > 8 ||
          !["closed", "left", "open"].includes(v.boundary) ||
          !["forward", "reverse"].includes(v.order)
        )
          return invalid(
            "窗口需满足0≤起点<终点≤14，速度需为0.25–8倍，并选择端点规则与方向。",
          );
        const raw = [
          { t: 0, value: 21 },
          { t: 2, value: 22 },
          { t: 5, value: 24 },
          { t: 7, value: 23 },
          { t: 11, value: 25 },
          { t: 14, value: 26 },
        ];
        const selected = raw.filter(
          (row) =>
            (v.boundary === "open" ? row.t > start : row.t >= start) &&
            (v.boundary === "closed" ? row.t <= end : row.t < end),
        );
        if (v.order === "reverse") selected.reverse();
        const schedule = selected.map((row) => ({
          ...row,
          at: (v.order === "forward" ? row.t - start : end - row.t) / speed,
        }));
        const expected = [2, 5, 7, 11];
        const pass =
          close(start, 2) &&
          close(end, 11) &&
          close(speed, 2) &&
          v.boundary === "closed" &&
          v.order === "forward" &&
          schedule.length === 4 &&
          schedule.every((row, index) => row.t === expected[index]);
        return result(
          pass,
          "回放计划正确：4条记录在4.5秒内依次出现",
          "回放窗口、速度或方向与任务目标不一致",
          [
            "选中" +
              schedule.length +
              "/6条记录；窗口播放时长" +
              fmt((end - start) / speed, 3) +
              "秒。",
            schedule.length
              ? "第一条在第" +
                fmt(schedule[0].at, 3) +
                "秒出现，最后一条在第" +
                fmt(schedule[schedule.length - 1].at, 3) +
                "秒出现。"
              : "当前窗口没有记录；不能生成有效回放事件。",
            "历史时间与读数保持不变；下面只计算播放计划，不启动真实计时器。",
          ],
          {
            caption: "计算出的回放事件",
            headers: [
              "播放次序",
              "历史时间（秒）",
              "读数",
              "开始后出现时刻（秒）",
            ],
            rows: schedule.map((row, index) => [
              String(index + 1),
              String(row.t),
              String(row.value),
              fmt(row.at, 3),
            ]),
          },
        );
      },
    },
    {
      id: 14,
      stage: 1,
      title: "中断恢复：去重与补传",
      goal: "服务端已连续确认到序号3。把缓存中的4–8各补传一次，并按序号升序分批发送。",
      brief:
        "缓存包含已确认记录、同一序号的重试副本和乱序到达记录。输入确认位置，选择去重依据、发送顺序与批大小，检查重建出的发送队列。",
      concept:
        "确认序号标记可靠恢复位置；序号标识同一条事件。不同事件可能恰好有相同读数，所以不能按数值去重。分批只改变发送节奏，不应造成漏项或重复。",
      hint: "确认序号填3；按序号去重、升序发送。批大小可取1–5，使用3时应生成[4,5,6]与[7,8]两批。",
      tables: [
        {
          caption: "自拟本地缓存（按到达顺序）；服务端确认位置=3",
          headers: ["缓存位置", "序号", "读数", "说明"],
          rows: [
            ["1", "2", "20", "已确认"],
            ["2", "3", "20.5", "已确认"],
            ["3", "4", "21", "待补传"],
            ["4", "5", "21", "待补传"],
            ["5", "5", "21", "重试副本"],
            ["6", "7", "22", "先到达"],
            ["7", "6", "21.5", "后到达"],
            ["8", "8", "22", "待补传"],
          ],
        },
      ],
      fields: [
        numeric("ack", "服务端已确认序号", 0, 8),
        select("dedup", "去重依据", [
          option("sequence", "按序号去重"),
          option("value", "按读数去重"),
          option("none", "不去重"),
        ]),
        select("order", "发送顺序", [
          option("sequence", "序号升序"),
          option("arrival", "沿用缓存到达顺序"),
        ]),
        numeric("batchSize", "每批最大记录数", 1, 5),
      ],
      run(values) {
        const v = values || {},
          ack = number(v.ack),
          batchSize = number(v.batchSize);
        if (
          !integer(ack) ||
          ack < 0 ||
          ack > 8 ||
          !integer(batchSize) ||
          batchSize < 1 ||
          batchSize > 5 ||
          !["sequence", "value", "none"].includes(v.dedup) ||
          !["sequence", "arrival"].includes(v.order)
        )
          return invalid(
            "确认序号需为0–8的整数，批大小需为1–5的整数，并选择去重依据和发送顺序。",
          );
        const cache = [
          { seq: 2, value: 20 },
          { seq: 3, value: 20.5 },
          { seq: 4, value: 21 },
          { seq: 5, value: 21 },
          { seq: 5, value: 21 },
          { seq: 7, value: 22 },
          { seq: 6, value: 21.5 },
          { seq: 8, value: 22 },
        ];
        const pending = cache.filter((row) => row.seq > ack),
          seen = new Set();
        const queue = pending.filter((row) => {
          if (v.dedup === "none") return true;
          const key = v.dedup === "sequence" ? row.seq : row.value;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        if (v.order === "sequence") queue.sort((a, b) => a.seq - b.seq);
        const sequence = queue.map((row) => row.seq),
          expected = [4, 5, 6, 7, 8];
        const missing = expected.filter((seq) => !sequence.includes(seq));
        const duplicates = sequence.filter(
          (seq, index) => sequence.indexOf(seq) !== index,
        );
        const alreadyConfirmed = sequence.filter((seq) => seq <= 3);
        const pass =
          ack === 3 &&
          queue.length === 5 &&
          sequence.every((seq, index) => seq === expected[index]);
        const delivered = new Set([1, 2, 3]);
        const rows = queue.map((row, index) => {
          const duplicate = delivered.has(row.seq);
          delivered.add(row.seq);
          return [
            String(Math.floor(index / batchSize) + 1),
            String(row.seq),
            fmt(row.value),
            duplicate ? "服务端已有：重复发送" : "补充新记录",
          ];
        });
        return result(
          pass,
          "恢复队列正确：序号4–8各补传一次",
          "补传队列仍有缺失、重复或顺序问题",
          [
            "按所填确认位置筛出" +
              pending.length +
              "条，去重后" +
              queue.length +
              "条，分成" +
              Math.ceil(queue.length / batchSize) +
              "批。",
            "发送序号：[" + sequence.join(", ") + "]；应为[4, 5, 6, 7, 8]。",
            "缺失序号：" +
              (missing.join("、") || "无") +
              "；队列内重复：" +
              ([...new Set(duplicates)].join("、") || "无") +
              "；重复发送已确认序号：" +
              (alreadyConfirmed.join("、") || "无") +
              "。",
            sequence.every(
              (seq, index) => index === 0 || seq > sequence[index - 1],
            )
              ? "发送队列按序号严格递增。"
              : "发送队列未按序号严格递增，请检查排序与重复项。",
            v.dedup === "value"
              ? "按读数去重会错误合并“序号不同但读数相同”的记录，例如4与5、7与8。"
              : "恢复位置必须取自服务端确认结果，不能用本地最后看到的序号替代。",
          ],
          {
            caption: "模拟补传队列与服务端反馈",
            headers: ["批次", "序号", "读数", "服务端反馈"],
            rows,
          },
        );
      },
    },
  ];

  window.LAB_TASKS = window.LAB_TASKS || [];
  window.LAB_TASKS.push(...tasks);
})();
