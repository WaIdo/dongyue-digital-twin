/* Self-contained teaching samples. No model service or production system is called. */
window.LAB_TASKS = window.LAB_TASKS || [];
(() => {
  const field = (key, label, type, extra = {}) => ({
    key,
    label,
    type,
    ...extra,
  });
  const options = (pairs) => pairs.map(([value, label]) => ({ value, label }));
  const docs = [
    [
      "D1",
      "设备编码规则",
      "v2",
      "已授权",
      "每台设备采用唯一资产编码，模型和测点引用该编码。",
    ],
    [
      "D2",
      "事件处置流程",
      "v3",
      "已授权",
      "告警发生后，依次确认、处理、复核、归档。",
    ],
    ["D3", "事件处置流程", "v1", "已停用", "旧版本只要求确认后归档。"],
    ["D4", "供应商内部材料", "未核验", "未授权", "不可用于本次教学知识库。"],
  ];
  const outcome = (pass, summary, details, output) => ({
    pass,
    summary,
    details,
    ...(output ? { output } : {}),
  });
  window.LAB_TASKS.push(
    {
      id: 22,
      stage: 3,
      title: "建设技术知识库",
      goal: "为检索建立有授权、可追溯的文档索引。",
      brief:
        "从四份教学文档中选取当前有效且已授权的资料。为文本片段保留必要的追溯字段。",
      concept:
        "文档能被检索到，不代表可以用于回答。授权状态、版本和片段位置都需要进入索引。",
      hint: "选择 D1、D2，并保留文档编号、版本和片段编号。旧版与未授权文件应排除。",
      tables: [
        {
          caption: "自拟教学文档库",
          headers: ["编号", "资料", "版本", "授权状态", "片段内容"],
          rows: docs,
        },
      ],
      fields: [
        field("documents", "纳入索引的文档", "checks", {
          options: options(
            docs.map((d) => [d[0], `${d[0]} · ${d[1]} ${d[2]}`]),
          ),
        }),
        field("metadata", "为每个片段保留的字段", "checks", {
          options: options([
            ["doc", "文档编号"],
            ["version", "版本"],
            ["chunk", "片段编号"],
            ["color", "封面颜色"],
          ]),
        }),
      ],
      run(v) {
        const chosen = Array.isArray(v.documents) ? v.documents : [],
          meta = Array.isArray(v.metadata) ? v.metadata : [];
        const valid =
          chosen.length === 2 && chosen.includes("D1") && chosen.includes("D2");
        const trace = ["doc", "version", "chunk"].every((k) =>
          meta.includes(k),
        );
        return outcome(
          valid && trace,
          valid && trace ? "索引校验通过" : "索引需要调整",
          [
            valid
              ? "已排除停用版本和未授权文档。"
              : "请只纳入当前有效且已授权的 D1、D2。",
            trace
              ? "片段能够追溯到文档、版本和位置。"
              : "缺少文档编号、版本或片段编号，无法复核答案。",
          ],
          {
            caption: "本次索引结果",
            headers: ["文档", "索引状态"],
            rows: docs.map((d) => [
              d[0],
              chosen.includes(d[0])
                ? d[3] === "已授权"
                  ? "已选择"
                  : "不应纳入"
                : "未选择",
            ]),
          },
        );
      },
    },
    {
      id: 23,
      stage: 3,
      title: "配置知识问答",
      goal: "对照检索证据，判断答案能否被引用支持。",
      brief:
        "问题是“告警确认后能否直接归档？”从本地片段中选取证据，并提交你的回答策略。这里检查引用链，不调用生成式模型。",
      concept:
        "回答必须能由当前有效文档直接支持。关键词相似不代表版本有效；没有证据时应保留未知。",
      hint: "D2 v3 要求确认后继续处理、复核；D3 是停用版本。选择“不可以”并引用 D2 的 v3。",
      tables: [
        {
          caption: "本地检索候选",
          headers: ["引用", "版本", "片段"],
          rows: [
            ["D2", "v3", "确认 → 处理 → 复核 → 归档"],
            ["D3", "v1（停用）", "确认 → 归档"],
            ["D1", "v2", "资产编码必须唯一"],
          ],
        },
      ],
      fields: [
        field("source", "引用文档", "select", {
          options: options([
            ["D2", "D2 · 事件处置流程"],
            ["D3", "D3 · 旧事件处置流程"],
            ["D1", "D1 · 设备编码规则"],
          ]),
        }),
        field("version", "引用版本", "text", { placeholder: "例如 v3" }),
        field("answer", "你的回答", "select", {
          options: options([
            ["no", "不可以，还需处理和复核"],
            ["yes", "可以，确认后立即归档"],
            ["unknown", "现有资料无法判断"],
          ]),
        }),
      ],
      run(v) {
        const pass =
          v.source === "D2" &&
          String(v.version).trim().toLowerCase() === "v3" &&
          v.answer === "no";
        return outcome(
          pass,
          pass ? "答案与引用一致" : "答案尚未形成有效引用链",
          [
            v.source === "D2"
              ? "选中了直接回答该问题的文档。"
              : "该文档已停用或与问题无直接关系。",
            String(v.version).trim().toLowerCase() === "v3"
              ? "版本核对正确。"
              : "请核对当前文档版本 v3。",
            v.answer === "no"
              ? "回答保留了处理和复核步骤。"
              : "对照候选片段，确认后仍有两项必需操作。",
          ],
        );
      },
    },
    {
      id: 24,
      stage: 3,
      title: "评测异常检测",
      goal: "根据独立测试集计算查准率与召回率。",
      brief:
        "给定 10 条人工复核标签与检测结果，先统计 TP、FP、FN，再填写百分比。本样例只演练评测，不代表工业模型性能。",
      concept:
        "查准率 = TP ÷ (TP + FP)；召回率 = TP ÷ (TP + FN)。误报为 FP，漏报为 FN。",
      hint: "本表 TP=3、FP=2、FN=1。查准率 60%，召回率 75%。",
      tables: [
        {
          caption: "自拟独立测试集",
          headers: ["样本", "人工标签", "检测结果"],
          rows: [
            ["S01", "异常", "异常"],
            ["S02", "正常", "异常"],
            ["S03", "异常", "异常"],
            ["S04", "正常", "正常"],
            ["S05", "异常", "正常"],
            ["S06", "正常", "正常"],
            ["S07", "正常", "异常"],
            ["S08", "异常", "异常"],
            ["S09", "正常", "正常"],
            ["S10", "正常", "正常"],
          ],
        },
      ],
      fields: [
        field("tp", "正确检出的异常 TP", "number", {
          min: 0,
          max: 10,
          step: 1,
        }),
        field("fp", "误报 FP", "number", { min: 0, max: 10, step: 1 }),
        field("fn", "漏报 FN", "number", { min: 0, max: 10, step: 1 }),
        field("precision", "查准率（%）", "number", {
          min: 0,
          max: 100,
          step: 0.1,
        }),
        field("recall", "召回率（%）", "number", {
          min: 0,
          max: 100,
          step: 0.1,
        }),
      ],
      run(v) {
        const present = ["tp", "fp", "fn", "precision", "recall"].every(
          (k) =>
            String(v[k] ?? "").trim() !== "" && Number.isFinite(Number(v[k])),
        );
        const counts =
          Number(v.tp) === 3 && Number(v.fp) === 2 && Number(v.fn) === 1;
        const rates =
          Math.abs(Number(v.precision) - 60) < 0.1 &&
          Math.abs(Number(v.recall) - 75) < 0.1;
        return outcome(
          present && counts && rates,
          present && counts && rates ? "评测计算通过" : "请复核混淆矩阵与分母",
          [
            counts
              ? "TP、FP、FN 统计正确。"
              : "从“人工标签”和“检测结果”逐条统计：TP=3、FP=2、FN=1。",
            rates
              ? "两项百分比均正确。"
              : "查准率的分母是所有预测异常；召回率的分母是所有实际异常。",
          ],
          {
            caption: "核验基准（本教学测试集）",
            headers: ["指标", "计算", "结果"],
            rows: [
              ["查准率", "3 ÷ (3+2)", "60%"],
              ["召回率", "3 ÷ (3+1)", "75%"],
            ],
          },
        );
      },
    },
    {
      id: 25,
      stage: 3,
      title: "比较 AI 配置",
      goal: "依据验证集要求选择配置，并保持测试集独立。",
      brief:
        "验证集已分别评测 A、B、C。目标为查准率不低于 80%、召回率不低于 85%，在满足两项要求的配置中选择延迟最低者。",
      concept:
        "使用验证集选择配置，再用未参与调参的测试集报告结果。测试集反复用于调参会造成信息泄露。",
      hint: "B 是唯一同时满足两项质量要求的配置。选定后锁定配置，才运行独立测试集。",
      tables: [
        {
          caption: "自拟验证集评测结果",
          headers: ["配置", "查准率", "召回率", "推理延迟"],
          rows: [
            ["A", "90%", "70%", "12 ms"],
            ["B", "85%", "90%", "20 ms"],
            ["C", "75%", "95%", "30 ms"],
          ],
        },
      ],
      fields: [
        field("config", "采用的配置", "select", {
          options: options([
            ["A", "配置 A"],
            ["B", "配置 B"],
            ["C", "配置 C"],
          ]),
        }),
        field("protocol", "后续评测安排", "select", {
          options: options([
            ["freeze", "锁定配置，运行独立测试集"],
            ["tune-test", "反复调整到测试集结果最好"],
            ["reuse", "把验证集改名为测试集"],
          ]),
        }),
      ],
      run(v) {
        const rows = [
          ["A", 90, 70, 12],
          ["B", 85, 90, 20],
          ["C", 75, 95, 30],
        ];
        const selected = rows.find((r) => r[0] === v.config);
        const pass =
          selected?.[1] >= 80 && selected?.[2] >= 85 && v.protocol === "freeze";
        return outcome(
          Boolean(pass),
          pass ? "配置选择与评测安排通过" : "请对照质量门槛与数据边界",
          [
            selected
              ? `${selected[0]}：查准率 ${selected[1]}%，召回率 ${selected[2]}%，延迟 ${selected[3]} ms。`
              : "尚未选择配置。",
            v.config === "B"
              ? "B 同时满足查准率和召回率要求。"
              : "不能只追求某一项指标或更低延迟。",
            v.protocol === "freeze"
              ? "测试集保持独立。"
              : "测试集不得用于反复选择参数或由验证集改名。",
          ],
        );
      },
    },
    {
      id: 26,
      stage: 3,
      title: "测试可信控制",
      goal: "为无证据、越权与有证据请求配置不同处理规则。",
      brief:
        "为三种请求选择行为。运行后查看逐项判定与审计结果。即使分析有证据，也不能绕过设备操作权限。",
      concept:
        "证据校验和权限校验是两道独立检查。建议与执行分离，需要明确的人为确认条件。",
      hint: "无证据应说明无法判断；越权操作应拒绝并记录；有证据的分析可以展示引用，但执行仍需授权人员确认。",
      tables: [
        {
          caption: "自拟请求情境",
          headers: ["请求", "证据", "权限"],
          rows: [
            ["Q1 查询未收录设备的维护周期", "没有", "只读"],
            ["Q2 学生要求写入设备控制值", "无关", "只读"],
            ["Q3 查看已有报警记录的分析", "有引用", "只读"],
          ],
        },
      ],
      fields: [
        field("q1", "Q1 · 没有证据时", "select", {
          options: options([
            ["abstain", "说明证据不足，保留未知"],
            ["guess", "根据常识补全维护周期"],
          ]),
        }),
        field("q2", "Q2 · 超出权限时", "select", {
          options: options([
            ["deny", "拒绝执行并保留审计记录"],
            ["write", "直接写入以便验证"],
          ]),
        }),
        field("q3", "Q3 · 有证据的分析", "select", {
          options: options([
            ["cite", "展示引用，执行须授权人员确认"],
            ["auto", "自动执行所有建议"],
            ["block", "拒绝查看所有已有证据"],
          ]),
        }),
      ],
      run(v) {
        const decisions = [
          ["Q1", v.q1 === "abstain", "证据不足：不生成事实结论"],
          ["Q2", v.q2 === "deny", "越权写入：拒绝并记录"],
          ["Q3", v.q3 === "cite", "可展示分析及引用：执行另行授权"],
        ];
        const pass = decisions.every((r) => r[1]);
        return outcome(
          pass,
          pass ? "三类请求控制通过" : "存在需要修正的控制规则",
          decisions.filter((r) => !r[1]).map((r) => `${r[0]} 应采用：${r[2]}`),
          {
            caption: "教学规则检查日志",
            headers: ["请求", "结果", "预期行为"],
            rows: decisions.map((r) => [r[0], r[1] ? "通过" : "未通过", r[2]]),
          },
        );
      },
    },
    {
      id: 27,
      stage: 3,
      title: "执行系统验收",
      goal: "汇总前 26 项练习的检查结果，定位未通过项并复测。",
      brief:
        "运行验收前，完成前 26 项配置与检查。下面的五类验收将汇总本页当前练习结果；输入修改后，对应检查需要重新运行。",
      concept:
        "验收结论必须与当前配置一致，不能使用修改前的通过记录。失败项修正后需重新运行检查。",
      hint: "打开左侧尚未通过的任务，修正输入并检查。所有前置练习通过后，再返回运行验收。",
      fields: [
        field("version", "本次实验配置版本", "text", {
          placeholder: "例如 lab-v1",
        }),
        field("recheck", "复测要求", "checks", {
          options: options([
            ["current", "确认使用当前输入对应的检查结果"],
            ["failed", "确认已对失败项修正并复测"],
          ]),
        }),
      ],
      run(v, c) {
        const groups = [
          ["对象映射", [1, 2, 3, 4, 5, 6, 7]],
          ["数据同步", [8, 9, 10, 11, 12, 13, 14]],
          ["状态反馈", [15, 16, 17, 18, 20, 21]],
          ["AI 证据", [22, 23, 24, 25]],
          ["权限隔离", [19, 26]],
        ];
        const passed = new Set(c.passedIds || []);
        const missing = Array.from({ length: 26 }, (_, i) => i + 1).filter(
          (id) => !passed.has(id),
        );
        const version = /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,39}$/.test(
          String(v.version || "").trim(),
        );
        const confirmations = ["current", "failed"].every((x) =>
          (v.recheck || []).includes(x),
        );
        return outcome(
          !missing.length && version && confirmations,
          !missing.length && version && confirmations
            ? "本页练习验收通过"
            : "本次验收仍有待完成项",
          [
            missing.length
              ? `尚未通过的任务：${missing.join("、")}。`
              : "前 26 项练习均已通过当前配置检查。",
            version
              ? "配置版本有效。"
              : "请填写 2–40 位字母、数字、点、横线或下划线组成的版本号。",
            confirmations
              ? "已确认当前结果和复测要求。"
              : "请核对并确认两项复测要求。",
          ],
          {
            caption: "五类验收结果",
            headers: ["类别", "通过项", "当前状态"],
            rows: groups.map(([name, ids]) => [
              name,
              `${ids.filter((id) => passed.has(id)).length}/${ids.length}`,
              ids.every((id) => passed.has(id)) ? "通过" : "待复测",
            ]),
          },
        );
      },
    },
    {
      id: 28,
      stage: 3,
      title: "交付并复盘",
      goal: "结合检查记录，总结一项修正与一项迁移条件，导出实验报告。",
      brief:
        "完成验收后，说明你实际修改过什么、根据什么结果判断修改有效，并写出将样例迁移到其他设备时需要重新确认的条件。",
      concept:
        "报告应保留配置、结果和解释。样例校验通过不能自动证明真实系统性能，迁移时必须重新确认数据、对象和权限条件。",
      hint: "可记录某次编码冲突、数据清洗或误报问题的修改前后差异。迁移条件可以涉及单位、量程、对象编码、采样周期或权限。",
      fields: [
        field("reflection", "修正过程与结果", "textarea", {
          placeholder: "写出问题、所改配置，以及检查前后的结果（至少20字）",
        }),
        field("transfer", "迁移到新设备前要确认什么", "textarea", {
          placeholder:
            "结合对象、数据或权限，列出需要重新确认的条件（至少15字）",
        }),
      ],
      run(v, c) {
        const accepted = (c.passedIds || []).includes(27);
        const reflection = String(v.reflection || "").trim().length >= 20,
          transfer = String(v.transfer || "").trim().length >= 15;
        return outcome(
          accepted && reflection && transfer,
          accepted && reflection && transfer
            ? "实验记录已齐备，可以导出报告"
            : "请补齐验收或复盘记录",
          [
            accepted ? "本次配置已完成练习验收。" : "请先通过第 27 项验收。",
            reflection
              ? "修正过程已记录；论证质量由教师复核。"
              : "修正记录至少20字，应包含问题、修改与结果。",
            transfer
              ? "迁移条件已记录，可随报告导出。"
              : "迁移条件至少15字，请写清需要重新确认的事项。",
          ],
        );
      },
    },
  );
})();
