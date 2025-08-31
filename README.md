# EduRPG – School Gamification Platform

This repository contains the **EduRPG** project documentation, tasks, and operational scripts.

## Quickstart (Development)

### Requirements
- Node.js 20+
- npm or pnpm
- Docker + Docker Compose
- Postgres 16

### Setup
1. **Clone repo** and install dependencies:
   ```bash
   npm install
   ```

2. **Start Postgres** via Docker Compose:
   ```bash
   docker compose up -d db
   ```

3. **Apply migrations** (Prisma):
   ```bash
   npx prisma migrate dev --name init
   ```

4. **Run dev server**:
   ```bash
   npm run dev
   ```
   App should be available at http://localhost:3000

### Backup / Restore
- **Backup:** Nightly cron runs `/ops/backup.sh`
- **Restore:** See `/docs/OPS_RESTORE.md`

### Authentication
- Login handled via **Bakaláři DataConnector** credentials (NextAuth Credentials provider).
- Session stored as JWT with role + classId claims.

### Tech Stack
- Next.js 15 (App Router)
- React 19
- TypeScript (strict)
- shadcn/ui + TailwindCSS
- Prisma + Postgres 16
- NextAuth v4
- Zod validation
- Vitest + Playwright (tests)

## Folder Structure
- `/docs` → Documentation (PRD, Architecture, API, Tasks, Workers)
- `/docs/tasks` → Task breakdowns (T01–T15 + TZZ)
- `/docs/workers` → Worker capability profiles
- `/ops` → Backup scripts, restore runbooks

## Contribution Workflow
1. Pick task file under `/docs/tasks`.
2. Implement code according to spec.
3. Run local tests (Vitest, Playwright).
4. Submit for review → **CODE_REVIEW_SUPERSENIOR** must give **Green** before merge/deploy.

## License
Internal use only – not open source.
