# Architecture — WeekPulse

## Overview

Monolithic Next.js application: React UI + Route Handler REST API + Prisma/PostgreSQL.

```
Browser → Next.js App Router pages
       → /api/* Route Handlers (Zod + RBAC)
       → Prisma services
       → PostgreSQL
Auth.js JWT session on every protected request
```

## Roles

| Role | Capabilities |
|------|--------------|
| TEAM_MEMBER | Own reports only: draft, edit, submit, view history |
| MANAGER | All reports, dashboard, review actions, projects |
| ADMIN | Manager + user invite/role assignment |

## Report workflow

```
DRAFT ──submit──► SUBMITTED ──approve──► APPROVED
                     │
                     └──request changes──► NEEDS_CORRECTION ──edit+resubmit──► SUBMITTED
```

On each submit/resubmit, a `ReportVersion` snapshot is stored. `ReviewAction` rows link comments to the version under review.

Managers never PATCH report content fields — only `/review` changes status + comment.

## Key modules

- `src/lib/auth.ts` — Auth.js credentials
- `src/lib/rbac.ts` — access helpers (unit tested)
- `src/lib/services/reports.ts` — create/update/submit/review + versions
- `src/lib/services/dashboard.ts` — metrics & chart aggregates
- `src/middleware.ts` — route gating by auth/role

## Database entities

User → Report → ReportVersion  
User → ReviewAction → Report / ReportVersion  
Project ← ProjectMembership → User  
Report → Project

## Frontend structure

- Personal: `/reports`, `/reports/new`, `/reports/[id]/edit`
- Shared detail: `/reports/[id]`
- Manager: `/dashboard`, `/reports/[id]/review`, `/team/[userId]`, `/projects`
- Admin: `/users`
