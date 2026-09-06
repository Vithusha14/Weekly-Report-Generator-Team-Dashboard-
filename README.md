# WeekPulse - Weekly Report Generator & Team Dashboard

## 1. Overall project

**WeekPulse** is a full-stack internal web application for teams to submit structured weekly work reports and for managers to review, request corrections, approve, and analyze those reports across the whole team.

### What it solves

| Role | What they can do |
|------|------------------|
| **Team Member** | Create/edit own weekly reports, submit for review, see manager feedback, resubmit |
| **Manager** | View all (non-draft) reports, approve or request changes, use team dashboard & charts |
| **Admin** | Everything a manager can do + invite/remove users and assign roles |

### Core workflow

```
DRAFT → SUBMITTED → NEEDS_CORRECTION → (edit) → SUBMITTED → APPROVED
```

- Each resubmit saves a **ReportVersion** (history is kept, not overwritten).
- Managers can change **status/comment only** — they cannot edit the member’s report content.
- Draft report content is **private to the author**; managers only see draft/not-started status on the dashboard.

### Main features

- Authentication (register, login, logout) with hashed passwords and secure sessions  
- Fixed report structure (same fields for every user)  
- Task table, blockers (key issue), achievements (key highlight), hours by type  
- Review/correction cycle with comment history  
- Manager dashboard: metrics, date range filters, charts, activity feed  
- Project/category CRUD + optional member assignment  
- Admin user management  
- Optional AI chat assistant for managers  
- Seeded demo data + RBAC unit tests  

---

## 2. Tech stack

### Frontend

| Item | Choice |
|------|--------|
| Framework | **Next.js 16** (App Router) |
| Language | **TypeScript** |
| UI | **React 19** + **Tailwind CSS** |
| Charts | **Recharts** |
| Forms / UX | Client components, basic form validation |
| Auth UI | Auth.js / NextAuth client (`signIn` / session) |

**Frontend folders**

```
src/app/                 → pages (login, reports, dashboard, projects, users, team)
src/components/          → reusable UI (ReportForm, ReportView, StatusBadge, AiChatWidget, AppNav)
src/app/globals.css      → theme & shared styles
```

### Backend (API)

| Item | Choice |
|------|--------|
| Runtime | **Next.js Route Handlers** (`src/app/api/*`) — REST API |
| Auth | **Auth.js (NextAuth v5)** Credentials + JWT sessions |
| Validation | **Zod** on request bodies |
| Business logic | `src/lib/services/` (reports, dashboard) |
| Access control | `src/lib/rbac.ts` + middleware + per-route checks |

**Backend folders**

```
src/app/api/auth/        → login/register (NextAuth + register route)
src/app/api/reports/     → CRUD, submit, review
src/app/api/projects/    → project CRUD
src/app/api/users/       → admin user management
src/app/api/dashboard/   → manager metrics & chart data
src/app/api/ai/chat/     → AI assistant
src/lib/                 → auth, prisma, rbac, validations, services
src/middleware.ts        → route protection by role
```

### Database

| Item | Choice |
|------|--------|
| Database | **PostgreSQL 16** (Docker) |
| ORM | **Prisma** |
| Schema | `prisma/schema.prisma` |
| Seed | `prisma/seed.ts` |

**Main tables:** `User`, `Project`, `ProjectMembership`, `Report`, `ReportVersion`, `ReviewAction`

---

## 3. Project structure (overview)

```
weekly-reports/
├── prisma/
│   ├── schema.prisma          # DB models
│   └── seed.ts                # demo users & reports
├── src/
│   ├── app/
│   │   ├── (app)/             # authenticated pages
│   │   ├── api/               # REST backend
│   │   ├── login/ register/   # auth pages
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/            # frontend components
│   ├── lib/                   # backend helpers & services
│   └── middleware.ts
├── tests/rbac.test.ts         # RBAC tests
├── docs/                      # architecture + ER notes
├── docker-compose.yml         # PostgreSQL
├── .env.example
└── package.json
```

This is a **single monorepo**: frontend pages and backend API run together via Next.js.

---

## 4. Setup instructions

### Prerequisites

- Node.js **20+**
- npm
- **Docker Desktop** (for PostgreSQL)

### 1) Install dependencies (frontend + backend packages)

```bash
cd weekly-reports
npm install
```

### 2) Environment

Copy `.env.example` to `.env` (or use the existing `.env`):

```env
DATABASE_URL="postgresql://weekly:weekly@localhost:5433/weekly_reports?schema=public"
AUTH_SECRET="dev-secret-change-me-in-production-weekly-reports-2026"
AUTH_TRUST_HOST="true"
NEXTAUTH_URL="http://localhost:3000"
```

Optional (AI assistant):

```env
OPENAI_API_KEY=...
# or
ANTHROPIC_API_KEY=...
```

> **Note:** Postgres is mapped to host port **5433** (because 5432 is often already used on Windows).

### 3) Running the database

```bash
# Start PostgreSQL container
npm run db:up

# Apply schema
npx prisma db push

# Seed demo data
npm run db:seed
```

Stop DB later:

```bash
npm run db:down
```

### 4) Running the backend (API)

The REST API is part of the Next.js server under `/api/*`.  
Starting the Next.js app also starts the backend:

```bash
npm run dev
```

API base: `http://localhost:3000/api`

### 5) Running the frontend

Same command — App Router pages are served by the same process:

```bash
npm run dev
```

Open: [http://localhost:3000](http://localhost:3000)

### 6) Production build (optional)

```bash
npm run build
npm run start
```

---

## 5. Frontend pages

| Page | Route | Who |
|------|-------|-----|
| Login | `/login` | Public |
| Register | `/register` | Public |
| Report history | `/reports` | Member (+ redirects) |
| Create report | `/reports/new` | Member |
| Edit report | `/reports/[id]/edit` | Author (Draft / Needs Correction) |
| Report detail | `/reports/[id]` | Author or Manager/Admin (not drafts for managers) |
| Manager review | `/reports/[id]/review` | Manager / Admin |
| Team dashboard | `/dashboard` | Manager / Admin |
| Projects | `/projects` | Manager / Admin |
| Users | `/users` | Admin |
| Member profile | `/team/[userId]` | Manager / Admin |

---

## 6. Backend API (REST)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/auth/register` | Register new team member |
| `GET/POST` | `/api/auth/[...nextauth]` | Auth.js login/session |
| `GET/POST` | `/api/reports` | List / create draft |
| `GET/PATCH` | `/api/reports/:id` | View / update content |
| `POST` | `/api/reports/:id/submit` | Submit / resubmit (+ version) |
| `POST` | `/api/reports/:id/review` | Approve or request changes |
| `GET/POST` | `/api/projects` | List / create project |
| `GET/PATCH/DELETE` | `/api/projects/:id` | Project update / delete |
| `GET/POST` | `/api/users` | List / invite users |
| `GET/PATCH/DELETE` | `/api/users/:id` | Profile, role, remove |
| `GET` | `/api/dashboard` | Metrics + charts (`dateFrom`, `dateTo`) |
| `POST` | `/api/ai/chat` | Manager AI assistant |

All protected routes enforce **role-based access control** on the server.

---

## 7. Scripts

| Command | Purpose |
|---------|---------|
| `npm install` | Install frontend + backend dependencies |
| `npm run db:up` | Start PostgreSQL (Docker) |
| `npm run db:down` | Stop PostgreSQL |
| `npx prisma db push` | Sync DB schema |
| `npm run db:seed` | Seed users, projects, reports |
| `npm run dev` | Run frontend + backend (Next.js) |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm test` | Run RBAC unit tests |

---

## 8. AI assistant (optional)

- Managers get an in-app chat widget.
- Uses OpenAI or Anthropic if an API key is set.
- Without a key, a local fallback answers simple questions from recent report summaries.
- Only report context is sent — never passwords.

---

## 9. Docs

- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- ER diagram notes: [docs/ER-DIAGRAM.md](docs/ER-DIAGRAM.md)

---

## License

Assignment / educational use.
