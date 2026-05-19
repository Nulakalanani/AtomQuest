# AtomQuest — Architecture & Cost

## Stack

```
Browser (React 19 + Vite)
    │
    ├── React Router v6 — client-side routing
    ├── TanStack Query v5 — server state, caching
    ├── shadcn/ui + Tailwind v4 — component library
    ├── Recharts — analytics charts
    └── XLSX.js — CSV / Excel export
         │
         ▼
  Supabase (Backend-as-a-Service)
    ├── Auth — email/password, JWT sessions
    ├── PostgreSQL — goals, check-ins, profiles, cycles, audit
    ├── Row-Level Security — per-role data isolation
    ├── SECURITY DEFINER functions
    │     ├── approve_employee_goals() — atomic approval with validation
    │     └── sync_shared_checkin()   — sibling goal achievement sync
    └── Realtime (passive — queries via React Query)
         │
         ▼
  Vercel — static hosting, edge CDN, zero config
```

## Database schema (key tables)

| Table | Purpose |
|-------|---------|
| `profiles` | User profile: name, email, manager_id, department |
| `user_roles` | Many-to-many: user ↔ role (employee/manager/admin) |
| `thrust_areas` | Admin-configured goal categories |
| `cycles` | Year × phase (GOAL_SETTING / Q1–Q4 / CLOSED) with open/close windows |
| `goals` | Full goal lifecycle: draft → submitted → approved/returned → locked |
| `check_ins` | Quarterly actual achievement, score, manager comment |
| `audit_logs` | Every post-lock field change: who, what, when |
| `escalation_logs` | Rule-based escalation records with resolution tracking |

## Security model

- **RLS on every table** — employees only see their own goals; managers see their direct reports; admins see all.
- **`has_role()` and `is_manager_of()`** — SECURITY DEFINER helper functions used in all policies to avoid privilege escalation.
- **`approve_employee_goals()`** — atomic approve: validates total = 100% AND per-goal min 10% before updating any rows.
- **`sync_shared_checkin()`** — SECURITY DEFINER so the primary owner can write check-in rows for sibling employees without a client-side RLS bypass.
- Anon key is safe to expose (Supabase design); service role key is never in the frontend.

## Cost profile (free-tier sustainable)

| Service | Free tier | Usage |
|---------|-----------|-------|
| Supabase | 500MB DB, 2GB bandwidth | Well within for demo/pilot |
| Vercel | 100GB bandwidth, unlimited deployments | Static SPA — trivial footprint |
| Total | **$0/month** for pilot org | Scales to Supabase Pro (~$25/mo) at ~500 active users |

## Key design decisions

- **No backend server** — all logic is PostgreSQL functions or client-side. Zero infra to maintain.
- **SECURITY DEFINER DB functions** for cross-user writes (shared goal sync, bulk approve) — avoids sending a service role key to the browser.
- **Optimistic UI** via TanStack Query `invalidateQueries` — instant feedback, no full-page reloads.
- **Vercel `vercel.json` with SPA rewrite** — all routes serve `index.html` so deep links work after deploy.
