# 02 — Software Specification

**Project:** AskKMITL — Conversational Student Portal + Learning Analytics
**Document Type:** Software / Technical Specification (Architecture & Design)
**Version:** 1.0
**Status:** Draft for Implementation Hand-off
**Companion:** `01_REQUIREMENT_SPEC.md` (requirements & acceptance criteria)
**Audience:** AI Coding Agent
**Author:** Nathapol Powpadetkarn (Frong)

---

## 0. How to Use This Document (note to the coding agent)

Build in the **MVP order** of §13. Treat the **Learning Analytics layer (§10) as the centre of gravity** — it is the thesis. The chat product exists to feed it. Do not over-build Tiers C/D stretch items before the Must-have path runs end-to-end. Every requirement ID (`FR-*`, `NFR-*`, `UX-*`) maps back to `01_REQUIREMENT_SPEC.md`.

---

## 1. Architecture Overview

AskKMITL is a **three-plane** system:

1. **Experience plane** — a mobile-first PWA (the Gemini-style chat).
2. **Intelligence plane** — an API + agent that routes each query to RAG, Text-to-SQL, or a tool, and logs every interaction.
3. **Analytics plane** — an offline/batch pipeline that turns logs + outcomes into models and a dashboard (the thesis).

```
┌─────────────────────────────────────────────────────────────┐
│  EXPERIENCE PLANE  (Next.js PWA — mobile-first, Gemini UI)    │
│  chat thread · suggestion chips · answer cards · auth gate    │
└───────────────┬─────────────────────────────────────────────┘
                │  HTTPS / streamed (SSE)
┌───────────────▼─────────────────────────────────────────────┐
│  INTELLIGENCE PLANE  (FastAPI)                               │
│                                                              │
│   Auth/Session ──► Agent Orchestrator (intent router)        │
│                       │                                      │
│        ┌──────────────┼───────────────┐                      │
│        ▼              ▼               ▼                       │
│   RAG Engine    Text-to-SQL      Tools/Skills                │
│   (Tier A)      (Tier B)         (Tier C: audit, GPA sim,…)   │
│        │              │               │                      │
│        └──────────────┴───────────────┘                      │
│                       │                                      │
│              Interaction Logger (FR-D1)  ──► event stream    │
└───────┬──────────────────────────┬──────────────────────────┘
        │                          │
┌───────▼────────┐        ┌────────▼─────────┐
│ Operational DB │        │   Vector DB      │
│ (Postgres)     │        │ (pgvector/Chroma)│
│ students,      │        │ regulation &     │
│ courses,grades │        │ course-doc chunks│
│ enrolments,    │        └──────────────────┘
│ curriculum,    │
│ chat_events    │
└───────┬────────┘
        │  nightly / on-demand extract (hashed)
┌───────▼─────────────────────────────────────────────────────┐
│  ANALYTICS PLANE  (Python batch — THESIS CORE)               │
│  feature build · topic modelling · at-risk model · causal    │
│  → evaluation reports → Power BI dashboard                   │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | **Next.js (App Router) + React + TypeScript** | PWA-capable, owner's strongest stack, SSR/streaming |
| Styling | **Tailwind CSS** with custom design tokens | fast, token-driven, themable |
| PWA | `next-pwa` / custom service worker + Web App Manifest | installable, offline shell |
| Backend | **FastAPI (Python)** | async, great for LLM/agent orchestration, owner-familiar |
| Agent / LLM | LLM via API + lightweight orchestration (LangGraph or plain function-routing) | intent routing, tool calling |
| RAG | Embeddings + vector store; chunked regulation/course docs | grounded Tier-A answers |
| Operational DB | **PostgreSQL** | relational academic data, row-level security |
| Vector DB | **pgvector** (same Postgres) or Chroma | one fewer moving part for a PoC |
| Analytics engine | **Python**: pandas, scikit-learn, BERTopic/gensim, SHAP, statsmodels; **DuckDB** for fast local log/feature queries over Parquet | owner-familiar (DuckDB/Parquet), statistically rich |
| Dashboard | **Power BI** | owner skill; reviewer-friendly visuals |
| Packaging | **Docker + docker-compose** | reproducible demo startup |
| Hosting (demo) | Container host (Render / Railway / Fly.io / VPS) | backend reachable for reviewers |

---

## 3. Component Design

### 3.1 Agent Orchestrator (intent router)
The single decision point per turn.

1. Receive `{message, session, auth_state, locale}`.
2. **Classify intent** → one of: `knowledge` (Tier A), `personal_data` (Tier B), `skill` (Tier C), `smalltalk/other`.
3. **Authorisation gate:** if intent ∈ {personal_data, skill-requiring-data} and not authenticated → return inline auth prompt (UX-6); do **not** call data tools.
4. Dispatch to the chosen engine; stream the result.
5. **Always** emit a structured log event (FR-D1) regardless of path.

Intent classification = LLM function-calling/classifier with a constrained schema; keep it deterministic (low temperature) and log the predicted intent for analytics (it *is* a feature).

### 3.2 RAG Engine (Tier A — FR-A1…A7)
- **Ingestion:** load regulation docs, thesis/IS rules, scholarship/loan info, calendar, course descriptions → clean → **chunk** (size ~500–800 tokens, overlap ~80) with metadata `{doc, section, source_url}`.
- **Indexing:** embed chunks → vector store.
- **Retrieval:** top-k (k≈4–6) with metadata filter; optional re-rank.
- **Generation:** answer **only** from retrieved context; if low retrieval confidence → defer + route (FR-E2). Always attach `source` (FR-A7).

### 3.3 Text-to-SQL Engine (Tier B — FR-B1…B5)
- LLM generates SQL **against a restricted, read-only view layer** — never the raw tables.
- **Hard rule:** the authenticated `student_id` is injected **server-side** into a parameterised, row-scoped query context; the LLM never receives or controls identity (FR-B5/E3). Prefer **pre-built parameterised query templates** for the common questions and reserve free-form Text-to-SQL for the long tail, validated against an allow-list of tables/columns.
- Validate generated SQL (parse, reject writes/`;`/DDL, enforce `WHERE student_hash = :me`).
- Render results as answer cards (UX-4).

### 3.4 Tools / Skills (Tier C)
Deterministic Python functions the agent calls:
- `degree_audit(student_id)` → unmet requirements by category + remaining credits (FR-C1).
- `gpa_simulate(student_id, hypothetical_grades)` → projected GPAX; `min_grades_for(target)` (FR-C3).
- `recommend_courses(student_id)` → hybrid recommender (FR-C2).
- `retake_optimise(student_id)` → ranked retakes by GPAX-gain/credit (FR-C4).
- (stretch) `timetable_solve`, `match_advisor`.

### 3.5 Interaction Logger (FR-D1) — the sensor
Middleware that, on every turn, writes:
```json
{
  "event_id": "uuid",
  "student_hash": "sha256(salt + student_id)",
  "ts": "ISO-8601",
  "locale": "th|en",
  "raw_query": "…(only if consented)…",
  "intent": "knowledge|personal_data|skill|other",
  "topic": "registration|thesis|grades|withdrawal|…",
  "tier_used": "A|B|C",
  "resolved": true,
  "escalated_to": null,
  "latency_ms": 1234,
  "retrieval_conf": 0.81
}
```
Written to `chat_events` (Postgres) and exported to Parquet for the analytics plane.

---

## 4. Data Model (Operational — PostgreSQL)

Core tables (synthetic-first per `01` §9):

```sql
-- Identity / enrolment
students(student_id PK, student_hash, program_id FK, year_level,
         admit_term, status, consent_analytics BOOL, consent_ts)

programs(program_id PK, name, degree_level, total_credits_required)

curriculum(curriculum_id PK, program_id FK, course_id FK,
           category ENUM('core','major_required','major_elective','free_elective','ge'),
           required_flag BOOL, recommended_term INT)

courses(course_id PK, code, title_th, title_en, credits,
        description_th, description_en)

prerequisites(course_id FK, prereq_course_id FK)   -- prerequisite graph

enrolments(enrolment_id PK, student_id FK, course_id FK, term,
           grade CHAR(2), grade_point NUMERIC, status)

term_summary(student_id FK, term, term_gpa NUMERIC,
             gpax NUMERIC, credits_earned INT)      -- materialised for fast B-tier

-- Operational misc
requests(request_id PK, student_id FK, type, status, submitted_ts)
academic_calendar(event_id PK, term, event_type, start_date, end_date)

-- Analytics sensor
chat_events(event_id PK, student_hash, ts, locale, raw_query,
            intent, topic, tier_used, resolved, escalated_to,
            latency_ms, retrieval_conf)

-- RAG
doc_chunks(chunk_id PK, doc, section, source_url, content,
           embedding VECTOR)                        -- pgvector
```

**Read-only views for Text-to-SQL** (e.g. `v_my_grades`, `v_my_progress`) that always require a `:student_hash` bind parameter. The LLM only sees these views.

---

## 5. Synthetic Data Generator (DR-1, DR-2)

A scripted generator (`/data/generate.py`) producing a realistic cohort:

- Sample programs, curricula, prerequisite graphs, and an academic calendar from seed config.
- Simulate each student's term-by-term enrolment respecting prerequisites and credit limits.
- Sample grades from a **per-student latent ability** parameter (so GPAX is internally consistent).
- **Inject the behavioural→outcome relationship** the thesis recovers: students with lower latent ability (and/or stress shocks) generate *more* withdrawal/deadline/grade-anxiety queries clustered near deadlines, and have higher probability of failing/probation next term. Keep this latent link **hidden** from the model; it is the ground truth.
- Honour reproducibility: a single `--seed` controls the whole world (NFR-9).

Output: Postgres seed + a Parquet mirror of `chat_events` for the analytics plane.

---

## 6. API Design (FastAPI)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `POST` | `/api/chat` | optional | main turn; streams (SSE); routes via orchestrator |
| `POST` | `/api/auth/login` | – | student login → session |
| `POST` | `/api/auth/consent` | yes | set/revoke analytics consent (PR-1/PR-6) |
| `GET`  | `/api/me/progress` | yes | degree audit + credits remaining (FR-C1/B2) |
| `POST` | `/api/me/gpa-simulate` | yes | GPA projection (FR-C3) |
| `GET`  | `/api/me/recommendations` | yes | course recommender (FR-C2) |
| `GET`  | `/api/health` | – | liveness for demo |

`/api/chat` request: `{ message, locale }` (session cookie carries identity).
Response: SSE stream of `{type: "token"|"card"|"source"|"done", …}`.

**Security middleware (NFR-4, FR-E3):** every data-bearing route resolves `student_hash` from the session server-side and binds it into queries. The client cannot pass a `student_id`.

---

## 7. Frontend Design (Next.js PWA)

### 7.1 Screens / components
- **ChatScreen** (the single surface, UX-1): scrollable thread + sticky `Composer`.
- **EmptyState**: greeting + **SuggestionChips** (UX-2).
- **MessageBubble**: user/assistant variants; assistant supports streamed text (UX-3).
- **AnswerCard**: structured renderers — `DegreeAuditCard`, `GpaSimCard`, `CourseListCard`, `GradeTableCard` (UX-4).
- **SourceChip**: tappable grounding reference (UX-5).
- **AuthSheet**: inline bottom-sheet login when a personal question is asked (UX-6).
- **ThemeToggle**: light/dark (UX-7).

### 7.2 PWA (NFR-1)
- `manifest.webmanifest`: name, short_name `AskKMITL`, `display: standalone`, theme_color `#e86020`, background_color, maskable icons (192/512).
- Service worker: cache the app shell + static assets for offline launch; network-first for `/api/*`.
- iOS notes: provide `apple-touch-icon`, respect safe-area insets (`env(safe-area-inset-*)`), test Add-to-Home-Screen on Safari.

---

## 8. Design System (binding — UX-3, NFR-7, `01` §7/§8)

### 8.1 Colour tokens
Primary brand `#e86020`, with an AA-safe derived ramp.

```css
:root {
  /* Brand */
  --color-primary:        #e86020; /* accents, fills, send button, active */
  --color-primary-hover:  #d4541a;
  --color-primary-press:  #b8431a; /* AA-safe for small text on white */
  --color-primary-text:   #9c3614; /* use for small brand-coloured TEXT on light */
  --color-primary-tint:   #fce9df; /* light fill / chip background */
  --color-primary-on-dark:#ff7a45; /* brand accent on dark surfaces */

  /* Neutrals (Gemini-like calm) */
  --bg:            #ffffff;
  --surface:       #f7f7f8;
  --surface-2:     #efeff1;
  --border:        #e3e3e6;
  --text:          #1b1b1f;
  --text-muted:    #5f6368;

  /* Feedback */
  --success: #1e8e3e;
  --warning: #f29900;
  --danger:  #d93025;

  /* Shape & motion */
  --radius-sm: 8px;
  --radius-md: 16px;
  --radius-lg: 24px;     /* bubbles, cards */
  --radius-pill: 999px;  /* chips, composer */
  --shadow-1: 0 1px 2px rgba(0,0,0,.06), 0 2px 8px rgba(0,0,0,.04);
}

[data-theme="dark"] {
  --bg:        #131316;
  --surface:   #1c1c20;
  --surface-2: #26262b;
  --border:    #34343a;
  --text:      #e6e6e9;
  --text-muted:#a3a3ab;
  --color-primary: #ff7a45;     /* lifted for contrast */
  --color-primary-tint: #3a2417;
}
```

**Contrast rule (NFR-7 / `01` §8):** `#e86020` ≈ 3.2:1 on white → use it for **large text, icons, fills, borders, accents** only. For **small brand-coloured text on white**, use `--color-primary-text` (`#9c3614`). On dark, use `--color-primary-on-dark`.

### 8.2 Typography
```css
--font-sans: "Google Sans", "Google Sans Text", "Roboto", "Inter",
             system-ui, -apple-system, "Noto Sans Thai", sans-serif;
```
- Google Sans is **proprietary / not on Google Fonts** — ship the fallback stack above and load Google Sans only if licensed assets are provided (`01` §7 note). Include **Noto Sans Thai** for clean Thai rendering.
- Scale: Display 28/600, Title 20/600, Body 16/400, Caption 13/400. Line-height ≥ 1.4.

### 8.3 Gemini-style UX patterns (UX-1…8)
- Spacious layout, large radii, soft surfaces; the assistant bubble blends into the background while the **user bubble** uses `--surface-2`.
- Composer is a rounded **pill** with a circular `#e86020` send button.
- Suggestion chips are pill-shaped, `--color-primary-tint` background, primary-text label.
- A subtle brand **shimmer/gradient** for the "thinking" state (orange→amber), kept tasteful.
- Motion: 150–250 ms ease-out for streaming/append; respect `prefers-reduced-motion`.

> The coding agent must read `/mnt/skills/public/frontend-design/SKILL.md` before building UI, and apply these tokens rather than framework defaults.

---

## 9. (reserved)

---

## 10. Analytics Plane — THESIS CORE (FR-D2…D8)

A Python batch pipeline over the Parquet mirror of `chat_events` joined to academic outcomes. Use **DuckDB** for feature queries (owner-familiar, fast over Parquet).

### 10.1 Pipeline stages
1. **Ingest & join** logs ↔ `term_summary`/`enrolments` on `student_hash`.
2. **Feature engineering** (one row per student-per-term):
   - *Behavioural:* query count, query frequency trend, share of "withdrawal/deadline/grade-anxiety" topics, query timing relative to deadlines, escalation rate, latency-to-first-query in term, topic diversity.
   - *Academic:* current GPAX, credits behind plan, prior failed courses, current load, year level.
3. **Models** (below).
4. **Evaluation report** (versioned, seeded) + **Power BI export** (Parquet/CSV with UTF-8 BOM for Thai, owner's standard).

### 10.2 Early Academic-Risk Model (FR-D4 — headline result)
- **Target:** binary — at-risk next term (fail any course / probation / GPAX < threshold). (Optionally a **survival** formulation: time-to-probation via Cox PH.)
- **Models:** Logistic Regression (interpretable baseline) → Gradient Boosting / Random Forest. Two feature sets:
  - **Baseline:** academic features only.
  - **Full:** academic **+ behavioural** features.
- **Headline metric (AC-5):** report **AUC-ROC and PR-AUC** (data is imbalanced → PR-AUC matters) with stratified k-fold CV, and the **incremental lift** of Full vs Baseline. This number *is* the thesis result: "behavioural signals from the portal add X to predictive power."
- **Interpretability (AC-6):** SHAP values → which behaviours drive risk.
- **Calibration:** reliability curve; threshold chosen for a stated precision/recall trade-off.

### 10.3 Topic Modelling (FR-D2)
- **BERTopic** (embedding-based, Thai-aware) or LDA on raw queries (consented).
- Output: ranked confusion themes × academic-calendar position → bottleneck candidates (FR-D3).

### 10.4 Bottleneck Detection (FR-D3)
- Aggregate query volume by `topic`/`course`; flag statistical outliers (e.g., z-score / control-chart limits) as curriculum/communication problems; emit a short policy recommendation.

### 10.5 Causal Analysis (FR-D6 — stretch, links to uplift methodology)
- **Treatment:** active portal engagement (define threshold, e.g., ≥ N sessions/term).
- **Outcome:** next-term GPAX / pass rate.
- **Method:** propensity score matching to balance covariates, then estimate ATE; optionally uplift/meta-learners for heterogeneous effects. Report with explicit assumptions and caveats (observational, not RCT).

### 10.6 Dashboard (FR-D7)
Power BI pages: (1) Confusion themes & volume over the calendar; (2) Bottleneck flags; (3) Risk cohort overview + drivers (SHAP summary); (4) Engagement vs outcome. Connects to the analytics Parquet/CSV exports.

---

## 11. Security & Privacy Implementation (NFR-4/5, `01` §10)

- **Auth:** session-based (HTTP-only, secure cookie). Tier A open; Tier B/C gated.
- **Row-level scoping:** all personal queries bind `student_hash` server-side (FR-E3); free-form SQL passes an allow-list validator (no writes/DDL, mandatory `WHERE` scope).
- **Pseudonymisation:** analytics store holds only `sha256(salt + student_id)`; salt + mapping kept in the operational secret store, never exported (PR-2).
- **Consent gate (PR-1/PR-6):** logging of `raw_query` only when `consent_analytics = true`; revocation purges the student's analytics rows.
- **PII scrub:** raw queries pass a PII filter before storage/modelling (PR-3).
- **Secrets:** `.env` server-side only; never shipped to the client.

---

## 12. Deployment & DevOps (C-3, NFR-3)

- `docker-compose.yml` services: `web` (Next.js), `api` (FastAPI), `db` (Postgres + pgvector), optional `analytics` (Python batch job runner).
- One-command demo: `docker compose up` → seeded synthetic data → app reachable.
- Backend deployable to Render/Railway/Fly.io so reviewers can reach it; frontend as PWA from the same origin or Vercel.
- Health check (`/api/health`) for demo stability.

---

## 13. Implementation Phases (build order)

**Phase 0 — Foundation**
Repo scaffold, docker-compose, Postgres schema (§4), **synthetic data generator (§5)**, design tokens (§8).

**Phase 1 — Tier A (RAG) + chat shell**
Ingestion/indexing, RAG engine, Next.js chat surface (UX-1…3,5,7), PWA manifest/SW. → demoable knowledge assistant.

**Phase 2 — Auth + Tier B (Text-to-SQL)**
Login, consent, row-scoped query layer, grade/credit answers, answer cards. → personalised assistant.

**Phase 3 — Degree Audit + Logger**
`degree_audit` tool, **interaction logger (§3.5)**, Parquet export. → sensor live.

**Phase 4 — Analytics core (THESIS)**
Feature pipeline, **at-risk model with incremental-lift evaluation (§10.2)**, SHAP, evaluation report, Power BI dashboard. → AC-5/6/7/8.

**Phase 5 — Should/Could**
Course recommender, GPA simulator, topic modelling, bottleneck detection, (stretch) causal analysis.

---

## 14. Testing Strategy

- **Unit:** tools (degree audit, GPA sim) against hand-computed references (AC-3).
- **Security:** automated test that student A **cannot** retrieve student B's data (AC-2); SQL validator rejects writes/cross-scope.
- **RAG quality:** fixed Q→expected-source test set; measure grounded accuracy (AC-1) and defer behaviour on out-of-scope questions.
- **Model:** seeded CV; assert Full model ≥ Baseline by the reported margin; calibration check; pipeline re-runs from one command (AC-8).
- **PWA:** Lighthouse PWA pass; manual Add-to-Home-Screen on iOS Safari + Android Chrome (AC-4).
- **Accessibility:** automated contrast check enforcing the `#e86020` usage rule (NFR-7).

---

## 15. Repository Structure

```
askkmitl/
├─ docker-compose.yml
├─ .env.example
├─ web/                       # Next.js PWA
│  ├─ app/ (chat surface)
│  ├─ components/ (MessageBubble, Composer, AnswerCard, SuggestionChips, AuthSheet)
│  ├─ styles/tokens.css       # §8 design tokens
│  └─ public/ (manifest, icons, sw)
├─ api/                       # FastAPI
│  ├─ orchestrator/ (intent router §3.1)
│  ├─ rag/ (§3.2)             ├─ text2sql/ (§3.3)
│  ├─ skills/ (§3.4)          ├─ logger/ (§3.5)
│  ├─ auth/  ├─ db/ (models, views)  └─ main.py
├─ data/
│  ├─ generate.py             # synthetic generator §5
│  ├─ seeds/ (curriculum, prereqs, calendar, docs)
│  └─ exports/ (parquet mirror)
├─ analytics/                 # THESIS CORE §10
│  ├─ features.py (duckdb)    ├─ model_risk.py (sklearn+shap)
│  ├─ topics.py (bertopic)    ├─ bottlenecks.py
│  ├─ causal.py (stretch)     └─ report/ (eval reports, powerbi exports)
└─ docs/
   ├─ 01_REQUIREMENT_SPEC.md  └─ 02_SOFTWARE_SPEC.md
```

---

## 16. Environment Variables (`.env.example`)

```
LLM_API_KEY=
LLM_MODEL=
EMBEDDING_MODEL=
DATABASE_URL=postgresql://...
VECTOR_BACKEND=pgvector
HASH_SALT=            # for student_hash; keep secret, never export
SESSION_SECRET=
APP_ORIGIN=
```

---

## 17. Traceability (requirement → component)

| Requirement | Built in |
|-------------|----------|
| FR-A* (RAG) | §3.2 RAG Engine |
| FR-B* (personal data) | §3.3 Text-to-SQL + §11 scoping |
| FR-C* (smart skills) | §3.4 Tools |
| FR-D1 (logging) | §3.5 Logger |
| FR-D2/D3 (topics/bottlenecks) | §10.3/10.4 |
| FR-D4 (at-risk model) | §10.2 |
| FR-D6 (causal) | §10.5 |
| FR-D7 (dashboard) | §10.6 |
| FR-E* (guardrails) | §3.1 gate, §11 security |
| UX-*/design | §7, §8 |
| NFR-1 (PWA) | §7.2, §12 |
| NFR-5 (PDPA) | §11 |
| NFR-7 (contrast) | §8.1 |

---

*End of `02_SOFTWARE_SPEC.md`*
