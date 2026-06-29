"""
/api/chat  — main conversation endpoint (SSE stream).
"""

import json
from fastapi import APIRouter, Request, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from api.db.database import get_db
from api.orchestrator import route

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    locale: str = "th"


async def _event_generator(message: str, locale: str, student_hash: str | None, db):
    async for chunk in route(message, locale, student_hash, db):
        yield f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"
    yield "data: [DONE]\n\n"


@router.post("/chat")
async def chat(
    body: ChatRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    student_hash = request.cookies.get("session")
    return StreamingResponse(
        _event_generator(body.message, body.locale, student_hash, db),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
