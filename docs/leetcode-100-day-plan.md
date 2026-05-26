# Coding Resource Plan

## Sources Reviewed

- LeetCode 75: https://leetcode.com/studyplan/leetcode-75/
- LeetCode Top 100 Liked / Hot 100 style list: https://leetcode.com/studyplan/top-100-liked/
- NeetCode Roadmap: https://neetcode.io/roadmap
- Grind 75: https://www.techinterviewhandbook.org/grind75

## Current Website Behavior

The website no longer hosts daily coding problems, a code editor, syntax checks, or a local Python backend. The Coding todo card links directly to:

- NeetCode Roadmap: https://neetcode.io/roadmap
- Hello Interview Practice: https://www.hellointerview.com/practice

Users complete the Coding todo manually after studying or practicing on those sites.

## Historical 100-Day Plan

- Start date: 2026-05-26.
- Length: 100 consecutive days.
- Daily coding load: 3 Python problems.
- Default mix: 2 LeetCode problems and 1 LLM hand-coding drill.
- Coverage: all 100 Hot 100 metadata entries are assigned across the first 50 days, then reused for pattern review.
- LLM drills progress from easy numerical routines to harder transformer internals and training/inference utilities.

## Why This Structure

LeetCode 75 and Grind 75 are useful because they are time-boxed and interview-focused. NeetCode is useful because it organizes problems by pattern. The 100-day resource library combines those ideas with a practical LLM interview track: Hot 100 coverage comes first, and daily LLM drills add hands-on practice for softmax, loss functions, normalization, attention, decoding, KV cache, retrieval metrics, LoRA, quantization, optimizer steps, and batching.

The repository still contains historical generated coding metadata in `data/content-library.json`, but the current UI does not render it.
