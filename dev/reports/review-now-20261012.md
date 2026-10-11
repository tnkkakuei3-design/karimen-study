# Immediate review UX — 2026-10-12

Implemented proposal 1 + 3. Review home exposes all weak questions with a primary immediate-start action, recommended timing separately, and visible individual questions. Answered drill questions offer isolated confirmation practice in a dialog; it preserves the current session and does not alter scores or graduation counts. This distinction is stated in the dialog. Existing 24-hour graduation policy is unchanged.

Validation: npm test passed (500 question UI, 130 image bindings, scoring, review, timers, and latest partial-exam repairs). Added checks for early immediate review, unchanged reviewAt/reviewPass on an early correct answer, and unchanged serialized state after modal practice and return. Public Pages run 38169310689 succeeded. Browser fixture: 390px light, scheduled-in-future question can start now; answer, practice, and return verified. 360px dark mixed due/future screen has no horizontal overflow, unloaded visible images, or undersized targets. Physical iPhone/Safari not tested.

Screenshot: ../screenshots/review-now-390-20261012.jpg (isolated fixture with example records).
