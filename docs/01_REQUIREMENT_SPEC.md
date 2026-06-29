# 01 — Requirement Specification

**Project:** AskKMITL — A Conversational Student Portal with an Integrated Learning Analytics Framework
**Working Thesis Title:** *AskKMITL: A Single-Surface Conversational Student Portal with an Embedded Learning Analytics Framework for Early Academic-Risk Detection*
**Document Type:** Requirement Specification (Business / Product Requirements)
**Version:** 1.0
**Status:** Draft for Implementation Hand-off
**Audience:** AI Coding Agent, Thesis Advisor, Reviewers
**Author:** Nathapol Powpadetkarn (Frong)
**Program:** M.Sc. Business Analytics & Statistics, KMITL

---

## 1. Purpose of This Document

This document defines **what** the system must do and **why**, independent of implementation. It is the contract the software is validated against. The companion document `02_SOFTWARE_SPEC.md` defines **how** it is built.

Two intents run in parallel and must both be satisfied:

1. **Product intent** — a usable, mobile-first conversational portal that consolidates KMITL's fragmented student-facing web services into a single Gemini-style chat surface.
2. **Research intent (the thesis core)** — the portal is also a *sensor*. Every interaction feeds a Learning Analytics layer that models student behaviour, detects academic risk early, and surfaces curriculum bottlenecks. **The analytics layer — not the chatbot — is the academic contribution.**

> ⚠️ **Reviewer-facing framing.** This is not "a chatbot for a university." It is "a learning-analytics study in which a conversational portal is the data-collection instrument." All requirements below are written to keep statistical rigour central.

---

## 2. Background & Problem Statement

KMITL students must navigate many disconnected web systems (registration, grades, curriculum, scholarship, thesis/IS regulations, document requests, academic calendar). The cost to the student is high cognitive load and slow self-service; the cost to the institution is invisibility — no one can see, at scale, **what students are confused about, when, and which of them are heading toward academic trouble.**

Two gaps follow:

- **Service gap:** answers exist but are scattered and hard to reach on mobile.
- **Insight gap:** the institution has no behavioural early-warning signal. Risk is usually detected only *after* grades drop.

AskKMITL closes both: one conversational surface for students, and a behavioural data stream for the institution.

---

## 3. Objectives

### 3.1 Product Objectives
- **PO-1** Provide a single conversational surface answering ≥ 90% of common student self-service questions without a human handoff.
- **PO-2** Answer personal academic questions (grades, completed credits, remaining requirements) securely, per authenticated student.
- **PO-3** Offer proactive "smart" academic tools beyond lookup (degree audit, GPA simulation, course recommendation).
- **PO-4** Run as an installable, mobile-first web application (PWA) usable on iOS/Android/desktop with no app-store dependency.

### 3.2 Research Objectives (Thesis)
- **RO-1** Build a labelled behavioural dataset from interaction logs joined to academic outcomes.
- **RO-2** Develop and evaluate an **early academic-risk prediction model** that uses behavioural signals (query patterns) in addition to academic features, and quantify the *incremental* predictive value of the behavioural signals.
- **RO-3** Apply **topic modelling** to interaction logs to discover and rank student confusion themes ("curriculum bottlenecks") over the academic calendar.
- **RO-4** (Stretch) Estimate the **causal effect of portal engagement on academic outcomes** using a quasi-experimental design (propensity score matching / uplift), linking back to causal-inference methodology.

### 3.3 Out of Scope (this PoC)
- Native iOS/Android apps (web/PWA only).
- Write-back actions to official systems (no real enrolment, no payments, no request approvals). The system **informs and routes**, it does not transact.
- Production integration with live KMITL systems (see §9 Data Strategy — synthetic data is used for the PoC).
- Multi-language NLU beyond Thai + English.

---

## 4. Stakeholders & User Personas

| ID | Persona | Goal | Key needs |
|----|---------|------|-----------|
| P1 | **Undergraduate student** | Fast self-service on mobile | Plain answers, "can I take course X?", "how many credits left?", privacy |
| P2 | **Graduate / IS student** | Thesis & registration logistics | Regulations, timelines, advisor matching |
| P3 | **Academic advisor / faculty** | See who needs help early | Risk dashboard, confusion themes |
| P4 | **Registrar / program admin** | Reduce repetitive enquiries; improve curriculum | Bottleneck analytics, enquiry volume trends |
| P5 | **Researcher (project owner)** | Validate analytics models | Clean logs, reproducible pipeline, evaluation harness |

---

## 5. Functional Requirements

Requirements are grouped by capability tier. Tiers A–C are the **product**; Tier D is the **thesis core**.

### Tier A — Knowledge & Regulation Q&A (RAG; no login required)

Document-grounded answers that are identical for every user.

- **FR-A1** Answer questions on registration rules (add/drop, min/max credits, deadlines).
- **FR-A2** Answer questions on thesis/IS regulations, formatting, timelines, proposal/defense steps.
- **FR-A3** Answer questions on scholarships and student loans (e.g., กยศ.) eligibility and process.
- **FR-A4** Answer questions on document requests (transcript, certificates) and the academic calendar.
- **FR-A5** Provide course descriptions from the curriculum catalogue.
- **FR-A6** **Routing:** when a query needs a human or office, return the correct unit + contact channel ("contact the Registrar's office at …") instead of guessing.
- **FR-A7** Every grounded answer must expose its **source** (document/section) for traceability.

### Tier B — Personal Academic Q&A (Text-to-SQL / tools; login required)

Per-student answers from structured data. **Authentication is mandatory before any Tier-B response.**

- **FR-B1** Report the student's grades, term GPA, and cumulative GPAX.
- **FR-B2** Report completed courses, accumulated credits, and **credits remaining to graduate**.
- **FR-B3** **Prerequisite check:** "Can I enrol in course X?" → verify prerequisites are satisfied.
- **FR-B4** Report status of tuition, submitted requests, and registration windows relevant to the student.
- **FR-B5** A student may only ever access **their own** records (enforced server-side, not in the prompt).

### Tier C — Smart Academic Skills (tools / optimisation)

Capabilities beyond lookup. These embed light statistics/optimisation in the product itself.

- **FR-C1 Degree Audit:** compare transcript against curriculum structure; report unmet mandatory/elective requirements by category and remaining credits.
- **FR-C2 Course Recommender:** suggest electives via a hybrid recommender (content-based on course descriptions + collaborative filtering on enrolment history).
- **FR-C3 GPA Simulator:** project GPAX from hypothetical term grades; compute minimum grades needed for a target (e.g., honours).
- **FR-C4 Retake Optimiser:** rank repeatable courses by GPAX gain per credit invested.
- **FR-C5 Timetable Solver (stretch):** given desired courses, produce a non-conflicting schedule via constraint solving.
- **FR-C6 Advisor Matching (stretch):** match a student's stated research interest to faculty via embedding similarity over faculty publications/profiles.
- **FR-C7 Proactive Nudges (stretch):** push reminders (drop deadline approaching, waited-for course now open, registration opens tomorrow).

### Tier D — Learning Analytics Engine (THESIS CORE)

Turns aggregate interaction logs into institutional insight and predictive models.

- **FR-D1 Interaction logging:** every turn is logged as a structured event — `{student_id (hashed), timestamp, raw_query, detected_intent, detected_topic, tier_used, resolved/escalated, response_latency}`.
- **FR-D2 Topic modelling:** automatically cluster queries into confusion themes; rank themes by volume and by position in the academic calendar.
- **FR-D3 Bottleneck detection:** flag courses/regulations that generate anomalously high query volume as candidate curriculum or communication problems, with a policy-style recommendation output.
- **FR-D4 Early academic-risk prediction:** predict a student's risk of failing / probation / GPAX falling below threshold next term, using **behavioural features (from logs) + academic features**. Must report **incremental lift from behavioural features** vs an academic-only baseline.
- **FR-D5 Temporal pattern analysis:** characterise query patterns across the academic calendar for staffing/communication planning.
- **FR-D6 Causal analysis (stretch):** estimate the effect of portal engagement on academic outcomes using propensity score matching / uplift, with explicit treatment/control definition.
- **FR-D7 Analytics dashboard:** a Power BI dashboard for P3/P4 summarising confusion themes, bottlenecks, risk cohorts, and temporal trends.
- **FR-D8 Reproducible pipeline:** every model is trained by a scripted, re-runnable pipeline with fixed seeds and a versioned evaluation report.

### Tier E — Guardrails (what the AI must NOT do)

- **FR-E1** Never approve/deny official requests or perform transactions; inform + route only.
- **FR-E2** On uncertain or ambiguous regulations, explicitly defer ("please confirm with the Registrar") with the contact channel — never fabricate.
- **FR-E3** Never return personal data without an authenticated session bound to that student.
- **FR-E4** Never expose raw `student_id`; only hashed identifiers leave the secure boundary.

---

## 6. Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-1 | **Platform** | Web application, **mobile-first**, installable as a PWA (Add to Home Screen). Works on iOS Safari, Android Chrome, desktop. No app store. |
| NFR-2 | **Performance** | First grounded answer ≤ 4 s P50; UI interaction ≤ 100 ms; streamed token responses. |
| NFR-3 | **Availability (PoC)** | Demonstrable on a single deployed environment; backend containerised for reproducible startup. |
| NFR-4 | **Security** | Authenticated sessions for Tier B/C; server-side authorisation; secrets never in client. |
| NFR-5 | **Privacy / PDPA** | Consent captured before logging; `student_id` stored only as a salted hash in analytics; PII excluded from logs; right-to-withdraw supported. (See §10.) |
| NFR-6 | **Usability** | Conversational, single-surface, Gemini-style. New user can get an answer with zero training. |
| NFR-7 | **Accessibility** | WCAG AA contrast; the primary `#e86020` must only be used where it passes AA against its background (see §8). Keyboard + screen-reader support. |
| NFR-8 | **Observability** | Structured logs + basic metrics (latency, resolution rate, escalation rate). |
| NFR-9 | **Reproducibility** | Synthetic data generator, model pipelines, and evaluation are scripted and seedable. |
| NFR-10 | **Internationalisation** | Thai + English input and output; UTF-8 throughout; Thai-aware tokenisation for topic modelling. |

---

## 7. UX / UI Requirements

The experience must read as a clean, modern conversational assistant in the **spirit of Google Gemini**, with KMITL's warm orange as the accent.

- **UX-1 Single surface.** One primary screen: a conversation thread with a persistent bottom input bar. No multi-page navigation maze.
- **UX-2 Empty state with suggestions.** On open, show a friendly greeting and **suggestion chips** ("How many credits until I graduate?", "Can I take Data Mining?", "Thesis submission deadline?").
- **UX-3 Streamed responses.** Answers stream token-by-token; a subtle "thinking" shimmer while retrieving.
- **UX-4 Rich answer cards.** Structured answers (degree audit, GPA simulation, course lists) render as cards/tables inside the thread, not raw text.
- **UX-5 Source affordance.** Grounded answers show a small, tappable "source" reference.
- **UX-6 Auth gate.** Personal (Tier B/C) questions trigger an inline, friendly login prompt; public (Tier A) questions never require login.
- **UX-7 Light & dark mode.** Both required; orange accent tuned for each.
- **UX-8 Mobile-first ergonomics.** Thumb-reachable input, large tap targets (≥ 44 px), safe-area aware, installable.

### Design Tokens (binding)
- **Primary:** `#e86020` (KMITL warm orange) — used for the send button, active states, focus rings, key accents, and the assistant's identity mark.
- **Typography:** **Google Sans** as the display/UI typeface.
  > Implementation note: Google Sans is a proprietary Google typeface and is **not** distributable via Google Fonts. The build must declare `font-family: "Google Sans", "Google Sans Text", "Roboto", "Inter", system-ui, sans-serif;` and gracefully fall back to **Roboto/Inter** where Google Sans is unavailable. Document this fallback; do not ship a broken font load.
- **Shape language:** generous corner radii, soft surfaces, airy spacing, subtle elevation — Gemini-like calm, not dense enterprise UI.
- Full token table and component specs live in `02_SOFTWARE_SPEC.md` §8.

---

## 8. Accessibility Constraint on the Primary Colour

`#e86020` on white yields a contrast ratio around **3.2:1** — this **fails** WCAG AA for normal body text (needs ≥ 4.5:1). Therefore:

- Use `#e86020` for **large text (≥ 18.66 px bold / 24 px), icons, fills, borders, and accents** — not for small body text on white.
- For small text needing the brand colour, use a **darkened variant** (e.g. `#b8431a` / `#9c3614`) that passes AA.
- On dark surfaces, use a **lightened tint** (e.g. `#ff7a45`) for legibility.
- This rule is mandatory (NFR-7). The software spec defines the full derived palette.

---

## 9. Data Strategy & Constraints

> 🔴 **Primary project risk.** Real KMITL grade/registration data is hard to obtain and PDPA-sensitive. **Do not block the project on it.**

- **DR-1 Synthetic-first.** The PoC runs on a **synthetic student dataset** generated to be statistically realistic (plausible distributions of GPA, credit progression, enrolment paths, and — critically — a *plausible behavioural-to-outcome relationship* so the at-risk model has signal to learn). The generator is part of the deliverable.
- **DR-2 Realism for analytics.** Synthetic logs must encode a *latent* relationship between query behaviour (e.g., frequent withdrawal-related questions near deadlines) and worse outcomes, so model evaluation is meaningful. This relationship is hidden from the model and is the ground truth the thesis recovers.
- **DR-3 Real-data path (optional).** If an anonymised extract is later approved, the schema is designed to accept it without code changes.
- **DR-4 Assumptions:** curriculum structure, prerequisite graph, and academic calendar are provided as seed data files.

---

## 10. Privacy & PDPA Requirements

Logging student questions and joining them to grades is sensitive personal data. This is a **thesis chapter**, not an afterthought ("Responsible Learning Analytics").

- **PR-1 Consent:** explicit, revocable consent captured before any analytics logging.
- **PR-2 Pseudonymisation:** analytics store only a **salted hash** of `student_id`; the mapping is kept in the secured operational store, never in the analytics store.
- **PR-3 Data minimisation:** logs capture intent/topic/metadata; raw queries are retained only with consent and are scannable for PII removal.
- **PR-4 Purpose limitation:** analytics data is used for the stated research/early-warning purpose only.
- **PR-5 Transparency:** a plain-language notice explains what is collected and why.
- **PR-6 Right to withdraw:** a student can revoke consent and have their analytics records purged.

---

## 11. Constraints & Assumptions

- **C-1** Single developer + AI coding agent; PoC timeframe (independent-study scope).
- **C-2** Web/PWA only; no native builds; no Apple Developer Program dependency.
- **C-3** Backend must be containerised (Docker) for reproducible demo startup.
- **C-4** Thai + English required.
- **A-1** LLM access is available via API for NLU/RAG/Text-to-SQL.
- **A-2** Synthetic data is acceptable to reviewers provided methodology is sound.

---

## 12. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| Real data unavailable | High | High | Synthetic-first strategy (§9); schema accepts real extract later |
| Project read as "just a chatbot" | High | Med | Tier-D analytics framed as the contribution; rigorous evaluation harness |
| PDPA non-compliance | High | Med | Consent + pseudonymisation + minimisation (§10); dedicated thesis chapter |
| Text-to-SQL leaks other students' data | High | Med | Server-side authorisation; row-level scoping outside the prompt (FR-B5/E3) |
| LLM hallucinates regulations | Med | Med | Strict RAG grounding + source display + defer-on-uncertainty (FR-A7/E2) |
| Scope creep across Tiers C/D | Med | High | MVP scope (§13); stretch items clearly marked |
| Google Sans licensing | Low | High | Documented fallback to Roboto/Inter (§7) |

---

## 13. MVP Scope & Prioritisation (MoSCoW)

**Must (MVP — sufficient to pass):**
- Tier A RAG (FR-A1–A7)
- Tier B grades/credits via Text-to-SQL with auth (FR-B1–B5)
- Degree Audit (FR-C1)
- Interaction logging (FR-D1)
- **One** at-risk prediction model with incremental-lift evaluation (FR-D4)
- Power BI analytics dashboard (FR-D7)
- PWA, Gemini-style UI, design tokens (UX-1–8)
- Synthetic data generator + reproducible pipeline (DR-1, FR-D8)

**Should:** Course Recommender (FR-C2), GPA Simulator (FR-C3), Topic modelling (FR-D2), Bottleneck detection (FR-D3).

**Could:** Retake optimiser (FR-C4), Temporal analysis (FR-D5), Proactive nudges (FR-C7).

**Won't (this cycle):** Timetable solver (FR-C5), Advisor matching (FR-C6), Causal analysis (FR-D6), native apps, live system integration.

---

## 14. Acceptance Criteria & Success Metrics

### Product
- **AC-1** ≥ 90% of a fixed test set of common questions answered correctly and grounded (Tier A).
- **AC-2** Tier-B answers are correct for the authenticated student and **inaccessible** for others (security test passes).
- **AC-3** Degree Audit output matches a hand-computed reference for ≥ 3 synthetic students.
- **AC-4** App installs as a PWA on iOS Safari and Android Chrome and is usable one-handed.

### Research (thesis)
- **AC-5** At-risk model reports **AUC-ROC and PR-AUC** with cross-validation; the **behavioural+academic** model beats the **academic-only** baseline by a reported, non-trivial margin (the headline result).
- **AC-6** Model interpretability provided (e.g., SHAP) identifying which behavioural signals drive risk.
- **AC-7** Topic modelling yields a ranked, human-interpretable list of confusion themes mapped to the calendar.
- **AC-8** The full pipeline (data → features → model → evaluation report) re-runs end-to-end from a single command with a fixed seed.

---

## 15. Glossary

- **RAG** — Retrieval-Augmented Generation: grounding answers in retrieved documents.
- **Text-to-SQL** — translating a natural-language question into a database query.
- **Degree Audit** — checking a transcript against curriculum requirements.
- **At-risk model** — classifier/estimator predicting poor academic outcomes.
- **PDPA** — Thailand's Personal Data Protection Act.
- **PWA** — Progressive Web App: an installable, app-like web application.
- **GPAX** — cumulative grade point average across all terms.

---

*End of `01_REQUIREMENT_SPEC.md`*
