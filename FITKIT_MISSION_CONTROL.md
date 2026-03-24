# FitKit Mission Control — Complete Reference Document

> **Purpose:** Internal engineering dashboard for monitoring, analytics, and observability of the FitKit platform.
> **Audience:** FitKit internal team / developers only.
> **Last Updated:** March 2026

---

## Table of Contents

1. [FitKit Platform Overview](#1-fitkit-platform-overview)
2. [System Architecture](#2-system-architecture)
3. [Data Sources](#3-data-sources)
4. [Database Schema — Full Reference](#4-database-schema--full-reference)
5. [Edge Functions — Full Reference](#5-edge-functions--full-reference)
6. [Mission Control App — Architecture](#6-mission-control-app--architecture)
7. [Screens — Full Specification](#7-screens--full-specification)
8. [New Infrastructure — function_logs Table](#8-new-infrastructure--function_logs-table)
9. [Logging Strategy](#9-logging-strategy)
10. [Environment Variables](#10-environment-variables)
11. [Claude Code Prompt](#11-claude-code-prompt)
12. [Key Business Questions the Dashboard Answers](#12-key-business-questions-the-dashboard-answers)
13. [Future Enhancements](#13-future-enhancements)

---

## 1. FitKit Platform Overview

FitKit is a **student fitness testing platform** with two distinct user-facing surfaces sharing one Supabase backend.

### Two Surfaces

#### 📱 FitKit App (Flutter — Teacher-facing)
Used by teachers/coaches to:
- Sign in via OTP
- Manage classes and students (onboard, upload via Excel)
- Issue physical QR/RFID cards to students
- Send guardian consent emails
- Run test sessions via BLE hardware devices
- Capture and save test results

#### 🌐 FitKit Reports (Next.js — Student/Guardian-facing)
Used by students to:
- Access their personal report via `report_access_key` (QR scan or direct URL)
- View overall fitness score, domain/determinant breakdowns
- View individual test detail pages with score history
- See their leaderboard rank (Hall of Fame)
- View AI-powered personalized insights

---

### Identity & Access Model

```
Organization (school / academy / defence)
    └── Teachers (manage classes)
    └── Classes
        └── Students (Users)
            └── Card (optional physical QR+RFID card)
            └── report_access_key (always exists)
                ├── If card issued → RFID value IS the report_access_key
                └── If no card → UUID generated as report_access_key
```

**Key point:** `report_access_key` is a student-level identifier, not a card-level one. Every student always has one. The physical card is optional — when issued, its RFID value becomes the key; otherwise a UUID is generated.

---

### Consent Flow

Before a student can access their report, a guardian must approve via email:

```
Teacher sends consent → SES email to guardian
        ↓
Guardian clicks link → consent token validated
        ↓
Guardian approves/rejects
        ↓
users.is_consent_approved updated
        ↓
Student can now access FitKit Reports
```

Email lifecycle states: `queued → sent → delivered → approved/rejected/bounced/complained`

---

### End-to-End Data Flow

```
Teacher runs test session on Flutter app
        ↓
BLE device (atoms/manual) streams raw data
        ↓
Background service processes + saves
        ↓
save-test-results-with-determinants (edge function)
        ↓
scores_overview + *_results tables + best_scores populated
        ↓
Student scans QR card (or uses URL with report_access_key)
        ↓
FitKit Reports Next.js app fetches via edge functions
(fitness-overview, score-overview, test-results, test-leaderboard, etc.)
        ↓
Student views personalized report
```

---

## 2. System Architecture

### Full Stack

```
┌─────────────────────────────────────────────────────┐
│                   FitKit Platform                    │
├──────────────────────┬──────────────────────────────┤
│   Flutter App        │   Next.js Reports App        │
│   (Teacher-facing)   │   (Student-facing)           │
│                      │                              │
│   - OTP auth         │   - report_access_key auth   │
│   - BLE devices      │   - No traditional login     │
│   - Local SQLite      │   - Server components        │
│     cache (Drift)    │   - ECharts visualizations   │
├──────────────────────┴──────────────────────────────┤
│              Supabase Backend                        │
│                                                      │
│   PostgreSQL DB          Edge Functions (Deno)       │
│   - 30+ tables           - 14 functions              │
│   - RPCs/stored fns      - Shared error handling     │
│   - pg_cron (rotation)   - Zod validation            │
│   - Row Level Security   - CORS handling             │
├──────────────────────────────────────────────────────┤
│              Supporting Services                     │
│                                                      │
│   Upstash Redis          AWS SES                     │
│   - Leaderboard cache    - Consent emails            │
│   - TTL: 600s            - SNS webhook               │
│   - Sorted sets          - Delivery tracking         │
│                                                      │
│   Sentry                 Axiom                       │
│   - Error tracking       - Edge function logs        │
│   - Performance          - Log drain from Supabase   │
│   - Release health       - 30-day retention          │
└──────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|---|---|
| Flutter App | Flutter + Dart, Drift (SQLite), BLE |
| Reports Web App | Next.js 16, React 19, TypeScript, Tailwind, ECharts |
| Backend API | Supabase Edge Functions (Deno/TypeScript) |
| Database | Supabase PostgreSQL |
| Cache | Upstash Redis |
| Email | AWS SES + SNS |
| Error Monitoring | Sentry |
| Log Aggregation | Axiom (via Supabase log drain) |
| Validation | Zod (both app and edge functions) |
| Mission Control | Next.js 15, TypeScript, Tailwind, Shadcn/ui, Recharts |

---

## 3. Data Sources

### 3.1 Supabase DB (Primary — Business Analytics)
- Direct queries via `@supabase/supabase-js` with service role key
- Read-only from dashboard perspective
- Covers all business analytics: student activity, org health, consent pipeline, test coverage
- No new tables needed except `function_logs`

### 3.2 function_logs Table (New — Performance Metrics)
- One row per edge function invocation
- Written by `withErrorHandling` wrapper in edge functions
- Covers: invocation count, duration, cache hit/miss, errors
- Rotated by pg_cron nightly (keep 30 days)
- See Section 8 for full schema

### 3.3 Axiom (Raw Edge Function Logs)
- Every `console.log` from every edge function
- Shipped automatically via Supabase log drain
- Used for step-by-step debugging of individual invocations
- API: `https://api.axiom.co/v1/datasets/{dataset}/query`
- Auth: Bearer token

### 3.4 Upstash Redis REST API
- Memory usage, total keys, daily request quota
- Used for cache health monitoring
- API: `{UPSTASH_REDIS_REST_URL}/info`
- Auth: Bearer token

### 3.5 Sentry API
- Unresolved issues, error frequency, release health
- API: `https://sentry.io/api/0/projects/{org}/{project}/issues/`
- Auth: Bearer token

---

## 4. Database Schema — Full Reference

### 4.1 Core Tables

#### `organizations`
```sql
id              uuid primary key
name            text
type            organization_type  -- school | academy | defence
created_at      timestamptz
```

#### `users`
```sql
id                    uuid primary key
organization_id       uuid references organizations
report_access_key     text unique  -- RFID value if card issued, else UUID
is_consent_approved   boolean default false
guardian_email        text
created_at            timestamptz
```

#### `classes`
```sql
id              uuid primary key
organization_id uuid references organizations
name            text
std             std_type   -- 1-12
div             div_type   -- A-Z
created_at      timestamptz
```

#### `teachers`
```sql
id              uuid primary key
organization_id uuid references organizations
name            text
email           text
created_at      timestamptz
```

#### `cards`
```sql
id          uuid primary key
rfid        text unique
qr_code     text unique
user_id     uuid references users  -- null if unassigned
created_at  timestamptz
```

#### `consent_requests`
```sql
id              uuid primary key
user_id         uuid references users
guardian_email  text
token           text unique
email_status    text  -- queued | sent | delivered | bounced | complained | rejected
sent_at         timestamptz
approved_at     timestamptz
rejected_at     timestamptz
created_at      timestamptz
```

#### `seasons`
```sql
id              uuid primary key
organization_id uuid references organizations
is_active       boolean
start_date      date
end_date        date
created_at      timestamptz
```

### 4.2 Test Metadata Tables

#### `tests`
```sql
id          uuid primary key
name        text
category    test_category
```

#### `test_configurations`
```sql
id          uuid primary key
test_id     uuid references tests
name        text
```

#### `test_suites`
```sql
id              uuid primary key
organization_id uuid
name            text
```

#### `test_suite_tests`
```sql
id              uuid primary key
test_suite_id   uuid references test_suites
test_config_id  uuid references test_configurations
```

#### `organization_test_suites`
```sql
organization_id uuid
test_suite_id   uuid
```

#### `package_test_suites` / `test_suite_packages`
Package-level test suite assignments.

### 4.3 Session Tables

#### `test_sessions`
```sql
id              uuid primary key
organization_id uuid references organizations
created_at      timestamptz
```

#### `test_session_participants`
```sql
id              uuid primary key
test_session_id uuid references test_sessions
user_id         uuid references users
created_at      timestamptz
```

### 4.4 Score Tables

#### `scores_overview`
```sql
id              uuid primary key
user_id         uuid references users
test_id         uuid references tests
test_config_id  uuid references test_configurations
score           numeric
created_at      timestamptz
```

#### `best_scores`
```sql
id              uuid primary key
user_id         uuid references users
test_config_id  uuid references test_configurations
season_id       uuid references seasons
score           numeric
created_at      timestamptz
```

### 4.5 Result Tables (one per test category)

Each links to `scores_overview` via `score_overview_id`:

| Table | Test Category |
|---|---|
| `sprint_results` | sprint (30m) |
| `shuttle_run_results` | shuttle_run |
| `shuttle_run_hrm_results` | shuttle_run_hrm (with HRM device) |
| `pushup_results` | pushup |
| `crunches_results` | crunches |
| `plank_results` | plank |
| `jump_results` | vertical_jump, long_jump |
| `spot_running_results` | spot_running |
| `bmi_results` | bmi |
| `isometric_pull_results` | isometric_pull |
| `deadlift_results` | deadlift |
| `determination_results` | determination (cognitive test) |

### 4.6 Database Enums

```sql
test_category:
  pushup | plank | vertical_jump | long_jump | isometric_pull | deadlift
  sprint | shuttle_run | beep_test | sit_up | wall_sit | grip_strength
  spot_running | crunches | bmi | determination | shuttle_run_hrm

organization_type: school | academy | defence

gender_type: M | F

academy_level: beginner | intermediate | advanced

std_type: 1 | 2 | 3 | ... | 12

div_type: A | B | C | ... | Z

metric_unit: reps | seconds | kg | meters | cm | newtons

primary_metric: reps | duration | force | distance | load

equipment_type: mat | atoms | manual | memory_board

domain_tag:
  explosive_power | cardio_stamina | sprint_speed | agility
  muscle_strength | skill_coordination | balance | decision_quickness
  cardiovascular | strength | cognitive | aerobic

determinant_key:
  sustained_focus | reaction_speed | accuracy | cognitive_stamina
  distance_covered | pacing | heart_rate_recovery | steps_per_minute
  speed | core_stability | upper_body | lower_body
```

### 4.7 Database RPC / Stored Functions

```sql
bulk_update_users(updates json)
get_active_classes(p_organization_id, p_season_id)
get_all_determinant_scores(p_user_id)
get_all_test_scores_for_cache(p_class, p_organization_id, p_season_id, p_test_config_id)
get_assigned_test_configs_for_user(p_user_id)
get_assigned_tests_for_org(p_organization_id)
get_latest_score_per_test(p_user_id)
get_latest_two_scores_per_config(p_user_id)
get_latest_two_scores_per_config_bulk(p_user_ids[])
get_test_leaderboard(p_organization_id, p_season_id, p_test_config_id, p_user_id)
get_user_with_organization(p_user_id)
save_test_result_atomic(...)
save_test_result_with_determinants_atomic(...)
```

---

## 5. Edge Functions — Full Reference

All functions share:
- CORS handling via `handleCorsPreflight`
- Error handling via `withErrorHandling`
- Input sanitization via `Sanitizer`
- Zod validation
- Standard `ApiResponse` shape

### Report-side Functions (called by FitKit Reports web app)

| Function | Input | What it does |
|---|---|---|
| `health` | none | Health check, returns `healthy: true` |
| `user-info` | `report_access_key` | User profile + org details |
| `assigned-tests` | `report_access_key` | Tests assigned to user's org |
| `fitness-overview` | `report_access_key` | Overall fitness score + per-test trend |
| `score-overview` | `report_access_key` | Domain scores, determinant scores, overall |
| `test-results` | `report_access_key`, `test_config_id`, `result_id?` | Detailed result + history for one test |
| `test-leaderboard` | `report_access_key`, `test_config_id` | Leaderboard for one test (Redis cached) |

### App-side Functions (called by Flutter app)

| Function | What it does |
|---|---|
| `send-otp` | Sends OTP for teacher login |
| `verify-otp` | Verifies OTP, returns session |
| `organization` | CRUD for organizations |
| `teacher` | CRUD for teachers |
| `classes` | CRUD for classes |
| `user` | Create/update single user |
| `users` | Bulk user operations |
| `reset-student-classes` | Reassign students to classes |
| `card` | Assign/manage individual card |
| `upload-cards` | Bulk card upload |
| `test-suites` | Fetch test suite for org |
| `save-test-results-with-determinants` | Atomic save of test result + determinants |
| `get-firmware` | Returns firmware info for BLE devices |

### Consent Functions

| Function | What it does |
|---|---|
| `send-consents` | Bulk sends guardian consent emails via SES |
| `get-consent-details` | Validates token + returns consent page data |
| `submit-consent` | Records approve/reject decision |
| `resend-consent-email` | Resends email, generates new token |
| `handle-ses-events` | SNS webhook for SES email lifecycle events |

### Ops Functions

| Function | What it does |
|---|---|
| `refresh-leaderboard-cache` | Bulk rebuilds Redis sorted sets for all org/class/test combos |
| `test-redis` | Smoke test for Redis connectivity |

### test-leaderboard — Redis Cache Key Format
```
lb:test:{organization_id}:{season_id}:{test_config_id}:{class_level}

Example:
lb:test:9efdec9b-be4d-4815-a205-c5cd908bed0f:7ceca0d5-6784-4452-aa4a-cadc48284e55:d95da49a-be59-46d4-b891-b36d610eefda:intermediate
```

Cache TTL: 600 seconds. On miss → calls `get_test_leaderboard` RPC.

---

## 6. Mission Control App — Architecture

### What it is
A standalone Next.js 15 internal dashboard. No auth needed (internal tool). Gives the engineering team a single place to see:
1. Raw edge function logs (via Axiom)
2. Business analytics (via Supabase DB queries)
3. Performance metrics (via function_logs table)
4. Cache health (via Upstash REST API)
5. Errors (via Sentry API)

### Why separate from FitKit Reports
- Different audience (engineers vs students)
- Uses service role key (bypasses RLS)
- Needs access to all orgs, not just one user's data
- Mixes multiple data sources

### Tech Stack
```
Next.js 15 (App Router)
TypeScript
Tailwind CSS
Shadcn/ui (components)
Recharts (charts)
Supabase JS (service role key)
Axiom SDK / REST API
Upstash REST API
Sentry API
```

### File Structure
```
fitkit-mission-control/
├── src/
│   ├── app/
│   │   ├── layout.tsx               # Sidebar + global layout
│   │   ├── page.tsx                 # /  → System Health
│   │   ├── overview/
│   │   │   └── page.tsx             # /overview → Business Overview
│   │   ├── organisations/
│   │   │   ├── page.tsx             # /organisations → Org List
│   │   │   └── [orgId]/
│   │   │       └── page.tsx         # /organisations/[orgId] → Org Detail
│   │   ├── consent/
│   │   │   └── page.tsx             # /consent → Consent Pipeline
│   │   ├── functions/
│   │   │   └── page.tsx             # /functions → Edge Function Monitor
│   │   ├── errors/
│   │   │   └── page.tsx             # /errors → Error Log
│   │   ├── cache/
│   │   │   └── page.tsx             # /cache → Redis Cache Monitor
│   │   └── audit/
│   │       └── page.tsx             # /audit → Audit Log
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   └── TopBar.tsx
│   │   ├── shared/
│   │   │   ├── KPICard.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── DataTable.tsx
│   │   │   └── TimeFilter.tsx
│   │   └── charts/
│   │       ├── BarChart.tsx
│   │       ├── LineChart.tsx
│   │       └── FunnelChart.tsx
│   ├── lib/
│   │   ├── supabase.ts              # Service role client
│   │   ├── axiom.ts                 # Axiom API client
│   │   ├── upstash.ts               # Redis REST API client
│   │   ├── sentry.ts                # Sentry API client
│   │   └── queries/
│   │       ├── overview.ts          # Business overview queries
│   │       ├── organisations.ts     # Org analytics queries
│   │       ├── consent.ts           # Consent pipeline queries
│   │       ├── functions.ts         # function_logs queries
│   │       └── audit.ts             # Audit log queries
│   └── types/
│       └── index.ts
├── supabase/
│   └── migrations/
│       └── 20240324_function_logs.sql
├── .env.local
└── package.json
```

---

## 7. Screens — Full Specification

---

### Screen 1: System Health `/`

**Purpose:** Glanceable status of everything. First thing you see.

**Data Sources:**
- Supabase: ping connection
- Axiom: last log ingestion timestamp
- Upstash: `/info` endpoint
- Sentry: unresolved issues count
- `function_logs`: last 24h stats

**Components:**

#### Service Status Cards (4 cards)
```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Supabase   │  │    Axiom    │  │    Redis    │  │   Sentry    │
│  ● Online   │  │  ● Online   │  │  ● Online   │  │  ● Online   │
│  12ms ping  │  │  Last: 2m   │  │  45MB used  │  │  2 issues   │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
```
Status logic:
- 🟢 Green: service responds normally
- 🟡 Yellow: degraded / high latency
- 🔴 Red: unreachable / error

#### Last 24h Stats (from function_logs)
```
Total Invocations    Error Count    Avg Duration    Cache Miss Rate
     1,247               3            187ms             34%
```

#### Functions Health Table
```
Function Name           | Invocations | Error Rate | Avg Duration | Status
test-leaderboard        |     342     |    0.3%    |    220ms     |   🟢
fitness-overview        |     289     |    0.0%    |    165ms     |   🟢
test-results            |     201     |    1.2%    |    310ms     |   🟡
save-test-results...    |      89     |    0.0%    |    445ms     |   🟢
```
Highlight rows where error rate > 10% in red.

#### Last Leaderboard Cache Refresh
```
Last refresh: 2 hours ago
Status: Success (142 caches refreshed, 0 failed)
[Trigger Manual Refresh]
```

---

### Screen 2: Business Overview `/overview`

**Purpose:** High-level platform usage numbers across all orgs.

**Time Filter:** Today / Yesterday / This Week / This Season / Custom Date Range

**Data Sources:** Supabase DB (users, scores_overview, organizations, consent_requests)

**KPI Cards (top row)**
```
Total Students    Tests Performed    Active Orgs    New Students
   2,847              1,203              12             47
   (all time)      (this week)      (this week)    (this week)
```

**Consent Approval Rate**
```
Overall: 78% approved
Sent: 2,847 | Delivered: 2,601 | Approved: 2,219 | Rejected: 124 | Bounced: 258
```

**Charts:**

Bar chart — Tests performed per day (last 30 days)
```sql
select date_trunc('day', created_at) as day, count(*) as tests
from scores_overview
where created_at >= now() - interval '30 days'
group by 1 order by 1
```

Bar chart — New students onboarded per day (last 30 days)
```sql
select date_trunc('day', created_at) as day, count(*) as students
from users
where created_at >= now() - interval '30 days'
group by 1 order by 1
```

---

### Screen 3: Organisations `/organisations`

**Purpose:** Per-org health at a glance, with drill-down.

#### List View `/organisations`

**Table columns:**
| Org Name | Type | Total Students | Tested (%) | Last Activity | Consent Rate | Status |
|---|---|---|---|---|---|---|
| Minerva Academy | academy | 342 | 89% | 2h ago | 91% | 🟢 Active |
| Delhi Public School | school | 1,205 | 34% | 3 days ago | 72% | 🟡 Low Activity |
| Army Fitness | defence | 89 | 12% | 14 days ago | 45% | 🔴 Inactive |

Status logic:
- 🟢 Active: activity in last 7 days
- 🟡 Low Activity: activity in last 30 days
- 🔴 Inactive: no activity in 30+ days

**Key queries:**
```sql
-- Students with at least 1 test result per org
select o.id, o.name, o.type,
  count(distinct u.id) as total_students,
  count(distinct so.user_id) as tested_students,
  max(so.created_at) as last_activity
from organizations o
left join users u on u.organization_id = o.id
left join scores_overview so on so.user_id = u.id
group by o.id, o.name, o.type

-- Consent rate per org
select u.organization_id,
  count(*) as total,
  count(*) filter (where cr.approved_at is not null) as approved
from users u
left join consent_requests cr on cr.user_id = u.id
group by u.organization_id
```

---

#### Org Detail View `/organisations/[orgId]`

**Header:** Org name, type, total students, active season

**Activity Cards**
```
Students Performed Today    This Week    This Season
           12                  89            342
```

**Test Coverage Table**
```
Test Category    | Assigned | Students Performed | Coverage %
Sprint 30m       |   Yes    |        298         |    87%
Shuttle Run      |   Yes    |        312         |    91%
Push-ups         |   Yes    |        267         |    78%
BMI              |   Yes    |        334         |    98%
Deadlift         |   No     |         -          |     -
```

**Consent Funnel**
```
Sent (342) → Delivered (318) → Approved (289) → Rejected (14)
                                              ↘ Bounced (24) [needs attention]
```

**Student List Table**
```
Name          | Tests Done | Last Active  | Consent Status
Chingkhei     |    6/7     | 2h ago       | ✅ Approved
Bolero        |    7/7     | 1 day ago    | ✅ Approved
Aadhya Kapoor |    2/7     | 5 days ago   | ⏳ Pending
Azam Khan     |    0/7     | Never        | ❌ Bounced
```
Click on student → individual student detail modal showing all their test scores + dates.

---

### Screen 4: Consent Pipeline `/consent`

**Purpose:** Full visibility into the consent email lifecycle. Find stuck/failed students.

**Filter:** By org, by email_status, by date range

**Funnel Visualization**
```
  ┌──────────┐
  │  Sent    │  2,847
  └────┬─────┘
       │
  ┌────▼─────┐
  │Delivered │  2,601  (91.4%)
  └────┬─────┘
       │
   ┌───┴───┐
   ▼       ▼
Approved  Rejected
 2,219     124
 (85.3%)  (4.8%)

Bounced: 258 (9.1%) ← needs attention
Complained: 3
```

**Tables:**

Students pending > 7 days (actionable)
```
Name         | Org            | Guardian Email        | Sent At      | Days Pending
John Doe     | Minerva Acad   | parent@gmail.com      | 15 Mar 2026  | 9 days
Jane Smith   | DPS            | guardian@yahoo.com    | 10 Mar 2026  | 14 days
```

Students with bounced emails (needs attention)
```
Name         | Org            | Bounced Email           | Bounced At
Alice        | Army Fitness   | bad.email@invalid.com   | 20 Mar 2026
```

**Key queries:**
```sql
-- Consent funnel
select
  count(*) as total_sent,
  count(*) filter (where email_status = 'delivered') as delivered,
  count(*) filter (where approved_at is not null) as approved,
  count(*) filter (where rejected_at is not null) as rejected,
  count(*) filter (where email_status = 'bounced') as bounced,
  count(*) filter (where email_status = 'complained') as complained
from consent_requests

-- Pending > 7 days
select u.id, u.guardian_email, cr.created_at, cr.email_status,
  o.name as org_name,
  extract(day from now() - cr.created_at) as days_pending
from consent_requests cr
join users u on u.id = cr.user_id
join organizations o on o.id = u.organization_id
where cr.approved_at is null
  and cr.rejected_at is null
  and cr.email_status = 'delivered'
  and cr.created_at < now() - interval '7 days'
order by cr.created_at asc
```

---

### Screen 5: Edge Function Monitor `/functions`

**Purpose:** Per-function performance and health. Debugging entry point.

**Data Sources:** `function_logs` table + Axiom for raw logs

**Functions Summary Table**
```
Function                      | Today  | Success | Errors | Avg ms | p95 ms | Cache Hit%
test-leaderboard              |  342   |  99.7%  |   1    |  220   |  445   |   66%
fitness-overview              |  289   | 100.0%  |   0    |  165   |  290   |    -
test-results                  |  201   |  98.8%  |   2    |  310   |  620   |    -
score-overview                |  187   | 100.0%  |   0    |  198   |  380   |    -
save-test-results-with-det... |   89   | 100.0%  |   0    |  445   |  890   |    -
user-info                     |  156   | 100.0%  |   0    |   98   |  180   |    -
assigned-tests                |  134   | 100.0%  |   0    |  145   |  265   |    -
```

**On click → Function Detail**

Shows from `function_logs`:
```
Invocations over time (line chart, last 7 days)
Error rate over time (line chart)
Duration distribution (histogram)

Recent invocations:
Timestamp          | Status  | Duration | User     | Org      | Error
2026-03-24 10:30   | success |  220ms   | Chingkhei| Minerva  | -
2026-03-24 10:31   | failed  |   32ms   | unknown  | -        | User not found [STEP 6]
```

Click on failed row → opens Axiom log viewer for that invocation timestamp showing all steps.

**Key queries:**
```sql
-- Function summary
select
  function_name,
  count(*) as total,
  count(*) filter (where status = 'success') as successes,
  count(*) filter (where status = 'failed') as errors,
  round(avg(duration_ms)) as avg_ms,
  percentile_cont(0.95) within group (order by duration_ms) as p95_ms,
  round(avg(boot_ms)) as avg_boot_ms
from function_logs
where created_at >= now() - interval '24 hours'
group by function_name
order by total desc

-- Cache hit rate for test-leaderboard
select
  count(*) filter (where cache_hit = true) as hits,
  count(*) filter (where cache_hit = false) as misses,
  round(
    count(*) filter (where cache_hit = true)::numeric /
    count(*)::numeric * 100
  ) as hit_rate_pct
from function_logs
where function_name = 'test-leaderboard'
  and created_at >= now() - interval '24 hours'
```

---

### Screen 6: Errors `/errors`

**Purpose:** Unified error view. Find and diagnose failures fast.

**Data Sources:** `function_logs` (where status = 'failed') + Sentry API

**Sentry Summary Banner**
```
Sentry: 2 unresolved issues | 0 new today | Last event: 3h ago [View in Sentry →]
```

**Error Log Table (from function_logs)**
```
Time           | Function          | Step    | Error Message                    | Org    | User
24 Mar 10:31   | test-leaderboard  | STEP 6  | User not found for report key    | -      | -
23 Mar 15:42   | test-results      | STEP 9  | Redis timeout after 5000ms       | Minerva| Chingkhei
22 Mar 09:11   | fitness-overview  | STEP 4  | Zod validation failed: missing   | DPS    | -
```

**Filters:** Function name | Org | Date range | Error step

**Charts:**
- Errors per hour (line chart, last 24h)
- Errors per function (bar chart)

**Key query:**
```sql
select
  fl.created_at,
  fl.function_name,
  fl.error_step,
  fl.error_message,
  fl.user_id,
  fl.org_id,
  o.name as org_name
from function_logs fl
left join organizations o on o.id = fl.org_id
where fl.status = 'failed'
  and fl.created_at >= now() - interval '7 days'
order by fl.created_at desc
```

---

### Screen 7: Cache Monitor `/cache`

**Purpose:** Upstash Redis health + leaderboard cache status.

**Data Sources:** Upstash REST API + `function_logs`

**Upstash Health Cards**
```
Memory Used     Total Keys    Daily Requests    Quota Remaining
  45.2 MB         1,847          28,341           71,659 / 100k
```

**Cache Hit Rate Trend (line chart)**
From `function_logs` where `function_name = 'test-leaderboard'`, grouped by hour, last 24h.

**Leaderboard Cache Status Table**
```
Org            | Level        | Test Config  | TTL Remaining | Last Refreshed
Minerva        | intermediate | Sprint 30m   |   8m 32s      | 51m ago
Minerva        | intermediate | Shuttle Run  |   8m 31s      | 51m ago
Minerva        | beginner     | Sprint 30m   |   EXPIRED     | 61m ago  ← stale
DPS            | class-7      | Push-ups     |   4m 12s      | 56m ago
```

**Manual Refresh Button**
```
[🔄 Refresh All Leaderboard Caches]
→ Calls refresh-leaderboard-cache edge function
→ Shows progress + result (X caches refreshed, Y failed)
```

---

### Screen 8: Audit Log `/audit`

**Purpose:** Chronological feed of everything that happened across the entire platform.

**Data Sources:** Supabase DB (users, consent_requests, scores_overview) + function_logs

**Event Types:**
- 🟢 `student_onboarded` — new row in `users`
- 📧 `consent_sent` — new row in `consent_requests`
- ✅ `consent_approved` — `approved_at` set
- ❌ `consent_rejected` — `rejected_at` set
- ⚠️ `consent_bounced` — `email_status = 'bounced'`
- 🏃 `test_performed` — new row in `scores_overview`
- 💥 `function_error` — row in `function_logs` where `status = 'failed'`
- 🔄 `cache_refreshed` — row in `function_logs` for `refresh-leaderboard-cache`

**Feed Example**
```
10:31 AM  🏃 test_performed    Chingkhei (Minerva)    Sprint 30m — Score: 7.2
10:30 AM  🏃 test_performed    Bolero (Minerva)       Shuttle Run — Score: 8.1
10:28 AM  ✅ consent_approved  John Doe (DPS)         Guardian approved
10:15 AM  💥 function_error    test-leaderboard        STEP 6: User not found
09:55 AM  📧 consent_sent      Jane Smith (DPS)       Sent to parent@gmail.com
09:30 AM  🟢 student_onboarded Rahul Kumar (Army)     New student added
```

**Filters:** Org | Event type | Date range
**Search:** Student name / Org name
**Export:** CSV button — dumps filtered results

---

## 8. New Infrastructure — function_logs Table

### Migration File
`supabase/migrations/20240324_function_logs.sql`

```sql
-- Create function_logs table
create table if not exists function_logs (
  id            bigserial primary key,
  function_name text not null,
  user_id       uuid references users(id) on delete set null,
  org_id        uuid references organizations(id) on delete set null,
  boot_ms       int,
  duration_ms   int,
  cache_hit     boolean,
  status        text not null check (status in ('success', 'failed')),
  error_step    text,
  error_message text,
  metadata      jsonb,
  created_at    timestamptz not null default now()
);

-- Indexes for common query patterns
create index on function_logs (created_at desc);
create index on function_logs (function_name, created_at desc);
create index on function_logs (status, created_at desc);
create index on function_logs (org_id, created_at desc);
create index on function_logs (function_name, status, created_at desc);

-- pg_cron: delete rows older than 30 days (runs every night at midnight)
select cron.schedule(
  'cleanup-function-logs',
  '0 0 * * *',
  $$ delete from function_logs where created_at < now() - interval '30 days' $$
);

-- Comment
comment on table function_logs is
  'One row per edge function invocation. Written by withErrorHandling wrapper. Rotated by pg_cron.';
```

### How to Write to It (Edge Functions)

Modify `supabase/functions/_shared/withErrorHandling.ts`:

```typescript
// At the end of every invocation, insert one row
await supabase.from('function_logs').insert({
  function_name: functionName,       // e.g. 'test-leaderboard'
  user_id: context.resolvedUserId ?? null,
  org_id: context.resolvedOrgId ?? null,
  boot_ms: context.bootMs ?? null,
  duration_ms: Date.now() - context.startTime,
  cache_hit: context.cacheHit ?? null,  // only relevant for cached functions
  status: error ? 'failed' : 'success',
  error_step: error?.step ?? null,      // e.g. 'STEP 6'
  error_message: error?.message ?? null,
  metadata: {
    // function-specific context
    test_config_id: context.params?.test_config_id ?? null,
    report_access_key: context.params?.report_access_key ?? null,
  }
})
```

### What Goes in `metadata` jsonb Per Function

| Function | metadata fields |
|---|---|
| `test-leaderboard` | `test_config_id`, `report_access_key`, `cache_key` |
| `test-results` | `test_config_id`, `result_id`, `report_access_key` |
| `fitness-overview` | `report_access_key` |
| `score-overview` | `report_access_key` |
| `save-test-results-with-determinants` | `test_category`, `session_id` |
| `refresh-leaderboard-cache` | `caches_refreshed`, `skipped`, `failed` |

---

## 9. Logging Strategy

### Two-Layer Approach

```
Layer 1: Axiom (raw verbose logs)
─────────────────────────────────
Purpose: Debugging. Step-by-step invocation trace.
Content: Every console.log from every edge function
         (Boot, Step 1-N, errors, Shutdown)
Setup:   Supabase log drain → Axiom (one-click in Supabase dashboard)
Retention: 30 days (Axiom free tier)
Used for: "What exactly happened in this invocation?"

Layer 2: function_logs table (structured summary)
──────────────────────────────────────────────────
Purpose: Analytics. Per-invocation metrics.
Content: 1 row per invocation with key fields
Setup:   withErrorHandling wrapper writes the row
Retention: 30 days (pg_cron rotation)
Used for: "How many cache misses today? Which functions are slow?"
```

### Why Not Store Raw Logs in Supabase

One `test-leaderboard` invocation produces ~20 log rows. At scale:
- 1,000 invocations/day × 20 rows = 20,000 rows/day
- 30 days = 600,000 rows just for one function
- Across all functions = millions of rows
- Querying becomes slow and expensive

Axiom is purpose-built for this. It handles the raw verbose logs. Supabase handles the structured summary.

### Why Not Use txt Files on Supabase Storage

- No atomic append (race conditions with concurrent writes)
- Cannot query (must download entire file to filter)
- No structure (can't filter by function name, org, status)
- High latency for dashboard reads

### pg_cron = logrotate for Postgres

| Linux logrotate | FitKit pg_cron |
|---|---|
| Runs on system cron | Runs inside Postgres |
| Rotates log files | Deletes old table rows |
| Compresses old files | (summarize before delete if needed) |
| Configurable retention | `interval '30 days'` |

---

## 10. Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...    # bypasses RLS, server-side only

# Axiom
AXIOM_TOKEN=xaat-...
AXIOM_ORG_ID=your-org-id
AXIOM_DATASET=supabase-edge-logs    # name of your dataset in Axiom

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://xxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxx...

# Sentry
SENTRY_AUTH_TOKEN=sntrys_...
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=fitkit-reports

# App
NEXT_PUBLIC_APP_NAME=FitKit Mission Control
```

**Security notes:**
- `SUPABASE_SERVICE_ROLE_KEY` must NEVER be exposed to the browser (server-side only)
- All other tokens are also server-side only
- This dashboard has no auth — deploy behind VPN or IP whitelist

---

## 11. Claude Code Prompt

Use this prompt with Claude Code in a fresh directory:

```
I am building a standalone Next.js dashboard called "FitKit Mission Control" — an internal tool for monitoring and analytics of the FitKit platform.

## What FitKit is
FitKit is a student fitness testing platform with two surfaces:
1. A Flutter mobile app used by teachers to run fitness tests and capture results
2. A Next.js web app (FitKit Reports) where students view their fitness reports

The backend is Supabase (PostgreSQL + Edge Functions), Upstash Redis, Sentry, and Axiom (for edge function logs via Supabase log drain).

## What I want to build
A standalone Next.js 15 app (App Router, TypeScript, Tailwind CSS) — internal use only, no auth needed for now.

## Tech Stack
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Shadcn/ui for components
- Recharts for charts
- Supabase JS client for DB queries

## Supabase Schema (relevant tables)
- organizations (id, name, type: school|academy|defence, created_at)
- users (id, organization_id, is_consent_approved, guardian_email, created_at, report_access_key)
- classes (id, organization_id, name, std, div, created_at)
- cards (id, rfid, qr_code, user_id, created_at)
- consent_requests (id, user_id, guardian_email, email_status: queued|sent|delivered|bounced|complained|rejected, token, created_at, sent_at, approved_at, rejected_at)
- scores_overview (id, user_id, test_id, test_config_id, score, created_at)
- test_sessions (id, organization_id, created_at)
- test_session_participants (id, test_session_id, user_id, created_at)
- seasons (id, organization_id, is_active, created_at)
- tests (id, name, category)
- test_configurations (id, test_id, name)

## New table to create (migration file)
```sql
create table if not exists function_logs (
  id            bigserial primary key,
  function_name text not null,
  user_id       uuid,
  org_id        uuid,
  boot_ms       int,
  duration_ms   int,
  cache_hit     boolean,
  status        text not null check (status in ('success', 'failed')),
  error_step    text,
  error_message text,
  metadata      jsonb,
  created_at    timestamptz not null default now()
);

create index on function_logs (created_at desc);
create index on function_logs (function_name, created_at desc);
create index on function_logs (status, created_at desc);
create index on function_logs (org_id, created_at desc);

select cron.schedule(
  'cleanup-function-logs',
  '0 0 * * *',
  $$ delete from function_logs where created_at < now() - interval '30 days' $$
);
```

## Dashboard Screens to build

### 1. / — System Health (landing)
- Service status cards: Supabase, Axiom, Redis, Sentry (ping each, show green/yellow/red)
- Last 24h stats from function_logs: total invocations, error count, avg duration, cache miss rate
- Functions with error rate > 10% highlighted in red
- Last leaderboard cache refresh time + manual refresh button

### 2. /overview — Business Overview
- Time filter: Today / Yesterday / This Week / This Season / Custom date range
- KPI cards: total students, tests performed in period, active orgs, new students onboarded
- Consent approval rate funnel
- Bar chart: tests performed per day (last 30 days) from scores_overview
- Bar chart: new students per day from users.created_at

### 3. /organisations — Org List + Drill Down
List view: org name, type, student count, students with ≥1 result, last activity, consent approval %, active/inactive badge

/organisations/[orgId] detail view:
- Students performed today / this week / this season
- Test coverage per test category (assigned vs performed %)
- Consent funnel
- Student list table: name, tests completed, last active, consent status

### 4. /consent — Consent Pipeline
- Funnel visualization: Sent → Delivered → Approved / Rejected / Bounced
- Students pending > 7 days (table)
- Students with bounced emails (table)
- Filter by org

### 5. /functions — Edge Function Monitor
- Table: function name, invocations today, success rate, avg duration, p95 duration
- Click into function → show recent rows from function_logs
- Cache hit/miss ratio for test-leaderboard

### 6. /errors — Error Log
- Table from function_logs where status = failed
- Filter by function name, org, date range
- Error frequency chart (errors per hour)

### 7. /cache — Redis Cache Monitor
- Upstash REST API stats: memory, keys, daily requests
- Cache hit rate trend from function_logs
- Manual refresh leaderboard cache button (POST to refresh-leaderboard-cache edge function)

### 8. /audit — Audit Log
- Unified feed: new users + consent events + test results + function errors
- Filter by org, event type, date range
- Export as CSV

## Layout
- Sidebar navigation with all 8 screens
- Dark theme
- FitKit Mission Control branding

## Environment Variables
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
AXIOM_TOKEN
AXIOM_ORG_ID
AXIOM_DATASET
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
SENTRY_AUTH_TOKEN
SENTRY_ORG
SENTRY_PROJECT

## Build Instructions
1. Scaffold the full Next.js 15 app with all screens
2. Create supabase/migrations/20240324_function_logs.sql migration file
3. Use Shadcn/ui components throughout (dark theme)
4. Use server components for all data fetching
5. Add loading skeletons for all data-heavy sections
6. Use Recharts for all charts
7. Build screens 1, 2, 3 fully functional first
8. Stub screens 4-8 with placeholder UI and correct layout
9. Use Supabase service role key for all DB queries (server-side only, never exposed to browser)
10. Create a lib/supabase.ts, lib/axiom.ts, lib/upstash.ts, lib/sentry.ts client files
11. All data fetching in lib/queries/ folder, one file per screen
```

---

## 12. Key Business Questions the Dashboard Answers

### Student Activity
- How many students of [org] performed tests yesterday?
- Which students have never performed any test?
- Which students completed all assigned tests vs partial?
- How many new students were onboarded this week?

### Org Health
- Which orgs are active vs inactive?
- Which org has the best/worst test coverage?
- Which org has the most consent issues?

### Consent Pipeline
- What is the overall consent approval rate?
- How many students are stuck in pending > 7 days?
- Which emails bounced and need re-sending?
- What is the SES delivery rate?

### Test Activity
- Which test categories are performed most?
- Which assigned tests are never performed?
- How many test sessions ran today?
- Which orgs are running tests vs which are not?

### Edge Function Performance
- Which functions are slowest?
- Which functions have the highest error rate?
- What is the leaderboard cache hit rate?
- How often are cold starts happening (boot_ms)?

### Cache Health
- Is the leaderboard cache warm?
- Which org/test combos have stale cache?
- How many Redis requests are we using vs quota?

---


*This document is the single source of truth for FitKit Mission Control.*
*Update it as the system evolves.*
