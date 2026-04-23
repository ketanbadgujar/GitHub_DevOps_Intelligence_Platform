from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, case
from loguru import logger
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'collector'))

from models import PullRequest, WorkflowRun, Repository
from schemas import DORAMetrics


def get_deployment_frequency_label(deployments_per_day: float) -> str:
    if deployments_per_day >= 1:
        return "Elite"
    elif deployments_per_day >= 1/7:
        return "High"
    elif deployments_per_day >= 1/30:
        return "Medium"
    else:
        return "Low"


def get_lead_time_label(hours: float) -> str:
    if hours <= 24:
        return "Elite"
    elif hours <= 24 * 7:
        return "High"
    elif hours <= 24 * 30:
        return "Medium"
    else:
        return "Low"


def get_change_failure_rate_label(rate: float) -> str:
    if rate <= 0.05:
        return "Elite"
    elif rate <= 0.10:
        return "High"
    elif rate <= 0.15:
        return "Medium"
    else:
        return "Low"


def get_mttr_label(hours: float) -> str:
    if hours <= 1:
        return "Elite"
    elif hours <= 24:
        return "High"
    elif hours <= 24 * 7:
        return "Medium"
    else:
        return "Low"


def calculate_deployment_frequency(
    db: Session,
    repo_id: int,
    since: datetime
) -> float:
    merged_to_main = db.query(func.count(PullRequest.id)).filter(
        and_(
            PullRequest.repo_id == repo_id,
            PullRequest.merged_at >= since,
            PullRequest.merged_at.isnot(None),
            PullRequest.base_branch.in_(["main", "master"])
        )
    ).scalar() or 0

    days = (datetime.now(timezone.utc) - since).days or 1
    frequency = merged_to_main / days

    logger.info(
        f"Deployment frequency: {merged_to_main} merges "
        f"over {days} days = {frequency:.3f}/day"
    )
    return round(frequency, 4)


def calculate_lead_time(
    db: Session,
    repo_id: int,
    since: datetime
) -> float:
    prs = db.query(
        PullRequest.created_at,
        PullRequest.merged_at
    ).filter(
        and_(
            PullRequest.repo_id == repo_id,
            PullRequest.merged_at >= since,
            PullRequest.merged_at.isnot(None),
            PullRequest.base_branch.in_(["main", "master"])
        )
    ).all()

    if not prs:
        return 0.0

    durations = []
    for pr in prs:
        if pr.created_at and pr.merged_at:
            created = pr.created_at
            merged = pr.merged_at
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            if merged.tzinfo is None:
                merged = merged.replace(tzinfo=timezone.utc)
            hours = (merged - created).total_seconds() / 3600
            if hours >= 0:
                durations.append(hours)

    if not durations:
        return 0.0

    avg_hours = sum(durations) / len(durations)
    logger.info(f"Lead time: avg {avg_hours:.1f} hours across {len(durations)} PRs")
    return round(avg_hours, 2)


def calculate_change_failure_rate(
    db: Session,
    repo_id: int,
    since: datetime
) -> float:
    total_runs = db.query(func.count(WorkflowRun.id)).filter(
        and_(
            WorkflowRun.repo_id == repo_id,
            WorkflowRun.run_started_at >= since,
            WorkflowRun.conclusion.isnot(None)
        )
    ).scalar() or 0

    if total_runs == 0:
        return 0.0

    failed_runs = db.query(func.count(WorkflowRun.id)).filter(
        and_(
            WorkflowRun.repo_id == repo_id,
            WorkflowRun.run_started_at >= since,
            WorkflowRun.conclusion.in_(["failure", "timed_out", "cancelled"])
        )
    ).scalar() or 0

    rate = failed_runs / total_runs
    logger.info(
        f"Change failure rate: {failed_runs} failed / "
        f"{total_runs} total = {rate:.3f}"
    )
    return round(rate, 4)


def calculate_mttr(
    db: Session,
    repo_id: int,
    since: datetime
) -> float:
    runs = db.query(
        WorkflowRun.conclusion,
        WorkflowRun.run_started_at,
        WorkflowRun.run_completed_at,
        WorkflowRun.head_branch
    ).filter(
        and_(
            WorkflowRun.repo_id == repo_id,
            WorkflowRun.run_started_at >= since,
            WorkflowRun.conclusion.isnot(None),
            WorkflowRun.head_branch.in_(["main", "master"])
        )
    ).order_by(WorkflowRun.run_started_at).all()

    if not runs:
        return 0.0

    recovery_times = []
    i = 0
    while i < len(runs):
        if runs[i].conclusion in ["failure", "timed_out"]:
            failure_time = runs[i].run_completed_at or runs[i].run_started_at
            for j in range(i + 1, len(runs)):
                if runs[j].conclusion == "success":
                    recovery_time = runs[j].run_completed_at or runs[j].run_started_at
                    if failure_time and recovery_time:
                        ft = failure_time
                        rt = recovery_time
                        if ft.tzinfo is None:
                            ft = ft.replace(tzinfo=timezone.utc)
                        if rt.tzinfo is None:
                            rt = rt.replace(tzinfo=timezone.utc)
                        hours = (rt - ft).total_seconds() / 3600
                        if hours >= 0:
                            recovery_times.append(hours)
                    i = j
                    break
        i += 1

    if not recovery_times:
        return 0.0

    avg_mttr = sum(recovery_times) / len(recovery_times)
    logger.info(f"MTTR: avg {avg_mttr:.1f} hours across {len(recovery_times)} incidents")
    return round(avg_mttr, 2)


def calculate_dora_metrics(
    db: Session,
    repo_full_name: str,
    period_days: int = 90
) -> DORAMetrics:
    repo = db.query(Repository).filter_by(full_name=repo_full_name).first()
    if not repo:
        raise ValueError(f"Repository {repo_full_name} not found in database")

    since = datetime.now(timezone.utc) - timedelta(days=period_days)

    deployment_frequency = calculate_deployment_frequency(db, repo.id, since)
    lead_time_hours = calculate_lead_time(db, repo.id, since)
    change_failure_rate = calculate_change_failure_rate(db, repo.id, since)
    mttr_hours = calculate_mttr(db, repo.id, since)

    return DORAMetrics(
        repo_full_name=repo_full_name,
        period_days=period_days,
        deployment_frequency=deployment_frequency,
        deployment_frequency_label=get_deployment_frequency_label(deployment_frequency),
        lead_time_hours=lead_time_hours,
        lead_time_label=get_lead_time_label(lead_time_hours),
        change_failure_rate=change_failure_rate,
        change_failure_rate_label=get_change_failure_rate_label(change_failure_rate),
        mttr_hours=mttr_hours,
        mttr_label=get_mttr_label(mttr_hours),
        calculated_at=datetime.now(timezone.utc)
    )