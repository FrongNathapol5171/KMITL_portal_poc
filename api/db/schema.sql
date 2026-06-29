-- AskKMITL — PostgreSQL schema (Phase 0)
-- Requires pgvector extension

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── Programs & Curriculum ─────────────────────────────────────────────────

CREATE TABLE programs (
    program_id   SERIAL PRIMARY KEY,
    name         TEXT NOT NULL,
    degree_level TEXT NOT NULL CHECK (degree_level IN ('bachelor','master','doctoral')),
    total_credits_required INT NOT NULL
);

CREATE TABLE courses (
    course_id       SERIAL PRIMARY KEY,
    code            TEXT NOT NULL UNIQUE,
    title_th        TEXT NOT NULL,
    title_en        TEXT NOT NULL,
    credits         INT  NOT NULL,
    description_th  TEXT,
    description_en  TEXT
);

CREATE TABLE prerequisites (
    course_id       INT NOT NULL REFERENCES courses(course_id),
    prereq_course_id INT NOT NULL REFERENCES courses(course_id),
    PRIMARY KEY (course_id, prereq_course_id)
);

CREATE TYPE curriculum_category AS ENUM (
    'core', 'major_required', 'major_elective', 'free_elective', 'ge'
);

CREATE TABLE curriculum (
    curriculum_id    SERIAL PRIMARY KEY,
    program_id       INT  NOT NULL REFERENCES programs(program_id),
    course_id        INT  NOT NULL REFERENCES courses(course_id),
    category         curriculum_category NOT NULL,
    required_flag    BOOL NOT NULL DEFAULT TRUE,
    recommended_term INT,
    UNIQUE (program_id, course_id)
);

-- ─── Students ──────────────────────────────────────────────────────────────

CREATE TABLE students (
    student_id         TEXT PRIMARY KEY,
    student_hash       TEXT NOT NULL UNIQUE,     -- sha256(salt + student_id)
    program_id         INT  NOT NULL REFERENCES programs(program_id),
    year_level         INT  NOT NULL,
    admit_term         TEXT NOT NULL,            -- e.g. "2023-1"
    status             TEXT NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active','inactive','graduated','probation')),
    consent_analytics  BOOL NOT NULL DEFAULT FALSE,
    consent_ts         TIMESTAMPTZ
);

-- ─── Enrolments & Grades ───────────────────────────────────────────────────

CREATE TABLE enrolments (
    enrolment_id SERIAL PRIMARY KEY,
    student_id   TEXT NOT NULL REFERENCES students(student_id),
    course_id    INT  NOT NULL REFERENCES courses(course_id),
    term         TEXT NOT NULL,
    grade        CHAR(2),
    grade_point  NUMERIC(3,2),
    status       TEXT NOT NULL DEFAULT 'enrolled'
                     CHECK (status IN ('enrolled','withdrawn','completed'))
);

CREATE INDEX idx_enrolments_student ON enrolments(student_id);
CREATE INDEX idx_enrolments_term    ON enrolments(student_id, term);

CREATE TABLE term_summary (
    student_id    TEXT NOT NULL REFERENCES students(student_id),
    term          TEXT NOT NULL,
    term_gpa      NUMERIC(4,3),
    gpax          NUMERIC(4,3),
    credits_earned INT NOT NULL DEFAULT 0,
    PRIMARY KEY (student_id, term)
);

-- ─── Operational Misc ──────────────────────────────────────────────────────

CREATE TABLE requests (
    request_id   SERIAL PRIMARY KEY,
    student_id   TEXT NOT NULL REFERENCES students(student_id),
    type         TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','processing','completed','rejected')),
    submitted_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE academic_calendar (
    event_id   SERIAL PRIMARY KEY,
    term       TEXT NOT NULL,
    event_type TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date   DATE NOT NULL
);

-- ─── Analytics Sensor ──────────────────────────────────────────────────────

CREATE TABLE chat_events (
    event_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_hash   TEXT,                          -- NULL for unauthenticated
    ts             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locale         TEXT NOT NULL DEFAULT 'th' CHECK (locale IN ('th','en')),
    raw_query      TEXT,                          -- only if consent_analytics=true
    intent         TEXT CHECK (intent IN ('knowledge','personal_data','skill','other')),
    topic          TEXT,
    tier_used      CHAR(1) CHECK (tier_used IN ('A','B','C')),
    resolved       BOOL,
    escalated_to   TEXT,
    latency_ms     INT,
    retrieval_conf NUMERIC(4,3)
);

CREATE INDEX idx_chat_events_hash ON chat_events(student_hash);
CREATE INDEX idx_chat_events_ts   ON chat_events(ts);

-- ─── RAG document chunks ───────────────────────────────────────────────────

CREATE TABLE doc_chunks (
    chunk_id   SERIAL PRIMARY KEY,
    doc        TEXT NOT NULL,
    section    TEXT,
    source_url TEXT,
    content    TEXT NOT NULL,
    embedding  VECTOR(768)             -- Gemini text-embedding-004 dim
);

CREATE INDEX idx_doc_chunks_embedding ON doc_chunks
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 50);

-- ─── Read-only views for Text-to-SQL (Tier B) ─────────────────────────────

CREATE VIEW v_my_grades AS
SELECT
    e.student_id,
    s.student_hash,
    c.code        AS course_code,
    c.title_en    AS course_title,
    e.term,
    e.grade,
    e.grade_point,
    c.credits
FROM enrolments e
JOIN students s  USING (student_id)
JOIN courses  c  ON e.course_id = c.course_id;

-- (the WHERE student_hash = :me is injected server-side; the view does not enforce it)

CREATE VIEW v_my_progress AS
SELECT
    s.student_id,
    s.student_hash,
    s.year_level,
    s.status,
    p.name          AS program_name,
    p.total_credits_required,
    COALESCE(SUM(CASE WHEN e.status = 'completed' AND e.grade NOT IN ('F','W')
                      THEN c.credits ELSE 0 END), 0) AS credits_earned,
    p.total_credits_required -
    COALESCE(SUM(CASE WHEN e.status = 'completed' AND e.grade NOT IN ('F','W')
                      THEN c.credits ELSE 0 END), 0) AS credits_remaining,
    ts.gpax
FROM students s
JOIN programs  p  USING (program_id)
LEFT JOIN enrolments e ON e.student_id = s.student_id
LEFT JOIN courses    c ON e.course_id  = c.course_id
LEFT JOIN (
    SELECT student_id, gpax
    FROM   term_summary
    WHERE  (student_id, term) IN (
        SELECT student_id, MAX(term) FROM term_summary GROUP BY student_id
    )
) ts ON ts.student_id = s.student_id
GROUP BY s.student_id, s.student_hash, s.year_level, s.status,
         p.name, p.total_credits_required, ts.gpax;
