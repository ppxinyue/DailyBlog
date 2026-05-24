# Issues

## 2026-05-24

- The workspace initially was not a Git repository, so `git status` failed until `git init` was run.
- The `docs` directory did not exist initially, so historical progress and issue searches returned no files.
- YouTube embeds and most third-party news embeds cannot be directly composited into canvas recordings because of browser cross-origin restrictions.
- The current demo uses open direct video URLs that are compatible with canvas-based recording.
- Full camera recording requires browser permission and should be tested on `localhost` or `127.0.0.1`, not by opening the HTML file directly.
- Camera preview now preserves aspect ratio, which can create black bars when the camera aspect ratio does not match the iPhone-like recording area.
