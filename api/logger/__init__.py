"""Interaction logger — FR-D1 sensor middleware."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def log_event(
    db: AsyncSession,
    *,
    student_hash: str | None,
    locale: str,
    raw_query: str | None,
    intent: str,
    topic: str | None,
    tier_used: str,
    resolved: bool,
    escalated_to: str | None,
    latency_ms: int,
    retrieval_conf: float | None,
):
    await db.execute(
        text("""
            INSERT INTO chat_events
              (event_id, student_hash, ts, locale, raw_query,
               intent, topic, tier_used, resolved, escalated_to,
               latency_ms, retrieval_conf)
            VALUES
              (:eid, :sh, :ts, :locale, :rq,
               :intent, :topic, :tier, :resolved, :esc,
               :lat, :conf)
        """),
        {
            "eid":     str(uuid.uuid4()),
            "sh":      student_hash,
            "ts":      datetime.now(timezone.utc),
            "locale":  locale,
            "rq":      raw_query,
            "intent":  intent,
            "topic":   topic,
            "tier":    tier_used,
            "resolved": resolved,
            "esc":     escalated_to,
            "lat":     latency_ms,
            "conf":    retrieval_conf,
        },
    )
    await db.commit()
