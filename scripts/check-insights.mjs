import fs from "node:fs/promises";

const insightsPath = new URL("../data/insights.json", import.meta.url);
const library = JSON.parse(await fs.readFile(insightsPath, "utf8"));
const errors = [];
const maxAgeDays = library.updatePolicy?.maxAgeDays ?? 92;
const today = process.env.INSIGHT_CHECK_DATE
  ? new Date(`${process.env.INSIGHT_CHECK_DATE}T00:00:00+08:00`)
  : new Date();
const seenUrls = new Set();

for (const [dateKey, items] of Object.entries(library.days || {})) {
  if (!Array.isArray(items) || items.length === 0) {
    errors.push(`${dateKey} must have at least one insight`);
    continue;
  }
  const dayUrls = new Set();
  for (const item of items) {
    if (!item.id || !item.title || !item.url || !item.publishedAt || !item.zhSummary || !item.whyItMatters) {
      errors.push(`${dateKey} has incomplete insight metadata`);
    }
    if (dayUrls.has(item.url)) errors.push(`${dateKey} repeats URL ${item.url}`);
    if (seenUrls.has(item.url)) errors.push(`Insight URL is duplicated across days: ${item.url}`);
    dayUrls.add(item.url);
    seenUrls.add(item.url);

    const publishedAt = new Date(`${item.publishedAt}T00:00:00+08:00`);
    const ageDays = Math.floor((today - publishedAt) / 86400000);
    if (Number.isNaN(ageDays)) errors.push(`${item.id} has invalid publishedAt ${item.publishedAt}`);
    if (ageDays < 0) errors.push(`${item.id} publishedAt is in the future`);
    if (ageDays > maxAgeDays) errors.push(`${item.id} is ${ageDays} days old, over maxAgeDays=${maxAgeDays}`);
  }
}

if (errors.length) {
  console.error(errors.map((error) => `ERROR ${error}`).join("\n"));
  process.exit(1);
}

console.log("Insight library check passed");
