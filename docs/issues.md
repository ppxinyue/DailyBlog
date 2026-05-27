# Issues

## 2026-05-24

- The workspace initially was not a Git repository, so `git status` failed until `git init` was run.
- The `docs` directory did not exist initially, so historical progress and issue searches returned no files.
- Recording is no longer part of the current product flow; earlier camera/canvas constraints are historical only.
- Calendar UI is visible again, but it only reflects browser-local completion state.
- The current 100-day manifest starts on 2026-05-26, so 2026-05 and 2026-09 are intentionally partial months.
- The refresh job is currently represented by manifest policy and validation scripts; production ingestion still needs approved source connectors and storage.
- Coding now depends on external NeetCode and Hello Interview availability; the site no longer performs local syntax checks or judging.
- The Insight module has curated seed data and a validation script; fully automated retrieval still depends on a scheduled job with web access and source review.
- Insight selection should avoid drifting into general neuroscience; AI industry relevance is the primary filter.
- Existing English and Chinese seed reading entries are not yet all replaced with open-platform source URLs; production release should ingest from `data/open-platform-sources.json` and preserve item-level attribution/license metadata.
- English practice now depends on the availability and UX of the external ShadowingEnglish site.
- Chinese daily reading now depends on the availability and editorial choices of 每日一文.
- Daily reflection inputs are browser-local via `localStorage`; cross-device, multi-browser sync, or export still requires backend storage or a file export feature.
- Insight read/unread state is browser-local via `localStorage`.
- Calendar, simple statistics, and Insight favorites are browser-local via `localStorage`; cross-device sync still requires backend storage or export/import.
- On 2026-05-27, the Daily Insight automation was configured as ACTIVE, but no `2026-05-27` entry was written to `data/insights.json`; no local automation run log was found under `/Users/pp/.codex/automations/daily-insight-refresh`.
- The Insight More button currently loads from a static `moreSearch` pool in `data/insights.json`; true live web search still requires a backend/search connector.
