"use strict";

// Keep temporary release-cache parameters out of shared page addresses.
const pageAddress = new URL(window.location.href);
if (pageAddress.searchParams.has("v")) {
  pageAddress.searchParams.delete("v");
  window.history.replaceState(window.history.state, "", pageAddress.pathname + pageAddress.search + pageAddress.hash);
}

const capabilities = {
  overview: { chapter: "devices", source: "高清演示截图 · 01:15", action: "观看设备联动", image: "scene-devices.webp", alt: "三维厂区总览与设备信息面板的关联展示", kicker: "场景与对象", title: ["从厂区鸟瞰，", "定位设备。"], description: "以统一设备对象连接空间位置与业务数据。在三维场景中定位设备，在信息面板中查看状态，让现场与数据彼此对应。", items: ["厂区、装置、设备多层级浏览", "三维场景与 Web 面板双向联动", "设备定位与数字档案关联"] },
  process: { chapter: "pipes", source: "高清演示截图 · 03:33", action: "观看管网流向", image: "scene-pipes.webp", alt: "三维场景中用颜色和动态流向呈现介质管网", kicker: "介质与管网", title: ["让管网里的流向，", "变得清晰可见。"], description: "将设备、管道和阀门组织在同一空间中，以颜色与动态流向展示不同介质的输送路径，连接工艺流程与三维场景。", items: ["原料液、产品油、蒸汽与冷却水分类呈现", "设备、管道、阀门的空间关联", "工艺流程与三维场景联动展示"] },
  data: { chapter: "data", source: "高清演示截图 · 02:45", action: "观看数据中心", image: "scene-data.webp", alt: "数据中心界面中的历史趋势曲线、统计图表和三维设备", kicker: "监控与记录", title: ["让设备状态，", "沿时间展开。"], description: "在数据中心查看历史曲线和统计图表，将温度、压力、液位等趋势与三维设备关联，为运行分析与事件复盘提供上下文。", items: ["二维 SCADA 工艺组态与场景关联", "温度、压力、液位与电流趋势查询", "报警记录、确认处置与操作审计"] },
  ai: { chapter: "ai", source: "高清演示截图 · 04:00", action: "观看分析演示", image: "scene-ai.webp", alt: "系统演示素材中的AI分析面板，包括异常趋势、预测维护与能耗建议", kicker: "智能分析 / 方案展示", title: ["从历史记录，", "探索未来趋势。"], description: "演示材料展示了异常趋势分析、预测性预警与能耗优化建议的应用方向，以数字空间支持策略验证与持续改进。", items: ["时间序列异常检测与趋势分析示意", "面向工况的能耗优化建议", "模型效果与生产收益尚未在本页验证"] }
};

const processViews = {
  flow: { image: "scene-flow.webp", alt: "工艺管理中的流程、阀门管道配置和三维厂区同屏展示", source: "高清演示截图 · 03:20", title: "在同一屏，查看流程与现场。", description: "工艺管理界面将工艺流程、阀门与管道配置、三维场景组织在一起，让工艺关系对应到厂区空间。", chapter: "process", action: "观看工艺演示" },
  pipes: { image: "scene-pipes.webp", alt: "三维场景中用颜色和动态流向呈现介质管网", source: "高清演示截图 · 03:33", title: "沿着管线，看清介质流向。", description: "在三维场景中查看设备、管道与阀门的连接。管线以颜色区分介质，视频中的流向动画展示物料的输送方向。", chapter: "pipes", action: "观看管网流向" },
  scada: { image: "scada.webp", alt: "功能演示材料中的二维SCADA流程图，展示设备与管线的连接关系", source: "功能演示材料 · 二维 SCADA 界面", title: "从二维监控，读懂设备连接。", description: "以传统工艺组态图呈现设备与管线关系。配合三维场景，从流程连接和空间位置两个角度理解同一套工艺。", chapter: "scada", action: "观看 SCADA 演示" }
};

const videoChapters = {
  full: { start: 0, title: "完整演示" },
  devices: { start: 60, title: "设备定位与联动" },
  workshop: { start: 87, title: "三维车间" },
  alarms: { start: 115, title: "报警与操作记录" },
  data: { start: 154, title: "数据中心" },
  process: { start: 193, title: "工艺流程" },
  pipes: { start: 211, title: "介质管网" },
  scada: { start: 200, title: "二维 SCADA" },
  operations: { start: 219, title: "系统运维" },
  ai: { start: 235, title: "智能分析" },
  mr: { start: 278, title: "MR 虚实交互" }
};
function formatTime(seconds) { return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`; }
function setVideoAction(button, key, label) {
  button.dataset.videoOpen = key;
  const icon = document.createElement("span"); icon.setAttribute("aria-hidden", "true"); icon.textContent = "▷";
  button.replaceChildren(document.createTextNode(label + " "), icon);
}

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
  document.querySelector("#capability-source").textContent = data.source;
  setVideoAction(document.querySelector("#capability-video"), data.chapter, data.action);
  document.querySelector("#capability-kicker").textContent = data.kicker;
  const title = document.querySelector("#capability-title");
  title.replaceChildren(document.createTextNode(data.title[0]), document.createElement("br"), document.createTextNode(data.title[1]));
  document.querySelector("#capability-description").textContent = data.description;
  document.querySelector("#capability-list").replaceChildren(...data.items.map(text => {const item = document.createElement("li"); item.textContent = text; return item;}));
});

const processTabs = [...document.querySelectorAll("[data-process-view]")];
wireTabs(processTabs, button => {
  const data = processViews[button.dataset.processView];
  selectTab(processTabs, button, document.querySelector("#process-detail"));
  const image = document.querySelector("#process-img");
  image.src = `assets/${data.image}`; image.alt = data.alt;
  document.querySelector("#process-source").textContent = data.source;
  document.querySelector("#process-detail-title").textContent = data.title;
  document.querySelector("#process-detail-copy").textContent = data.description;
  setVideoAction(document.querySelector("#process-video"), data.chapter, data.action);
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
let pendingVideoStart = null;
function playChapter(key = "full") {
  const chapter = videoChapters[key] || videoChapters.full;
  pendingVideoStart = chapter.start;
  document.querySelector("#video-dialog-title").textContent = `东粤化学 · ${chapter.title}`;
  document.querySelector("#video-context").textContent = chapter.start ? `从 ${formatTime(chapter.start)} 开始 · 可继续观看后续演示` : "完整演示 · 05:16";
  if (video.readyState >= 1) seekToChapter();
  else video.load();
  // Request playback within the click gesture, including on mobile browsers.
  video.play().catch(() => { /* Native controls remain available. */ });
}
function seekToChapter() {
  if (pendingVideoStart === null) return;
  video.currentTime = Math.min(pendingVideoStart, Math.max(0, video.duration - 0.1));
  pendingVideoStart = null;
}
video.addEventListener("loadedmetadata", seekToChapter);
document.querySelectorAll("[data-video-open]").forEach(button => button.addEventListener("click", () => {
  openDialog(videoDialog);
  playChapter(button.dataset.videoOpen || "full");
}));
document.querySelectorAll("[data-video-chapter]").forEach(button => button.addEventListener("click", () => playChapter(button.dataset.videoChapter)));
video.addEventListener("timeupdate", () => {
  const buttons = [...document.querySelectorAll("[data-video-chapter]")];
  const active = buttons.filter(button => video.currentTime >= videoChapters[button.dataset.videoChapter].start).pop();
  buttons.forEach(button => { if (button === active) button.setAttribute("aria-current", "true"); else button.removeAttribute("aria-current"); });
});

document.querySelectorAll("dialog").forEach(dialog => {
  dialog.querySelector("[data-close-dialog]").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
  dialog.addEventListener("close", () => {
    document.body.classList.remove("dialog-open");
    if (dialog === videoDialog) { video.pause(); pendingVideoStart = null; }
    const opener = dialogOpeners.get(dialog);
    const focusTarget = opener?.getClientRects().length ? opener : menuToggle.getClientRects().length ? menuToggle : document.querySelector(".hero-actions button");
    focusTarget.focus({preventScroll:true});
    syncHeroMotion();
  });
});
video.addEventListener("error", () => { document.querySelector(".video-error").hidden = false; });
video.addEventListener("loadeddata", () => { document.querySelector(".video-error").hidden = true; });
function expandImage(source) {
  const image = document.querySelector("#expanded-image"); image.src = source.src; image.alt = source.alt;
  document.querySelector("#image-dialog-title").textContent = source.alt;
  openDialog(imageDialog);
}
document.querySelector("#expand-image").addEventListener("click", () => expandImage(document.querySelector("#capability-img")));
document.querySelectorAll("[data-image-open]").forEach(button => button.addEventListener("click", () => expandImage(button.querySelector("img"))));

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
