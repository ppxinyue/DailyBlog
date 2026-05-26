# Insight Library

## Goal

The Insight module gives an AI-industry-centered daily view for a cognitive neuroscience + AI student. It should start from industry/research/product signals, then interpret them through cognitive neuroscience, neurodiversity, developmental psychology, and social simulation.

## Selection Rules

- Refresh daily at 00:00 Asia/Shanghai.
- Each item must have a publication or update date within the last 3 months.
- Do not repeat links across days.
- Include original URL, source name, publication date, Chinese summary, and why it matters for the user's AI + mind/brain/social-science background.
- Prefer AI industry and applied research first: Microsoft Research Asia AI and Brain, Microsoft Research AI & Society / Societal AI, OpenAI, Anthropic, Google DeepMind, Meta AI, Apple ML, NVIDIA, top internet/AI company research blogs, Kaggle, GitHub, and production agent/evaluation projects.
- Interpret selected items through one or more of these lenses: cognitive neuroscience, neurodiversity, developmental psychology, children, education, mental health, and social simulation.
- Good items include industry agent evaluation work, AI accessibility for neurodiverse users, child/developmental learning products, education copilots, mental health support boundaries, synthetic society / generative-agent simulations, human-vs-LLM social or moral behavior gaps, and business cases where human cognitive habits affect agent design.
- Also track Elon Musk-related AI/brain/robotics signals, especially xAI, Neuralink, and Tesla AI / Optimus, when they connect to AI industry, brain-computer interfaces, robotics agents, cognition, safety, or social impact.
- Each item should include a concise `zhSummary`, a STAR-format `starSummary`, and optionally a more substantive `detailedSummary`.
- `starSummary` must contain `situation`, `task`, `action`, and `result`, written in clear Chinese and focused on the user's AI-industry + cognitive/developmental/social background.
- Avoid items that are only neuroscience papers with no plausible AI-industry relevance.

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
2. Start with AI industry/product/applied-research signals, then add academic papers only when they help interpret industry practice.
3. Keep only items published or updated within 92 days.
4. Deduplicate by URL against all previous days.
5. Write the daily item list into `data/insights.json`.
6. Run `node scripts/check-insights.mjs`.
7. Commit the data update.

## Production Notes

The current implementation stores curated seed items. A production implementation should run a backend job or scheduled agent at 00:00, use official APIs/RSS feeds where possible, and record retrieval timestamps separately from publication dates.
