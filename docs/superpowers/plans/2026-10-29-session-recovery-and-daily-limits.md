# Session recovery and daily limits

**User decision:** Advanced study uses five cards per category per day. Due reviews take priority; unused slots are filled with new cards. Future reviews keep their FSRS dates, and overdue backlog remains due for the next day. Beginner study keeps ten cards daily. Day boundaries use America/Bogota.

**Recovery:** Replace three sequential Server Action requests with a cancellable HTTP initialization request. Show a retry state on failure or after 30 seconds. Create no session for an empty selection. A per-user UUID and unique database index reuse the same session if a response is lost. Ignore stale results and abort the HTTP request when leaving the page.

**Cost:** Remove the entire expansion operation and its dashboard/decks/session callers. This eliminates the previous five category reads, up to five future-card reads and up to 25 individual due-date updates per execution. Actual study selection/statistics/authentication and daily quota reads still query the database; this is not a total bill percentage or a measured concurrency claim.

**Implementation:**

- [x] Reproduce duplicate session creation with concurrent retries; add UUID uniqueness migration 0004 and private, repeat-safe creation.
- [x] Add load error, retry, timeout and stale-result handling. Reviewer identified Server Action queue blocking after timeout; replace initialization with AbortController + HTTP route.
- [x] Add failing daily-budget selection tests and pass them.
- [x] Delete future-card expansion instead of replacing it with a batch update.
- [x] Count daily reviews using Colombia day boundaries and enforce quotas transactionally under a per-user row lock.
- [x] Add migration 0005 for daily review lookup and preserve legacy migration fingerprint checks across new metadata.
- [x] Verify full integration suite, midnight boundary, concurrent final-slot enforcement, browser failure/retry, production build and final independent review.

**Migration requirement:** Apply pending migrations before deploying. No production database or hosting changes are authorized or performed in this task.

## Verification evidence

- Reproduced duplicate sessions on concurrent retries before the fix (different session IDs); the idempotent creation regression then passed.
- Browser verification used a trigger in the disposable database to first reject session creation, then delay it 35 seconds. The page showed a recoverable error, timed out at 30 seconds, and retried successfully to the Reveal screen. Session count was 3 before the delayed start, 4 after its delayed commit, and still 4 after retry.
- Daily selection tests cover three due reviews plus two new cards, untouched future dates, exhausted daily quotas, next-day backlog, and the separate beginner limit.
- Database tests cover same-user concurrent quota enforcement, Colombia midnight boundaries, session privacy, HTTP origin/auth validation and no empty-session creation.
- Independent review identified and corrected blocked Server Action retries and cross-tab quota recovery, including completing already-saved work when a refresh has no cards left. Final focused review found no remaining issues.
- Final checks: 43 unit tests, 12 integration tests against the local production build, ESLint and production build/TypeScript all passed. Integration action calls select the correct manifest worker because initialization no longer imports read/create actions into the client session page.
