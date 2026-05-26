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
- Daily theme: all 3 problems for a day share one topic.
- Coverage: the 100 official-style Hot 100 metadata entries are each assigned once as the anchor problem for a day.
- Practice expansion: each Hot 100 anchor is paired with two original same-pattern drills so the day has 3 exercises without copying LeetCode problem text.

## Why This Structure

LeetCode 75 and Grind 75 are useful because they are time-boxed and interview-focused. NeetCode is useful because it organizes problems by pattern. The 100-day resource library combines those ideas: one daily pattern, one Hot 100 anchor, two same-pattern drills, repeated exposure across arrays, two pointers, sliding window, stack, binary search, linked list, trees, graph, DP, greedy, intervals, matrix, and bit manipulation.

## Website Behavior

- Coding resources are stored in `data/content-library.json`.
- `scripts/generate-100-day-content.mjs` regenerates the 100-day plan.
- `scripts/check-content-library.mjs` validates that every date has exactly 3 coding problems, same-day coding topics match, and Hot 100 coverage reaches 100/100.
- The website shows a Coding tab with the 3 daily problems, starter code, syntax/structure checks, submit precheck, and progressive hints.

## Current Judge Boundary

The browser implementation does local precheck only:

- bracket matching
- missing colon after Python control statements
- indentation warnings
- expected function signature check
- simple topic keyword warning

It does not yet execute arbitrary Python test cases in a sandbox. A production judge should use a server-side Python sandbox with timeouts, memory limits, test harnesses, and line-level traceback parsing. The API key field is present for future AI-assisted error explanation, but direct browser calls with a user API key should be replaced by a backend proxy before production use.
