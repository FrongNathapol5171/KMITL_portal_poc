"""
Tools / Skills — Tier C (§3.4, FR-C1…C4).
Deterministic Python functions called by the orchestrator.
"""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def degree_audit(student_hash: str, db: AsyncSession) -> dict:
    """
    FR-C1: compare transcript against curriculum; return unmet requirements.
    """
    prog_row = await db.execute(
        text("""
            SELECT p.program_id, p.name, p.total_credits_required
            FROM   students s JOIN programs p USING (program_id)
            WHERE  s.student_hash = :h
        """),
        {"h": student_hash},
    )
    prog = prog_row.mappings().fetchone()
    if not prog:
        return {"error": "student not found"}

    curriculum_rows = await db.execute(
        text("""
            SELECT c.course_id, c.code, c.title_en, cu.category,
                   cu.required_flag, c.credits
            FROM   curriculum cu JOIN courses c USING (course_id)
            WHERE  cu.program_id = :pid
        """),
        {"pid": prog["program_id"]},
    )
    curriculum = curriculum_rows.mappings().all()

    completed_rows = await db.execute(
        text("""
            SELECT e.course_id
            FROM   enrolments e JOIN students s USING (student_id)
            WHERE  s.student_hash = :h
              AND  e.status = 'completed'
              AND  e.grade NOT IN ('F', 'W')
        """),
        {"h": student_hash},
    )
    completed_ids = {r[0] for r in completed_rows.fetchall()}

    from collections import defaultdict
    met: dict[str, list] = defaultdict(list)
    unmet: dict[str, list] = defaultdict(list)

    for course in curriculum:
        target = met if course["course_id"] in completed_ids else unmet
        target[course["category"]].append({
            "code": course["code"],
            "title": course["title_en"],
            "credits": course["credits"],
            "required": course["required_flag"],
        })

    total_earned = sum(
        c["credits"] for cats in met.values() for c in cats
    )

    return {
        "program": prog["name"],
        "total_required": prog["total_credits_required"],
        "credits_earned": total_earned,
        "credits_remaining": prog["total_credits_required"] - total_earned,
        "met": dict(met),
        "unmet": dict(unmet),
    }


async def gpa_simulate(
    student_hash: str,
    hypothetical_grades: list[dict],   # [{course_id, grade_point, credits}]
    db: AsyncSession,
) -> dict:
    """
    FR-C3: project GPAX from hypothetical term grades.
    """
    progress_row = await db.execute(
        text("SELECT credits_earned, gpax FROM v_my_progress WHERE student_hash = :h"),
        {"h": student_hash},
    )
    prog = progress_row.mappings().fetchone()
    if not prog:
        return {"error": "student not found"}

    current_credits = prog["credits_earned"] or 0
    current_gpax = float(prog["gpax"] or 0.0)

    total_points_so_far = current_gpax * current_credits
    hypo_points = sum(g["grade_point"] * g["credits"] for g in hypothetical_grades)
    hypo_credits = sum(g["credits"] for g in hypothetical_grades)

    new_gpax = (total_points_so_far + hypo_points) / max(1, current_credits + hypo_credits)

    return {
        "current_gpax": round(current_gpax, 3),
        "projected_gpax": round(new_gpax, 3),
        "credits_after": current_credits + hypo_credits,
    }


async def min_grade_for_target(
    student_hash: str,
    target_gpax: float,
    term_credits: int,
    db: AsyncSession,
) -> dict:
    """Compute minimum average grade point needed this term to reach target_gpax."""
    progress_row = await db.execute(
        text("SELECT credits_earned, gpax FROM v_my_progress WHERE student_hash = :h"),
        {"h": student_hash},
    )
    prog = progress_row.mappings().fetchone()
    if not prog:
        return {"error": "student not found"}

    current_credits = prog["credits_earned"] or 0
    current_gpax = float(prog["gpax"] or 0.0)

    required_points = target_gpax * (current_credits + term_credits) - current_gpax * current_credits
    min_gp = required_points / max(1, term_credits)
    achievable = 0.0 <= min_gp <= 4.0

    return {
        "target_gpax": target_gpax,
        "min_avg_grade_point": round(min_gp, 3),
        "achievable": achievable,
    }


async def retake_optimise(student_hash: str, db: AsyncSession) -> list[dict]:
    """
    FR-C4: rank repeatable (failed/low-grade) courses by GPAX-gain-per-credit.
    """
    rows = await db.execute(
        text("""
            SELECT c.code, c.title_en, e.grade, e.grade_point, c.credits
            FROM   enrolments e
            JOIN   students s  USING (student_id)
            JOIN   courses  c  ON e.course_id = c.course_id
            WHERE  s.student_hash = :h
              AND  e.grade_point < 3.0
              AND  e.status = 'completed'
            ORDER  BY e.grade_point ASC
        """),
        {"h": student_hash},
    )
    candidates = rows.mappings().all()
    progress = await db.execute(
        text("SELECT credits_earned, gpax FROM v_my_progress WHERE student_hash = :h"),
        {"h": student_hash},
    )
    prog = progress.mappings().fetchone()
    if not prog:
        return []

    current_credits = prog["credits_earned"] or 0
    current_gpax = float(prog["gpax"] or 0.0)

    results = []
    for c in candidates:
        gain_if_A = (4.0 - float(c["grade_point"])) * c["credits"] / max(1, current_credits)
        results.append({
            "code": c["code"],
            "title": c["title_en"],
            "current_grade": c["grade"],
            "credits": c["credits"],
            "gpax_gain_if_A": round(gain_if_A, 4),
        })

    results.sort(key=lambda x: x["gpax_gain_if_A"], reverse=True)
    return results
