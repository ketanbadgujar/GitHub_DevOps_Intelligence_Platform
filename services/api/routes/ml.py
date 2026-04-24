from fastapi import APIRouter, HTTPException, Query
import httpx
from loguru import logger
import os

ML_SERVICE_URL = os.getenv("ML_SERVICE_URL", "http://localhost:8003")

router = APIRouter(prefix="/ml", tags=["machine learning"])


async def call_ml_service(path: str, params: dict = None, method: str = "GET"):
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            if method == "POST":
                response = await client.post(
                    f"{ML_SERVICE_URL}{path}",
                    params=params
                )
            else:
                response = await client.get(
                    f"{ML_SERVICE_URL}{path}",
                    params=params
                )
            response.raise_for_status()
            return response.json()
        except httpx.ConnectError:
            raise HTTPException(
                status_code=503,
                detail="ML service unavailable"
            )
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=e.response.status_code,
                detail=str(e)
            )


@router.get("/pr-risk")
async def get_pr_risk(
    repo: str = Query(default="fastapi/fastapi"),
    limit: int = Query(default=20, ge=1, le=100)
):
    return await call_ml_service(
        "/ml/pr-risk",
        {"repo": repo, "limit": limit}
    )


@router.get("/burnout")
async def get_burnout(
    repo: str = Query(default="fastapi/fastapi")
):
    return await call_ml_service(
        "/ml/burnout",
        {"repo": repo}
    )


@router.get("/models")
async def get_models():
    return await call_ml_service("/ml/models")


@router.post("/train")
async def trigger_training(
    repo: str = Query(default="fastapi/fastapi")
):
    return await call_ml_service(
        "/ml/train",
        {"repo": repo},
        method="POST"
    )
