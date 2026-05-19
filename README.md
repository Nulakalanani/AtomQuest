<div align="center">

<img src="https://img.shields.io/badge/AtomQuest-Enterprise%20Goal%20Management-6366f1?style=for-the-badge&logoColor=white" alt="AtomQuest" />

# ⚛️ AtomQuest
### Enterprise Goal Management & Performance Tracking Portal

*Where ambition meets accountability — at enterprise scale.*

<br/>

[![Live Demo](https://img.shields.io/badge/🚀%20Live%20Demo-atom--quest--tracker.vercel.app-6366f1?style=for-the-badge)](https://atom-quest-tracker.vercel.app)
[![Built with React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

<br/>

> **AtomQuest** is a full-stack enterprise SaaS platform for goal setting, quarterly performance tracking, escalation management, and executive analytics — purpose-built for the AtomQuest Hackathon 2025.

<br/>

---

</div>

## 🎯 Hackathon Submission

| Field | Details |
|---|---|
| 🏆 **Hackathon** | AtomQuest Hackathon 2025 |
| 🌐 **Live Demo** | [https://atom-quest-tracker.vercel.app](https://atom-quest-tracker.vercel.app) |
| 📁 **Repository** | This repository |
| 👤 **Role Credentials** | See [Demo Credentials](#-demo-credentials) below |

<br/>

---

## ✨ Why AtomQuest?

Most enterprises still manage performance goals through disconnected spreadsheets, email chains, and manual reviews. **AtomQuest** eliminates that friction entirely.

| Without AtomQuest | With AtomQuest |
|---|---|
| 📋 Goals scattered across spreadsheets | ✅ Centralized goal management per cycle |
| 📧 Approval chains via email | ✅ Structured submit → approve → lock workflow |
| 🕵️ No visibility on escalations | ✅ Automated escalation engine with edge functions |
| 📊 Manual quarterly review meetings | ✅ Real-time check-ins with weighted scoring |
| 👁️ Executives blind to team performance | ✅ Live executive dashboards and analytics |
| 🔒 No audit trail | ✅ Full audit log for every action |

<br/>

---

## 🚀 Key Highlights

- ⚡ **End-to-end goal lifecycle** — from draft to approved, checked-in, locked, and scored
- 🔐 **Row-Level Security** via Supabase — every user sees only what they're permitted to
- 🤖 **Edge Function Escalation Engine** — automatically flags overdue check-ins without any manual intervention
- 📈 **Multi-axis scoring system** — MIN, MAX, TIMELINE, ZERO — all calculated server-side
- 🎭 **Three role-based portals** in a single app — Employee, Manager, Admin
- 📤 **Excel export** of performance data from any dashboard
- 🌐 **Production-deployed** on Vercel with zero-config CI/CD

<br/>

---

## 🏛️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        ATOMQUEST PLATFORM                       │
├─────────────────┬───────────────────┬───────────────────────────┤
│   EMPLOYEE      │     MANAGER       │         ADMIN             │
│   PORTAL        │     PORTAL        │         PORTAL            │
│                 │                   │                           │
│ • My Goals      │ • Team Approvals  │ • Analytics Dashboard     │
│ • Check-ins     │ • Check-in Review │ • Escalation Control      │
│ • Progress      │ • Team Analytics  │ • Audit Log               │
│   Tracking      │                   │ • Cycle Management        │
│                 │                   │ • Thrust Areas            │
│                 │                   │ • Shared Goals            │
│                 │                   │ • Completion Reports      │
└────────┬────────┴─────────┬─────────┴─────────────┬─────────────┘
         │                  │                        │
         └──────────────────┴────────────────────────┘
                            │
              ┌─────────────▼──────────────┐
              │     React + TypeScript      │
              │    Vite + Tailwind CSS      │
              │    ShadCN UI + Recharts     │
              │    TanStack Query (v5)      │
              └─────────────┬──────────────┘
                            │
              ┌─────────────▼──────────────┐
              │        SUPABASE            │
              │ ┌────────────────────────┐ │
              │ │   PostgreSQL (RLS)     │ │
              │ │   Auth (JWT)           │ │
              │ │   Edge Functions       │ │
              │ │   Real-time Subs       │ │
              │ └────────────────────────┘ │
              └─────────────┬──────────────┘
                            │
              ┌─────────────▼──────────────┐
              │  Supabase Edge Functions   │
              │  (Deno runtime)            │
              │                            │
              │  • escalation-checker      │
              │    (cron: daily trigger)   │
              │  • score-compute           │
              └────────────────────────────┘
                            │
              ┌─────────────▼──────────────┐
              │     Vercel (CDN + CI/CD)   │
              │     Global Edge Network    │
              └────────────────────────────┘
```

<br/>

---

## 🎭 Role-Based Workflow

### 👤 Employee Journey
```
Create Goal (DRAFT)
      ↓
 Submit for Approval  ──────────────────────────────►  SUBMITTED
      ↓                                                     ↓
                                                   Manager Reviews
                                                     ↙         ↘
                                               APPROVED      RETURNED
                                                   ↓
                                          Quarterly Check-ins (Q1→Q4)
                                                   ↓
                                            Goal LOCKED (by Admin)
                                                   ↓
                                           Final Score Computed
```

### 👥 Manager Journey
```
Review Submitted Goals
      ↓
Approve / Return with Comment
      ↓
Monitor Team Check-ins
      ↓
View Team Performance Analytics
```

### 🛡️ Admin Journey
```
Configure Cycles & Thrust Areas
      ↓
Manage Shared Goals
      ↓
Monitor Escalations
      ↓
Lock Goals (End of Quarter)
      ↓
View Executive Analytics + Audit Log
      ↓
Export Completion Reports
```

<br/>

---

## 🌟 Features

### 🎯 Goal Management
| Feature | Description |
|---|---|
| **Goal Creation** | Employees create goals with thrust area, UoM type (MIN/MAX/TIMELINE/ZERO), target, and weightage |
| **Weighted Scoring** | Automatic weighted performance score across all goals (max 150 per goal) |
| **Shared Goals** | Admin-created goals cascaded across the organisation |
| **Goal Locking** | Admin can lock goals at cycle-end to freeze scores |
| **Return Workflow** | Managers can return goals with comments for revision |
| **Status Tracking** | DRAFT → SUBMITTED → APPROVED → LOCKED lifecycle |

### 📊 Performance & Analytics
| Feature | Description |
|---|---|
| **Quarterly Check-ins** | Employees log progress per quarter with percentage completion |
| **Score Engine** | Multi-axis scoring: MIN (higher is better), MAX (lower is better), TIMELINE, ZERO defect |
| **Score Tiers** | 💎 Exceeds (≥100) · 🟢 On Target (≥80) · 🟡 At Risk (≥50) · 🔴 Off Track |
| **Analytics Dashboard** | Department-wise, cycle-wise, thrust-area-wise performance breakdown |
| **Completion Reports** | Per-employee score report exportable to Excel |
| **Executive Dashboard** | Admin-level org-wide analytics with Recharts visualisations |

### ⚠️ Escalation Engine
| Feature | Description |
|---|---|
| **Auto-Detection** | Edge Function scans all active cycles for overdue check-ins daily |
| **Escalation Records** | Timestamped escalation log stored in DB per employee/cycle |
| **Admin View** | Escalations dashboard showing who is overdue and for how long |
| **Resolution Tracking** | Escalations resolved automatically on check-in submission |

### 🔒 Security & Governance
| Feature | Description |
|---|---|
| **Row-Level Security** | Supabase RLS policies on every table — zero data leakage between roles |
| **JWT Auth** | Supabase Auth with session management |
| **Audit Log** | Every create/update/delete action timestamped and stored |
| **Role Guards** | React-side route protection matching DB-level access control |

<br/>

---

## 🤖 Edge Escalation Engine

The heart of AtomQuest's automation layer is the **escalation-checker** Supabase Edge Function.

```
Supabase Cron (Daily)
        │
        ▼
escalation-checker (Deno)
        │
        ├─► Query: All active cycles with overdue check-in windows
        │
        ├─► Cross-reference: Employees who have NOT submitted check-ins
        │
        ├─► Write: escalations table (employee_id, cycle_id, quarter, triggered_at)
        │
        └─► Result: Admin escalation dashboard updates in real-time
```

**Why this matters:** In a real enterprise, managers manually chase employees for updates. AtomQuest's engine removes that burden entirely — no human needed to identify who's behind.

<br/>

---

## 📐 Admin Analytics Engine

The Admin Analytics dashboard aggregates performance data across five dimensions:

| Dimension | View |
|---|---|
| **By Department** | Average score per department across the org |
| **By Thrust Area** | Which strategic areas are performing well vs at risk |
| **By Cycle Phase** | Q1/Q2/Q3/Q4 score trends |
| **By Individual** | Per-employee breakdown filterable by manager/dept |
| **Completion Rate** | % of employees who have submitted check-ins per quarter |

All charts are built with **Recharts** — responsive, animated, and export-ready.

<br/>

---

## 🧱 Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend Framework** | React 19 + Vite 7 | SPA with lightning-fast HMR |
| **Language** | TypeScript 5.8 | Type-safe development at scale |
| **Styling** | Tailwind CSS 4 | Utility-first responsive design |
| **UI Components** | ShadCN UI + Radix UI | Accessible, composable component system |
| **State & Data** | TanStack Query v5 | Server state, caching, background refetch |
| **Charts** | Recharts 2 | Responsive SVG data visualisation |
| **Forms** | React Hook Form + Zod | Schema-validated form handling |
| **Animations** | Framer Motion | Smooth, production-grade transitions |
| **Backend** | Supabase (PostgreSQL) | Relational DB with real-time & RLS |
| **Auth** | Supabase Auth (JWT) | Session management across roles |
| **Edge Functions** | Supabase Edge (Deno) | Serverless automation (escalation engine) |
| **Routing** | React Router v6 | Client-side navigation with role guards |
| **Export** | xlsx (SheetJS) | Excel report generation |
| **Deployment** | Vercel | Global CDN, CI/CD from GitHub |

<br/>

---

## 📁 Project Structure

```
atomquest-vercel/
├── src/
│   ├── routes/
│   │   ├── index.tsx                      # Login page
│   │   ├── signup.tsx                     # Registration
│   │   ├── _app.employee.index.tsx        # Employee dashboard
│   │   ├── _app.employee.goals.tsx        # Employee goals manager
│   │   ├── _app.employee.checkin.tsx      # Check-in submission
│   │   ├── _app.manager.index.tsx         # Manager dashboard
│   │   ├── _app.manager.approvals.tsx     # Goal approval queue
│   │   ├── _app.manager.checkins.tsx      # Team check-in monitor
│   │   ├── _app.admin.index.tsx           # Admin dashboard
│   │   ├── _app.admin.analytics.tsx       # Analytics & charts
│   │   ├── _app.admin.escalations.tsx     # Escalation centre
│   │   ├── _app.admin.audit.tsx           # Audit log
│   │   ├── _app.admin.cycles.tsx          # Cycle management
│   │   ├── _app.admin.thrust.tsx          # Thrust area config
│   │   ├── _app.admin.shared.tsx          # Shared goals
│   │   └── _app.admin.completion.tsx      # Completion reports
│   ├── components/
│   │   ├── ui/                            # ShadCN components
│   │   ├── AppShell.tsx                   # Role-aware layout shell
│   │   ├── RoleSwitcher.tsx               # In-app role switcher
│   │   ├── ScorePill.tsx                  # Score tier badge
│   │   └── WeightageGauge.tsx             # Weightage visualiser
│   ├── lib/
│   │   ├── auth.tsx                       # Auth context & hooks
│   │   ├── scoreEngine.ts                 # Core scoring logic
│   │   ├── exportHelper.ts                # Excel export utility
│   │   └── seed.functions.ts              # Demo data seeder
│   └── integrations/
│       └── supabase/
│           ├── client.ts                  # Supabase client init
│           └── types.ts                   # Auto-generated DB types
├── supabase/
│   ├── config.toml                        # Supabase project config
│   └── migrations/                        # SQL migration files
│       ├── 20260517083153_*.sql           # Core schema + RLS
│       └── 20260517093216_*.sql           # Edge function hooks
├── vercel.json                            # Vercel SPA routing config
├── vite.config.ts
└── package.json
```

<br/>

---

## 🗄️ Database Schema

```
profiles          user_roles        cycles
──────────        ──────────        ──────
id (PK)           id (PK)           id (PK)
name              user_id (FK)      year
email             role (enum)       phase (enum)
manager_id (FK)                     opens_at
department                          closes_at
                                    is_active

goals                     check_ins               escalations
──────────────────────    ─────────────────       ───────────────
id (PK)                   id (PK)                 id (PK)
employee_id (FK)          goal_id (FK)            employee_id (FK)
cycle_id (FK)             quarter (enum)          cycle_id (FK)
thrust_area               achievement             quarter (enum)
title                     progress_status         triggered_at
uom_type (enum)           notes                   resolved_at
target
weightage
status (enum)             audit_logs              thrust_areas
is_shared                 ──────────────          ────────────
parent_goal_id (FK)       id (PK)                 id (PK)
locked                    user_id (FK)            name
return_comment            action                  active
                          table_name
                          record_id
                          payload (jsonb)
                          created_at
```

<br/>

---

## 🌐 Deployment Architecture

```
GitHub Repository
       │
       │  push / merge to main
       ▼
  Vercel CI/CD
  ┌────────────────────────────┐
  │  npm run build (Vite)      │
  │  Output: dist/             │
  │  vercel.json: SPA rewrites │
  └─────────────┬──────────────┘
                │
                ▼
  Vercel Global Edge Network
  ┌────────────────────────────┐
  │  CDN-cached static assets  │
  │  Instant rollbacks         │
  │  Preview deployments       │
  └─────────────┬──────────────┘
                │  API calls
                ▼
  Supabase Cloud
  ┌────────────────────────────┐
  │  PostgreSQL (RLS enforced) │
  │  Auth (JWT sessions)       │
  │  Edge Functions (Deno)     │
  │  Real-time subscriptions   │
  └────────────────────────────┘
```

<br/>

---

## 🖥️ Screenshots

> *Open the live demo at [https://atom-quest-tracker.vercel.app](https://atom-quest-tracker.vercel.app)*

| View | Description |
|---|---|
|<img width="1919" height="922" alt="image" src="https://github.com/user-attachments/assets/868b91fd-e444-4d9a-ae07-10cbef64f321" />| **Employee Dashboard** — Goal overview, score summary, check-in status |
|<img width="1919" height="907" alt="image" src="https://github.com/user-attachments/assets/5bd9ba39-4391-4ba3-ad11-0e8e7e027523" />| **Goal Creation** — Thrust area, UoM type, target, weightage |
|(<img width="1917" height="918" alt="image" src="https://github.com/user-attachments/assets/983d45da-b2cd-4a23-8879-bba2aefaa68a" />| **Manager Approvals** — Review and approve/return submitted goals |
|<img width="1918" height="1075" alt="image" src="https://github.com/user-attachments/assets/90d3371b-f85f-4bf0-acc6-ff8bed5dfca6" />| **Admin Analytics** — Department-wide performance charts |
|<img width="1918" height="924" alt="image" src="https://github.com/user-attachments/assets/ad27a860-e704-4a8a-8c22-07765d03d8ae" />| **Escalation Centre** — Overdue check-in tracking |
|<img width="1913" height="926" alt="image" src="https://github.com/user-attachments/assets/e8bc8190-8b90-4c5f-a43f-46491a633fde" />| **Audit Log** — Full action history with timestamps |

<br/>

---

## 🔑 Demo Credentials
⚠️ Important — How to Login:
On the login page, click the Quick Access role buttons at the bottom of the form. They auto-fill and log you in instantly.
Do NOT type credentials manually — use the buttons only.

Use these accounts to explore all three portals on the live demo:

| Role | Email | Password | Access |
|---|---|---|---|
| 👤 **Employee** | `employee@atomquest.com` | `password123` | My Goals, Check-ins, Progress |
| 👥 **Manager** | `manager@atomquest.com` | `password123` | Team Approvals, Check-in Review |
| 🛡️ **Admin** | `admin@atomquest.com` | `password123` | Full platform access |

> 💡 You can also use the **Role Switcher** in the app header to toggle between roles if your account has multiple roles assigned.

<br/>

---

## 🛠️ Local Setup

### Prerequisites

- Node.js 18+
- npm or pnpm
- Supabase CLI (`npm install -g supabase`)
- A Supabase project (free tier works)

### 1. Clone the repository

```bash
git clone https://github.com/Nulakalanani/AtomQuest
cd atomquest/atomquest-vercel
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the root:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

> Get these from your Supabase project → Settings → API.

### 4. Run database migrations

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

This applies all migrations in `supabase/migrations/` including:
- Core schema (profiles, goals, check-ins, cycles, thrust areas)
- Row-Level Security policies
- Helper functions (`has_role`, `is_manager_of`)
- Edge Function hooks

### 5. Deploy Edge Functions

```bash
supabase functions deploy escalation-checker
```

Then schedule it via the Supabase Dashboard → Edge Functions → Schedules (cron: `0 9 * * *` for daily 9 AM trigger).

### 6. Start the development server

```bash
npm run dev
```

App runs at `http://localhost:5173`

<br/>

---

## ☁️ Supabase Setup (Detailed)

<details>
<summary><strong>Click to expand Supabase configuration steps</strong></summary>

### Step 1: Create a Supabase project
1. Go to [supabase.com](https://supabase.com) → New Project
2. Note your **Project URL** and **anon public key**

### Step 2: Apply migrations
```bash
supabase db push
```
This creates all tables, enums, RLS policies, and triggers.

### Step 3: Enable Email Auth
- Dashboard → Authentication → Providers → Email: Enable

### Step 4: Create demo users
Use the Supabase Auth UI or run the seed script:
```bash
# Inside the app, use the seed utility (admin-only feature)
# or create users manually via Authentication → Users
```

### Step 5: Assign roles
```sql
-- Run in Supabase SQL Editor
INSERT INTO user_roles (user_id, role)
VALUES
  ('EMPLOYEE_UUID', 'employee'),
  ('MANAGER_UUID', 'manager'),
  ('ADMIN_UUID', 'admin');
```

### Step 6: Configure manager relationships
```sql
UPDATE profiles SET manager_id = 'MANAGER_UUID'
WHERE id = 'EMPLOYEE_UUID';
```

</details>

<br/>

---

## 🔄 Edge Function Deployment

<details>
<summary><strong>Click to expand Edge Function setup</strong></summary>

### escalation-checker

This function runs daily and automatically:
1. Queries all active cycle phases with open check-in windows
2. Finds employees who haven't submitted check-ins for the current quarter
3. Creates escalation records in the `escalations` table
4. These are surfaced in the Admin → Escalation Centre dashboard

```bash
# Deploy the function
supabase functions deploy escalation-checker

# Test locally
supabase functions serve escalation-checker
curl http://localhost:54321/functions/v1/escalation-checker
```

### Scheduling (via Supabase Dashboard)
1. Go to Dashboard → Edge Functions → escalation-checker
2. Add Schedule: `0 9 * * *` (9 AM UTC daily)
3. Confirm and activate

</details>

<br/>

---

## 🔒 Security & Governance

AtomQuest is built with **security-first** principles:

- **Row-Level Security (RLS)** enabled on every table — database enforces access control, not just the frontend
- **`has_role()` and `is_manager_of()`** security-definer functions used throughout RLS policies
- **JWT-based sessions** managed by Supabase Auth — no custom auth logic
- **No service-role key exposed** to the client — only the anon key with scoped RLS permissions
- **Audit log** captures every material action (goal create, status change, check-in submit) with actor and timestamp
- **Goal locking** prevents retroactive edits after cycle closure

<br/>

---

## 📈 Scalability

| Dimension | Approach |
|---|---|
| **Users** | Supabase PostgreSQL scales to millions of rows; RLS adds minimal overhead |
| **Concurrency** | TanStack Query handles deduplication and background refetching |
| **Edge Functions** | Deno runtime — stateless, auto-scaled by Supabase |
| **Frontend** | Vite-bundled, CDN-distributed via Vercel's global edge network |
| **Data Growth** | Cycle-scoped data model keeps queries bounded — historical data doesn't bloat active queries |
| **Multi-tenant** | Role + manager-hierarchy model supports large org trees without schema changes |

<br/>

---

## 🔮 Future Enhancements

- [ ] 📧 **Email notifications** — Supabase webhook → Resend for approval/escalation alerts
- [ ] 📱 **PWA support** — Offline-capable check-in submission
- [ ] 🤖 **AI goal suggestions** — LLM-powered goal drafting assistant
- [ ] 🔗 **HRMS integrations** — Sync org structure from Workday / SAP
- [ ] 📊 **Custom report builder** — Drag-and-drop analytics configurator
- [ ] 🌍 **Multi-org tenancy** — Isolated workspaces for different business units
- [ ] 🔔 **In-app notifications** — Real-time alerts via Supabase Realtime
- [ ] 📋 **Goal templates** — Pre-built goal libraries by department/role

<br/>

---

## 💼 Business Impact

AtomQuest addresses a real, expensive enterprise problem:

> **74% of employees don't have clear visibility into how their goals connect to company strategy** *(Deloitte Human Capital Trends)*

| Metric | Impact |
|---|---|
| ⏱️ **Time saved** | Eliminates ~3 hrs/manager/quarter on manual follow-ups |
| 📉 **Escalation reduction** | Automated detection replaces ad-hoc check-ins |
| 📊 **Decision quality** | Executives get real-time data vs quarterly snapshot reports |
| 🔒 **Compliance** | Full audit trail satisfies HR governance requirements |
| 🔄 **Cycle speed** | Goal submission-to-approval cycle reduced from days to hours |

<br/>

---

## 🏗️ Workflow Overview (End-to-End)

```
CYCLE OPENED (Admin configures year + phase)
           │
           ▼
GOAL SETTING PHASE
┌─ Employee creates goals ─────────────────────────────────┐
│  - Thrust area selection (Admin-configured)              │
│  - UoM type: MIN / MAX / TIMELINE / ZERO                 │
│  - Target value + weightage (must sum to 100%)           │
│  - Submit for manager approval                           │
└──────────────────────────────────────────────────────────┘
           │
           ▼
APPROVAL PHASE
┌─ Manager reviews ────────────────────────────────────────┐
│  - APPROVE → goal moves to active                        │
│  - RETURN with comment → employee revises + resubmits    │
└──────────────────────────────────────────────────────────┘
           │
           ▼
QUARTERLY CHECK-INS (Q1 → Q2 → Q3 → Q4)
┌─ Employee submits check-in ──────────────────────────────┐
│  - Achievement value entered                             │
│  - Score auto-calculated by scoreEngine                  │
│  - Escalation engine clears any open escalation          │
└──────────────────────────────────────────────────────────┘
           │
           ▼
CYCLE CLOSURE (Admin locks goals)
┌─ Final scores frozen ────────────────────────────────────┐
│  - All goals set to LOCKED status                        │
│  - Weighted composite score computed per employee        │
│  - Completion report available for export (Excel)        │
└──────────────────────────────────────────────────────────┘
```

<br/>

---

## 🙏 Acknowledgements

- **Supabase** — for the most developer-friendly backend-as-a-service platform
- **ShadCN UI** — for beautiful, accessible, composable components
- **Vercel** — for effortless global deployment and previews
- **TanStack** — for the gold standard in React server state management
- **Recharts** — for elegant, composable React chart primitives
- **Radix UI** — for the unstyled, accessible component primitives powering ShadCN
- **AtomQuest Hackathon 2025** — for the opportunity to build something real

<br/>

---

<div align="center">

**Built with ❤️ for the AtomQuest Hackathon 2025**

<br/>

[![Live Demo](https://img.shields.io/badge/🚀%20Try%20the%20Live%20Demo-atom--quest--tracker.vercel.app-6366f1?style=for-the-badge)](https://atom-quest-tracker.vercel.app)

<br/>

*AtomQuest — Where ambition meets accountability.*

<br/>

---

*© 2025 AtomQuest. Built for AtomQuest Hackathon 2025.*

</div>
