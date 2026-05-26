# Insight Library

## Goal

The Insight module gives a cognitive neuroscience + AI student a daily view of recent interdisciplinary signals. It should include papers, frontier ideas, applied business cases, Kaggle competitions/results, and GitHub projects.

## Selection Rules

- Refresh daily at 00:00 Asia/Shanghai.
- Each item must have a publication or update date within the last 3 months.
- Do not repeat links across days.
- Include original URL, source name, publication date, Chinese summary, and why it matters for cognitive neuroscience + AI.
- Prefer sources close to industry and applied research: Microsoft Research Asia AI and Brain, Microsoft Research AI & Society / Societal AI, top AI labs, Kaggle, GitHub, and major industry research blogs.

## Data Shape

Insight data lives in `data/insights.json`.

Each insight item includes:

- `id`
- `title`
- `sourceName`
- `sourceType`
- `publishedAt`
- `url`
- `tags`
- `zhSummary`
- `whyItMatters`

## Update Workflow

1. Search source watchlists and recent web results.
2. Keep only items published or updated within 92 days.
3. Deduplicate by URL against all previous days.
4. Write the daily item list into `data/insights.json`.
5. Run `node scripts/check-insights.mjs`.
6. Commit the data update.

## Production Notes

The current implementation stores curated seed items. A production implementation should run a backend job or scheduled agent at 00:00, use official APIs/RSS feeds where possible, and record retrieval timestamps separately from publication dates.
