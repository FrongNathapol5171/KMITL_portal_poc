"""
Text-to-SQL Engine — Tier B/C (§3.3, FR-B1…B5).
Uses pre-built parameterised templates for common queries;
falls back to LLM-generated SQL validated against an allow-list.
"""

from typing import AsyncGenerator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from api.config import settings

# Allow-listed views and columns for free-form Text-to-SQL
ALLOWED_VIEWS = {"v_my_grades", "v_my_progress"}

TEMPLATE_QUERIES = {
    "grades": """
        SELECT course_code, course_title, term, grade, grade_point
        FROM   v_my_grades
        WHERE  student_hash = :sh
        ORDER  BY term DESC, course_code
    """,
    "progress": """
        SELECT program_name, total_credits_required,
               credits_earned, credits_remaining, gpax, status
        FROM   v_my_progress
        WHERE  student_hash = :sh
    """,
    "gpax": """
        SELECT gpax FROM v_my_progress WHERE student_hash = :sh
    """,
}

ROUTING_KEYWORDS = {
    "grades": ["เกรด", "grade", "gpa", "คะแนน"],
    "progress": ["เหลือ", "credit", "หน่วยกิต", "จบ", "remain", "graduate", "progress"],
    "gpax": ["gpax", "เกรดเฉลี่ย", "cumulative"],
}


def _detect_template(message: str) -> str | None:
    msg_lower = message.lower()
    for key, kws in ROUTING_KEYWORDS.items():
        if any(kw in msg_lower for kw in kws):
            return key
    return None


async def answer_personal(
    message: str,
    locale: str,
    student_hash: str,
    intent: str,
    db: AsyncSession,
) -> AsyncGenerator[dict, None]:
    """Stream a personalised answer for Tier-B/C queries."""
    template_key = _detect_template(message)

    if template_key and template_key in TEMPLATE_QUERIES:
        sql = TEMPLATE_QUERIES[template_key]
        result = await db.execute(text(sql), {"sh": student_hash})
        rows = result.mappings().all()

        if not rows:
            yield {"type": "token", "text": "ไม่พบข้อมูลสำหรับบัญชีของคุณครับ" if locale == "th"
                   else "No data found for your account."}
            yield {"type": "done"}
            return

        # Emit as a structured card
        yield {
            "type": "card",
            "card_type": template_key,
            "data": [dict(r) for r in rows],
        }
        yield {"type": "done"}

    else:
        # LLM-generated SQL (restricted to allowed views)
        generated = await _llm_sql(message, student_hash)
        if not generated:
            yield {
                "type": "token",
                "text": "ขอโทษครับ ไม่สามารถตอบคำถามนี้ได้ กรุณาติดต่อสำนักทะเบียน"
                        if locale == "th"
                        else "Sorry, I can't answer this. Please contact the Registrar.",
            }
            yield {"type": "done"}
            return

        try:
            result = await db.execute(text(generated), {"sh": student_hash})
            rows = result.mappings().all()
            yield {"type": "card", "card_type": "generic", "data": [dict(r) for r in rows]}
            yield {"type": "done"}
        except Exception:
            yield {"type": "token", "text": "เกิดข้อผิดพลาดในการค้นหาข้อมูลครับ"}
            yield {"type": "done"}


async def _llm_sql(message: str, student_hash: str) -> str | None:
    """Generate and validate SQL via LLM. Returns None if invalid."""
    import anthropic, re

    schema_hint = """
    Available views (read-only, student_hash-scoped):
      v_my_grades(student_hash, course_code, course_title, term, grade, grade_point)
      v_my_progress(student_hash, program_name, total_credits_required,
                    credits_earned, credits_remaining, gpax, status)
    Always include WHERE student_hash = :sh
    """

    client = anthropic.Anthropic(api_key=settings.LLM_API_KEY)
    resp = client.messages.create(
        model=settings.LLM_MODEL,
        max_tokens=256,
        temperature=0,
        messages=[{
            "role": "user",
            "content": (
                f"Generate a single SQL SELECT query to answer: {message}\n"
                f"Schema:\n{schema_hint}\n"
                "Return ONLY the SQL, nothing else."
            ),
        }],
    )
    sql = resp.content[0].text.strip()

    # Safety: reject writes, DDL, or queries without the scope filter
    sql_upper = sql.upper()
    if any(kw in sql_upper for kw in ("INSERT", "UPDATE", "DELETE", "DROP", "CREATE", "ALTER", "TRUNCATE")):
        return None
    if ":SH" not in sql_upper and "STUDENT_HASH" not in sql_upper:
        return None
    # Must reference only allowed views
    tables = re.findall(r"FROM\s+(\w+)|JOIN\s+(\w+)", sql_upper)
    found = {t for pair in tables for t in pair if t}
    if not found.issubset({v.upper() for v in ALLOWED_VIEWS}):
        return None

    return sql
