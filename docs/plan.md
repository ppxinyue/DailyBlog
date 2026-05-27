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
23. Support exporting the current Blog as a series of polished 1080x1440 PNG images for Xiaohongshu/Rednote.
24. Make Blog a large writing-first editor with live word statistics and no Todo modules inside the Blog view.
25. Give Blog its own candy-particle UI style and add a collapsible past-blog list below the editor.
26. Add basic Blog text editing controls plus separate draft stashing and saved-post persistence.
27. Add automatic Blog date and weekday metadata plus a dedicated title field above the writing surface.
28. Replace the static Blog candy background with animated particles and switchable art-inspired color themes.
29. Restyle Blog as a blue-and-cream poster layout with brain and AI graphics.
30. Remove text from the Blog poster hero so only brain and AI icons remain.
31. Lighten the Blog page by widening the editor, reducing type and padding, moving export controls below the writing area, and replacing the AI icon with a robot.
32. Slightly narrow the Blog editor and increase the title and body input font sizes by 6px.
33. Use GitHub Pages as the read-only published site while localhost acts as the writable editing environment.
34. Persist writable user state in `data/user-data.json` through the local server instead of relying only on browser `localStorage`.
35. Let localhost save actions commit and push data changes so GitHub Pages republishes the latest blog, favorites, notes, and completion state.
36. Keep Insight generation as a local write workflow: update `data/insights.json` locally, then commit/push it for Pages to display.
37. Require explicit Save actions in Todo and Blog before writing repository-backed user data or running Git publish.
38. Show save/publish status in the UI, including raw Git error details when a command fails.
39. Start local editing through `scripts/start-local.sh`, which runs the single required localhost server.
40. Run the Insight startup hook when `server.py` starts: validate existing Insight data by default, or execute `DAILYBLOG_INSIGHT_UPDATE_CMD` when a real updater is configured.
