from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import and_
from loguru import logger
import numpy as np
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'collector'))

from models import PullRequest, Repository
from schemas import PRCycleTime


def calculate_cycle_time(
    db: Session,
    repo_full_name: str,
    period_days: int = 90
) -> PRCycleTime:
    repo = db.query(Repository).filter_by(full_name=repo_full_name).first()
    if not repo:
        raise ValueError(f"Repository {repo_full_name} not found in database")

    since = datetime.now(timezone.utc) - timedelta(days=period_days)

    prs = db.query(PullRequest).filter(
        and_(
            PullRequest.repo_id == repo.id,
            PullRequest.merged_at >= since,
            PullRequest.merged_at.isnot(None),
            PullRequest.base_branch.in_(["main", "master"])
        )
    ).all()

    if not prs:
        logger.warning(f"No merged PRs found for {repo_full_name} in last {period_days} days")
        return PRCycleTime(
            repo_full_name=repo_full_name,
            period_days=period_days,
            avg_cycle_time_hours=0.0,
            median_cycle_time_hours=0.0,
            p75_cycle_time_hours=0.0,
            p95_cycle_time_hours=0.0,
            total_prs_merged=0,
            calculated_at=datetime.now(timezone.utc)
        )

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
        return PRCycleTime(
            repo_full_name=repo_full_name,
            period_days=period_days,
            avg_cycle_time_hours=0.0,
            median_cycle_time_hours=0.0,
            p75_cycle_time_hours=0.0,
            p95_cycle_time_hours=0.0,
            total_prs_merged=len(prs),
            calculated_at=datetime.now(timezone.utc)
        )

    durations_arr = np.array(durations)

    avg = float(np.mean(durations_arr))
    median = float(np.median(durations_arr))
    p75 = float(np.percentile(durations_arr, 75))
    p95 = float(np.percentile(durations_arr, 95))

    logger.info(
        f"Cycle time for {repo_full_name}: "
        f"avg={avg:.1f}h, median={median:.1f}h, "
        f"p75={p75:.1f}h, p95={p95:.1f}h "
        f"({len(durations)} PRs)"
    )

    return PRCycleTime(
        repo_full_name=repo_full_name,
        period_days=period_days,
        avg_cycle_time_hours=round(avg, 2),
        median_cycle_time_hours=round(median, 2),
        p75_cycle_time_hours=round(p75, 2),
        p95_cycle_time_hours=round(p95, 2),
        total_prs_merged=len(durations),
        calculated_at=datetime.now(timezone.utc)
    )