import sys
import os
from datetime import datetime, timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
from dotenv import load_dotenv

load_dotenv()

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'collector'))

from database import test_connection
from routes.repos import router as repos_router
from routes.metrics import router as metrics_router
from routes.ml import router as ml_router

app = FastAPI(
    title="GitHub DevOps Intelligence Platform",
    description="""
    Real-time DevOps analytics platform.
    Tracks DORA metrics, PR cycle time, pipeline risk, and contributor burnout.
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(repos_router)
app.include_router(metrics_router)
app.include_router(ml_router)


@app.on_event("startup")
async def startup():
    logger.info("API Gateway starting up")
    db_ok = test_connection()
    logger.info(f"Database: {'connected' if db_ok else 'disconnected'}")


@app.get("/")
async def root():
    return {
        "name": "GitHub DevOps Intelligence Platform",
        "version": "1.0.0",
        "status": "running",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "endpoints": {
            "docs": "/docs",
            "repos": "/repos",
            "metrics": "/metrics/dora, /metrics/cycle-time, /metrics/summary",
            "ml": "/ml/pr-risk, /ml/burnout, /ml/models, /ml/train"
        }
    }


@app.get("/health")
async def health():
    db_ok = test_connection()
    return {
        "status": "healthy" if db_ok else "degraded",
        "database": "connected" if db_ok else "disconnected",
        "services": {
            "collector": "running",
            "metrics": "http://localhost:8002",
            "ml": "http://localhost:8003"
        },
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
