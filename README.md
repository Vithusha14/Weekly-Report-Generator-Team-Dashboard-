# WeekPulse - Weekly Report Generator & Team Dashboard

Full-stack internal tool for structured weekly reports, manager review/correction workflows, and team analytics.

## Stack

- **Frontend / API:** Next.js 16 (App Router), TypeScript, Tailwind CSS
- **Auth:** Auth.js (NextAuth v5) Credentials provider + JWT sessions
- **Validation:** Zod
- **ORM / DB:** Prisma + PostgreSQL
- **Charts:** Recharts
- **Tests:** Vitest (RBAC)

## Features

- Role-based access: Team Member, Manager, Admin
- Fixed weekly report structure (tasks, blockers, achievements, hours by type)
- Review workflow: Draft → Submitted → Needs Correction → Submitted → Approved
- Report version history on each resubmission
- Manager dashboard with filters, metrics, and charts
- Project CRUD, user management, member profiles
- Optional AI chat assistant for managers

## Prerequisites

- Node.js 20+
- Docker Desktop (for PostgreSQL)

## Setup

### 1. Install dependencies

```bash
cd weekly-reports
npm install
```

### 2. Environment

Copy `.env.example` to `.env` (already provided for local demo):

```bash
DATABASE_URL="postgresql://weekly:weekly@localhost:5433/weekly_reports?schema=public"
AUTH_SECRET="dev-secret-change-me-in-production-weekly-reports-2026"
AUTH_TRUST_HOST="true"
NEXTAUTH_URL="http://localhost:3000"
```

Optional AI keys:

```bash
OPENAI_API_KEY=...
# or
ANTHROPIC_API_KEY=...
```

### 3. Start database

```bash
npm run db:up
```

Wait until Postgres is healthy, then:

```bash
npx prisma db push
npm run db:seed
```

### 4. Run the app (frontend + API together)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Demo accounts

Password for all: `Password123!`

| Role | Email |
|------|-------|
| Admin | admin@weekly.app |
| Manager | manager@weekly.app |
| Members | sam@weekly.app, jordan@weekly.app, casey@weekly.app, taylor@weekly.app, riley@weekly.app |

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Next.js |
| `npm run db:up` | Start Postgres container |
| `npx prisma db push` | Apply schema |
| `npm run db:seed` | Seed users/projects/reports |
| `npm test` | Run RBAC unit tests |
| `npm run build` | Production build |

## Pages

1. Login / Register
2. Personal weekly report create (`/reports/new`)
3. Report edit (`/reports/[id]/edit`)
4. Report history (`/reports`)
5. Report detail (`/reports/[id]`)
6. Manager review (`/reports/[id]/review`)
7. Team dashboard (`/dashboard`)
8. Projects (`/projects`)
9. Users admin (`/users`)
10. Team member profile (`/team/[userId]`)

## API overview

- `POST /api/auth/register` — register team member
- `GET/POST /api/reports` — list / create draft
- `GET/PATCH /api/reports/:id` — detail / edit content (author + editable status)
- `POST /api/reports/:id/submit` — submit / resubmit (creates version)
- `POST /api/reports/:id/review` — manager approve / request changes
- `GET/POST/PATCH/DELETE /api/projects` — project CRUD
- `GET/POST/PATCH/DELETE /api/users` — admin user management
- `GET /api/dashboard` — manager metrics + chart data
- `POST /api/ai/chat` — manager AI assistant

All protected endpoints enforce RBAC server-side.

## AI assistant

Managers see a chat widget. If `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` is set, answers use that provider with a grounded prompt over recent report summaries. Without a key, a local heuristic fallback answers basic questions. Only aggregated report context is sent — never passwords.

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## License

Assignment submission — educational use.
