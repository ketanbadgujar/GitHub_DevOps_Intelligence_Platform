from fastapi import APIRouter, HTTPException, Query
import httpx
from loguru import logger
import os

METRICS_SERVICE_URL = os.getenv("METRICS_SERVICE_URL", "http://localhost:8002")

router = APIRouter(prefix="/metrics", tags=["metrics"])


async def call_metrics_service(path: str, params: dict = None):
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(
                f"{METRICS_SERVICE_URL}{path}",
                params=params
            )
            response.raise_for_status()
            return response.json()
        except httpx.ConnectError:
            raise HTTPException(
                status_code=503,
                detail="Metrics service unavailable"
            )
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=e.response.status_code,
                detail=e.response.json().get("detail", "Metrics service error")
            )


@router.get("/dora")
async def get_dora_metrics(
    repo: str = Query(default="fastapi/fastapi"),
    days: int = Query(default=90, ge=7, le=365)
):
    return await call_metrics_service(
        "/metrics/dora",
        {"repo": repo, "days": days}
    )


@router.get("/cycle-time")
async def get_cycle_time(
    repo: str = Query(default="fastapi/fastapi"),
    days: int = Query(default=90, ge=7, le=365)
):
    return await call_metrics_service(
        "/metrics/cycle-time",
        {"repo": repo, "days": days}
    )


@router.get("/summary")
async def get_summary(
    repo: str = Query(default="fastapi/fastapi"),
    days: int = Query(default=90, ge=7, le=365)
):
    return await call_metrics_service(
        "/metrics/summary",
        {"repo": repo, "days": days}
    )
