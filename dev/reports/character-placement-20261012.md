# Character placement implementation — 2026-10-12 JST

Approved selection: nine unique source images, two existing and seven additions.
Base main: 1ec31fef976bc3e5eb513f90b83fa410ae57b294.

| Location / state | Asset |
| --- | --- |
| Mock home; ordinary result | Existing image-155cadc1029a.png (D003) |
| Learn heading | D047 |
| Notes heading | Existing image-a5b30a44fd43.png (D039) |
| Open note caution heading | D042 |
| Review, due items | D051 |
| Review, unregistered or waiting | D012 |
| Review, no due items and a completed review attempt today | D011 |
| 50-question result, 45–49 | D004 |
| Perfect result, including shorter study | D006 |

Review completion is derived from existing completed review attempts and local calendar date; mere zero due count is not called completion. No storage schema or scoring changes. Decorative images have empty alt and adjacent state text. Existing attribution expanded for Master Shadow and Pro. Original image bytes preserved; sources are in assets/characters/sources.json.

No additional images in question/answer controls, per-question explanations, category cards, settings, or record operations. Other design changes previously discussed are outside this character-only patch.

Checks before release: JS syntax; existing npm test; focused state test covering unregistered/due/completed/waiting/next-day, 44/45/49/50 and 9/10 results, and note caution. The checkout contains previously retrieved question assets; final public visual checks use the deployed repository's latest content.

Public checks on commit 6e0326f: learn 360px; completed review 360px; due and waiting review 390px; pass 45 at 390px; perfect 50 in dark mode 390px; open note caution. Images loaded; measured learn/completed/due/pass/perfect states had no horizontal overflow or targets below 44px. Refined review heading into phrase-preserving wraps and shortened waiting message after visual inspection. Cloud Chrome only, not physical iPhone/Safari.
