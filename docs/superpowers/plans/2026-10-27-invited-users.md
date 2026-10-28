# Invited Users Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the shared password with administrator-created accounts and private study progress.

**Architecture:** Better Auth with the existing Drizzle/PostgreSQL connection; the admin plugin creates invited accounts and blocks public signup. Owner provisioning and the schema upgrade run transactionally before deployment. All application data and paid APIs validate real sessions.

**Tech Stack:** Next.js 16.4.3, React 19, Drizzle, postgres-js, Better Auth, node:test.

**Spec:** docs/superpowers/specs/2026-10-27-invited-users-design.md

## Global Constraints

- One server-side DEEPSEEK_API_KEY serves all authenticated users.
- No public signup; only the administrator creates accounts.
- Preserve existing cards, reviews and study sessions for the provisioned owner.
- Keep existing components and styling; do not expose secrets in source or browser bundles.

## Review Focus

- A guessed session/card ID from another account never reads or changes its data.
- Missing, forged, expired or revoked sessions cannot call paid APIs.
- Public auth endpoints cannot create accounts or escalate roles.
- Re-running provisioning never duplicates initial cards or transfers existing user data.
- Invalid credentials, malformed request bodies and duplicate usernames return useful errors.

### Task 1: Database and authentication

- [x] Write failing integration tests against a temporary PostgreSQL database for provisioning, closed registration, login, cookies and admin permissions.
- [x] Add Better Auth schema, rate-limit storage, configuration and handler.
- [x] Add an idempotent, transactional upgrade/provisioning script that assigns legacy data to the explicitly created owner.
- [x] Run integration tests and the existing test suite.

### Task 2: Isolate study data and APIs

- [x] Add failing tests using two real authenticated accounts for cards, statistics, session summaries and reviews, plus unauthenticated AI access.
- [x] Require authenticated users in every server action and API route; scope reads and writes by owner and use transactions for reviews.
- [x] Seed new users with independent initial vocabulary.
- [x] Run tests and verify no unauthenticated provider request reaches DeepSeek/Groq.

### Task 3: Account screens and delivery

- [x] Add login, logout, password change and administrator account creation using the existing UI style.
- [x] Document environment variables, migration/provisioning and deployment order.
- [x] Run tests, lint, TypeScript, production build and desktop browser checks. Mobile viewport verification remains unavailable in the current browser tools.
- [x] Review the full diff and report deployment prerequisites and any unverified production work.

### Additional user requirement: beginner vocabulary

- [x] Create and validate 300 original A1/A2/B1 entries with Spanish support.
- [x] Persist the shared catalog and seed independent per-user cards.
- [x] Add beginner/advanced selection on account creation; preserve advanced owner data.
- [x] Test A1 → A2 → B1 selection and adapt AI prompts to account level.
- [x] Repeat integration and production build after the Next.js security update.

## Verified / remaining external work

- 24 unit tests and 8 HTTP/database integration tests pass with username login.
- Integration includes dotted usernames, public profile update rejection, password change and other-session revocation.
- Production build, lint and TypeScript pass. Legacy and fresh databases were tested locally.
- Independent review findings (final review retry duplication, internal username identifier validation, nullable username update bypass) were fixed.
- Production migration and deployment completed using the existing no-nameglish POSTGRES_URL. Preserved 101 cards, 26 study sessions and 253 reviews for valdefer; the transaction verified progress fingerprints and stored no_nameglish_legacy_backup. Production username login/admin access and anonymous access guards were verified. The one-time PROVISION_OWNER flag was reset to 0.
