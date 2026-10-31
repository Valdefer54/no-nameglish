# Fifteen-minute JWT sessions

**Goal:** Require a fresh login fifteen minutes after signing in, including while a page stays open.

**Architecture:** Reuse Better Auth's signed JWT cookie format and database sessions. Disable session renewal, validate application requests against the database to preserve revocation, and use the server's expiration time for a client redirect. Change the cookie prefix so existing seven-day sessions require a new login.

**Constraints:** No schema changes, new dependencies, production database operations, or deployment.

## Tasks

- [x] Add auth tests exercising real username login with a disposable memory adapter: JWT signature and lifetime, fixed expiration despite activity, replay rejection, and fresh login after expiration. Confirm failures against the original configuration.
- [x] Add a proxy test covering the new cookie and rejection of legacy cookies. Confirm failure.
- [x] Configure a 900-second session with JWT cookies and no refresh in `src/lib/auth.ts`; share the cookie prefix with `src/proxy.ts`.
- [x] Expose the authoritative session in `src/lib/current-user.ts`; use its expiry in `src/app/layout.tsx` and a client `SessionExpiry` component. Redirect using a full navigation to clear cached protected content, with checks when a tab regains focus or visibility.
- [x] Explain the expiration and one-time sign-in requirement in README; include new auth tests in `npm test`.
- [x] Run the full unit suite, lint, TypeScript and build. Run integration tests against a new disposable PostgreSQL database and verify the browser expiration redirect.

## Review focus

- Replayed expired cookies must fail even when the browser has retained them.
- A JWT cache must not authorize revoked sessions in application APIs or actions.
- Activity must not extend the absolute expiration.
- Existing cookies must not retain their previous seven-day lifetime.
- Open or suspended tabs must return to login when the server's session expires.

## Review fixes and evidence

- Added failing-then-passing tests and a session creation hook for Better Auth's one-day `rememberMe:false` default and password-change token rotation. Both now preserve the fifteen-minute deadline.
- Derived a policy-specific signing key from `BETTER_AUTH_SECRET` so renaming an old seven-day cookie cannot bypass the new cookie prefix. Added a failing-then-passing replay regression test.
- Final unit suite: 32 passed. PostgreSQL integration suite: 8 passed against the disposable `nameglish_jwt_20261029_test` database. ESLint, TypeScript and the production build passed with Node.js 24.
- Browser verification: signed in locally, shortened only the disposable session deadline, reloaded the protected page, and observed automatic navigation back to `/login` without an interaction.
- Independent final review reported no remaining findings. No production data or hosting configuration was changed.
