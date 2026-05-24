# Progress

## 2026-05-24

- Created the first static implementation with `index.html`, `styles.css`, and `app.js`.
- Added English daily video practice with subtitles, translations, and vocabulary notes.
- Added Chinese daily reading practice.
- Added full-screen studio overlay with an iPhone-like vertical frame.
- Implemented camera preview and MediaRecorder-based composite recording.
- Implemented recording library with download, single delete, and clear-all controls.
- Added IndexedDB persistence so recordings survive page refreshes.
- Started a local HTTP server at `http://127.0.0.1:4173/`.
- Verified page load, tab switching, studio opening, and JavaScript syntax.
- Initialized Git repository after discovering the workspace was not a Git repo.
- Created `docs/plan.md`, `docs/progress.md`, and `docs/issues.md` to track plan, progress, and issues.
- Removed the Chinese reading "今日提示" panel.
- Changed the Chinese reading content to full-article style entries, including the full `匆匆` text and a complete original short letter.
- Updated studio close behavior so camera and microphone tracks stop automatically when the user exits.
- Changed camera rendering to preserve the camera aspect ratio with letterboxing instead of stretching the person to fill the frame.
