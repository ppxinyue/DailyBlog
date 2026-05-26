import fs from "node:fs/promises";

const libraryPath = new URL("../data/content-library.json", import.meta.url);
const library = JSON.parse(await fs.readFile(libraryPath, "utf8"));
const errors = [];
const warnings = [];
const now = new Date();

for (const [monthKey, month] of Object.entries(library.months || {})) {
  const englishIds = new Set();
  const englishReadingIds = new Set();
  const readingIds = new Set();
  const duplicateEnglish = new Set();
  const duplicateEnglishReading = new Set();
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
    if (assignment.englishReading && !library.englishReadingResources?.[assignment.englishReading]) {
      errors.push(`${dateKey} references missing English reading resource ${assignment.englishReading}`);
    }
    if (!Array.isArray(assignment.coding) || assignment.coding.length !== 3) {
      errors.push(`${dateKey} must assign exactly 3 coding problems`);
    } else {
      const codingResources = assignment.coding.map((id) => library.codingResources?.[id]);
      codingResources.forEach((resource, index) => {
        if (!resource) errors.push(`${dateKey} references missing coding resource ${assignment.coding[index]}`);
      });
      const topics = new Set(codingResources.filter(Boolean).map((resource) => resource.topic));
      if (topics.size > 1) {
        errors.push(`${dateKey} coding problems must share one topic, found: ${[...topics].join(", ")}`);
      }
    }

    if (englishIds.has(assignment.english)) duplicateEnglish.add(assignment.english);
    if (assignment.englishReading && englishReadingIds.has(assignment.englishReading)) duplicateEnglishReading.add(assignment.englishReading);
    if (readingIds.has(assignment.reading)) duplicateReading.add(assignment.reading);
    englishIds.add(assignment.english);
    if (assignment.englishReading) englishReadingIds.add(assignment.englishReading);
    readingIds.add(assignment.reading);
  }

  if (duplicateEnglish.size) {
    errors.push(`${monthKey} repeats English resource IDs: ${[...duplicateEnglish].join(", ")}`);
  }
  if (duplicateReading.size) {
    errors.push(`${monthKey} repeats reading resource IDs: ${[...duplicateReading].join(", ")}`);
  }
  if (duplicateEnglishReading.size) {
    errors.push(`${monthKey} repeats English reading resource IDs: ${[...duplicateEnglishReading].join(", ")}`);
  }
  if (Object.keys(days).length < expectedDays) {
    warnings.push(`${monthKey} has ${Object.keys(days).length}/${expectedDays} assigned days`);
  }
}

const assignedDates = Object.values(library.months || {}).flatMap((month) => Object.keys(month.days || {})).sort();
const planDays = library.updatePolicy?.totalDays;
if (planDays && assignedDates.length !== planDays) {
  errors.push(`100-day plan expected ${planDays} assigned dates, found ${assignedDates.length}`);
}
const assignedCoding = new Set();
for (const month of Object.values(library.months || {})) {
  for (const assignment of Object.values(month.days || {})) {
    for (const id of assignment.coding || []) assignedCoding.add(id);
  }
}
const hot100Count = Object.entries(library.codingResources || {})
  .filter(([id, resource]) => resource.hot100 && assignedCoding.has(id)).length;
if (hot100Count < 100) {
  errors.push(`Coding plan covers ${hot100Count}/100 Hot 100 problems`);
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
