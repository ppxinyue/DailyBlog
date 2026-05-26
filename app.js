const today = new Date();
const todayKey = toDateKey(today);
const notes = JSON.parse(localStorage.getItem("mimic-daily-notes") || "{}");
const completions = JSON.parse(localStorage.getItem("mimic-daily-completions") || "{}");
const readInsights = JSON.parse(localStorage.getItem("mimic-read-insights") || "{}");
const favoriteInsights = JSON.parse(localStorage.getItem("mimic-favorite-insights") || "{}");
let insightLibrary = null;

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
    const items = insightLibrary.days?.[todayKey] || [];
    renderInsightChannels(insightLibrary.watchlist || []);

    if (!items.length) {
      list.textContent = "今日暂无 Insight";
      renderOverview();
      return;
    }

    list.innerHTML = items.map(renderInsightItem).join("");
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
      });
    });
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
  target.innerHTML = `
    <span>Today ${todayDone.done}/4</span>
    <span>Month ${fullDays}</span>
    <span>Saved ${favoriteCount}</span>
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
