"""
Analytics Plane — Feature Engineering (§10.1, FR-D4).
Uses DuckDB over Parquet for fast local queries.

Usage:
    python features.py --export-dir ../data/exports --output features.parquet
"""

import argparse
from pathlib import Path
import duckdb
import pandas as pd

DEFAULT_EXPORT_DIR = Path(__file__).parent.parent / "data" / "exports"


def build_features(export_dir: Path, at_risk_gpax_threshold: float = 2.0) -> pd.DataFrame:
    """
    Build one row per (student_hash, term) with behavioural + academic features.
    Target: at_risk_next_term — 1 if next-term gpax < threshold or probation.
    """
    con = duckdb.connect()

    # Register Parquet files as virtual tables
    con.execute(f"""
        CREATE VIEW chat_events  AS SELECT * FROM read_parquet('{export_dir}/chat_events.parquet');
        CREATE VIEW term_summary AS SELECT * FROM read_parquet('{export_dir}/term_summary.parquet');
        CREATE VIEW enrolments   AS SELECT * FROM read_parquet('{export_dir}/enrolments.parquet');
        CREATE VIEW students     AS SELECT * FROM read_parquet('{export_dir}/students.parquet');
    """)

    # ── Behavioural features per (student_hash, term) ────────────────────
    behavioural_sql = """
        WITH base AS (
            SELECT
                ce.student_hash,
                -- map ts to term (simple: extract year+month)
                CASE
                    WHEN MONTH(ts) BETWEEN 8 AND 12 THEN CONCAT(YEAR(ts), '-1')
                    ELSE CONCAT(YEAR(ts) - 1, '-2')
                END AS term,
                ce.topic,
                ce.intent,
                ce.resolved,
                ce.latency_ms,
                ce.ts
            FROM chat_events ce
            WHERE ce.student_hash IS NOT NULL
        ),
        agg AS (
            SELECT
                student_hash,
                term,
                COUNT(*)                                              AS query_count,
                -- share of high-anxiety topics
                AVG(CASE WHEN topic IN (
                    'withdrawal','deadline','grade_anxiety','scholarship')
                    THEN 1.0 ELSE 0.0 END)                           AS anxiety_topic_share,
                -- share of grade-related queries
                AVG(CASE WHEN topic IN ('grades','gpa_simulation','credits')
                    THEN 1.0 ELSE 0.0 END)                           AS grade_topic_share,
                -- topic diversity (count distinct topics)
                COUNT(DISTINCT topic)                                 AS topic_diversity,
                -- escalation rate
                AVG(CASE WHEN resolved = false THEN 1.0 ELSE 0.0 END) AS escalation_rate,
                -- average latency (proxy for complexity of questions)
                AVG(latency_ms)                                       AS avg_latency_ms,
                -- query frequency trend: queries in last 2 weeks of term vs first 2
                -- simplified: compare month count
                COUNT(DISTINCT DATE_TRUNC('week', ts))                AS active_weeks
            FROM base
            GROUP BY student_hash, term
        )
        SELECT * FROM agg
    """
    beh_df = con.execute(behavioural_sql).df()

    # ── Academic features per (student_hash, term) ───────────────────────
    academic_sql = f"""
        SELECT
            s.student_hash,
            ts.term,
            ts.gpax                                 AS current_gpax,
            ts.term_gpa                             AS current_term_gpa,
            ts.credits_earned,
            s.year_level,
            -- failed courses this term
            COUNT(CASE WHEN e.grade = 'F' THEN 1 END) AS failed_courses_count
        FROM term_summary ts
        JOIN students s USING (student_id)
        LEFT JOIN enrolments e ON e.student_id = ts.student_id AND e.term = ts.term
        GROUP BY s.student_hash, ts.term, ts.gpax, ts.term_gpa, ts.credits_earned, s.year_level
    """
    acad_df = con.execute(academic_sql).df()

    # ── Target: at_risk_next_term ─────────────────────────────────────────
    target_sql = f"""
        WITH ordered AS (
            SELECT
                s.student_hash,
                ts.term,
                ts.gpax,
                LAG(ts.term) OVER (
                    PARTITION BY s.student_hash ORDER BY ts.term
                ) AS prev_term
            FROM term_summary ts JOIN students s USING (student_id)
        )
        SELECT
            student_hash,
            prev_term AS term,     -- predict AT this term, outcome is NEXT
            CASE WHEN gpax < {at_risk_gpax_threshold} THEN 1 ELSE 0 END AS at_risk_next_term
        FROM ordered
        WHERE prev_term IS NOT NULL
    """
    target_df = con.execute(target_sql).df()

    # ── Merge ─────────────────────────────────────────────────────────────
    features_df = (
        acad_df
        .merge(beh_df, on=["student_hash", "term"], how="left")
        .merge(target_df, on=["student_hash", "term"], how="left")
    )

    # Fill missing behavioural (students with no chat events = 0 activity)
    beh_cols = [
        "query_count", "anxiety_topic_share", "grade_topic_share",
        "topic_diversity", "escalation_rate", "avg_latency_ms", "active_weeks",
    ]
    features_df[beh_cols] = features_df[beh_cols].fillna(0)
    features_df["at_risk_next_term"] = features_df["at_risk_next_term"].fillna(0).astype(int)

    con.close()
    return features_df


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--export-dir", type=Path, default=DEFAULT_EXPORT_DIR)
    parser.add_argument("--output", type=Path, default=Path("features.parquet"))
    parser.add_argument("--threshold", type=float, default=2.0)
    args = parser.parse_args()

    df = build_features(args.export_dir, at_risk_gpax_threshold=args.threshold)
    df.to_parquet(args.output, index=False)
    print(f"Feature matrix: {df.shape[0]} rows × {df.shape[1]} cols → {args.output}")
