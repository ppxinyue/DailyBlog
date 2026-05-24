import fs from "node:fs/promises";

const libraryPath = new URL("../data/content-library.json", import.meta.url);
const library = JSON.parse(await fs.readFile(libraryPath, "utf8"));
const errors = [];
const warnings = [];
const now = new Date();

for (const [monthKey, month] of Object.entries(library.months || {})) {
  const englishIds = new Set();
  const readingIds = new Set();
  const duplicateEnglish = new Set();
  const duplicateReading = new Set();
  const days = month.days || {};
  const expectedDays = daysInMonth(monthKey);

  for (const [dateKey, assignment] of Object.entries(days)) {
    if (!dateKey.startsWith(`${monthKey}-`)) {
      errors.push(`${dateKey} is listed under ${monthKey}`);
    }

    if (!library.englishResources?.[assignment.english]) {
      errors.push(`${dateKey} references missing English resource ${assignment.english}`);
    }
    if (!library.readingResources?.[assignment.reading]) {
      errors.push(`${dateKey} references missing reading resource ${assignment.reading}`);
    }

    if (englishIds.has(assignment.english)) duplicateEnglish.add(assignment.english);
    if (readingIds.has(assignment.reading)) duplicateReading.add(assignment.reading);
    englishIds.add(assignment.english);
    readingIds.add(assignment.reading);
  }

  if (duplicateEnglish.size) {
    errors.push(`${monthKey} repeats English resource IDs: ${[...duplicateEnglish].join(", ")}`);
  }
  if (duplicateReading.size) {
    errors.push(`${monthKey} repeats reading resource IDs: ${[...duplicateReading].join(", ")}`);
  }
  if (Object.keys(days).length < expectedDays) {
    warnings.push(`${monthKey} has ${Object.keys(days).length}/${expectedDays} assigned days`);
  }
}

const refreshDays = library.updatePolicy?.refreshOnLastDays ?? 3;
if (isWithinLastDays(now, refreshDays)) {
  const nextMonth = addMonths(monthKeyFromDate(now), 1);
  if (!library.months?.[nextMonth]) {
    errors.push(`Missing next-month manifest ${nextMonth} during final ${refreshDays} days`);
  }
}

if (warnings.length) {
  console.warn(warnings.map((warning) => `WARN ${warning}`).join("\n"));
}
if (errors.length) {
  console.error(errors.map((error) => `ERROR ${error}`).join("\n"));
  process.exit(1);
}

console.log("Content library check passed");

function daysInMonth(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

function monthKeyFromDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function addMonths(monthKey, amount) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + amount, 1);
  return monthKeyFromDate(date);
}

function isWithinLastDays(date, count) {
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return date.getDate() > lastDay - count;
}
