/* Tasks 1–7: self-contained, synthetic teaching fixtures; no production connection. */
(() => {
  "use strict";
  window.LAB_TASKS = window.LAB_TASKS || [];
  const value = (values, key) => String(values?.[key] ?? "").trim();
  const number = (values, key) => {
    const raw = value(values, key);
    return raw !== "" && /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(raw)
      ? Number(raw)
      : NaN;
  };
  const picked = (values, key) =>
    Array.isArray(values?.[key]) ? [...new Set(values[key].map(String))] : [];
  const result = (errors, success, details, output) => ({
    pass: errors.length === 0,
    summary: errors.length ? `还有 ${errors.length} 项配置需要修正。` : success,
    details: errors.length ? errors : details,
    ...(output ? { output } : {}),
  });
  const table = (caption, headers, rows) => ({
    caption,
    headers,
    rows: rows.map((row) => row.map(String)),
  });
  const list = (raw) => raw.split(/[\s,，;；→>]+/).filter(Boolean);
  function parseRows(raw, columns, errors) {
    if (!raw) {
      errors.push("请填写配置，每行一条记录。");
      return [];
    }
    if (raw.length > 4000) {
      errors.push("配置过长，请控制在 4000 个字符内。");
      return [];
    }
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length > 24) {
      errors.push("本题最多检查 24 行配置。");
      return [];
    }
    return lines
      .map((line, index) => {
        const cells = line.split(/[,，\t|]/).map((cell) => cell.trim());
        if (cells.length !== columns || cells.some((cell) => cell === "")) {
          errors.push(
            `第 ${index + 1} 行需要 ${columns} 个非空字段，以逗号分隔。`,
          );
          return null;
        }
        return cells;
      })
      .filter(Boolean);
  }
  const finite = (n) => Number.isFinite(n);
  const round = (n) => Number(n.toFixed(4)).toString();
  const code = (s) => s.trim().toUpperCase();

  window.LAB_TASKS.push(
    {
      id: 1,
      stage: 0,
      title: "分解产业需求",
      goal: "将对象、数据与 AI 需求转成可检验的验收条件。",
      brief: `教学小组需要定位设备、查看历史测点，并获得带引用的技术回答。三条同步样本延迟为 1.2、1.8、2.4 秒；用户允许的最长延迟为 3 秒。选择需求并给出能被本组样本满足的验收阈值。`,
      concept:
        "验收条件需要同时覆盖业务目标、可测量指标与访问边界。阈值过松会漏掉问题，过严则当前样本无法通过。",
      hint: "设备定位、测点历史和有出处的问答缺一不可；延迟阈值应覆盖最慢样本，同时不超过 3 秒。教学操作不写入生产设备。",
      tables: [
        table(
          "教学验收样本",
          ["样本", "同步延迟"],
          [
            ["A", "1.2 秒"],
            ["B", "1.8 秒"],
            ["C", "2.4 秒"],
          ],
        ),
      ],
      fields: [
        {
          key: "requirements",
          label: "需求清单（可多选）",
          type: "checks",
          options: [
            { value: "object", label: "设备条目能定位对应三维对象" },
            { value: "data", label: "按设备与时间查询测点历史" },
            { value: "ai", label: "技术回答显示可核查的文档引用" },
            { value: "audit", label: "保留教学配置修改记录（可选扩展）" },
            { value: "production", label: "允许学生直接修改真实生产设备" },
          ],
        },
        {
          key: "latency",
          label: "同步延迟验收上限（秒）",
          type: "number",
          min: 0.1,
          max: 10,
          step: 0.1,
          placeholder: "填写数值，例如 2.8",
        },
      ],
      run(values) {
        const errors = [],
          selected = picked(values, "requirements"),
          limit = number(values, "latency");
        const labels = {
          object: "设备对象定位",
          data: "测点历史查询",
          ai: "有出处的技术问答",
        };
        Object.entries(labels).forEach(([key, label]) => {
          if (!selected.includes(key)) errors.push(`需求缺项：${label}。`);
        });
        if (selected.includes("production"))
          errors.push(
            "教学需求不能包含真实生产写入；配置修改应限定在教学实例内。",
          );
        if (
          selected.some(
            (key) =>
              !["object", "data", "ai", "audit", "production"].includes(key),
          )
        )
          errors.push("需求清单中存在未定义选项。");
        if (!finite(limit) || limit <= 0)
          errors.push("请输入大于 0 的有效延迟阈值。");
        else {
          if (limit > 3)
            errors.push(`阈值 ${limit} 秒超过用户允许的 3 秒，验收条件过松。`);
          if (limit < 2.4)
            errors.push(
              `样本 C 的 2.4 秒超过阈值 ${limit} 秒，当前链路无法通过此条件。`,
            );
        }
        return result(
          errors,
          "需求覆盖完整，当前三条样本满足验收条件。",
          [
            "已覆盖对象、数据与 AI 需求。",
            `样本最大延迟 2.4 秒 ≤ 验收上限 ${limit} 秒 ≤ 用户上限 3 秒。`,
            selected.includes("audit")
              ? "已加入可选审计需求，便于追溯。"
              : "未加入可选审计需求，不影响本题必需范围。",
          ],
          table(
            "延迟验收结果",
            ["样本", "延迟 / 秒", "判断"],
            [1.2, 1.8, 2.4].map((n, i) => [
              String.fromCharCode(65 + i),
              n,
              finite(limit) && n <= limit ? "满足输入阈值" : "未满足输入阈值",
            ]),
          ),
        );
      },
    },
    {
      id: 2,
      stage: 0,
      title: "设计系统架构",
      goal: "建立有依赖顺序且与生产写入隔离的数据路径。",
      brief: `将读取、质量校验、对象映射和界面呈现排成一条处理链。可选缓存必须位于读取之后、对象映射之前。随后选择学生配置的写入目标。`,
      concept:
        "数据应先完成读取和质量检查，再绑定对象并呈现。缓存可以缓冲输入，但不能替代质量检查；教学修改必须与生产设备分离。",
      hint: "使用表中的组件编号，不写标题。必需链为 SOURCE → QUALITY → TWIN → VIEW；CACHE 可插入 SOURCE 与 TWIN 之间。",
      tables: [
        table(
          "组件目录",
          ["编号", "作用", "是否必需"],
          [
            ["SOURCE", "读取授权样本", "是"],
            ["QUALITY", "检查类型、时间与质量", "是"],
            ["TWIN", "关联资产、测点与模型", "是"],
            ["VIEW", "呈现设备与状态", "是"],
            ["CACHE", "缓存读取结果", "可选"],
          ],
        ),
      ],
      fields: [
        {
          key: "sequence",
          label: "组件顺序（用箭头、逗号或换行分隔）",
          type: "textarea",
          placeholder: "例如 SOURCE → …… → VIEW",
        },
        {
          key: "writeTarget",
          label: "学生配置写入哪里？",
          type: "select",
          options: [
            { value: "", label: "请选择" },
            { value: "sandbox", label: "隔离的教学实例" },
            { value: "production", label: "真实生产设备" },
          ],
        },
      ],
      run(values) {
        const errors = [],
          parts = list(value(values, "sequence")).map(code),
          required = ["SOURCE", "QUALITY", "TWIN", "VIEW"],
          allowed = [...required, "CACHE"];
        if (parts.length > 5)
          errors.push("组件数量超过本题范围；每个组件最多使用一次。");
        parts.forEach((part, i) => {
          if (!allowed.includes(part))
            errors.push(`第 ${i + 1} 个组件 ${part} 不在目录中。`);
        });
        required.forEach((part) => {
          if (!parts.includes(part)) errors.push(`缺少必需组件 ${part}。`);
        });
        if (new Set(parts).size !== parts.length)
          errors.push("链路存在重复组件，请每个组件只使用一次。");
        if (required.every((part) => parts.includes(part))) {
          for (let i = 1; i < required.length; i++)
            if (parts.indexOf(required[i - 1]) > parts.indexOf(required[i]))
              errors.push(`${required[i - 1]} 必须先于 ${required[i]}。`);
          if (
            parts.includes("CACHE") &&
            !(
              parts.indexOf("CACHE") > parts.indexOf("SOURCE") &&
              parts.indexOf("CACHE") < parts.indexOf("TWIN")
            )
          )
            errors.push("CACHE 必须位于 SOURCE 之后、TWIN 之前。");
        }
        if (value(values, "writeTarget") !== "sandbox")
          errors.push("请选择隔离的教学实例作为写入目标。");
        return result(
          errors,
          "数据路径与教学写入边界检查通过。",
          [
            `有效链路：${parts.join(" → ")}。`,
            parts.includes("CACHE")
              ? "缓存位于数据入口与对象映射之间。"
              : "本方案直接传递样本，不使用可选缓存。",
            "学生配置只写入隔离教学实例。",
          ],
          table(
            "配置后的处理链",
            ["顺序", "组件", "后续组件"],
            parts
              .slice(0, 6)
              .map((part, i) => [i + 1, part, parts[i + 1] || "输出界面"]),
          ),
        );
      },
    },
    {
      id: 3,
      stage: 0,
      title: "构建资产层级",
      goal: "组织厂区、区域、设备与测点，检测孤立对象和循环关系。",
      brief: `至少建立 1 个厂区、1 个区域、2 台设备和 2 个测点。格式为“对象ID,类型,父对象ID”，类型使用 plant、zone、device、point；厂区父对象填 -。可以自行命名并增加对象，最多 24 行。`,
      concept:
        "合法层级为厂区 → 区域 → 设备 → 测点。每个非根对象都需要存在的父对象，且父子引用不能形成环路。",
      hint: "先检查父对象 ID 是否存在，再检查类型关系。示例中的 IA01 引用了不存在的 UNKNOWN，应关联到一台设备。",
      fields: [
        {
          key: "hierarchy",
          label: "资产层级配置",
          type: "textarea",
          value:
            "DEMO,plant,-\nZONE,zone,DEMO\nR101,device,ZONE\nP101,device,ZONE\nTT01,point,R101\nIA01,point,UNKNOWN",
        },
      ],
      run(values) {
        const errors = [],
          rows = parseRows(value(values, "hierarchy"), 3, errors),
          nodes = new Map(),
          counts = { plant: 0, zone: 0, device: 0, point: 0 };
        rows.forEach(([rawId, rawType, rawParent], i) => {
          const id = code(rawId),
            type = rawType.toLowerCase(),
            parent = code(rawParent);
          if (!/^[A-Z][A-Z0-9_-]{1,23}$/.test(id))
            errors.push(
              `第 ${i + 1} 行 ID 需以字母开头，使用 2—24 位字母、数字、下划线或连字符。`,
            );
          if (!Object.prototype.hasOwnProperty.call(counts, type))
            errors.push(`${id} 的类型 ${type} 未定义。`);
          else counts[type]++;
          if (nodes.has(id))
            errors.push(`对象 ID ${id} 重复（不区分大小写）。`);
          nodes.set(id, { id, type, parent });
        });
        if (counts.plant !== 1)
          errors.push(`需要且只能有 1 个厂区，当前为 ${counts.plant} 个。`);
        [
          ["zone", 1, "区域"],
          ["device", 2, "设备"],
          ["point", 2, "测点"],
        ].forEach(([type, min, label]) => {
          if (counts[type] < min)
            errors.push(
              `${label}至少需要 ${min} 个，当前为 ${counts[type]} 个。`,
            );
        });
        const parentType = { zone: "plant", device: "zone", point: "device" };
        nodes.forEach((node) => {
          if (node.type === "plant") {
            if (node.parent !== "-")
              errors.push(`厂区 ${node.id} 的父对象应为 -。`);
          } else if (!nodes.has(node.parent))
            errors.push(`${node.id} 的父对象 ${node.parent} 不存在。`);
          else if (nodes.get(node.parent).type !== parentType[node.type])
            errors.push(
              `${node.id}（${node.type}）不能挂在 ${node.parent}（${nodes.get(node.parent).type}）下。`,
            );
        });
        const cycleIds = new Set();
        nodes.forEach((node) => {
          const seen = new Set();
          let current = node;
          while (current && current.parent !== "-") {
            if (seen.has(current.id)) {
              cycleIds.add(current.id);
              break;
            }
            seen.add(current.id);
            current = nodes.get(current.parent);
          }
        });
        if (cycleIds.size)
          errors.push(`检测到循环引用，涉及：${[...cycleIds].join("、")}。`);
        return result(
          errors,
          "资产层级完整，无孤立对象或循环引用。",
          [
            `已组织 ${counts.plant} 个厂区、${counts.zone} 个区域、${counts.device} 台设备、${counts.point} 个测点。`,
            "所有非根对象的父级类型与引用均有效。",
          ],
          table(
            "解析后的对象关系",
            ["对象 ID", "类型", "父对象 ID"],
            [...nodes.values()].map((node) => [
              node.id,
              node.type,
              node.parent,
            ]),
          ),
        );
      },
    },
    {
      id: 4,
      stage: 0,
      title: "制定唯一编码",
      goal: "为设备和测点分配稳定、无冲突的对象编码。",
      brief: `编码规则为“项目前缀-类别-三位序号”。前缀为 2—8 位字母/数字且以字母开头，同一项目共用前缀；设备类别 EQ，测点类别 PT；序号为 001—999。大小写和首尾空格将被统一处理。`,
      concept:
        "唯一编码用于跨页面和数据源关联。仅大小写不同的编码不能区分两个对象，稳定的类别和命名空间可以减少误绑定。",
      hint: "两台不同设备不能共用 LAB-EQ-001。可自由选择项目名与序号，例如 DEMO-EQ-021、DEMO-EQ-022、DEMO-PT-031。",
      fields: [
        {
          key: "reactor",
          label: "教学反应器 R101 的编码",
          type: "text",
          value: "LAB-EQ-001",
        },
        {
          key: "pump",
          label: "教学输送泵 P101 的编码",
          type: "text",
          value: "lab-eq-001",
        },
        {
          key: "temperature",
          label: "教学温度测点 TT01 的编码",
          type: "text",
          value: "LAB-PT-001",
        },
      ],
      run(values) {
        const errors = [],
          definitions = [
            ["reactor", "反应器 R101", "EQ"],
            ["pump", "输送泵 P101", "EQ"],
            ["temperature", "温度测点 TT01", "PT"],
          ],
          seen = new Map(),
          prefixes = new Set();
        const rows = definitions.map(([key, label, expected]) => {
          const normalized = code(value(values, key)),
            match = normalized.match(/^([A-Z][A-Z0-9]{1,7})-(EQ|PT)-(\d{3})$/);
          if (!match || Number(match[3]) < 1)
            errors.push(`${label} 编码不符合“前缀-类别-001至999”的规则。`);
          else {
            prefixes.add(match[1]);
            if (match[2] !== expected)
              errors.push(`${label} 的类别应为 ${expected}。`);
          }
          if (normalized && seen.has(normalized))
            errors.push(
              `${label} 与 ${seen.get(normalized)} 使用了相同编码 ${normalized}。`,
            );
          seen.set(normalized, label);
          return [label, normalized || "未填写", expected];
        });
        if (prefixes.size > 1)
          errors.push("三个对象属于同一教学项目，请使用一致的项目前缀。");
        return result(
          errors,
          "三项编码格式正确，且归一化后互不冲突。",
          [
            `项目命名空间：${[...prefixes].join("、")}。`,
            "大小写和首尾空格已归一化，可用同一编码关联数据与模型。",
          ],
          table("编码归一化结果", ["对象", "标准编码", "类别"], rows),
        );
      },
    },
    {
      id: 5,
      stage: 0,
      title: "定义测点字典",
      goal: "统一测点类型、单位、量程和质量码。",
      brief: `配置 TT01 温度与 PT01 压力字典，每行“测点ID,类型,单位,下限,上限”。类型用 number；温度支持 C 或 K，压力支持 kPa 或 MPa。量程必须覆盖全部样本，并保持在教学设备的允许范围内。`,
      concept:
        "数字相同但单位不同并不代表同一物理量。字典需同时约束类型、单位、量程和质量标识；量程不能通过无限放宽来掩盖坏值。",
      hint: "TT01 样本为 -10、25、320 °C，允许范围 -50—400 °C；PT01 样本为 0、160、450 kPa，允许范围 0—600 kPa。K = °C + 273.15，MPa = kPa / 1000。三种质量码均需保留。",
      tables: [
        table(
          "教学测点与范围",
          ["测点", "样本", "允许量程边界"],
          [
            ["TT01", "-10、25、320 °C", "-50 至 400 °C"],
            ["PT01", "0、160、450 kPa", "0 至 600 kPa"],
          ],
        ),
      ],
      fields: [
        {
          key: "dictionary",
          label: "测点字典（每行 5 个字段）",
          type: "textarea",
          value: "TT01,number,C,-20,300\nPT01,text,kPa,0,500",
        },
        {
          key: "quality",
          label: "字典可表示的质量码",
          type: "checks",
          options: [
            { value: "GOOD", label: "GOOD：有效" },
            { value: "BAD", label: "BAD：无效" },
            { value: "UNCERTAIN", label: "UNCERTAIN：待确认" },
          ],
        },
      ],
      run(values) {
        const errors = [],
          rows = parseRows(value(values, "dictionary"), 5, errors),
          seen = new Set(),
          output = [];
        const specs = {
          TT01: {
            min: -50,
            max: 400,
            sampleMin: -10,
            sampleMax: 320,
            baseUnit: "°C",
          },
          PT01: {
            min: 0,
            max: 600,
            sampleMin: 0,
            sampleMax: 450,
            baseUnit: "kPa",
          },
        };
        rows.forEach(([rawId, type, unit, rawMin, rawMax]) => {
          const id = code(rawId),
            spec = specs[id];
          if (!spec) {
            errors.push(`测点 ${id} 不在本题目录中。`);
            return;
          }
          if (seen.has(id)) errors.push(`${id} 在字典中重复。`);
          seen.add(id);
          if (
            !["number", "float", "double", "数值"].includes(type.toLowerCase())
          )
            errors.push(`${id} 的连续测量值需要数值类型，不能使用 ${type}。`);
          let min = number({ n: rawMin }, "n"),
            max = number({ n: rawMax }, "n"),
            validUnit = true;
          const normalizedUnit = unit
            .toLowerCase()
            .replace(/°|℃/g, (match) => (match === "℃" ? "c" : ""));
          if (id === "TT01") {
            if (normalizedUnit === "k") {
              min -= 273.15;
              max -= 273.15;
            } else if (normalizedUnit !== "c") validUnit = false;
          } else {
            if (normalizedUnit === "mpa") {
              min *= 1000;
              max *= 1000;
            } else if (normalizedUnit !== "kpa") validUnit = false;
          }
          if (!validUnit)
            errors.push(
              `${id} 的单位 ${unit} 不受支持，请使用题目列出的单位。`,
            );
          if (!finite(min) || !finite(max) || min >= max)
            errors.push(`${id} 量程需要有效数字，且下限小于上限。`);
          else if (validUnit) {
            if (min < spec.min - 1e-8 || max > spec.max + 1e-8)
              errors.push(
                `${id} 换算量程 ${round(min)}—${round(max)} ${spec.baseUnit} 超过允许边界 ${spec.min}—${spec.max}。`,
              );
            if (min > spec.sampleMin + 1e-8 || max < spec.sampleMax - 1e-8)
              errors.push(
                `${id} 量程未覆盖样本范围 ${spec.sampleMin}—${spec.sampleMax} ${spec.baseUnit}。`,
              );
          }
          output.push([
            id,
            type,
            `${rawMin}—${rawMax} ${unit}`,
            validUnit && finite(min) && finite(max)
              ? `${round(min)}—${round(max)} ${spec.baseUnit}`
              : "无法换算",
          ]);
        });
        ["TT01", "PT01"].forEach((id) => {
          if (!seen.has(id)) errors.push(`字典缺少 ${id}。`);
        });
        const quality = picked(values, "quality");
        ["GOOD", "BAD", "UNCERTAIN"].forEach((q) => {
          if (!quality.includes(q))
            errors.push(`质量码缺少 ${q}，无法完整表达数据质量。`);
        });
        if (quality.some((q) => !["GOOD", "BAD", "UNCERTAIN"].includes(q)))
          errors.push("存在本题未定义的质量码。");
        return result(
          errors,
          "测点字典能够覆盖样本，类型、单位和质量码检查通过。",
          [
            "已将量程换算到统一物理单位后比较。",
            "两个测点的量程均覆盖样本，且没有超出教学设备边界。",
            "已保留有效、无效与待确认三种质量状态。",
          ],
          table(
            "字典与单位换算",
            ["测点", "类型", "输入量程", "统一单位量程"],
            output,
          ),
        );
      },
    },
    {
      id: 6,
      stage: 0,
      title: "组织三维资源",
      goal: "统一模型单位与坐标，利用基准点检查空间一致性。",
      brief: `模型使用毫米，教学场景使用米。按“统一缩放 → 绕 Z 轴旋转 → 平移”变换坐标，使三个基准点与目标位置对齐；每点误差不超过 0.01 米。D 是待定位的设备点，计算后显示其位置。`,
      concept:
        "只把模型放进场景不足以保证位置正确。单位、轴向和原点都需要校准，多个基准点可避免仅对齐一个点造成的误判。",
      hint: "毫米转换为米的比例是 0.001。A 决定平移，B 和 C 决定绕 Z 轴的方向；先缩放、再旋转，最后加平移。",
      tables: [
        table(
          "自拟模型基准点",
          ["点", "模型坐标 / mm", "目标坐标 / m"],
          [
            ["A", "(0, 0, 0)", "(10, 20, 0)"],
            ["B", "(10000, 0, 0)", "(10, 30, 0)"],
            ["C", "(0, 5000, 0)", "(5, 20, 0)"],
            ["D（设备）", "(2500, 1000, 2000)", "由输入配置计算"],
          ],
        ),
      ],
      fields: [
        {
          key: "scale",
          label: "统一缩放比例",
          type: "number",
          min: 0.000001,
          max: 10,
          step: "any",
          value: "1",
        },
        {
          key: "rotation",
          label: "绕 Z 轴旋转（从 +Z 看为逆时针）",
          type: "select",
          options: [
            { value: "0", label: "0°" },
            { value: "90", label: "90°" },
            { value: "180", label: "180°" },
            { value: "270", label: "270°" },
          ],
          value: "0",
        },
        {
          key: "x",
          label: "X 平移（米）",
          type: "number",
          step: "any",
          value: "0",
        },
        {
          key: "y",
          label: "Y 平移（米）",
          type: "number",
          step: "any",
          value: "0",
        },
        {
          key: "z",
          label: "Z 平移（米）",
          type: "number",
          step: "any",
          value: "0",
        },
      ],
      run(values) {
        const errors = [],
          scale = number(values, "scale"),
          rotation = number(values, "rotation"),
          offsets = ["x", "y", "z"].map((key) => number(values, key));
        if (!finite(scale) || scale <= 0 || scale > 10)
          errors.push("缩放比例必须大于 0 且不超过 10。");
        if (![0, 90, 180, 270].includes(rotation))
          errors.push("请选择有效的旋转角度。");
        offsets.forEach((n, i) => {
          if (!finite(n) || Math.abs(n) > 10000)
            errors.push(
              `${"XYZ"[i]} 平移需为绝对值不超过 10000 米的有效数字。`,
            );
        });
        if (errors.length) return result(errors, "", []);
        const points = [
          ["A", [0, 0, 0], [10, 20, 0]],
          ["B", [10000, 0, 0], [10, 30, 0]],
          ["C", [0, 5000, 0], [5, 20, 0]],
          ["D", [2500, 1000, 2000], null],
        ];
        const angle = (rotation * Math.PI) / 180;
        const output = points.map(([name, p, target]) => {
          const x = p[0] * scale,
            y = p[1] * scale;
          const actual = [
            x * Math.cos(angle) - y * Math.sin(angle) + offsets[0],
            x * Math.sin(angle) + y * Math.cos(angle) + offsets[1],
            p[2] * scale + offsets[2],
          ];
          const error = target
            ? Math.hypot(...actual.map((n, i) => n - target[i]))
            : null;
          if (error !== null && error > 0.01 + 1e-10)
            errors.push(
              `基准点 ${name} 偏差 ${round(error)} 米，超过 0.01 米。`,
            );
          return [
            name,
            `(${actual.map(round).join(", ")})`,
            error === null ? "待定位设备点，不作为基准" : `${round(error)} 米`,
          ];
        });
        return result(
          errors,
          "三个基准点校准通过，设备点已变换到教学场景。",
          [
            "三个基准点的误差均不超过 0.01 米。",
            `设备 D 的场景坐标：${output[3][1]} 米。`,
          ],
          table(
            "输入变换产生的坐标",
            ["点", "场景坐标 / m", "与基准的偏差"],
            output,
          ),
        );
      },
    },
    {
      id: 7,
      stage: 0,
      title: "配置对象映射",
      goal: "关联资产、三维模型与测点，检测漏配和错配。",
      brief: `为 R101 与 P101 各配置一条映射，每行“资产ID,模型ID,测点ID”。可选择同一设备的普通模型或简化模型；反应器可绑定温度或压力测点。模型和测点必须属于同一资产。`,
      concept:
        "映射正确不仅意味着 ID 存在，还要求资产身份一致。不同精度模型可指向同一设备，但不能将其他设备的数据贴到当前对象上。",
      hint: "检查三列的所属资产。R101 可选 mesh_reactor 或 mesh_reactor_low，搭配 TT01 或 PT01；P101 的测点是 IA01。",
      tables: [
        table(
          "教学模型目录",
          ["模型 ID", "所属资产", "用途"],
          [
            ["mesh_reactor", "R101", "反应器模型"],
            ["mesh_reactor_low", "R101", "反应器简化模型"],
            ["mesh_pump", "P101", "输送泵模型"],
            ["mesh_pump_low", "P101", "输送泵简化模型"],
          ],
        ),
        table(
          "教学测点目录",
          ["测点 ID", "所属资产", "本次样本读数"],
          [
            ["TT01", "R101", "165 °C"],
            ["PT01", "R101", "160 kPa"],
            ["IA01", "P101", "12.5 A"],
          ],
        ),
      ],
      fields: [
        {
          key: "mapping",
          label: "对象映射配置",
          type: "textarea",
          value: "R101,mesh_reactor,TT01\nP101,mesh_pump,TT01",
        },
      ],
      run(values) {
        const errors = [],
          rows = parseRows(value(values, "mapping"), 3, errors),
          assets = ["R101", "P101"],
          models = {
            mesh_reactor: "R101",
            mesh_reactor_low: "R101",
            mesh_pump: "P101",
            mesh_pump_low: "P101",
          },
          points = {
            TT01: { asset: "R101", reading: "165 °C" },
            PT01: { asset: "R101", reading: "160 kPa" },
            IA01: { asset: "P101", reading: "12.5 A" },
          },
          seenAssets = new Set(),
          seenModels = new Set(),
          seenPoints = new Set();
        const output = rows.map(([rawAsset, rawModel, rawPoint]) => {
          const asset = code(rawAsset),
            model = rawModel.toLowerCase(),
            point = code(rawPoint);
          let rowOK = true;
          const reject = (message) => {
            errors.push(message);
            rowOK = false;
          };
          if (!assets.includes(asset)) reject(`资产 ${asset} 不在本题目录中。`);
          if (seenAssets.has(asset))
            reject(`资产 ${asset} 重复配置；本题每个资产选择一条映射。`);
          if (!Object.prototype.hasOwnProperty.call(models, model))
            reject(`模型 ${model} 不存在。`);
          else if (models[model] !== asset)
            reject(`模型 ${model} 属于 ${models[model]}，不能关联 ${asset}。`);
          if (!Object.prototype.hasOwnProperty.call(points, point))
            reject(`测点 ${point} 不存在。`);
          else if (points[point].asset !== asset)
            reject(
              `测点 ${point} 属于 ${points[point].asset}，不能关联 ${asset}。`,
            );
          if (seenModels.has(model)) reject(`模型 ${model} 被重复占用。`);
          if (seenPoints.has(point)) reject(`测点 ${point} 被重复占用。`);
          seenAssets.add(asset);
          seenModels.add(model);
          seenPoints.add(point);
          return [
            asset,
            model,
            point,
            rowOK ? points[point].reading : "映射未通过，不显示读数",
          ];
        });
        assets.forEach((asset) => {
          if (!seenAssets.has(asset)) errors.push(`缺少资产 ${asset} 的映射。`);
        });
        return result(
          errors,
          "两项映射身份一致，可将样本读数关联到对应三维对象。",
          [
            "模型、测点均存在且属于相同资产。",
            "已完成两个资产的绑定，没有漏配或重复占用。",
          ],
          table(
            "映射生成的设备读数",
            ["资产", "模型", "测点", "教学样本读数"],
            output,
          ),
        );
      },
    },
  );
})();
