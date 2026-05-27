const today = new Date();
const todayKey = toDateKey(today);
const localStorageKeys = {
  notes: "mimic-daily-notes",
  completions: "mimic-daily-completions",
  readInsights: "mimic-read-insights",
  favoriteInsights: "mimic-favorite-insights",
  blogPosts: "mimic-blog-posts",
  blogDrafts: "mimic-blog-drafts",
  blogTitles: "mimic-blog-titles",
  blogTitleDrafts: "mimic-blog-title-drafts"
};
let notes = {};
let completions = {};
let readInsights = {};
let favoriteInsights = {};
let blogPosts = {};
let blogDrafts = {};
let blogTitles = {};
let blogTitleDrafts = {};
let insightLibrary = null;
let currentInsightItems = [];
let activeInsightView = "today";
let moreInsightLoaded = false;
let currentBlogDate = todayKey;
let localDataWritable = false;
let stateSaveTimer = 0;

initApp();

async function initApp() {
  await loadUserData();
  bindDailyInputs();
  renderOverview();
  renderInsights();
  bindViewSwitch();
  bindBlogEditor();
  bindBlogExport();
}

async function loadUserData() {
  const localFallback = readLocalStorageState();
  const sourceUrl = isLocalHost() ? "/api/user-data" : "./data/user-data.json";
  try {
    const response = await fetch(sourceUrl, { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    applyUserData(isLocalHost() ? mergeUserData(localFallback, data) : mergeUserData({}, data));
    localDataWritable = isLocalHost() && sourceUrl === "/api/user-data";
  } catch {
    applyUserData(localFallback);
    localDataWritable = false;
  }
  writeLocalStorageState();
}

function bindDailyInputs() {
  document.querySelectorAll("[data-note]").forEach((input) => {
    const key = `${todayKey}:${input.dataset.note}`;
    input.value = notes[key] || "";
    input.addEventListener("input", () => {
      notes[key] = input.value;
      scheduleUserDataSave({ publish: true, message: "Update DailyBlog todo notes" });
    });
  });

  document.querySelectorAll("[data-complete]").forEach((input) => {
    const key = `${todayKey}:${input.dataset.complete}`;
    input.checked = Boolean(completions[key]);
    input.addEventListener("change", () => {
      completions[key] = input.checked;
      scheduleUserDataSave({ publish: true, message: "Update DailyBlog completions" });
      renderOverview();
    });
  });
}

function readLocalStorageState() {
  return Object.fromEntries(
    Object.entries(localStorageKeys).map(([key, storageKey]) => [key, readStorageObject(storageKey)])
  );
}

function readStorageObject(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    return {};
  }
}

function applyUserData(data) {
  notes = data.notes || {};
  completions = data.completions || {};
  readInsights = data.readInsights || {};
  favoriteInsights = data.favoriteInsights || {};
  blogPosts = data.blogPosts || {};
  blogDrafts = data.blogDrafts || {};
  blogTitles = data.blogTitles || {};
  blogTitleDrafts = data.blogTitleDrafts || {};
}

function mergeUserData(localData, remoteData) {
  const merged = {};
  for (const key of Object.keys(localStorageKeys)) {
    merged[key] = { ...(remoteData?.[key] || {}), ...(localData?.[key] || {}) };
  }
  return merged;
}

function getUserDataSnapshot() {
  return {
    version: 1,
    notes,
    completions,
    readInsights,
    favoriteInsights,
    blogPosts,
    blogDrafts,
    blogTitles,
    blogTitleDrafts
  };
}

function writeLocalStorageState() {
  for (const [key, storageKey] of Object.entries(localStorageKeys)) {
    localStorage.setItem(storageKey, JSON.stringify(getUserDataSnapshot()[key] || {}));
  }
}

function scheduleUserDataSave(options = {}) {
  writeLocalStorageState();
  window.clearTimeout(stateSaveTimer);
  stateSaveTimer = window.setTimeout(() => saveUserData(options), options.publish ? 1200 : 500);
}

async function saveUserData(options = {}) {
  writeLocalStorageState();
  if (!localDataWritable) return { ok: false, offline: true };
  try {
    const response = await fetch("/api/user-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: getUserDataSnapshot(),
        publish: Boolean(options.publish),
        message: options.message || "Update DailyBlog data"
      })
    });
    const result = await response.json();
    if (!response.ok || result.publish?.ok === false) {
      throw new Error(result.publish?.stderr || result.stderr || "Save failed");
    }
    return result;
  } catch (error) {
    setBlogSaveStatus(`Local save failed: ${error.message}`);
    return { ok: false, error };
  }
}

function isLocalHost() {
  return ["localhost", "127.0.0.1"].includes(window.location.hostname);
}

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
      scheduleUserDataSave({ publish: true, message: "Update DailyBlog insight reads" });
      renderOverview();
    });
  });
  list.querySelectorAll("[data-insight-favorite]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.insightFavorite;
      favoriteInsights[id] = !favoriteInsights[id];
      scheduleUserDataSave({ publish: true, message: "Update DailyBlog insight favorites" });
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

function bindViewSwitch() {
  const buttons = document.querySelectorAll("[data-app-view]");
  buttons.forEach((button) => {
    button.addEventListener("click", () => setAppView(button.dataset.appView));
  });
  setAppView(localStorage.getItem("mimic-active-view") || "todo");
}

function setAppView(view) {
  const activeView = view === "blog" ? "blog" : "todo";
  document.querySelectorAll("[data-app-view]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.appView === activeView);
  });
  document.querySelector("#todoView").hidden = activeView !== "todo";
  document.querySelector("#blogView").hidden = activeView !== "blog";
  document.querySelector("#pageTitle").textContent = activeView === "blog" ? "Daily Blog" : "Daily Todo";
  localStorage.setItem("mimic-active-view", activeView);
}

function bindBlogEditor() {
  const editor = document.querySelector("#blogEditor");
  const titleInput = document.querySelector("#blogTitle");
  if (!editor) return;
  setBlogEditorContent(editor, getBlogEditorContent(currentBlogDate));
  if (titleInput) titleInput.value = getBlogTitle(currentBlogDate);
  editor.addEventListener("input", () => {
    blogDrafts[currentBlogDate] = getBlogEditorValue(editor);
    scheduleUserDataSave({ publish: false, message: "Update DailyBlog blog draft" });
    setBlogSaveStatus("Drafting");
    renderBlog();
  });
  titleInput?.addEventListener("input", () => {
    blogTitleDrafts[currentBlogDate] = titleInput.value;
    scheduleUserDataSave({ publish: false, message: "Update DailyBlog blog draft" });
    setBlogSaveStatus("Drafting");
    renderBlog();
  });
  bindBlogToolbar();
  bindBlogSaveActions();
  renderBlog();
}

function renderBlog() {
  const stats = document.querySelector("#blogWordStats");
  const archive = document.querySelector("#blogArchive");
  const dateLabel = document.querySelector("#blogDateLabel");
  const weekdayLabel = document.querySelector("#blogWeekdayLabel");
  if (!stats || !archive) return;
  if (dateLabel) dateLabel.textContent = formatBlogDate(currentBlogDate);
  if (weekdayLabel) weekdayLabel.textContent = formatBlogWeekday(currentBlogDate);
  const editor = document.querySelector("#blogEditor");
  const content = editor ? getBlogEditorValue(editor) : getBlogEditorContent(currentBlogDate);
  const count = countBlogText(content);
  stats.textContent = `${count.characters} chars · ${count.words} words · ${count.lines} lines`;
  archive.innerHTML = renderBlogArchive();
  archive.querySelectorAll("[data-blog-date]").forEach((button) => {
    button.addEventListener("click", () => {
      currentBlogDate = button.dataset.blogDate;
      const editor = document.querySelector("#blogEditor");
      const titleInput = document.querySelector("#blogTitle");
      if (editor) setBlogEditorContent(editor, getBlogEditorContent(currentBlogDate));
      if (titleInput) titleInput.value = getBlogTitle(currentBlogDate);
      setBlogSaveStatus(blogDrafts[currentBlogDate] ? "Draft loaded" : "Saved loaded");
      renderBlog();
    });
  });
}

function renderBlogArticle(content) {
  const parsed = parseBlogContent(content);
  const body = parsed.blocks.length
    ? parsed.blocks.map(renderBlogBlock).join("")
    : `<p class="blog-empty">write blog</p>`;
  return `
    <header class="blog-hero">
      <time>${currentBlogDate}</time>
      <h2>${escapeHtml(parsed.title || "Untitled")}</h2>
      ${parsed.tags.length ? `<div class="blog-tags">${parsed.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
    </header>
    <div class="blog-body">${body}</div>
  `;
}

function parseBlogContent(content) {
  const lines = blogContentToLines(content);
  const titleLine = lines.find((line) => line.trim().startsWith("# "));
  const tagsLine = lines.find((line) => line.trim().toLowerCase().startsWith("tags:"));
  const title = titleLine ? cleanBlogText(titleLine.replace(/^#\s*/, "").trim()) : "";
  const tags = tagsLine ? tagsLine.split(":").slice(1).join(":").split(",").map((tag) => tag.trim()).filter(Boolean) : [];
  const blocks = [];
  let list = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line === titleLine || line === tagsLine) {
      flushList();
      continue;
    }
    if (/^#{1,3}\s+/.test(line)) {
      flushList();
      const level = Math.min(3, line.match(/^#+/)?.[0].length || 2);
      blocks.push({ type: "heading", level, text: cleanBlogText(line.replace(/^#{1,3}\s*/, "")) });
    } else if (line.startsWith("> ")) {
      flushList();
      blocks.push({ type: "quote", text: cleanBlogText(line.replace(/^>\s*/, "")) });
    } else if (/^[-*]\s+/.test(line)) {
      list.push(cleanBlogText(line.replace(/^[-*]\s+/, "")));
    } else {
      flushList();
      blocks.push({ type: "paragraph", text: cleanBlogText(line) });
    }
  }
  flushList();

  return { title, tags, blocks };

  function flushList() {
    if (!list.length) return;
    blocks.push({ type: "list", items: list });
    list = [];
  }
}

function renderBlogBlock(block) {
  if (block.type === "heading") return `<h3>${escapeHtml(block.text)}</h3>`;
  if (block.type === "quote") return `<blockquote>${escapeHtml(block.text)}</blockquote>`;
  if (block.type === "list") return `<ul>${block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
  return `<p>${escapeHtml(block.text)}</p>`;
}

function renderBlogArchive() {
  const entries = Object.entries(blogPosts)
    .filter(([dateKey, content]) => content.trim() || getBlogTitle(dateKey).trim())
    .sort(([a], [b]) => b.localeCompare(a));
  if (!entries.length) return `<span class="archive-empty">No posts</span>`;
  return entries.map(([dateKey, content]) => {
    const title = getBlogTitle(dateKey) || parseBlogContent(content).title || "Untitled";
    return `<button type="button" data-blog-date="${dateKey}" class="${dateKey === currentBlogDate ? "is-active" : ""}"><span>${dateKey}</span>${escapeHtml(title)}</button>`;
  }).join("");
}

function countBlogText(content) {
  const trimmed = cleanBlogText(content).trim();
  const cjk = trimmed.match(/[\u4e00-\u9fff]/g)?.length || 0;
  const words = trimmed.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g)?.length || 0;
  const lines = trimmed ? trimmed.split(/\n+/).filter((line) => line.trim()).length : 0;
  return {
    characters: [...trimmed.replace(/\s/g, "")].length,
    words: cjk + words,
    lines
  };
}

function getBlogEditorContent(dateKey) {
  return blogDrafts[dateKey] || blogPosts[dateKey] || "";
}

function getBlogTitle(dateKey) {
  return blogTitleDrafts[dateKey] || blogTitles[dateKey] || "";
}

function getBlogEditorValue(editor) {
  const html = editor.innerHTML.replace(/<br>$/i, "").trim();
  return html === "<br>" ? "" : html;
}

function setBlogEditorContent(editor, content) {
  editor.innerHTML = looksLikeHtml(content) ? content : plainBlogTextToHtml(content);
}

function looksLikeHtml(content) {
  return /<\/?[a-z][\s\S]*>/i.test(content || "");
}

function plainBlogTextToHtml(content) {
  const lines = (content || "").split("\n");
  if (!lines.length || !content.trim()) return "";
  return lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return "<p><br></p>";
    if (/^#\s+/.test(trimmed)) return `<h1>${escapeHtml(trimmed.replace(/^#\s+/, ""))}</h1>`;
    if (/^##\s+/.test(trimmed)) return `<h2>${escapeHtml(trimmed.replace(/^##\s+/, ""))}</h2>`;
    if (/^###\s+/.test(trimmed)) return `<h3>${escapeHtml(trimmed.replace(/^###\s+/, ""))}</h3>`;
    if (/^>\s+/.test(trimmed)) return `<blockquote>${escapeHtml(trimmed.replace(/^>\s+/, ""))}</blockquote>`;
    return `<p>${escapeHtml(trimmed)}</p>`;
  }).join("");
}

function blogContentToLines(content) {
  if (!looksLikeHtml(content)) return content.split("\n");
  const wrapper = document.createElement("div");
  wrapper.innerHTML = content;
  const lines = [];
  wrapper.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      if (text) lines.push(text);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = node.tagName.toLowerCase();
    const text = node.textContent.trim();
    if (!text) return;
    if (tag === "h1") lines.push(`# ${text}`);
    else if (tag === "h2") lines.push(`## ${text}`);
    else if (tag === "h3") lines.push(`### ${text}`);
    else if (tag === "blockquote") lines.push(`> ${text}`);
    else if (tag === "li") lines.push(`- ${text}`);
    else if (tag === "ul" || tag === "ol") {
      node.querySelectorAll("li").forEach((item) => {
        const itemText = item.textContent.trim();
        if (itemText) lines.push(`- ${itemText}`);
      });
    } else {
      lines.push(text);
    }
  });
  return lines;
}

function bindBlogToolbar() {
  document.querySelectorAll("[data-blog-format]").forEach((button) => {
    button.addEventListener("click", () => applyBlogFormat(button));
  });
}

function bindBlogSaveActions() {
  document.querySelector("#stashBlogDraft")?.addEventListener("click", () => {
    const editor = document.querySelector("#blogEditor");
    const titleInput = document.querySelector("#blogTitle");
    if (!editor) return;
    blogDrafts[currentBlogDate] = getBlogEditorValue(editor);
    blogTitleDrafts[currentBlogDate] = titleInput?.value || "";
    setBlogSaveStatus("Stashing...");
    saveUserData({ publish: false, message: "Update DailyBlog blog draft" }).then((result) => {
      setBlogSaveStatus(result.ok ? "Draft stashed" : "Draft stashed locally");
    });
    renderBlog();
  });

  document.querySelector("#saveBlogPost")?.addEventListener("click", () => {
    const editor = document.querySelector("#blogEditor");
    const titleInput = document.querySelector("#blogTitle");
    if (!editor) return;
    const content = getBlogEditorValue(editor);
    const title = titleInput?.value || "";
    blogPosts[currentBlogDate] = content;
    blogDrafts[currentBlogDate] = content;
    blogTitles[currentBlogDate] = title;
    blogTitleDrafts[currentBlogDate] = title;
    setBlogSaveStatus("Publishing...");
    saveUserData({ publish: true, message: `Publish DailyBlog post ${currentBlogDate}` }).then((result) => {
      setBlogSaveStatus(result.ok ? "Saved and pushed" : "Saved locally");
    });
    renderBlog();
  });
}

function applyBlogFormat(button) {
  const editor = document.querySelector("#blogEditor");
  if (!editor) return;
  const format = button.dataset.blogFormat;
  editor.focus();
  if (format === "bold") {
    document.execCommand("bold");
  } else if (format === "strike") {
    document.execCommand("strikeThrough");
  } else if (format === "color") {
    document.execCommand("foreColor", false, button.dataset.color);
  } else if (format === "heading") {
    const level = Number(button.dataset.level || 2);
    document.execCommand("formatBlock", false, `H${Math.min(3, Math.max(1, level))}`);
  }

  blogDrafts[currentBlogDate] = getBlogEditorValue(editor);
  scheduleUserDataSave({ publish: false, message: "Update DailyBlog blog draft" });
  setBlogSaveStatus("Drafting");
  renderBlog();
}

function setBlogSaveStatus(message) {
  const target = document.querySelector("#blogSaveStatus");
  if (!target) return;
  target.textContent = message;
}

function cleanBlogText(text) {
  return text
    .replace(/<span\s+style="color:\s*#[0-9a-fA-F]{3,6}">([\s\S]*?)<\/span>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\*\*([\s\S]*?)\*\*/g, "$1")
    .replace(/~~([\s\S]*?)~~/g, "$1");
}

function bindBlogExport() {
  document.querySelector("#exportBlogPng")?.addEventListener("click", exportBlogPngSeries);
}

async function exportBlogPngSeries() {
  const button = document.querySelector("#exportBlogPng");
  const status = document.querySelector("#exportBlogStatus");
  const editor = document.querySelector("#blogEditor");
  const content = editor ? getBlogEditorValue(editor) : getBlogEditorContent(currentBlogDate);
  const parsed = parseBlogContent(content);
  parsed.title = getBlogTitle(currentBlogDate) || parsed.title;
  if (button) button.disabled = true;
  if (status) status.textContent = "Rendering...";

  try {
    const slides = createBlogSlides(parsed);
    for (let index = 0; index < slides.length; index += 1) {
      const canvas = renderBlogSlide(slides[index], parsed, index + 1, slides.length);
      await downloadCanvas(canvas, `blog-${currentBlogDate}-${String(index + 1).padStart(2, "0")}.png`);
      await wait(140);
    }
    if (status) status.textContent = `${slides.length} PNG`;
  } finally {
    if (button) button.disabled = false;
  }
}

function formatBlogDate(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function formatBlogWeekday(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

function createBlogSlides(parsed) {
  const width = 1080;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const maxWidth = width - 184;
  const slides = [{ type: "cover" }];
  const pages = [];
  let page = [];
  let y = 236;
  const maxY = 1250;

  const pushPage = () => {
    if (!page.length) return;
    pages.push(page);
    page = [];
    y = 236;
  };

  const addLine = (entry) => {
    const nextY = y + entry.height;
    if (nextY > maxY && page.length) pushPage();
    page.push({ ...entry, y });
    y += entry.height;
  };

  parsed.blocks.forEach((block) => {
    if (block.type === "heading") {
      const size = block.level === 1 ? 52 : block.level === 2 ? 44 : 38;
      context.font = `700 ${size}px Inter, system-ui, sans-serif`;
      wrapCanvasText(context, block.text, maxWidth).forEach((line) => addLine({ type: "heading", level: block.level, text: line, height: size + 22 }));
      y += 14;
      return;
    }
    if (block.type === "quote") {
      context.font = "700 38px Inter, system-ui, sans-serif";
      wrapCanvasText(context, block.text, maxWidth - 36).forEach((line) => addLine({ type: "quote", text: line, height: 58 }));
      y += 18;
      return;
    }
    if (block.type === "list") {
      context.font = "500 34px Inter, system-ui, sans-serif";
      block.items.forEach((item) => {
        wrapCanvasText(context, item, maxWidth - 42).forEach((line, lineIndex) => {
          addLine({ type: "list", text: line, bullet: lineIndex === 0, height: 50 });
        });
        y += 8;
      });
      y += 8;
      return;
    }
    context.font = "500 34px Inter, system-ui, sans-serif";
    wrapCanvasText(context, block.text, maxWidth).forEach((line) => addLine({ type: "paragraph", text: line, height: 52 }));
    y += 24;
  });
  pushPage();

  return [...slides, ...pages.map((items) => ({ type: "content", items }))];
}

function renderBlogSlide(slide, parsed, pageNumber, totalPages) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1440;
  const ctx = canvas.getContext("2d");
  const title = parsed.title || "Untitled";

  drawCanvasBackground(ctx);
  ctx.fillStyle = "#1f1f1f";

  if (slide.type === "cover") {
    drawCanvasPill(ctx, 92, 92, currentBlogDate);
    ctx.font = "800 78px Inter, system-ui, sans-serif";
    wrapCanvasText(ctx, title, 820).slice(0, 5).forEach((line, index) => {
      ctx.fillText(line, 92, 300 + index * 92);
    });
    if (parsed.tags.length) {
      let tagX = 92;
      const tagY = 820;
      parsed.tags.slice(0, 5).forEach((tag) => {
        ctx.font = "800 26px Inter, system-ui, sans-serif";
        const tagWidth = ctx.measureText(tag).width + 42;
        roundRect(ctx, tagX, tagY, tagWidth, 48, 24, "#f5f5f5", "#e6e6e6");
        ctx.fillStyle = "#6f6f6f";
        ctx.fillText(tag, tagX + 21, tagY + 32);
        tagX += tagWidth + 14;
      });
    }
    ctx.fillStyle = "#1f1f1f";
    ctx.font = "700 34px Inter, system-ui, sans-serif";
    ctx.fillText("Blog Notes", 92, 1190);
    drawCanvasPage(ctx, pageNumber, totalPages);
    return canvas;
  }

  ctx.font = "800 28px Inter, system-ui, sans-serif";
  ctx.fillText(title, 92, 118);
  ctx.fillStyle = "#6f6f6f";
  ctx.font = "700 24px Inter, system-ui, sans-serif";
  ctx.fillText(currentBlogDate, 92, 154);

  slide.items.forEach((item) => {
    if (item.type === "heading") {
      ctx.fillStyle = "#1f1f1f";
      const size = item.level === 1 ? 52 : item.level === 2 ? 44 : 38;
      ctx.font = `800 ${size}px Inter, system-ui, sans-serif`;
      ctx.fillText(item.text, 92, item.y);
    } else if (item.type === "quote") {
      ctx.fillStyle = "#1f1f1f";
      roundRect(ctx, 92, item.y - 40, 8, 48, 4, "#1f1f1f");
      ctx.fillStyle = "#6f6f6f";
      ctx.font = "700 38px Inter, system-ui, sans-serif";
      ctx.fillText(item.text, 120, item.y);
    } else if (item.type === "list") {
      ctx.fillStyle = "#1f1f1f";
      ctx.font = "500 34px Inter, system-ui, sans-serif";
      if (item.bullet) ctx.fillText("•", 92, item.y);
      ctx.fillText(item.text, 134, item.y);
    } else {
      ctx.fillStyle = "#1f1f1f";
      ctx.font = "500 34px Inter, system-ui, sans-serif";
      ctx.fillText(item.text, 92, item.y);
    }
  });
  drawCanvasPage(ctx, pageNumber, totalPages);
  return canvas;
}

function drawCanvasBackground(ctx) {
  const gradient = ctx.createLinearGradient(0, 0, 1080, 1440);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(1, "#f1f1f1");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1080, 1440);
  roundRect(ctx, 54, 54, 972, 1332, 42, "rgba(255,255,255,0.72)", "#e6e6e6");
}

function drawCanvasPill(ctx, x, y, text) {
  ctx.font = "800 26px Inter, system-ui, sans-serif";
  const width = ctx.measureText(text).width + 44;
  roundRect(ctx, x, y, width, 52, 26, "#f5f5f5", "#e6e6e6");
  ctx.fillStyle = "#6f6f6f";
  ctx.fillText(text, x + 22, y + 35);
}

function drawCanvasPage(ctx, pageNumber, totalPages) {
  ctx.fillStyle = "#6f6f6f";
  ctx.font = "800 24px Inter, system-ui, sans-serif";
  ctx.fillText(`${pageNumber}/${totalPages}`, 92, 1320);
}

function wrapCanvasText(ctx, text, maxWidth) {
  const lines = [];
  let line = "";
  for (const char of text) {
    const testLine = line + char;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = char.trimStart();
    } else {
      line = testLine;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function downloadCanvas(canvas, filename) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve();
        return;
      }
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      window.setTimeout(() => {
        URL.revokeObjectURL(link.href);
        resolve();
      }, 80);
    }, "image/png");
  });
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
