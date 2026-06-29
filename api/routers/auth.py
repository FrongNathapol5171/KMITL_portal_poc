"""Auth routes — session-based login/logout (FR-B5, NFR-4)."""

import hashlib
from fastapi import APIRouter, HTTPException, Response, Request, Depends
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from api.config import settings
from api.db.database import get_db

router = APIRouter()


class LoginRequest(BaseModel):
    student_id: str
    password: str          # PoC: password == student_id (real system: LDAP/SSO)


class ConsentRequest(BaseModel):
    consent: bool


def _hash(student_id: str) -> str:
    return hashlib.sha256(f"{settings.HASH_SALT}{student_id}".encode()).hexdigest()


@router.post("/login")
async def login(body: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    student_hash = _hash(body.student_id)
    row = await db.execute(
        text("SELECT student_id FROM students WHERE student_hash = :h"),
        {"h": student_hash},
    )
    student = row.fetchone()
    if not student:
        raise HTTPException(status_code=401, detail="Student not found")

    # PoC: simple session cookie (production → signed JWT or server-side session)
    response.set_cookie(
        key="session",
        value=student_hash,
        httponly=True,
        secure=False,   # set True in production (HTTPS)
        samesite="lax",
        max_age=86400,
    )
    return {"ok": True, "student_hash": student_hash}


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("session")
    return {"ok": True}


@router.post("/consent")
async def set_consent(
    body: ConsentRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    student_hash = request.cookies.get("session")
    if not student_hash:
        raise HTTPException(status_code=401, detail="Not authenticated")

    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    await db.execute(
        text("""UPDATE students
                SET consent_analytics = :c, consent_ts = :ts
                WHERE student_hash = :h"""),
        {"c": body.consent, "ts": now, "h": student_hash},
    )
    await db.commit()

    if not body.consent:
        # PR-6 right-to-withdraw: purge analytics rows
        await db.execute(
            text("DELETE FROM chat_events WHERE student_hash = :h"),
            {"h": student_hash},
        )
        await db.commit()

    return {"ok": True, "consent": body.consent}
