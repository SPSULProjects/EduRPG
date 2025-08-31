# EduRPG – PRD (MVP)

> Overview for MVP with lean worker roster, explicit tasks, tech stack, and success criteria.

## Product Summary
- **Product:** EduRPG – a school gamification platform.
- **Audience:** Students, Teachers, Operators (admins/leadership).
- **Value:** Beyond classes/tests: jobs, XP, achievements, items, events; RPG‑styled UX.

## Constraints
- **Auth:** Bakaláři DataConnector (credentials) → token after login.
- **Sync:** Import Bakaláři → EduRPG every **15 min** + manual trigger.
- **RBAC:** `OPERATOR` | `TEACHER` | `STUDENT`.
- **Economy:** Manual XP grants with **teacher daily XP budget**; Job payout split fairly.
- **UI:** RPG theme, responsive (phone → 8K), Czech first (i18n‑ready).
- **Ops:** Nightly DB backups **22:00**. Logs w/o PII. Log retention = **3 years** (1y easy + 2y archived for Operators).

## Technology
- **App:** Next.js **15** (App Router), React **19**, TypeScript
- **UI:** TailwindCSS + **shadcn/ui**
- **Auth:** NextAuth v4 (Credentials) + Bakaláři adapter
- **DB/ORM:** Postgres 16 + Prisma
- **Validation:** Zod
- **Testing:** Vitest, Playwright
- **Infra:** Docker Compose for Postgres (no CI/CD)

## MVP Scope
- Login via Bakaláři → JWT session
- 15‑min sync users/classes/subjects; Operator on‑demand
- Role‑aware dashboards; first‑login policy acknowledgment modal
- Jobs: create/apply/review/close with payout
- XP grants with daily teacher budget; per‑subject + overall progress (no leaderboard v1)
- Shop/Items (cosmetic); Achievements/Badges editor + manual award; Events with optional XP bonus
- Logs/Audit; backup; health check

## Worker Roster (owners)
- **FULLSTACK_INTEGRATOR:** T01, T02, T03, T10
- **DOMAIN_BACKEND_SPECIALIST:** T05, T06, T08, T09
- **FRONTEND_PRODUCT_ENGINEER:** T04, T07, T15 (+UI for T08)
- **DATA_PLATFORM_ENGINEER:** T11, T12 (+parts of T10, T13)
- **SECURITY_QA_ENGINEER:** T13, T14
- **CODE_REVIEW_SUPERSENIOR:** TZZ (gatekeeper)

## Success Criteria
- Operator can trigger sync; Teacher grants XP within daily limit; Student applies & gets payout after close.
- Logs are PII‑free; backups run nightly; health returns `{ ok:true, db:true }`.
- Code merges require **Green** from Code Reviewer.
