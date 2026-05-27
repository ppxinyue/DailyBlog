const today = new Date();
const todayKey = toDateKey(today);
const notes = JSON.parse(localStorage.getItem("mimic-daily-notes") || "{}");
const completions = JSON.parse(localStorage.getItem("mimic-daily-completions") || "{}");
const readInsights = JSON.parse(localStorage.getItem("mimic-read-insights") || "{}");
const favoriteInsights = JSON.parse(localStorage.getItem("mimic-favorite-insights") || "{}");
let insightLibrary = null;
let currentInsightItems = [];
let activeInsightView = "today";
let moreInsightLoaded = false;

document.querySelectorAll("[data-note]").forEach((input) => {
  const key = `${todayKey}:${input.dataset.note}`;
  input.value = notes[key] || "";
  input.addEventListener("input", () => {
    notes[key] = input.value;
    localStorage.setItem("mimic-daily-notes", JSON.stringify(notes));
  });
});

document.querySelectorAll("[data-complete]").forEach((input) => {
  const key = `${todayKey}:${input.dataset.complete}`;
  input.checked = Boolean(completions[key]);
  input.addEventListener("change", () => {
    completions[key] = input.checked;
    localStorage.setItem("mimic-daily-completions", JSON.stringify(completions));
    renderOverview();
  });
});

renderOverview();
renderInsights();

async function renderInsights() {
  const list = document.querySelector("#insightList");
  if (!list) return;

  try {
    const response = await fetch("./data/insights.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    insightLibrary = await response.json();
    currentInsightItems = insightLibrary.days?.[todayKey] || [];
    renderInsightChannels(insightLibrary.watchlist || []);
    bindInsightActions();

    if (!currentInsightItems.length) {
      list.textContent = "今日暂无 Insight";
      renderOverview();
      return;
    }

    renderInsightList(currentInsightItems);
    renderOverview();
  } catch {
    list.innerHTML = `<a href="./data/insights.json" target="_blank" rel="noreferrer">今日 Insight</a>`;
    renderOverview();
  }
}

function renderInsightChannels(channels) {
  const target = document.querySelector("#insightChannels");
  if (!target) return;
  target.innerHTML = `
    <span>检索渠道：</span>
    ${channels.map((channel) => `<a href="${channel.url}" target="_blank" rel="noreferrer">${channel.name}</a>`).join("")}
  `;
}

function bindInsightActions() {
  document.querySelectorAll("[data-insight-view]").forEach((button) => {
    button.addEventListener("click", () => {
      activeInsightView = button.dataset.insightView;
      moreInsightLoaded = false;
      if (activeInsightView === "history") renderInsightHistory();
      if (activeInsightView === "saved") renderSavedInsights();
      setActiveInsightButton();
    });
  });

  document.querySelector("#moreInsightButton")?.addEventListener("click", runMoreInsightSearch);
}

function setActiveInsightButton() {
  document.querySelectorAll("[data-insight-view]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.insightView === activeInsightView);
  });
}

function renderInsightList(items, options = {}) {
  const list = document.querySelector("#insightList");
  if (!list) return;
  if (!items.length) {
    list.textContent = options.emptyText || "暂无 Insight";
    return;
  }
  list.innerHTML = items.map((item) => renderInsightItem(item, options)).join("");
  bindInsightItemControls();
}

function bindInsightItemControls() {
  const list = document.querySelector("#insightList");
  if (!list) return;
  list.querySelectorAll("[data-insight-read]").forEach((input) => {
    input.addEventListener("change", () => {
      readInsights[input.dataset.insightRead] = input.checked;
      localStorage.setItem("mimic-read-insights", JSON.stringify(readInsights));
      renderOverview();
    });
  });
  list.querySelectorAll("[data-insight-favorite]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.insightFavorite;
      favoriteInsights[id] = !favoriteInsights[id];
      localStorage.setItem("mimic-favorite-insights", JSON.stringify(favoriteInsights));
      button.textContent = favoriteInsights[id] ? "★" : "☆";
      button.setAttribute("aria-pressed", String(Boolean(favoriteInsights[id])));
      renderOverview();
      if (activeInsightView === "saved" && !favoriteInsights[id]) renderSavedInsights();
    });
  });
}

function renderInsightHistory() {
  const groups = Object.entries(insightLibrary?.days || {})
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, items]) => `
      <section class="insight-history-group">
        <h3>${dateKey}</h3>
        ${items.map((item) => renderInsightItem(item)).join("")}
      </section>
    `)
    .join("");
  const list = document.querySelector("#insightList");
  if (!list) return;
  list.innerHTML = groups || "暂无历史 Insight";
  bindInsightItemControls();
}

function renderSavedInsights() {
  const saved = getAllInsightItems().filter((item) => favoriteInsights[item.id]);
  renderInsightList(saved, { emptyText: "暂无收藏" });
}

function runMoreInsightSearch() {
  const button = document.querySelector("#moreInsightButton");
  const list = document.querySelector("#insightList");
  if (!button || !list || moreInsightLoaded) return;
  activeInsightView = "today";
  setActiveInsightButton();
  button.disabled = true;
  list.insertAdjacentHTML("beforeend", `<article class="insight-loading" aria-live="polite"><span></span></article>`);
  window.setTimeout(() => {
    const loading = list.querySelector(".insight-loading");
    const moreItems = insightLibrary?.moreSearch?.[todayKey] || insightLibrary?.moreSearch?.default || [];
    moreInsightLoaded = true;
    currentInsightItems = [...currentInsightItems, ...moreItems];
    if (loading) loading.remove();
    renderInsightList(currentInsightItems);
    button.disabled = false;
  }, 900);
}

function getAllInsightItems() {
  const dayItems = Object.entries(insightLibrary?.days || {})
    .sort(([a], [b]) => b.localeCompare(a))
    .flatMap(([, items]) => items);
  const moreItems = Object.values(insightLibrary?.moreSearch || {}).flatMap((items) => items);
  const byId = new Map([...dayItems, ...moreItems].map((item) => [item.id, item]));
  return [...byId.values()];
}

function renderInsightItem(item) {
  const star = item.starSummary || {};
  const domains = Array.isArray(item.tags) ? item.tags.join(" / ") : "";
  const source = [item.sourceName, item.sourceType].filter(Boolean).join(" / ");
  const isFavorite = Boolean(favoriteInsights[item.id]);
  return `
    <article class="insight-item">
      <div class="insight-title-row">
        <label class="read-row">
          <input type="checkbox" data-insight-read="${item.id}" ${readInsights[item.id] ? "checked" : ""} />
          <span>
            <a href="${item.url}" target="_blank" rel="noreferrer">${item.title}</a>
            <span class="insight-meta">来源：${source || "未注明"} · 领域：${domains || "未注明"}</span>
          </span>
        </label>
        <button class="favorite-button" type="button" data-insight-favorite="${item.id}" aria-label="收藏" aria-pressed="${isFavorite}">${isFavorite ? "★" : "☆"}</button>
      </div>
      <dl class="star-summary">
        <dt>S</dt><dd>${star.situation || item.zhSummary || ""}</dd>
        <dt>T</dt><dd>${star.task || item.whyItMatters || ""}</dd>
        <dt>A</dt><dd>${star.action || ""}</dd>
        <dt>R</dt><dd>${star.result || ""}</dd>
      </dl>
    </article>
  `;
}

function renderOverview() {
  renderStats();
  renderCalendar();
}

function renderStats() {
  const target = document.querySelector("#dailyStats");
  if (!target) return;
  const todayDone = getDayCompletion(todayKey);
  const favoriteCount = Object.values(favoriteInsights).filter(Boolean).length;
  const fullDays = getMonthDateKeys(today.getFullYear(), today.getMonth()).filter((key) => getDayCompletion(key).done === 4).length;
  const monthDays = getMonthDateKeys(today.getFullYear(), today.getMonth()).length;
  const stats = [
    { label: "Today", value: todayDone.done, max: 4 },
    { label: "Month", value: fullDays, max: monthDays },
    { label: "Saved", value: favoriteCount, max: Math.max(favoriteCount, 6) }
  ];
  target.innerHTML = `
    ${stats.map((stat) => `
      <div class="stat-chart">
        <span>${stat.label}</span>
        <strong>${stat.value}</strong>
        <i style="--value: ${Math.min(100, Math.round((stat.value / stat.max) * 100))}%"></i>
      </div>
    `).join("")}
  `;
}

function renderCalendar() {
  const target = document.querySelector("#calendar");
  if (!target) return;
  const year = today.getFullYear();
  const month = today.getMonth();
  const monthKeys = getMonthDateKeys(year, month);
  const leadingBlanks = new Date(year, month, 1).getDay();
  const cells = [
    ...Array.from({ length: leadingBlanks }, () => `<span class="calendar-cell calendar-blank"></span>`),
    ...monthKeys.map((key) => {
      const day = Number(key.slice(-2));
      const completion = getDayCompletion(key);
      const classes = ["calendar-cell"];
      if (key === todayKey) classes.push("is-today");
      if (completion.done === 4) classes.push("is-complete");
      return `<span class="${classes.join(" ")}" title="${completion.done}/4">${day}</span>`;
    })
  ].join("");
  target.innerHTML = `
    <div class="calendar-month">${year}.${String(month + 1).padStart(2, "0")}</div>
    <div class="calendar-grid">${cells}</div>
  `;
}

function getDayCompletion(dateKey) {
  const modules = ["english", "chinese", "coding"];
  let done = modules.filter((module) => completions[`${dateKey}:${module}`]).length;
  const items = insightLibrary?.days?.[dateKey] || [];
  if (items.length && items.every((item) => readInsights[item.id])) done += 1;
  return { done };
}

function getMonthDateKeys(year, month) {
  const days = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: days }, (_, index) => toDateKey(new Date(year, month, index + 1)));
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
