# ER Diagram (text)

```
┌──────────┐       ┌───────────────────┐       ┌──────────┐
│  User    │──────<│ ProjectMembership │>──────│ Project  │
│----------│       └───────────────────┘       │----------│
│ id       │                                   │ id       │
│ email    │                                   │ name     │
│ role     │──┐                                │ desc     │
└──────────┘  │                                └────┬─────┘
     │        │                                     │
     │ authors│                                     │ tagged on
     ▼        │                                     ▼
┌──────────┐  │                              ┌──────────┐
│  Report  │──┘                              │  Report  │
│----------│<────────────────────────────────┤ (project)│
│ status   │                                 └──────────┘
│ content  │
│ latestComment │
└────┬─────┘
     │ 1:N versions
     ▼
┌──────────────┐         ┌──────────────┐
│ ReportVersion│────────<│ ReviewAction │
│--------------│         │--------------│
│ versionNumber│         │ action       │
│ snapshot JSON│         │ comment      │
│ submittedAt  │         │ reviewerId ──┼──► User
└──────────────┘         └──────────────┘
```

Statuses: DRAFT | SUBMITTED | NEEDS_CORRECTION | APPROVED
Roles: TEAM_MEMBER | MANAGER | ADMIN
