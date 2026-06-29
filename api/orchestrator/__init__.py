"""
Agent Orchestrator — intent router (§3.1).
Classifies each turn and dispatches to RAG / Text-to-SQL / Tools.
"""

import time
from typing import AsyncGenerator

from api.config import settings


INTENT_PROMPT = """
You are the intent classifier for AskKMITL, a university student portal.
Classify the student's message into exactly one intent label:

- knowledge        : questions about rules, regulations, curriculum, scholarships, thesis, calendar, courses (no personal data needed)
- personal_data    : questions about *this* student's grades, GPA, credits, enrolments, requests
- skill            : requests for degree audit, GPA simulation, course recommendation, retake optimiser
- smalltalk        : greetings, thanks, chitchat
- other            : anything outside university scope

Reply with a JSON object: {"intent": "<label>", "topic": "<short topic tag>"}
Topic tag examples: registration, thesis, grades, withdrawal, deadline, grade_anxiety,
scholarship, curriculum, credits, gpa_simulation, course_info, degree_audit, other.

Student message:
"""


async def classify_intent(message: str) -> dict:
    """Use LLM to classify intent (low temperature for determinism)."""
    import anthropic, json

    client = anthropic.Anthropic(api_key=settings.LLM_API_KEY)
    resp = client.messages.create(
        model=settings.LLM_MODEL,
        max_tokens=64,
        temperature=0,
        messages=[{"role": "user", "content": INTENT_PROMPT + message}],
    )
    text = resp.content[0].text.strip()
    try:
        return json.loads(text)
    except Exception:
        return {"intent": "other", "topic": "other"}


async def route(
    message: str,
    locale: str,
    student_hash: str | None,
    db,
) -> AsyncGenerator[dict, None]:
    """
    Main routing coroutine. Yields SSE-style dicts:
      {type: "token"|"card"|"source"|"done", ...}
    """
    t0 = time.monotonic()
    classification = await classify_intent(message)
    intent = classification.get("intent", "other")
    topic  = classification.get("topic",  "other")

    # Auth gate: personal queries require a session
    if intent in ("personal_data", "skill") and not student_hash:
        yield {"type": "auth_required", "intent": intent}
        return

    resolved = True
    escalated_to = None
    retrieval_conf = None
    tier = "A"

    if intent == "knowledge":
        from api.rag import answer_stream
        async for chunk in answer_stream(message, locale):
            if chunk.get("type") == "source":
                retrieval_conf = chunk.get("conf")
            if chunk.get("escalated"):
                escalated_to = chunk.get("escalated_to")
                resolved = False
            yield chunk
        tier = "A"

    elif intent in ("personal_data", "skill"):
        from api.text2sql import answer_personal
        async for chunk in answer_personal(message, locale, student_hash, intent, db):
            yield chunk
        tier = "B" if intent == "personal_data" else "C"

    else:
        yield {"type": "token", "text": "สวัสดีครับ! มีอะไรให้ช่วยเรื่องการศึกษาไหมครับ?"}
        yield {"type": "done"}

    latency_ms = int((time.monotonic() - t0) * 1000)

    # Log every turn (FR-D1)
    from api.logger import log_event

    # raw_query stored only if student has consented
    raw_q = None
    if student_hash and db:
        from sqlalchemy import text
        row = await db.execute(
            text("SELECT consent_analytics FROM students WHERE student_hash = :h"),
            {"h": student_hash},
        )
        r = row.fetchone()
        if r and r[0]:
            raw_q = message

    if db:
        await log_event(
            db,
            student_hash=student_hash,
            locale=locale,
            raw_query=raw_q,
            intent=intent,
            topic=topic,
            tier_used=tier,
            resolved=resolved,
            escalated_to=escalated_to,
            latency_ms=latency_ms,
            retrieval_conf=retrieval_conf,
        )
