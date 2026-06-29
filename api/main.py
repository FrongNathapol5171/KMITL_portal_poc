"""AskKMITL — FastAPI entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.config import settings
from api.routers import chat, auth, me, health

app = FastAPI(title="AskKMITL API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.APP_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(auth.router,   prefix="/api/auth")
app.include_router(chat.router,   prefix="/api")
app.include_router(me.router,     prefix="/api/me")
