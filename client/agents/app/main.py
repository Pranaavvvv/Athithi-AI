"""
Banquet Intelli-Manager — FastAPI Application Entry Point.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routers import finance, menu, ops
from app.tasks.scheduler import start_scheduler, stop_scheduler

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database tables and background scheduler on startup."""
    await init_db()
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title="Banquet Intelli-Manager",
    description="Integrated Banquet Management & Intelligence Tool — from inquiry to post-event analytics.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow all origins for hackathon development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Register Routers ───
app.include_router(finance.router, prefix="/api/finance", tags=["Finance"])
app.include_router(menu.router, prefix="/api/menu", tags=["Menu"])
app.include_router(ops.router, prefix="/api/ops", tags=["Operations"])


@app.get("/", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "Banquet Intelli-Manager", "version": "1.0.0"}


@app.get("/api/health", tags=["Health"])
async def api_health():
    return {"status": "healthy", "database": "connected"}
