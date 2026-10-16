"use strict";

const capabilities = {
  overview: { image: "platform-overview.webp", alt: "三维厂区总览与设备信息面板的关联展示", kicker: "场景与对象", title: ["从厂区鸟瞰，", "定位设备。"], description: "以统一设备对象连接空间位置与业务数据。在三维场景中定位设备，在信息面板中查看状态，让现场与数据彼此对应。", items: ["厂区、装置、设备多层级浏览", "三维场景与 Web 面板双向联动", "设备定位与数字档案关联"] },
  process: { image: "process-twin.webp", alt: "热解车间内部的三维设备与绿色动态介质管网", kicker: "介质与管网", title: ["让管网里的流向，", "变得清晰可见。"], description: "将设备、管道和阀门组织在同一空间中，以颜色与动态流向展示不同介质的输送路径，连接工艺流程与三维场景。", items: ["原料液、产品油、蒸汽与冷却水分类呈现", "设备、管道、阀门的空间关联", "工艺流程与三维场景联动展示"] },
  data: { image: "scada.webp", alt: "SCADA二维工艺流程图中的设备、管线与连接关系", kicker: "监控与记录", title: ["二维监控，", "与三维世界相连。"], description: "通过 SCADA 组态和数据面板查看工艺关联；结合历史趋势、报警检索与操作记录，为运行分析与事件复盘提供上下文。", items: ["二维 SCADA 工艺组态与场景关联", "温度、压力、液位与电流趋势查询", "报警记录、确认处置与操作审计"] },
  ai: { image: "ai-analysis.webp", alt: "系统演示素材中的AI分析面板，包括异常趋势、预测维护与能耗建议", kicker: "智能分析 / 方案展示", title: ["从历史记录，", "探索未来趋势。"], description: "演示材料展示了异常趋势分析、预测性预警与能耗优化建议的应用方向，以数字空间支持策略验证与持续改进。", items: ["时间序列异常检测与趋势分析示意", "面向工况的能耗优化建议", "模型效果与生产收益尚未在本页验证"] }
};

const processStages = [
  {name:"原料进厂",title:"从物料入口，建立全流程视角。",description:"在数字厂区中查看原料储存区域及其空间位置，为后续破碎、热解与精馏流程建立直观的工艺起点。"},
  {name:"破碎清洗",title:"认识预处理，理解前后工序的衔接。",description:"沿工艺链条查看破碎与清洗环节，了解原料预处理与后续热解装置之间的空间关系及物料路径。"},
  {name:"热解反应",title:"聚焦核心装置，关联设备与工况。",description:"在三维场景中定位热解反应器，结合温度、压力等测点信息，查看设备状态与相应的运行记录。"},
  {name:"精馏分离",title:"追踪管网连接，理解分离过程。",description:"从热解车间深入精馏装置，通过设备对象与管线关联，观察产品油、蒸汽和冷却水等介质的流向。"},
  {name:"成品出厂",title:"连接储罐与装车，完整呈现生产链条。",description:"沿工艺流程抵达成品储运区域，查看储罐、连接管网与出厂环节，形成从原料到产品的完整认知。"}
];

function wireTabs(buttons, activate) {
  buttons.forEach((button, index) => {
    button.addEventListener("click", () => activate(button));
    button.addEventListener("keydown", event => {
      let next = index;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % buttons.length;
      else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + buttons.length) % buttons.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = buttons.length - 1;
      else return;
      event.preventDefault();
      activate(buttons[next]);
      buttons[next].focus();
    });
  });
}
function selectTab(buttons, current, panel) {
  buttons.forEach(button => { button.setAttribute("aria-selected", String(button === current)); button.tabIndex = button === current ? 0 : -1; });
  panel.setAttribute("aria-labelledby", current.id);
}
const capabilityTabs = [...document.querySelectorAll("[data-tab]")];
wireTabs(capabilityTabs, button => {
  const data = capabilities[button.dataset.tab];
  selectTab(capabilityTabs, button, document.querySelector("#capability-panel"));
  const img = document.querySelector("#capability-img");
  img.src = `assets/${data.image}`; img.alt = data.alt;
  document.querySelector("#capability-kicker").textContent = data.kicker;
  const title = document.querySelector("#capability-title");
  title.replaceChildren(document.createTextNode(data.title[0]), document.createElement("br"), document.createTextNode(data.title[1]));
  document.querySelector("#capability-description").textContent = data.description;
  document.querySelector("#capability-list").replaceChildren(...data.items.map(text => {const item = document.createElement("li"); item.textContent = text; return item;}));
});

const processTabs = [...document.querySelectorAll("[data-step]")];
wireTabs(processTabs, button => {
  const index = Number(button.dataset.step); const data = processStages[index];
  selectTab(processTabs, button, document.querySelector("#process-detail"));
  document.querySelector("#process-stage").textContent = `STAGE 0${index + 1} / ${data.name}`;
  document.querySelector("#process-detail-title").textContent = data.title;
  document.querySelector("#process-detail-copy").textContent = data.description;
});

const menuToggle = document.querySelector(".menu-toggle");
const navigation = document.querySelector("#site-nav");
function closeMenu() { menuToggle.setAttribute("aria-expanded", "false"); menuToggle.setAttribute("aria-label", "打开导航"); navigation.classList.remove("open"); }
menuToggle.addEventListener("click", () => { const isOpen = menuToggle.getAttribute("aria-expanded") === "true"; menuToggle.setAttribute("aria-expanded", String(!isOpen)); menuToggle.setAttribute("aria-label", isOpen ? "打开导航" : "关闭导航"); navigation.classList.toggle("open", !isOpen); });
navigation.querySelectorAll("a,button").forEach(link => link.addEventListener("click", closeMenu));
document.addEventListener("keydown", event => { if (event.key === "Escape" && navigation.classList.contains("open")) { closeMenu(); menuToggle.focus(); } });
document.addEventListener("click", event => { if (!event.target.closest(".site-header")) closeMenu(); });
window.matchMedia("(min-width:1051px)").addEventListener("change", event => { if (event.matches) closeMenu(); });

const videoDialog = document.querySelector("#video-dialog");
const video = document.querySelector("#demo-video");
const imageDialog = document.querySelector("#image-dialog");
const dialogOpeners = new WeakMap();
function openDialog(dialog) { dialogOpeners.set(dialog, document.activeElement); dialog.showModal(); document.body.classList.add("dialog-open"); document.querySelector("#hero-motion").pause(); }
document.querySelectorAll("[data-video-open]").forEach(button => button.addEventListener("click", () => { openDialog(videoDialog); if (video.readyState === 0) video.load(); video.play().catch(() => { /* Native controls remain available if playback requires another user gesture. */ }); }));
document.querySelectorAll("dialog").forEach(dialog => {
  dialog.querySelector("[data-close-dialog]").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
  dialog.addEventListener("close", () => {
    document.body.classList.remove("dialog-open");
    if (dialog === videoDialog) video.pause();
    const opener = dialogOpeners.get(dialog);
    const focusTarget = opener?.getClientRects().length ? opener : menuToggle.getClientRects().length ? menuToggle : document.querySelector(".hero-actions button");
    focusTarget.focus({preventScroll:true});
    syncHeroMotion();
  });
});
video.addEventListener("error", () => { document.querySelector(".video-error").hidden = false; });
video.addEventListener("loadeddata", () => { document.querySelector(".video-error").hidden = true; });
document.querySelector("#expand-image").addEventListener("click", () => { const source = document.querySelector("#capability-img"); const image = document.querySelector("#expanded-image"); image.src = source.src; image.alt = source.alt; document.querySelector("#image-dialog-title").textContent = source.alt; openDialog(imageDialog); });

// Motion is optional. Mobile, reduced-motion and data-saving visits begin with a still image.
const heroMotion = document.querySelector("#hero-motion");
const motionToggle = document.querySelector("#motion-toggle");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let motionWanted = window.matchMedia("(min-width: 901px)").matches && !reducedMotion.matches && !navigator.connection?.saveData;
let sceneVisible = false;
function updateMotionControl() {
  const playing = !heroMotion.paused;
  motionToggle.setAttribute("aria-pressed", String(playing));
  motionToggle.setAttribute("aria-label", playing ? "暂停场景运镜" : "播放场景运镜");
  motionToggle.querySelector(".motion-label").textContent = playing ? "暂停画面" : "播放场景";
  motionToggle.querySelector(".motion-icon").textContent = playing ? "Ⅱ" : "▷";
}
function syncHeroMotion() {
  if (motionWanted && sceneVisible && !document.hidden && !document.querySelector("dialog[open]")) {
    if (!heroMotion.getAttribute("src")) heroMotion.src = "assets/hero-loop.mp4";
    heroMotion.play().catch(updateMotionControl);
  } else heroMotion.pause();
}
heroMotion.addEventListener("playing", () => { heroMotion.classList.add("is-playing"); updateMotionControl(); });
heroMotion.addEventListener("pause", updateMotionControl);
heroMotion.addEventListener("error", () => { heroMotion.classList.remove("is-playing"); motionToggle.hidden = true; });
motionToggle.addEventListener("click", () => { motionWanted = heroMotion.paused; syncHeroMotion(); });
document.addEventListener("visibilitychange", syncHeroMotion);
reducedMotion.addEventListener("change", event => { if (event.matches) { motionWanted = false; syncHeroMotion(); } });
if ("IntersectionObserver" in window) {
  new IntersectionObserver(entries => { sceneVisible = entries[0].isIntersecting; syncHeroMotion(); }, {threshold: .08}).observe(heroMotion);
} else { sceneVisible = true; syncHeroMotion(); }
const tabOrientation = window.matchMedia("(max-width: 900px)");
function updateTabOrientation() { document.querySelector(".capability-tabs").setAttribute("aria-orientation", tabOrientation.matches ? "horizontal" : "vertical"); }
tabOrientation.addEventListener("change", updateTabOrientation);
updateTabOrientation();

if ("IntersectionObserver" in window) {
  const links = [...navigation.querySelectorAll("a")];
  const observer = new IntersectionObserver(entries => { entries.forEach(entry => { if (entry.isIntersecting) links.forEach(link => { const active = link.hash === `#${entry.target.id}`; link.classList.toggle("active", active); if (active) link.setAttribute("aria-current", "location"); else link.removeAttribute("aria-current"); }); }); }, {rootMargin:"-20% 0px -60% 0px",threshold:0});
  links.forEach(link => { const section = document.querySelector(link.hash); if (section) observer.observe(section); });
}
