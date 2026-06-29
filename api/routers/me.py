"""Personal data routes — Tier B/C REST endpoints."""

from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from api.db.database import get_db
from api.skills import degree_audit, gpa_simulate, retake_optimise

router = APIRouter()


def _require_auth(request: Request) -> str:
    sh = request.cookies.get("session")
    if not sh:
        raise HTTPException(status_code=401, detail="Authentication required")
    return sh


@router.get("/progress")
async def get_progress(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    sh = _require_auth(request)
    return await degree_audit(sh, db)


@router.post("/gpa-simulate")
async def post_gpa_simulate(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    sh = _require_auth(request)
    body = await request.json()
    return await gpa_simulate(sh, body.get("hypothetical_grades", []), db)


@router.get("/recommendations")
async def get_recommendations(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    sh = _require_auth(request)
    return await retake_optimise(sh, db)
