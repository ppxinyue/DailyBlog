const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const today = new Date();
let selectedDate = new Date(today);
let calendarMonth = new Date(today.getFullYear(), today.getMonth(), 1);
let contentLibrary = null;
let insightLibrary = null;
let codingProblems = [];
let activeProblemIndex = 0;
let hintIndex = 1;
let todoState = loadTodoState();
let mediaStream = null;
let mediaRecorder = null;
let recordedChunks = [];
let drawTimer = null;
let recordings = [];
let db = null;

const defaultReading = {
  title: "每日一文",
  paragraphs: [
    "今天的中文阅读建议跳转到“每日一文”完成。读完之后回到这里，用朗读录制记录一次完整表达。",
    "录制只用于中文朗读；英语跟读直接在外部专业站点完成。",
  ],
};

init();

async function init() {
  contentLibrary = await loadJson("./data/content-library.json", buildFallbackContentLibrary());
  insightLibrary = await loadJson("./data/insights.json", { days: {} });
  recordings = await loadRecordings();
  setLessonsForDate(selectedDate);
  bindEvents();
  renderAll();
}

function bindEvents() {
  $("#prevMonth").addEventListener("click", () => {
    calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1);
    renderCalendar();
  });
  $("#nextMonth").addEventListener("click", () => {
    calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1);
    renderCalendar();
  });
  $$("[data-task]").forEach((input) => {
    input.addEventListener("change", () => {
      setTaskDone(input.dataset.task, input.checked);
      renderStats();
      renderCalendar();
    });
  });
  $("#checkSyntax").addEventListener("click", async () => {
    const result = await analyzePythonCode($("#codeEditor").value, getActiveProblem());
    $("#judgeOutput").textContent = formatAnalysis(result);
  });
  $("#submitCode").addEventListener("click", async () => {
    const result = await analyzePythonCode($("#codeEditor").value, getActiveProblem());
    if (!result.errors.length) setTaskDone("coding", true);
    $("#judgeOutput").textContent = `${result.errors.length ? "Rejected" : "Local Accepted"}\n\n${formatAnalysis(result)}`;
    renderStats();
    renderCalendar();
  });
  $("#nextHint").addEventListener("click", () => {
    hintIndex += 1;
    renderHints();
  });
  $("#openReadingStudio").addEventListener("click", openReadingStudio);
  $("#closeStudio").addEventListener("click", closeStudio);
  $("#enableCamera").addEventListener("click", enableCamera);
  $("#startRecording").addEventListener("click", startRecording);
  $("#stopRecording").addEventListener("click", stopRecording);
  $("#clearRecordings").addEventListener("click", clearRecordings);
}

function renderAll() {
  $("#todayLabel").textContent = formatDisplayDate(today);
  $("#selectedDateLabel").textContent = formatDisplayDate(selectedDate);
  renderStats();
  renderCalendar();
  renderTodoChecks();
  renderReading();
  renderCoding();
  renderInsights();
  renderRecordings();
}

function renderStats() {
  const state = getDayTodo();
  const done = Object.values(state).filter(Boolean).length;
  const percent = Math.round((done / 4) * 100);
  $("#completedCount").textContent = `${done}/4`;
  $("#completionRate").textContent = `${percent}%`;
  $("#todoProgressBar").style.width = `${percent}%`;
  $("#totalDone").textContent = Object.values(todoState)
    .flatMap((day) => Object.values(day))
    .filter(Boolean).length;
  $("#streakCount").textContent = calculateStreak();
  renderTodoChecks();
}

function renderTodoChecks() {
  const state = getDayTodo();
  $$("[data-task]").forEach((input) => {
    input.checked = Boolean(state[input.dataset.task]);
    input.closest(".todo-card")?.classList.toggle("done", input.checked);
  });
}

function renderCalendar() {
  $("#calendarTitle").textContent = `${calendarMonth.getFullYear()} 年 ${calendarMonth.getMonth() + 1} 月`;
  const grid = $("#calendarGrid");
  grid.innerHTML = "";
  const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const totalDays = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
  for (let i = 0; i < startOffset; i += 1) grid.append(document.createElement("span"));
  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
    const key = toDateKey(date);
    const button = document.createElement("button");
    button.className = "calendar-day";
    if (key === toDateKey(selectedDate)) button.classList.add("active");
    if (Object.values(todoState[key] || {}).filter(Boolean).length === 4) button.classList.add("complete");
    button.textContent = day;
    button.addEventListener("click", () => {
      selectedDate = date;
      setLessonsForDate(selectedDate);
      renderAll();
    });
    grid.append(button);
  }
}

function renderReading() {
  const reading = getReadingForDate(selectedDate);
  $("#readingText").innerHTML = `
    <h3>${reading.title}</h3>
    ${reading.paragraphs.slice(0, 2).map((paragraph) => `<p>${paragraph}</p>`).join("")}
  `;
}

function renderCoding() {
  const active = getActiveProblem();
  $("#codingTitle").textContent = `${formatDisplayDate(selectedDate)} · ${active.topic || "Interview practice"}`;
  $("#problemList").innerHTML = codingProblems
    .map((problem, index) => `
      <button class="problem-card ${index === activeProblemIndex ? "active" : ""}" data-index="${index}">
        <span>${index + 1}. ${problem.title}</span>
        <small>${problem.category === "llm" ? "LLM hand coding" : "LeetCode Hot 100"} · ${problem.difficulty || "Practice"}</small>
      </button>
    `)
    .join("");
  $$(".problem-card").forEach((button) => {
    button.addEventListener("click", () => {
      activeProblemIndex = Number(button.dataset.index);
      hintIndex = 1;
      renderCoding();
    });
  });
  $("#codeEditor").value = active.starterCode || "def solve():\n    pass\n";
  renderHints();
  $("#judgeOutput").textContent = "本地 Python 后端会检查语法、行列位置和函数签名。";
}

function renderHints() {
  const hints = getActiveProblem().hints || ["先写出函数签名，再处理边界条件。"];
  $("#hintList").innerHTML = hints
    .slice(0, Math.max(1, hintIndex))
    .map((hint, index) => `<div class="hint-item"><strong>${index + 1}</strong><span>${hint}</span></div>`)
    .join("");
}

function renderInsights() {
  const items = getInsightsForDate(selectedDate);
  const list = $("#insightList");
  if (!items.length) {
    list.className = "insight-list empty";
    list.textContent = "该日期暂无 Insight。每日 0 点自动更新后会显示。";
    return;
  }
  list.className = "insight-list";
  list.innerHTML = items
    .map((item) => `
      <article class="insight-card">
        <div>
          <h3>${item.title}</h3>
          <p class="meta">${item.sourceName} · ${item.publishedAt}</p>
        </div>
        <p>${item.detailedSummary || item.zhSummary}</p>
        <p><strong>为什么重要：</strong>${item.whyItMatters}</p>
        <div class="tag-row">${(item.tags || []).map((tag) => `<span>${tag}</span>`).join("")}</div>
        <a href="${item.url}" target="_blank" rel="noreferrer">查看原链接</a>
      </article>
    `)
    .join("");
}

async function analyzePythonCode(code, problem) {
  try {
    const response = await fetch("/api/python/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        expectedSignature: problem?.expectedSignature || "",
        keywords: problem?.keywords || [],
      }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    return {
      backend: "browser-fallback",
      errors: [],
      warnings: ["本地 Python 后端不可用。请用 `python3 server.py` 启动后端。"],
    };
  }
}

function formatAnalysis(result) {
  const lines = [`Backend: ${result.backend || "unknown"}`];
  if (!result.errors?.length && !result.warnings?.length) lines.push("未发现本地可检测的问题。");
  if (result.errors?.length) lines.push("Errors:", ...result.errors.map((error) => `- ${error}`));
  if (result.warnings?.length) lines.push("Warnings:", ...result.warnings.map((warning) => `- ${warning}`));
  return lines.join("\n");
}

function openReadingStudio() {
  $("#studio").classList.add("open");
  $("#studio").setAttribute("aria-hidden", "false");
  $("#studioTitle").textContent = getReadingForDate(selectedDate).title;
  startCanvasLoop();
}

function closeStudio() {
  if (mediaRecorder?.state === "recording") mediaRecorder.stop();
  $("#studio").classList.remove("open");
  $("#studio").setAttribute("aria-hidden", "true");
  stopCamera();
  stopCanvasLoop();
}

async function enableCamera() {
  mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  $("#cameraVideo").srcObject = mediaStream;
  await $("#cameraVideo").play();
  $("#cameraHint").hidden = true;
  $("#startRecording").disabled = false;
}

function startRecording() {
  if (!mediaStream) return;
  recordedChunks = [];
  const stream = $("#compositeCanvas").captureStream(30);
  mediaStream.getAudioTracks().forEach((track) => stream.addTrack(track));
  mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });
  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size) recordedChunks.push(event.data);
  };
  mediaRecorder.onstop = saveRecording;
  mediaRecorder.start();
  $("#startRecording").disabled = true;
  $("#stopRecording").disabled = false;
}

function stopRecording() {
  if (mediaRecorder?.state === "recording") mediaRecorder.stop();
  $("#startRecording").disabled = false;
  $("#stopRecording").disabled = true;
  setTaskDone("chinese", true);
  renderStats();
}

async function saveRecording() {
  const blob = new Blob(recordedChunks, { type: "video/webm" });
  const item = {
    id: crypto.randomUUID(),
    title: getReadingForDate(selectedDate).title,
    createdAt: new Date(),
    size: blob.size,
    blob,
    url: URL.createObjectURL(blob),
  };
  recordings.unshift(item);
  await persistRecording(item);
  renderRecordings();
}

function startCanvasLoop() {
  const canvas = $("#compositeCanvas");
  const ctx = canvas.getContext("2d");
  const draw = () => {
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const video = $("#cameraVideo");
    if (video.videoWidth) drawContain(ctx, video, 0, 0, canvas.width, Math.floor(canvas.height * 0.56));
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(70, canvas.height * 0.6, canvas.width - 140, canvas.height * 0.3);
    ctx.fillStyle = "#1f2937";
    ctx.font = "700 46px sans-serif";
    ctx.textAlign = "left";
    wrapCanvasText(getReadingForDate(selectedDate).paragraphs.join(" "), 110, canvas.height * 0.66, canvas.width - 220, 64, 7);
    drawTimer = requestAnimationFrame(draw);
  };
  draw();
}

function stopCanvasLoop() {
  if (drawTimer) cancelAnimationFrame(drawTimer);
  drawTimer = null;
}

function drawContain(ctx, video, x, y, width, height) {
  const scale = Math.min(width / video.videoWidth, height / video.videoHeight);
  const drawWidth = video.videoWidth * scale;
  const drawHeight = video.videoHeight * scale;
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(x, y, width, height);
  ctx.drawImage(video, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function wrapCanvasText(text, x, y, maxWidth, lineHeight, maxLines) {
  const words = text.split("");
  let line = "";
  let lines = 0;
  for (const word of words) {
    const next = line + word;
    if ($("#compositeCanvas").getContext("2d").measureText(next).width > maxWidth && line) {
      $("#compositeCanvas").getContext("2d").fillText(line, x, y);
      y += lineHeight;
      line = word;
      lines += 1;
      if (lines >= maxLines) return;
    } else {
      line = next;
    }
  }
  $("#compositeCanvas").getContext("2d").fillText(line, x, y);
}

function stopCamera() {
  mediaStream?.getTracks().forEach((track) => track.stop());
  mediaStream = null;
  $("#cameraVideo").srcObject = null;
  $("#cameraHint").hidden = false;
  $("#startRecording").disabled = true;
  $("#stopRecording").disabled = true;
}

function renderRecordings() {
  const list = $("#recordingList");
  if (!recordings.length) {
    list.className = "recording-list empty";
    list.textContent = "暂无录制";
    return;
  }
  list.className = "recording-list";
  list.innerHTML = recordings
    .map((item) => `
      <article class="recording-item">
        <video src="${item.url}" controls></video>
        <div>
          <h3>${item.title}</h3>
          <p>${item.createdAt.toLocaleString()} · ${formatSize(item.size)}</p>
          <a class="button-link" href="${item.url}" download="${item.title}.webm">下载</a>
          <button class="danger ghost delete-recording" data-id="${item.id}">删除</button>
        </div>
      </article>
    `)
    .join("");
  $$(".delete-recording").forEach((button) => button.addEventListener("click", () => deleteRecording(button.dataset.id)));
}

async function openDb() {
  if (db) return db;
  db = await new Promise((resolve, reject) => {
    const request = indexedDB.open("mimic-recordings", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("recordings", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return db;
}

async function loadRecordings() {
  const database = await openDb();
  const items = await new Promise((resolve, reject) => {
    const request = database.transaction("recordings", "readonly").objectStore("recordings").getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return items.map((item) => ({ ...item, createdAt: new Date(item.createdAt), url: URL.createObjectURL(item.blob) })).reverse();
}

async function persistRecording(item) {
  const database = await openDb();
  database.transaction("recordings", "readwrite").objectStore("recordings").put({
    id: item.id,
    title: item.title,
    createdAt: item.createdAt.toISOString(),
    size: item.size,
    blob: item.blob,
  });
}

async function deleteRecording(id) {
  recordings = recordings.filter((item) => item.id !== id);
  const database = await openDb();
  database.transaction("recordings", "readwrite").objectStore("recordings").delete(id);
  renderRecordings();
}

async function clearRecordings() {
  recordings = [];
  const database = await openDb();
  database.transaction("recordings", "readwrite").objectStore("recordings").clear();
  renderRecordings();
}

function setLessonsForDate(date) {
  codingProblems = getCodingProblemsForDate(date);
  activeProblemIndex = 0;
  hintIndex = 1;
}

function getCodingProblemsForDate(date) {
  const assignment = getDayAssignment(date);
  if (!assignment?.coding?.length) return [createMissingCodingProblem(date)];
  return assignment.coding.map((id) => contentLibrary?.codingResources?.[id] || createMissingCodingProblem(date));
}

function getReadingForDate(date) {
  const assignment = getDayAssignment(date);
  const resource = assignment ? contentLibrary?.readingResources?.[assignment.reading] : null;
  return resource || defaultReading;
}

function getInsightsForDate(date) {
  return insightLibrary?.days?.[toDateKey(date)] || [];
}

function getActiveProblem() {
  return codingProblems[activeProblemIndex] || createMissingCodingProblem(selectedDate);
}

function getDayAssignment(date) {
  const dateKey = toDateKey(date);
  return contentLibrary?.months?.[dateKey.slice(0, 7)]?.days?.[dateKey] || null;
}

function createMissingCodingProblem(date) {
  return {
    title: "该日期 Coding 题单待入库",
    topic: "Pending",
    difficulty: "Pending",
    category: "llm",
    starterCode: "def solve():\n    pass\n",
    expectedSignature: "def solve",
    keywords: [],
    hints: [`${formatDisplayDate(date)} 还没有通过校验的 Coding 题单。`],
  };
}

function setTaskDone(task, done) {
  const key = toDateKey(selectedDate);
  todoState[key] = { ...getDayTodo(), [task]: done };
  localStorage.setItem("mimic-todo-state", JSON.stringify(todoState));
}

function getDayTodo(date = selectedDate) {
  return { english: false, chinese: false, coding: false, insight: false, ...(todoState[toDateKey(date)] || {}) };
}

function loadTodoState() {
  try {
    return JSON.parse(localStorage.getItem("mimic-todo-state") || "{}");
  } catch {
    return {};
  }
}

function calculateStreak() {
  let streak = 0;
  const cursor = new Date(today);
  while (Object.values(getDayTodo(cursor)).filter(Boolean).length === 4) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

async function loadJson(url, fallback) {
  try {
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch {
    return fallback;
  }
}

function buildFallbackContentLibrary() {
  const key = toDateKey(today);
  return {
    months: { [key.slice(0, 7)]: { days: { [key]: { coding: ["fallback"] } } } },
    codingResources: { fallback: createMissingCodingProblem(today) },
    readingResources: {},
  };
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(date) {
  return date.toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "short" });
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
