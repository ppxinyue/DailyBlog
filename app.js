const todayKey = new Date().toISOString().slice(0, 10);
const notes = JSON.parse(localStorage.getItem("mimic-daily-notes") || "{}");

document.querySelectorAll("[data-note]").forEach((input) => {
  const key = `${todayKey}:${input.dataset.note}`;
  input.value = notes[key] || "";
  input.addEventListener("input", () => {
    notes[key] = input.value;
    localStorage.setItem("mimic-daily-notes", JSON.stringify(notes));
  });
});
