import pandas as pd
import numpy as np
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from loguru import logger
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'collector'))

from models import PullRequest, WorkflowRun, PRReview, Repository, ContributorDailyStat


def extract_pr_features(db: Session, repo_full_name: str) -> pd.DataFrame:
    repo = db.query(Repository).filter_by(full_name=repo_full_name).first()
    if not repo:
        raise ValueError(f"Repository {repo_full_name} not found")

    prs = db.query(PullRequest).filter_by(repo_id=repo.id).all()
    if not prs:
        raise ValueError("No pull requests found")

    runs = db.query(WorkflowRun).filter_by(repo_id=repo.id).all()
    run_map = {}
    for run in runs:
        if run.head_sha:
            if run.head_sha not in run_map:
                run_map[run.head_sha] = []
            run_map[run.head_sha].append(run)

    author_stats = {}
    for pr in prs:
        author = pr.author
        if author not in author_stats:
            author_stats[author] = {
                "total_prs": 0,
                "merged_prs": 0,
                "total_additions": 0,
                "total_deletions": 0
            }
        author_stats[author]["total_prs"] += 1
        if pr.merged_at:
            author_stats[author]["merged_prs"] += 1
        author_stats[author]["total_additions"] += pr.additions or 0
        author_stats[author]["total_deletions"] += pr.deletions or 0

    records = []
    for pr in prs:
        created = pr.created_at
        if created and created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)

        merged = pr.merged_at
        if merged and merged.tzinfo is None:
            merged = merged.replace(tzinfo=timezone.utc)

        author = pr.author
        stats = author_stats.get(author, {})
        total_prs = stats.get("total_prs", 1)
        merge_rate = stats.get("merged_prs", 0) / max(total_prs, 1)

        reviews = db.query(PRReview).filter_by(pr_id=pr.id).all()
        review_count = len(reviews)
        approved_count = sum(1 for r in reviews if r.state == "APPROVED")
        changes_requested = sum(1 for r in reviews if r.state == "CHANGES_REQUESTED")

        has_failed_run = 0
        if pr.merged_at:
            pr_runs = []
            for run in runs:
                if (run.head_branch == pr.head_branch and
                    run.run_started_at and pr.created_at):
                    rs = run.run_started_at
                    pc = pr.created_at
                    if rs.tzinfo is None:
                        rs = rs.replace(tzinfo=timezone.utc)
                    if pc.tzinfo is None:
                        pc = pc.replace(tzinfo=timezone.utc)
                    if pc <= rs <= (merged or pc + timedelta(days=7)):
                        pr_runs.append(run)

            if pr_runs:
                has_failed_run = int(any(
                    r.conclusion in ["failure", "timed_out"]
                    for r in pr_runs
                ))

        cycle_hours = 0.0
        if created and merged:
            cycle_hours = (merged - created).total_seconds() / 3600

        record = {
            "pr_number": pr.number,
            "title": pr.title,
            "author": author,
            "additions": pr.additions or 0,
            "deletions": pr.deletions or 0,
            "changed_files": pr.changed_files or 0,
            "commits_count": pr.commits_count or 0,
            "comments_count": pr.comments_count or 0,
            "review_comments_count": pr.review_comments_count or 0,
            "is_draft": int(pr.is_draft or False),
            "hour_of_day": created.hour if created else 12,
            "day_of_week": created.weekday() if created else 0,
            "is_weekend": int(created.weekday() >= 5) if created else 0,
            "author_total_prs": total_prs,
            "author_merge_rate": round(merge_rate, 3),
            "author_avg_additions": stats.get("total_additions", 0) / max(total_prs, 1),
            "review_count": review_count,
            "approved_count": approved_count,
            "changes_requested_count": changes_requested,
            "label_count": len(pr.labels) if pr.labels else 0,
            "cycle_hours": round(cycle_hours, 2),
            "has_failed_run": has_failed_run,
        }
        records.append(record)

    df = pd.DataFrame(records)
    logger.info(f"Extracted {len(df)} PR feature records for {repo_full_name}")
    return df


def extract_contributor_features(db: Session, repo_full_name: str) -> pd.DataFrame:
    repo = db.query(Repository).filter_by(full_name=repo_full_name).first()
    if not repo:
        raise ValueError(f"Repository {repo_full_name} not found")

    stats = db.query(ContributorDailyStat).filter_by(repo_id=repo.id).all()
    if not stats:
        raise ValueError("No contributor stats found")

    records = []
    for s in stats:
        records.append({
            "username": s.username,
            "date": s.date,
            "commits_count": s.commits_count or 0,
            "prs_opened": s.prs_opened or 0,
            "prs_merged": s.prs_merged or 0,
            "reviews_given": s.reviews_given or 0,
            "comments_count": s.comments_count or 0,
            "additions": s.additions or 0,
            "deletions": s.deletions or 0,
        })

    df = pd.DataFrame(records)
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(["username", "date"])

    df["week"] = df["date"].dt.to_period("W")
    weekly = df.groupby(["username", "week"]).agg(
        weekly_prs=("prs_opened", "sum"),
        weekly_merges=("prs_merged", "sum"),
        weekly_reviews=("reviews_given", "sum"),
        weekly_commits=("commits_count", "sum"),
        weekly_additions=("additions", "sum"),
        weekly_deletions=("deletions", "sum"),
        active_days=("date", "count")
    ).reset_index()

    contributor_features = []
    cutoff = pd.Timestamp.now() - pd.Timedelta(weeks=4)

    for username in weekly["username"].unique():
        user_data = weekly[weekly["username"] == username].copy()
        user_data["week_ts"] = user_data["week"].dt.start_time

        historical = user_data[user_data["week_ts"] < cutoff]
        recent = user_data[user_data["week_ts"] >= cutoff]

        if len(historical) < 2:
            continue

        contributor_features.append({
            "username": username,
            "avg_weekly_prs": historical["weekly_prs"].mean(),
            "std_weekly_prs": historical["weekly_prs"].std() or 0,
            "recent_weekly_prs": recent["weekly_prs"].mean() if len(recent) > 0 else 0,
            "avg_weekly_reviews": historical["weekly_reviews"].mean(),
            "std_weekly_reviews": historical["weekly_reviews"].std() or 0,
            "recent_weekly_reviews": recent["weekly_reviews"].mean() if len(recent) > 0 else 0,
            "avg_weekly_commits": historical["weekly_commits"].mean(),
            "recent_weekly_commits": recent["weekly_commits"].mean() if len(recent) > 0 else 0,
            "avg_active_days": historical["active_days"].mean(),
            "recent_active_days": recent["active_days"].mean() if len(recent) > 0 else 0,
            "total_weeks_active": len(user_data),
        })

    df_features = pd.DataFrame(contributor_features)
    logger.info(f"Extracted features for {len(df_features)} contributors")
    return df_features
