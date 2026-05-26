# Resource Library

## Goal

The practice site should not repeat daily video or reading content within a month. Content should be prepared one month at a time, and the next month should be generated during the final three days of the current month.

## Recommended Architecture

Use a content pipeline instead of direct front-end scraping:

1. Source registry
   - Keep a list of allowed providers, RSS feeds, public-domain text collections, partner libraries, and internally produced materials.
   - Store license terms, source URL, attribution, duration, language level, and whether media can be downloaded, transcoded, and recorded into canvas.

2. Ingestion jobs
   - Fetch candidate metadata from approved feeds or APIs.
   - For video, accept only direct downloadable media or media that the product has permission to mirror.
   - For text, accept public-domain, licensed, partner-provided, or original editorial content.

3. Processing
   - Download or mirror media to controlled storage.
   - Transcode video to a browser-friendly format.
   - Generate or import subtitles and align timestamps.
   - Extract vocabulary, translations, and difficulty tags.

4. Review
   - Check copyright, attribution, content quality, duration, audio clarity, and transcript accuracy.
   - Reject content that cannot be legally recorded, mirrored, or displayed.

5. Monthly manifest
   - Write approved resources into `data/content-library.json`.
   - Assign exactly one English resource and one Chinese reading resource to each date.
   - Validate that resource IDs do not repeat inside the same month.

6. Release automation
   - Run the refresh job on the final three days of each month.
   - If the next month has fewer than the required number of approved days, fail the job and report missing dates.

## Why Not Direct YouTube Downloading

YouTube embeds and many news videos are not suitable for this recording model because:

- Browser canvas recording cannot reliably include cross-origin iframe video.
- Downloading or mirroring platform videos can violate platform terms or copyright.
- Subtitles, translations, and derivative vocabulary explanations need editorial QA.

The safer path is to use licensed media, direct open media files, partner APIs, self-produced videos, or public-domain sources.

## Manifest Requirements

- `months[YYYY-MM].days[YYYY-MM-DD].english` points to an English resource ID.
- `months[YYYY-MM].days[YYYY-MM-DD].reading` points to a Chinese reading resource ID.
- English resource IDs must not repeat within a month.
- Reading resource IDs must not repeat within a month.
- Each English resource needs source, license, media URL, subtitles, translations, and vocabulary.
- Each reading resource needs source/author, license, and complete paragraphs.
- Coding days assign exactly three Python problems.
- Coding days must share one topic.
- Coding assignments link to official problem sources when they reference LeetCode, but do not copy proprietary problem statements.
- The 100-day coding track covers all Hot 100 anchor problems once, then pairs each anchor with two same-pattern drills.

## Current Status

The current manifest is a 100-day seed beginning on 2026-05-26. English and Chinese reading entries are original editorial demo content. Coding entries include Hot 100 metadata links and original same-pattern drills. Video resources after the first demo entries remain pending until approved direct media is sourced.
