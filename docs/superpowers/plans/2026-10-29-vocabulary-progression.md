# Ordered vocabulary progression

**Goal:** Study A1, then A2, then B1; congratulate learners and switch to B2–C1 after completion. Estimate the A1 workload for one daily ten-card session, five weekdays per week.

**Agreed criterion:** Every word studied, with at least 80% mature. A mature word has stability >21 days and >=5 reviews.

**Architecture:** Keep the existing FSRS scheduler. Store the unlocked beginner level and pending graduation notice on the account. Evaluate the complete canonical catalogue, persist forward-only milestones, and seed advanced cards once inside a transaction locking the account. Retain earlier cards and their scheduled reviews. Select new cards in catalogue order; never unlock a future level merely because current reviews are not due.

**UI:** Extend the current interface with a quiet A1 → A2 → B1 progress strip and an accessible graduation announcement with a dismiss action saved on the account. Preserve current fonts, colours and components.

- [x] Write failing unit tests for thresholds, ordering, locked levels, retained reviews and incomplete catalogues.
- [x] Implement progression rules, account fields and a generated Drizzle migration.
- [x] Add transactional promotion, private notice acknowledgement and canonical advanced seeding without duplicates.
- [x] Connect authenticated user reads, selection, review authorization, statistics and dashboard progress.
- [x] Verify real progression, concurrent promotion, data preservation and private notices in integration tests.
- [x] Run a reproducible FSRS workload simulation and document assumptions and results.
- [x] Run all tests, lint, TypeScript, build, browser verification and independent review.

**Constraints:** Preserve JWT changes already in the workspace. No production database access or deployment. A1/A2/B1 each contain 100 words; this catalogue is not a complete CEFR course or certification.

## Verification

- 39 unit tests and 9 PostgreSQL integration tests passed, including concurrent promotion and private acknowledgement. ESLint, TypeScript and the production build passed with Node.js 24.
- The independent reviewer found that advanced expansion could pull earlier beginner cards forward. Added a failing integration regression, excluded A1–B1 from the future-card expansion query, and verified the full suite passed. Final review reported no remaining material findings.
- Browser verification showed A1 active and A2/B1 locked, then the congratulations notice and 25 advanced cards after meeting the criterion. The confirmation button removed the persisted notice.
- FSRS simulation: 100 A1 words; one session of up to 10 cards on weekdays, default scheduler with interval fuzz disabled, 20 random seeds per error rate. Median completion: 197 days with all Good; 282 days with 5% Again; 284 days with 10% Again; 333 days with 20% Again. Full assumptions and first-presentation times are in README.
- Migration 0003 was applied only to the disposable local test database. Production still requires migration before deployment.
