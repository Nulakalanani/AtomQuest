# AtomQuest — Goal Setting & Tracking Portal

> **AtomQuest Hackathon 1.0 submission** · Built on React + TypeScript + Supabase + Vercel

---

## 🚀 Live Demo

**URL:** [https://atomquest-vercel.vercel.app](https://atomquest-vercel.vercel.app)

### Demo Accounts

| Role     | Email               | Password   |
|----------|---------------------|------------|
| Admin    | admin@demo.com      | Demo@1234  |
| Manager  | manager@demo.com    | Demo@1234  |
| Employee | employee@demo.com   | Demo@1234  |

> Use the **role switcher** (top-right) if a user has multiple roles.

---

## ✅ BRD Coverage Checklist

### Core Requirements (§1–§4)

| Requirement | Status | Notes |
|---|---|---|
| Employee goal sheet (up to 8 goals) | ✅ | Enforced at DB level |
| Thrust area assignment per goal | ✅ | Admin-configurable |
| Weightage 10–100%, total = 100% | ✅ | Client + server-side DB function |
| UoM types: MIN / MAX / TIMELINE / ZERO | ✅ | Score formula per BRD table |
| Manager approval / return workflow | ✅ | Via `approve_employee_goals()` RPC |
| Goals locked post-approval | ✅ | RLS + locked column |
| Quarterly check-ins (Q1–Q4) | ✅ | Per-goal, per-quarter |
| Per-quarter planned milestones | ✅ | Configurable Q1–Q4 planned targets |
| Shared goals (admin → employees) | ✅ | Fan-out with parent_goal_id sync |
| Score computation formula | ✅ | `computeScore()` in scoreEngine.ts |
| Audit trail (every field change) | ✅ | DB trigger on INSERT + UPDATE |
| Escalation rules (3 triggers) | ✅ | Manual + automatic Edge Function |
| Role-based access (employee/manager/admin) | ✅ | Supabase RLS + RPC security definer |

### Admin Features (§5)

| Feature | Status |
|---|---|
| Users & Roles management | ✅ |
| Cycle create / open / close / delete | ✅ |
| Thrust area CRUD | ✅ |
| Shared goal push to employees | ✅ |
| Completion dashboard | ✅ |
| Analytics (4 charts: QoQ, Thrust, UoM, Manager Eff.) | ✅ |
| Audit trail with CSV export | ✅ |
| Escalation engine (auto + manual) | ✅ |

### Good-to-Have (§6)

| Feature | Status | Notes |
|---|---|---|
| Automated escalation | ✅ | Supabase Edge Function cron |
| Cost optimisation | ✅ | $0 on Vercel + Supabase free tier |
| Azure AD / SSO | 🔜 | Supabase supports SAML — config only |
| Email notifications | ✅ | Auto-escalate edge function sends digest email to ESCALATION_NOTIFY_EMAIL env var. Set in Supabase Dashboard → Edge Functions → Secrets. |

---

## 🏗 Architecture

```
Browser (React + Vite)
       │
       ▼
Vercel CDN (static SPA)
       │
       ▼
Supabase (PostgreSQL + Auth + Storage + Edge Functions)
  ├── Row Level Security on every table
  ├── Security-definer RPC functions for all mutations
  ├── DB triggers for full audit logging
  └── Edge Function: auto-escalate (daily cron @ 08:00 UTC)
```

**Cost:** $0/month on free tiers (Vercel Hobby + Supabase Free).

---

## 🛠 Local Development

```bash
git clone <repo>
cd atomquest-vercel
npm install

# Copy env
cp .env.example .env
# Fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

npm run dev
```

### Run Supabase migrations

```bash
# If you have Supabase CLI:
supabase db push

# Or paste migrations in order into Supabase SQL Editor:
# 1. supabase/migrations/20260517083153_*.sql  (schema + RLS)
# 2. supabase/migrations/20260517093216_*.sql  (indexes + policies)
# 3. supabase/migrations/20260518120000_gap_fixes.sql  (audit trigger, server validation)
```

Then run `supabase/seed.sql` in the SQL Editor.

---

## 📦 Vercel Deployment

1. Push to GitHub
2. Import in [vercel.com/new](https://vercel.com/new)
3. Set environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Framework: **Vite** (auto-detected)
5. Deploy ✅

The `vercel.json` SPA rewrite is already configured.

For email notifications: in Supabase Dashboard → Edge Functions → Secrets, add:
- `ESCALATION_NOTIFY_EMAIL` = the HR/admin email address to notify

---

## 🔑 Key Technical Decisions

### Server-side weightage validation
Goals can only be approved through the `approve_employee_goals(employee_id, manager_id)` RPC which validates `SUM(weightage) = 100` before locking. A rogue API call cannot bypass this.

### Full audit trail via DB trigger
Every `INSERT` and `UPDATE` on `goals` fires `audit_goal_changes()` / `audit_goal_created()` — no application code needed. The audit trail is always accurate.

### Shared-goal sync
When an employee saves a check-in, the app fans out the same `actual_achievement` to all sibling goals sharing the same `parent_goal_id`. This is the BRD's most complex requirement.

### Per-quarter planned milestones
Goals have `planned_q1`–`planned_q4` columns defaulting to `target/4` but fully editable before submission. The check-in screen shows the correct planned figure per quarter.

### Automatic escalation
A Supabase Edge Function (`auto-escalate`) runs on a daily cron at 08:00 UTC and calls the `run_escalation_check()` Postgres function. Three rules are evaluated: missing goals, slow approvals, missing check-ins. Duplicate open violations are suppressed.

---

## 🗂 Project Structure

```
src/
├── components/        # AppShell, RoleSwitcher, WeightageGauge, ScorePill
├── integrations/      # Supabase client + generated types
├── lib/
│   ├── auth.tsx       # AuthProvider, roles, effectiveRole
│   ├── scoreEngine.ts # MIN/MAX/TIMELINE/ZERO score formula
│   └── exportHelper.ts
└── routes/
    ├── _app.employee.*   # Dashboard, Goal Wizard, Check-in
    ├── _app.manager.*    # Team, Approvals, Check-ins review
    └── _app.admin.*      # Overview, Users, Cycles, Thrust, Shared,
                          # Completion, Escalations, Audit, Analytics

supabase/
├── migrations/           # All DB migrations in order
├── functions/
│   └── auto-escalate/    # Daily cron edge function
└── seed.sql              # Demo data + instructions
```
