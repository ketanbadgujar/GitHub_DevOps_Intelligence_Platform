from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class PRRiskPrediction(BaseModel):
    pr_number: int
    title: str
    author: str
    risk_score: float
    risk_label: str
    risk_factors: list[str]
    predicted_at: datetime


class BurnoutPrediction(BaseModel):
    username: str
    burnout_risk: bool
    anomaly_score: float
    health_label: str
    avg_weekly_prs_historical: float
    avg_weekly_prs_recent: float
    avg_weekly_reviews_historical: float
    avg_weekly_reviews_recent: float
    predicted_at: datetime


class ModelInfo(BaseModel):
    model_name: str
    trained_at: Optional[datetime]
    training_samples: int
    feature_count: int
    is_trained: bool


class TrainingResult(BaseModel):
    model_name: str
    samples_used: int
    features_used: list[str]
    training_accuracy: float
    trained_at: datetime
    message: str
