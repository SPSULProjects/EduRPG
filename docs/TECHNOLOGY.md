# Technology Stack & Usage

- **Next.js 15 (App Router)**: Prefer Server Components for data lists; Client Components for interactivity.
- **React 19**: Concurrent‑safe components; avoid unnecessary client state.
- **TypeScript (strict)**: No `any`; use Zod for runtime validation at edges.
- **shadcn/ui**: Use primitives (Button, Card, Dialog, Table, Form, Toast). Keep accessibility defaults.
- **TailwindCSS**: Utility‑first responsive design; tokens for rarities & themes.
- **NextAuth v4**: Credentials provider; JWT strategy; minimal claims (`role`, `classId`). Store Bakaláři token in JWT only.
- **Prisma + Postgres 16**: All critical mutations in transactions; indexes for class/teacher/subject lookups.
- **Vitest + Playwright**: Unit/integration & E2E. Run locally / staging (no CI/CD).
- **Docker Compose**: Local Postgres; volumes for persistence.
- **Backups**: `backup.sh` cron nightly; restore verified quarterly.
- **Health**: `/api/health` returns `{ ok, ts, db }` (db ping).
