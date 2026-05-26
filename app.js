const todayKey = new Date().toISOString().slice(0, 10);
const notes = JSON.parse(localStorage.getItem("mimic-daily-notes") || "{}");
const completions = JSON.parse(localStorage.getItem("mimic-daily-completions") || "{}");
const readInsights = JSON.parse(localStorage.getItem("mimic-read-insights") || "{}");

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
  });
});

renderInsights();

async function renderInsights() {
  const list = document.querySelector("#insightList");
  if (!list) return;

  try {
    const response = await fetch("./data/insights.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const library = await response.json();
    const items = library.days?.[todayKey] || [];
    renderInsightChannels(library.watchlist || []);

    if (!items.length) {
      list.textContent = "今日暂无 Insight";
      return;
    }

    list.innerHTML = items.map(renderInsightItem).join("");
    list.querySelectorAll("[data-insight-read]").forEach((input) => {
      input.addEventListener("change", () => {
        readInsights[input.dataset.insightRead] = input.checked;
        localStorage.setItem("mimic-read-insights", JSON.stringify(readInsights));
      });
    });
  } catch {
    list.innerHTML = `<a href="./data/insights.json" target="_blank" rel="noreferrer">今日 Insight</a>`;
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
  return `
    <article class="insight-item">
      <label class="read-row">
        <input type="checkbox" data-insight-read="${item.id}" ${readInsights[item.id] ? "checked" : ""} />
        <span>
          <a href="${item.url}" target="_blank" rel="noreferrer">${item.title}</a>
          <span class="insight-meta">来源：${source || "未注明"} · 领域：${domains || "未注明"}</span>
        </span>
      </label>
      <dl class="star-summary">
        <dt>S</dt><dd>${star.situation || item.zhSummary || ""}</dd>
        <dt>T</dt><dd>${star.task || item.whyItMatters || ""}</dd>
        <dt>A</dt><dd>${star.action || ""}</dd>
        <dt>R</dt><dd>${star.result || ""}</dd>
      </dl>
    </article>
  `;
}
