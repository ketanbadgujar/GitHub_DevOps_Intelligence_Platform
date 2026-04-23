from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date


class DORAMetrics(BaseModel):
    repo_full_name: str
    period_days: int
    deployment_frequency: float
    deployment_frequency_label: str
    lead_time_hours: float
    lead_time_label: str
    change_failure_rate: float
    change_failure_rate_label: str
    mttr_hours: float
    mttr_label: str
    calculated_at: datetime

    class Config:
        from_attributes = True


class PRCycleTime(BaseModel):
    repo_full_name: str
    period_days: int
    avg_cycle_time_hours: float
    median_cycle_time_hours: float
    p75_cycle_time_hours: float
    p95_cycle_time_hours: float
    total_prs_merged: int
    calculated_at: datetime


class PRRiskScore(BaseModel):
    pr_number: int
    title: str
    author: str
    risk_score: float
    risk_label: str
    risk_factors: list[str]


class ContributorHealth(BaseModel):
    username: str
    health_score: float
    health_label: str
    avg_weekly_prs: float
    recent_weekly_prs: float
    avg_weekly_reviews: float
    recent_weekly_reviews: float
    burnout_risk: bool


class MetricsSummary(BaseModel):
    repo_full_name: str
    dora: DORAMetrics
    cycle_time: PRCycleTime
    top_contributors: list[str]
    calculated_at: datetime
    