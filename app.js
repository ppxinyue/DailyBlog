const englishLessons = [
  {
    title: "Daily English: Clear Speech Practice",
    date: "Day 1",
    source: "Open media sample video for local recording compatibility",
    videoUrl:
      "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    subtitles: [
      {
        start: 0,
        end: 4,
        en: "Good speaking begins with calm breathing and clear rhythm.",
        zh: "好的表达始于平稳呼吸和清晰节奏。",
      },
      {
        start: 4,
        end: 8,
        en: "Listen first, then repeat the sentence with the same stress.",
        zh: "先听，再用相同的重音重复整句。",
      },
      {
        start: 8,
        end: 12,
        en: "Do not rush. Let each word land before the next one begins.",
        zh: "不要着急。让每个词说清楚，再进入下一个词。",
      },
      {
        start: 12,
        end: 16,
        en: "Your goal is not speed. Your goal is control.",
        zh: "目标不是速度，而是掌控力。",
      },
    ],
    words: [
      {
        word: "rhythm",
        ipa: "/ˈrɪðəm/",
        note: "节奏；跟读时注意句子强弱，而不是平均用力。",
      },
      {
        word: "stress",
        ipa: "/stres/",
        note: "重音；英语信息通常落在重读词上。",
      },
      {
        word: "control",
        ipa: "/kənˈtroʊl/",
        note: "控制；这里指语速、停顿和发音的稳定度。",
      },
    ],
  },
  {
    title: "Daily English: News Tone Practice",
    date: "Day 2",
    source: "Open media sample video for local recording compatibility",
    videoUrl:
      "https://media.w3.org/2010/05/sintel/trailer.mp4",
    subtitles: [
      {
        start: 0,
        end: 5,
        en: "Today we focus on a steady newsreader tone.",
        zh: "今天练习稳定的新闻播报语气。",
      },
      {
        start: 5,
        end: 10,
        en: "Keep your pitch level, and pause at natural phrase boundaries.",
        zh: "保持音高平稳，在自然意群边界停顿。",
      },
      {
        start: 10,
        end: 15,
        en: "Important names and numbers need extra clarity.",
        zh: "重要名称和数字需要说得格外清楚。",
      },
    ],
    words: [
      {
        word: "steady",
        ipa: "/ˈstedi/",
        note: "稳定的；形容语速、音高或状态不大幅波动。",
      },
      {
        word: "boundary",
        ipa: "/ˈbaʊndəri/",
        note: "边界；练习中可理解为意群切分点。",
      },
      {
        word: "clarity",
        ipa: "/ˈklerəti/",
        note: "清晰度；新闻和演讲跟读的核心指标。",
      },
    ],
  },
];

const readingLessons = [
  {
    title: "匆匆（节选）",
    date: "Day 1",
    note: "朗读时把长句拆成短意群，语气保持温和，停顿要清楚。",
    paragraphs: [
      "燕子去了，有再来的时候；杨柳枯了，有再青的时候；桃花谢了，有再开的时候。",
      "但是，聪明的，你告诉我，我们的日子为什么一去不复返呢？",
      "是有人偷了他们罢：那是谁？又藏在何处呢？是他们自己逃走了罢：现在又到了哪里呢？",
    ],
  },
  {
    title: "给年轻读者的一段话",
    date: "Day 2",
    note: "这一段偏现代口语，注意真诚、明亮，不要读成宣讲腔。",
    paragraphs: [
      "愿你在很小的事情里，也能保留好奇心。一个问题、一页书、一次认真观察，都可能把你带到更宽的地方。",
      "读书不是为了立刻变得厉害，而是让你慢慢拥有判断、想象和理解别人的能力。",
    ],
  },
];

const $ = (selector) => document.querySelector(selector);
const todayIndex = Math.floor(Date.now() / 86400000);
const englishLesson = englishLessons[todayIndex % englishLessons.length];
const readingLesson = readingLessons[todayIndex % readingLessons.length];

const sourceVideo = $("#sourceVideo");
const cameraVideo = $("#cameraVideo");
const canvas = $("#compositeCanvas");
const ctx = canvas.getContext("2d");

let activeSubtitle = 0;
let studioType = "video";
let cameraStream = null;
let mediaRecorder = null;
let recordedChunks = [];
let drawFrameId = null;
let recordings = [];
let db = null;

async function init() {
  bindTabs();
  renderEnglishLesson();
  renderReadingLesson();
  bindStudio();
  db = await openRecordingsDb();
  recordings = await loadRecordings();
  renderRecordings();
}

function bindTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".panel").forEach((panel) => panel.classList.remove("active"));
      tab.classList.add("active");
      $(`#${tab.dataset.target}`).classList.add("active");
    });
  });
}

function renderEnglishLesson() {
  $("#englishDate").textContent = englishLesson.date;
  $("#englishTitle").textContent = englishLesson.title;
  $("#englishSource").textContent = englishLesson.source;
  sourceVideo.src = englishLesson.videoUrl;

  $("#subtitleList").innerHTML = englishLesson.subtitles
    .map(
      (line, index) => `
        <button class="subtitle-row ${index === 0 ? "active" : ""}" data-index="${index}">
          <span class="subtitle-time">${formatTime(line.start)} - ${formatTime(line.end)}</span>
          <span class="subtitle-en">${line.en}</span>
          <span class="subtitle-zh">${line.zh}</span>
        </button>
      `,
    )
    .join("");

  $("#wordList").innerHTML = englishLesson.words
    .map(
      (item) => `
        <div class="word-card">
          <strong>${item.word} <span>${item.ipa}</span></strong>
          <p>${item.note}</p>
        </div>
      `,
    )
    .join("");

  document.querySelectorAll(".subtitle-row").forEach((row) => {
    row.addEventListener("click", () => {
      setActiveSubtitle(Number(row.dataset.index));
      playActiveLine();
    });
  });

  $("#replayLine").addEventListener("click", playActiveLine);
  sourceVideo.addEventListener("timeupdate", syncSubtitle);
}

function renderReadingLesson() {
  $("#readingDate").textContent = readingLesson.date;
  $("#readingTitle").textContent = readingLesson.title;
  $("#readingNote").textContent = readingLesson.note;
  $("#readingText").innerHTML = readingLesson.paragraphs
    .map((paragraph) => `<p>${paragraph}</p>`)
    .join("");
}

function syncSubtitle() {
  const index = englishLesson.subtitles.findIndex(
    (line) => sourceVideo.currentTime >= line.start && sourceVideo.currentTime < line.end,
  );
  if (index >= 0 && index !== activeSubtitle) {
    setActiveSubtitle(index);
  }
}

function setActiveSubtitle(index) {
  activeSubtitle = index;
  document.querySelectorAll(".subtitle-row").forEach((row, rowIndex) => {
    row.classList.toggle("active", rowIndex === index);
  });
}

function playActiveLine() {
  const line = englishLesson.subtitles[activeSubtitle];
  sourceVideo.currentTime = line.start;
  sourceVideo.play();
  const stopAtLineEnd = () => {
    if (sourceVideo.currentTime >= line.end) {
      sourceVideo.pause();
      sourceVideo.removeEventListener("timeupdate", stopAtLineEnd);
    }
  };
  sourceVideo.addEventListener("timeupdate", stopAtLineEnd);
}

function bindStudio() {
  $("#openVideoStudio").addEventListener("click", () => openStudio("video"));
  $("#openReadingStudio").addEventListener("click", () => openStudio("reading"));
  $("#closeStudio").addEventListener("click", closeStudio);
  $("#enableCamera").addEventListener("click", enableCamera);
  $("#startRecording").addEventListener("click", startRecording);
  $("#stopRecording").addEventListener("click", stopRecording);
  $("#clearRecordings").addEventListener("click", clearRecordings);
}

function openStudio(type) {
  studioType = type;
  $("#studio").classList.add("open");
  $("#studio").setAttribute("aria-hidden", "false");
  $("#studioMode").textContent = type === "video" ? "Video shadowing" : "Chinese reading";
  $("#studioTitle").textContent = type === "video" ? englishLesson.title : readingLesson.title;
  drawStudioFrame();
}

function closeStudio() {
  if (mediaRecorder?.state === "recording") {
    stopRecording();
  }
  $("#studio").classList.remove("open");
  $("#studio").setAttribute("aria-hidden", "true");
  sourceVideo.pause();
  cancelAnimationFrame(drawFrameId);
}

async function enableCamera() {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1170, height: 1266, facingMode: "user" },
      audio: true,
    });
    cameraVideo.srcObject = cameraStream;
    await cameraVideo.play();
    $("#cameraHint").classList.add("hidden");
    $("#startRecording").disabled = false;
    drawStudioFrame();
  } catch (error) {
    $("#cameraHint").textContent = "摄像头或麦克风权限未开启";
  }
}

async function startRecording() {
  if (!cameraStream) {
    await enableCamera();
  }

  recordedChunks = [];
  const canvasStream = canvas.captureStream(30);
  const audioTracks = cameraStream.getAudioTracks();
  audioTracks.forEach((track) => canvasStream.addTrack(track));
  if (studioType === "video" && sourceVideo.captureStream) {
    sourceVideo.captureStream().getAudioTracks().forEach((track) => canvasStream.addTrack(track));
  }
  const mimeType = pickMimeType();
  mediaRecorder = new MediaRecorder(canvasStream, mimeType ? { mimeType } : undefined);

  mediaRecorder.addEventListener("dataavailable", (event) => {
    if (event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  });

  mediaRecorder.addEventListener("stop", saveRecording);
  $("#startRecording").disabled = true;
  $("#stopRecording").disabled = false;

  if (studioType === "video") {
    sourceVideo.currentTime = 0;
    sourceVideo.muted = true;
    await sourceVideo.play();
  }

  mediaRecorder.start();
}

function stopRecording() {
  if (mediaRecorder?.state === "recording") {
    mediaRecorder.stop();
  }
  sourceVideo.pause();
  $("#startRecording").disabled = false;
  $("#stopRecording").disabled = true;
}

async function saveRecording() {
  const blob = new Blob(recordedChunks, { type: "video/webm" });
  const url = URL.createObjectURL(blob);
  const recording = {
    id: crypto.randomUUID(),
    type: studioType,
    title: studioType === "video" ? englishLesson.title : readingLesson.title,
    createdAt: new Date(),
    blob,
    url,
    size: blob.size,
  };
  recordings.unshift(recording);
  await persistRecording(recording);
  renderRecordings();
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
    .map(
      (item) => `
        <article class="recording-item">
          <div>
            <strong>${item.title}</strong>
            <p class="recording-meta">${item.type === "video" ? "英语跟读" : "中文朗读"} · ${item.createdAt.toLocaleString()} · ${formatSize(item.size)}</p>
          </div>
          <video src="${item.url}" controls playsinline></video>
          <div>
            <a class="button-link" href="${item.url}" download="${downloadName(item)}.webm">保存</a>
            <button class="danger ghost delete-recording" data-id="${item.id}">删除</button>
          </div>
        </article>
      `,
    )
    .join("");

  document.querySelectorAll(".delete-recording").forEach((button) => {
    button.addEventListener("click", () => deleteRecording(button.dataset.id));
  });
}

function clearRecordings() {
  recordings.forEach((item) => URL.revokeObjectURL(item.url));
  recordings = [];
  clearPersistedRecordings();
  renderRecordings();
}

function deleteRecording(id) {
  const item = recordings.find((recording) => recording.id === id);
  if (item) {
    URL.revokeObjectURL(item.url);
  }
  recordings = recordings.filter((recording) => recording.id !== id);
  deletePersistedRecording(id);
  renderRecordings();
}

function openRecordingsDb() {
  return new Promise((resolve) => {
    const request = indexedDB.open("mimic-recordings", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("recordings", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

function loadRecordings() {
  return new Promise((resolve) => {
    if (!db) {
      resolve([]);
      return;
    }
    const request = db.transaction("recordings", "readonly").objectStore("recordings").getAll();
    request.onsuccess = () => {
      const items = request.result
        .map((item) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          url: URL.createObjectURL(item.blob),
          size: item.blob.size,
        }))
        .sort((a, b) => b.createdAt - a.createdAt);
      resolve(items);
    };
    request.onerror = () => resolve([]);
  });
}

function persistRecording(recording) {
  return new Promise((resolve) => {
    if (!db) {
      resolve();
      return;
    }
    const { id, type, title, createdAt, blob } = recording;
    const request = db
      .transaction("recordings", "readwrite")
      .objectStore("recordings")
      .put({ id, type, title, createdAt: createdAt.toISOString(), blob });
    request.onsuccess = resolve;
    request.onerror = resolve;
  });
}

function deletePersistedRecording(id) {
  if (!db) return;
  db.transaction("recordings", "readwrite").objectStore("recordings").delete(id);
}

function clearPersistedRecordings() {
  if (!db) return;
  db.transaction("recordings", "readwrite").objectStore("recordings").clear();
}

function drawStudioFrame() {
  const width = canvas.width;
  const height = canvas.height;
  ctx.fillStyle = "#05070a";
  ctx.fillRect(0, 0, width, height);

  if (studioType === "video") {
    drawVideoCover(sourceVideo, 0, 0, width, height / 2);
    drawDivider(height / 2);
    drawCamera(0, height / 2, width, height / 2);
    drawCaption(englishLesson.subtitles[activeSubtitle]?.en || "", height / 2 - 150);
  } else {
    drawCamera(0, 0, width, height);
    drawReadingOverlay();
  }

  drawFrameId = requestAnimationFrame(drawStudioFrame);
}

function drawCamera(x, y, width, height) {
  if (cameraVideo.readyState >= 2) {
    ctx.save();
    ctx.translate(x + width, y);
    ctx.scale(-1, 1);
    drawVideoCover(cameraVideo, 0, 0, width, height);
    ctx.restore();
  } else {
    ctx.fillStyle = "#111820";
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = "#d8e8f0";
    ctx.font = "700 54px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Camera preview", x + width / 2, y + height / 2);
  }
}

function drawVideoCover(video, x, y, width, height) {
  if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
    ctx.fillStyle = "#101923";
    ctx.fillRect(x, y, width, height);
    return;
  }

  const sourceRatio = video.videoWidth / video.videoHeight;
  const targetRatio = width / height;
  let sourceWidth = video.videoWidth;
  let sourceHeight = video.videoHeight;
  let sourceX = 0;
  let sourceY = 0;

  if (sourceRatio > targetRatio) {
    sourceWidth = video.videoHeight * targetRatio;
    sourceX = (video.videoWidth - sourceWidth) / 2;
  } else {
    sourceHeight = video.videoWidth / targetRatio;
    sourceY = (video.videoHeight - sourceHeight) / 2;
  }

  ctx.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

function drawDivider(y) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, y - 4, canvas.width, 8);
}

function drawCaption(text, y) {
  if (!text) return;
  ctx.fillStyle = "rgba(0, 0, 0, 0.58)";
  ctx.fillRect(60, y, canvas.width - 120, 110);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 42px sans-serif";
  ctx.textAlign = "center";
  wrapCanvasText(text, canvas.width / 2, y + 45, canvas.width - 180, 50);
}

function drawReadingOverlay() {
  const text = readingLesson.paragraphs.join(" ");
  ctx.fillStyle = "rgba(0, 0, 0, 0.56)";
  ctx.fillRect(70, canvas.height - 520, canvas.width - 140, 420);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 46px serif";
  ctx.textAlign = "left";
  wrapCanvasText(text, 110, canvas.height - 430, canvas.width - 220, 62, 5);
}

function wrapCanvasText(text, x, y, maxWidth, lineHeight, maxLines = 2) {
  const chars = [...text];
  let line = "";
  let lineCount = 0;
  chars.forEach((char) => {
    const testLine = line + char;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      if (lineCount < maxLines) {
        ctx.fillText(line, x, y + lineCount * lineHeight);
      }
      line = char;
      lineCount += 1;
    } else {
      line = testLine;
    }
  });
  if (lineCount < maxLines) {
    ctx.fillText(line, x, y + lineCount * lineHeight);
  }
}

function formatTime(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${min}:${sec}`;
}

function formatSize(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function downloadName(item) {
  return `${item.type}-${item.createdAt.toISOString().slice(0, 19).replaceAll(":", "-")}`;
}

function pickMimeType() {
  const options = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  return options.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

init();
