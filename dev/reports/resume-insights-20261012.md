# Mode-specific resume and learning insights — 2026-10-12

- Preserve one unfinished mock, one study/guided session, and one review session. Switching modes pauses and saves the current session; starting another session in the same slot requires explicit confirmation and records the old partial attempt.
- Each tab resumes its own slot. Mock order, answers, flags and remaining time survive switching, reload and automatic backup recovery. Other saved modes remain after finishing one mode.
- Storage schema is now version 5 under the unchanged `karimen-study-v4` key. Version 2–4 data migrates automatically. Older application code rejects version 5 rather than dropping saved modes. Invalid/content-incompatible saved sessions are archived, not discarded.
- Delayed mock grading updates cumulative counts without replacing a more recent actual answer from another mode. Unanswered questions remain excluded.
- Mock cards retain best-score stamps, add latest pass/fail and up to three recent full-attempt scores (oldest to newest); partial attempts are excluded.
- Category sorting supports default and weakness order, with at least five answered questions prioritized before smaller samples and unlearned categories.
- The notebook offers up to three relevant notes ranked by the number of associated review questions. Existing search/category filters and all 65 notes remain available.

Validation: progress-model, storage and DOM integration suites passed. Added coverage for three-slot migration/import/reload, timer retention, answer chronology, storage recovery, tab-specific resume, sorting and related-note navigation. UI tests also cover 500 questions/130 image bindings, grading, timers and focus return. Build validates 500 question-to-guide mappings.

No real-device visual QA was performed in this environment. Cloudflare migration is separate and still needs the actual destination URL.
