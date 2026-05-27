# Plan

## Working Rules

- Before each implementation step, search existing progress and issue records.
- Before and after each implementation step, inspect Git state.
- Record meaningful changes in `docs/progress.md`.
- Record blockers, limitations, and risks in `docs/issues.md`.

## Current Website Plan

1. Build a minimal four-box vertical dashboard: English shadowing, Chinese reading, Coding resources, and AI Insight.
2. Each box contains only a title, one or more resource links, and a daily learning reflection input.
3. Save daily reflection inputs locally in the browser by date and module.
4. Link English practice to ShadowingEnglish.
5. Link Chinese reading to 每日一文.
6. Link Coding to NeetCode and Hello Interview.
7. Link Insight to the local daily Insight resource file.
8. Remove local video/audio recording, calendar UI, completion stats, coding editors, Python backend checks, and expanded in-page Insight cards from the visible website.
9. Keep the visual style minimal with line-box cards and readable text.
10. In the Insight box, show each daily item with a read checkbox and STAR-format summary.
11. Show the Insight scope line and the active source-channel list in small text.
12. Prioritize Anthropic technical posts and include same-day X/forum hot topics when they overlap the user's focus areas.
13. Keep a large page title, add completion checkboxes for the first three cards, and use `write something` as the reflection placeholder.
14. Show source and domain metadata for every Insight item.
15. Restyle the page as a modern light app page with a centered white panel, soft grey cards, rounded corners, and no additional explanatory text.
16. Add a compact calendar, simple completion statistics, and local Insight favorites.
17. Keep section subtitles visually smaller than the main page title.
18. Keep Insight as the first content module under the calendar/statistics overview.
19. Keep the calendar lightweight and paired with a compact statistics panel.
20. Keep the calendar in the left half of the overview and show lightweight statistic charts on the right.
21. Add Insight history, saved-item view, and a More interaction with loading state and expanded result rendering.
22. Add a top-level Todo/Blog switch; keep existing work as Todo and provide a separate auto-formatted Blog page.
