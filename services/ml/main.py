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
from models import PullRequest, Repository
from feature_engineering import extract_pr_features, extract_contributor_features
from pr_risk_model import PRRiskModel, pr_risk_model, FEATURES as PR_FEATURES
from burnout_detector import BurnoutDetector, burnout_detector
from schemas import (
    PRRiskPrediction, BurnoutPrediction,
    ModelInfo, TrainingResult
)

app = FastAPI(
    title="DevOps ML Service",
    description="ML predictions for PR risk and contributor burnout",
    version="1.0.0"
)


@app.on_event("startup")
async def startup():
    logger.info("ML service starting up")
    if not test_connection():
        logger.error("Database connection failed on startup")


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "pr_risk_model_trained": pr_risk_model.is_trained,
        "burnout_model_trained": burnout_detector.is_trained,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@app.get("/ml/models", response_model=list[ModelInfo])
async def get_model_info():
    return [
        ModelInfo(
            model_name="PR Risk Classifier",
            trained_at=pr_risk_model.trained_at,
            training_samples=pr_risk_model.training_samples,
            feature_count=len(PR_FEATURES),
            is_trained=pr_risk_model.is_trained
        ),
        ModelInfo(
            model_name="Burnout Detector",
            trained_at=burnout_detector.trained_at,
            training_samples=burnout_detector.training_samples,
            feature_count=8,
            is_trained=burnout_detector.is_trained
        )
    ]


@app.post("/ml/train", response_model=list[TrainingResult])
async def train_models(
    repo: str = Query(default="fastapi/fastapi")
):
    logger.info(f"Training requested for {repo}")
    db = SessionLocal()
    results = []

    try:
        pr_df = extract_pr_features(db, repo)
        model = PRRiskModel()
        pr_result = model.train(pr_df)
        results.append(TrainingResult(
            model_name="PR Risk Classifier",
            samples_used=pr_result["samples_used"],
            features_used=pr_result["features_used"],
            training_accuracy=pr_result["training_accuracy"],
            trained_at=pr_result["trained_at"],
            message="Trained successfully"
        ))

        contributor_df = extract_contributor_features(db, repo)
        detector = BurnoutDetector()
        burnout_result = detector.train(contributor_df)
        results.append(TrainingResult(
            model_name="Burnout Detector",
            samples_used=burnout_result["samples_used"],
            features_used=burnout_result["features_used"],
            training_accuracy=0.0,
            trained_at=burnout_result["trained_at"],
            message=f"Trained — {burnout_result['anomalies_detected']} anomalies detected"
        ))

        return results

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Training failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@app.get("/ml/pr-risk", response_model=list[PRRiskPrediction])
async def get_pr_risk(
    repo: str = Query(default="fastapi/fastapi"),
    limit: int = Query(default=20, ge=1, le=100)
):
    logger.info(f"PR risk predictions requested for {repo}")
    db = SessionLocal()

    try:
        repo_obj = db.query(Repository).filter_by(full_name=repo).first()
        if not repo_obj:
            raise HTTPException(status_code=404, detail=f"Repository {repo} not found")

        pr_df = extract_pr_features(db, repo)
        open_prs = pr_df[pr_df["cycle_hours"] == 0].head(limit)

        if len(open_prs) == 0:
            recent_prs = pr_df.tail(limit)
            predictions = []
            for _, row in recent_prs.iterrows():
                result = pr_risk_model.predict(row.to_dict())
                predictions.append(PRRiskPrediction(
                    pr_number=int(row["pr_number"]),
                    title=str(row["title"]),
                    author=str(row["author"]),
                    risk_score=result["risk_score"],
                    risk_label=result["risk_label"],
                    risk_factors=result["risk_factors"],
                    predicted_at=datetime.now(timezone.utc)
                ))
            return sorted(predictions, key=lambda x: x.risk_score, reverse=True)

        predictions = []
        for _, row in open_prs.iterrows():
            result = pr_risk_model.predict(row.to_dict())
            predictions.append(PRRiskPrediction(
                pr_number=int(row["pr_number"]),
                title=str(row["title"]),
                author=str(row["author"]),
                risk_score=result["risk_score"],
                risk_label=result["risk_label"],
                risk_factors=result["risk_factors"],
                predicted_at=datetime.now(timezone.utc)
            ))

        return sorted(predictions, key=lambda x: x.risk_score, reverse=True)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PR risk prediction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@app.get("/ml/burnout", response_model=list[BurnoutPrediction])
async def get_burnout_predictions(
    repo: str = Query(default="fastapi/fastapi")
):
    logger.info(f"Burnout predictions requested for {repo}")
    db = SessionLocal()

    try:
        contributor_df = extract_contributor_features(db, repo)

        if len(contributor_df) == 0:
            return []

        predictions = []
        for _, row in contributor_df.iterrows():
            result = burnout_detector.predict(row.to_dict())
            predictions.append(BurnoutPrediction(
                username=str(row["username"]),
                burnout_risk=result["burnout_risk"],
                anomaly_score=result["anomaly_score"],
                health_label=result["health_label"],
                avg_weekly_prs_historical=round(float(row["avg_weekly_prs"]), 2),
                avg_weekly_prs_recent=round(float(row["recent_weekly_prs"]), 2),
                avg_weekly_reviews_historical=round(float(row["avg_weekly_reviews"]), 2),
                avg_weekly_reviews_recent=round(float(row["recent_weekly_reviews"]), 2),
                predicted_at=datetime.now(timezone.utc)
            ))

        return sorted(predictions, key=lambda x: x.anomaly_score, reverse=True)

    except Exception as e:
        logger.error(f"Burnout prediction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()
