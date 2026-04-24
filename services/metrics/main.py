import sys
import os
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, Query
from loguru import logger
from dotenv import load_dotenv

load_dotenv()

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'collector'))

from database import SessionLocal, test_connection
from dora import calculate_dora_metrics
from cycle_time import calculate_cycle_time
from schemas import DORAMetrics, PRCycleTime, MetricsSummary

app = FastAPI(
    title="DevOps Metrics Service",
    description="DORA metrics and PR cycle time analytics",
    version="1.0.0"
)


@app.on_event("startup")
async def startup():
    logger.info("Metrics service starting up")
    if not test_connection():
        logger.error("Database connection failed on startup")


@app.get("/health")
async def health():
    db_ok = test_connection()
    return {
        "status": "healthy" if db_ok else "degraded",
        "database": "connected" if db_ok else "disconnected",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@app.get("/metrics/dora", response_model=DORAMetrics)
async def get_dora_metrics(
    repo: str = Query(
        default="fastapi/fastapi",
        description="Repository in owner/name format"
    ),
    days: int = Query(
        default=90,
        ge=7,
        le=365,
        description="Period in days to calculate metrics over"
    )
):
    logger.info(f"DORA metrics requested for {repo} over {days} days")
    db = SessionLocal()
    try:
        metrics = calculate_dora_metrics(db, repo, days)
        return metrics
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error calculating DORA metrics: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
    finally:
        db.close()


@app.get("/metrics/cycle-time", response_model=PRCycleTime)
async def get_cycle_time(
    repo: str = Query(
        default="fastapi/fastapi",
        description="Repository in owner/name format"
    ),
    days: int = Query(
        default=90,
        ge=7,
        le=365,
        description="Period in days"
    )
):
    logger.info(f"Cycle time requested for {repo} over {days} days")
    db = SessionLocal()
    try:
        cycle_time = calculate_cycle_time(db, repo, days)
        return cycle_time
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error calculating cycle time: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
    finally:
        db.close()


@app.get("/metrics/summary", response_model=MetricsSummary)
async def get_summary(
    repo: str = Query(default="fastapi/fastapi"),
    days: int = Query(default=90, ge=7, le=365)
):
    logger.info(f"Summary requested for {repo}")
    db = SessionLocal()
    try:
        dora = calculate_dora_metrics(db, repo, days)
        cycle_time = calculate_cycle_time(db, repo, days)

        from models import PullRequest, Repository
        repo_obj = db.query(Repository).filter_by(full_name=repo).first()
        top_contributors = []
        if repo_obj:
            from sqlalchemy import func
            results = db.query(
                PullRequest.author,
                func.count(PullRequest.id).label("pr_count")
            ).filter_by(repo_id=repo_obj.id).group_by(
                PullRequest.author
            ).order_by(func.count(PullRequest.id).desc()).limit(5).all()
            top_contributors = [r.author for r in results]

        return MetricsSummary(
            repo_full_name=repo,
            dora=dora,
            cycle_time=cycle_time,
            top_contributors=top_contributors,
            calculated_at=datetime.now(timezone.utc)
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error calculating summary: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
    finally:
        db.close()