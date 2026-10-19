"use strict";

// Keep temporary release-cache parameters out of shared page addresses.
const pageAddress = new URL(window.location.href);
if (pageAddress.searchParams.has("v")) {
  pageAddress.searchParams.delete("v");
  window.history.replaceState(window.history.state, "", pageAddress.pathname + pageAddress.search + pageAddress.hash);
}

const capabilities = {
  overview: { chapter: "devices", source: "设备管理界面", action: "观看设备联动", image: "scene-devices.webp", alt: "设备管理面板与三维厂区联动界面", kicker: "设备与档案", title: ["从设备条目", "定位到三维现场"], description: "选择设备条目，相机聚焦到对应位置；点击三维设备，打开信息面板。空间位置与设备档案使用同一对象关联。", items: ["浏览厂区、车间与设备层级", "查看设备信息和运行状态", "验证面板与场景的双向定位"] },
  process: { chapter: "pipes", source: "介质管网界面", action: "观看管网流向", image: "scene-pipes.webp", alt: "通过颜色和动态流向区分介质的三维管网界面", kicker: "管道与介质", title: ["沿设备连接", "查看介质的输送路径"], description: "在同一场景中查看设备、管道与阀门。颜色区分不同介质，流向动画说明输送方向，便于对照工艺连接和空间位置。", items: ["区分原料液、产品油、蒸汽与冷却水", "追踪管道、阀门与设备的连接", "对照工艺流程与三维管网"] },
  data: { chapter: "data", source: "数据中心界面", action: "观看趋势查询", image: "scene-data.webp", alt: "数据中心的历史趋势曲线、统计图表与三维设备", kicker: "测点与记录", title: ["选定设备和时段", "对照历史趋势"], description: "选择设备和查询时段，比较温度、压力、液位与电流等测点曲线。结合事件记录，检查变化发生的时间和对应对象。", items: ["查询与叠加多路测点曲线", "查看聚合统计和运行记录", "结合报警事件进行复盘"] },
  ai: { chapter: "ai", source: "智能分析界面", action: "观看分析演示", image: "scene-ai.webp", alt: "智能分析面板中的异常趋势、预测维护和能耗建议", kicker: "异常与分析", title: ["对照异常趋势", "查看分析依据"], description: "分析界面集中呈现异常趋势、预测维护和能耗建议。教学任务进一步要求核验数据与引用来源，对比不同配置下的误报、漏报与检索结果。", items: ["查看异常变化与相关测点", "对照预测维护和能耗建议", "用独立测试样本评估分析结果"] }
};

const processViews = {
  flow: { image: "scene-flow.webp", alt: "工艺管理中的流程、阀门管道配置和三维厂区同屏展示", source: "工艺管理界面", title: "对照工艺流程，查看设备位置", description: "工艺管理界面将流程、阀门配置和三维场景组织在一起。选择流程中的设备，即可对照它在厂区中的位置与连接关系。", chapter: "process", action: "观看工艺演示" },
  pipes: { image: "scene-pipes.webp", alt: "三维场景中以颜色和流向呈现介质管网", source: "介质管网界面", title: "沿着管线，追踪介质流向", description: "查看设备、管道和阀门之间的连接。管线颜色区分介质，流向动画展示物料的输送方向。", chapter: "pipes", action: "观看管网流向" },
  scada: { image: "scada.webp", alt: "二维SCADA工艺组态图中的设备、管线与测点", source: "二维 SCADA 界面", title: "对照二维组态，理解工艺连接", description: "以工艺组态图呈现设备、管线与测点。在二维监控与三维场景之间，对照同一套工艺的流程连接和空间位置。", chapter: "scada", action: "观看 SCADA 演示" }
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
  operations: { start: 219, title: "运维界面" },
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
let requestedChapter = "full";
let videoLoadFailed = false;
const videoError = document.querySelector(".video-error");
function playChapter(key = "full") {
  requestedChapter = Object.prototype.hasOwnProperty.call(videoChapters, key) ? key : "full";
  const chapter = videoChapters[requestedChapter];
  pendingVideoStart = chapter.start;
  document.querySelector("#video-dialog-title").textContent = `东粤化学 · ${chapter.title}`;
  document.querySelector("#video-context").textContent = chapter.start ? `从 ${formatTime(chapter.start)} 开始 · 可继续观看后续演示` : "完整演示 · 05:16";
  if (videoLoadFailed || video.error || video.readyState === 0) video.load();
  else seekToChapter();
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
function showVideoError() { videoLoadFailed = true; videoError.hidden = false; }
video.addEventListener("error", showVideoError);
video.querySelectorAll("source").forEach(source => source.addEventListener("error", showVideoError));
video.addEventListener("loadstart", () => { videoLoadFailed = false; videoError.hidden = true; });
video.addEventListener("loadeddata", () => { videoLoadFailed = false; videoError.hidden = true; });
document.querySelector("#retry-video").addEventListener("click", () => playChapter(requestedChapter));
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
    if (!heroMotion.getAttribute("src")) heroMotion.src = "assets/hero-factory-hd-loop.mp4";
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
const learningTabs = [...document.querySelectorAll("[data-learning]")];
wireTabs(learningTabs, button => {
  learningTabs.forEach(tab => {
    const selected = tab === button;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    document.getElementById(tab.getAttribute("aria-controls")).hidden = !selected;
  });
});

if ("IntersectionObserver" in window) {
  const links = [...navigation.querySelectorAll("a")];
  const observer = new IntersectionObserver(entries => { entries.forEach(entry => { if (entry.isIntersecting) links.forEach(link => { const active = link.hash === `#${entry.target.id}`; link.classList.toggle("active", active); if (active) link.setAttribute("aria-current", "location"); else link.removeAttribute("aria-current"); }); }); }, {rootMargin:"-20% 0px -60% 0px",threshold:0});
  links.forEach(link => { const section = document.querySelector(link.hash); if (section) observer.observe(section); });
}
