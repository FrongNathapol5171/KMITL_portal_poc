"""
Agent Orchestrator — intent router (§3.1).
Classifies each turn and dispatches to RAG / Text-to-SQL / Tools.
Uses Google Gemini for intent classification.
"""

import json
import time
from typing import AsyncGenerator

import google.generativeai as genai

from api.config import settings

INTENT_PROMPT = """
You are the intent classifier for AskKMITL, a university student portal.
Classify the student's message into exactly one intent label:

- knowledge        : questions about rules, regulations, curriculum, scholarships, thesis, calendar, courses (no personal data needed)
- personal_data    : questions about *this* student's grades, GPA, credits, enrolments, requests
- skill            : requests for degree audit, GPA simulation, course recommendation, retake optimiser
- smalltalk        : greetings, thanks, chitchat
- other            : anything outside university scope

Reply with a JSON object only — no markdown, no extra text:
{"intent": "<label>", "topic": "<short topic tag>"}

Topic tag examples: registration, thesis, grades, withdrawal, deadline, grade_anxiety,
scholarship, curriculum, credits, gpa_simulation, course_info, degree_audit, other.

Student message:
"""


def _get_client() -> genai.GenerativeModel:
    genai.configure(api_key=settings.GEMINI_API_KEY)
    return genai.GenerativeModel(
        model_name=settings.LLM_MODEL,
        generation_config={"temperature": 0, "max_output_tokens": 64},
    )


async def classify_intent(message: str) -> dict:
    """Use Gemini to classify intent (temperature=0 for determinism)."""
    model = _get_client()
    resp = model.generate_content(INTENT_PROMPT + message)
    text = resp.text.strip()
    # Strip possible markdown fences
    if text.startswith("```"):
        text = text.split("```")[1].lstrip("json").strip()
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
    raw_q = None
    if student_hash and db:
        from sqlalchemy import text as sa_text
        row = await db.execute(
            sa_text("SELECT consent_analytics FROM students WHERE student_hash = :h"),
            {"h": student_hash},
        )
        r = row.fetchone()
        if r and r[0]:
            raw_q = message

    if db:
        from api.logger import log_event
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
