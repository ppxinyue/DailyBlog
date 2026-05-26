# LeetCode 100-Day Plan

## Sources Reviewed

- LeetCode 75: https://leetcode.com/studyplan/leetcode-75/
- LeetCode Top 100 Liked / Hot 100 style list: https://leetcode.com/studyplan/top-100-liked/
- NeetCode Roadmap: https://neetcode.io/roadmap
- Grind 75: https://www.techinterviewhandbook.org/grind75

## Plan Shape

- Start date: 2026-05-26.
- Length: 100 consecutive days.
- Daily coding load: 3 Python problems.
- Default mix: 2 LeetCode problems and 1 LLM hand-coding drill.
- Coverage: all 100 Hot 100 metadata entries are assigned across the first 50 days, then reused for pattern review.
- LLM drills progress from easy numerical routines to harder transformer internals and training/inference utilities.

## Why This Structure

LeetCode 75 and Grind 75 are useful because they are time-boxed and interview-focused. NeetCode is useful because it organizes problems by pattern. The 100-day resource library combines those ideas with a practical LLM interview track: Hot 100 coverage comes first, and daily LLM drills add hands-on practice for softmax, loss functions, normalization, attention, decoding, KV cache, retrieval metrics, LoRA, quantization, optimizer steps, and batching.

## Website Behavior

- Coding resources are stored in `data/content-library.json`.
- `scripts/generate-100-day-content.mjs` regenerates the 100-day plan.
- `scripts/check-content-library.mjs` validates that every date has exactly 3 coding problems, at least one LeetCode problem, at least one LLM hand-coding problem, and Hot 100 coverage reaches 100/100.
- The website shows a Coding tab with the 3 daily problems, starter code, syntax/structure checks, submit precheck, and progressive hints.

## Current Judge Boundary

The website now prefers the local Python endpoint in `server.py`:

- run `python3 server.py` from the project root
- open `http://127.0.0.1:4173/`
- the front-end posts code to `/api/python/analyze`

The local backend currently performs AST-based syntax analysis plus structural checks:

- bracket matching
- missing colon after Python control statements
- indentation warnings
- expected function signature check
- simple topic keyword warning

If the Python backend is not running, the browser falls back to its older local precheck and shows a warning. It does not yet execute arbitrary Python test cases in a sandbox. A production judge should add isolated execution with timeouts, memory limits, test harnesses, and line-level traceback parsing. The API key field is present for future AI-assisted error explanation, but direct browser calls with a user API key should be replaced by a backend proxy before production use.
