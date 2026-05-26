# Issues

## 2026-05-24

- The workspace initially was not a Git repository, so `git status` failed until `git init` was run.
- The `docs` directory did not exist initially, so historical progress and issue searches returned no files.
- YouTube embeds and most third-party news embeds cannot be directly composited into canvas recordings because of browser cross-origin restrictions.
- The current demo uses open direct video URLs that are compatible with canvas-based recording.
- Full camera recording requires browser permission and should be tested on `localhost` or `127.0.0.1`, not by opening the HTML file directly.
- Camera preview now preserves aspect ratio, which can create black bars when the camera aspect ratio does not match the iPhone-like recording area.
- The calendar no longer cycles demo lessons silently; dates without approved manifest entries show a pending state.
- The current 100-day manifest starts on 2026-05-26, so 2026-05 and 2026-09 are intentionally partial months.
- The refresh job is currently represented by manifest policy and validation scripts; production ingestion still needs approved source connectors and storage.
- The Coding module now has a local Python AST syntax backend, but real accepted/wrong-answer/runtime-error judging still requires a sandboxed executor and reviewed test harness.
- LLM hand-coding drills are original prompts and starter signatures; production-quality tests still need a backend sandbox and reviewed expected outputs.
- The Insight module has curated seed data and a validation script; fully automated retrieval still depends on a scheduled job with web access and source review.
- Insight selection should avoid drifting into general neuroscience; AI industry relevance is the primary filter.
- Coding mistake stats are currently browser-local via `localStorage`; cross-device sync requires a user account or backend storage.
- Existing English and Chinese seed reading entries are not yet all replaced with open-platform source URLs; production release should ingest from `data/open-platform-sources.json` and preserve item-level attribution/license metadata.
