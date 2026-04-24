from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from loguru import logger
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'collector'))

from database import SessionLocal
from models import Repository, PullRequest, WorkflowRun, ContributorDailyStat
from sqlalchemy import func

router = APIRouter(prefix="/repos", tags=["repositories"])


class RepoSummary(BaseModel):
    id: int
    full_name: str
    owner: str
    name: str
    description: str | None
    default_branch: str
    total_prs: int
    total_workflow_runs: int
    total_contributors: int


@router.get("", response_model=list[RepoSummary])
async def list_repositories():
    db = SessionLocal()
    try:
        repos = db.query(Repository).all()
        result = []
        for repo in repos:
            total_prs = db.query(func.count(PullRequest.id)).filter_by(
                repo_id=repo.id
            ).scalar() or 0

            total_runs = db.query(func.count(WorkflowRun.id)).filter_by(
                repo_id=repo.id
            ).scalar() or 0

            total_contributors = db.query(
                func.count(func.distinct(ContributorDailyStat.username))
            ).filter_by(repo_id=repo.id).scalar() or 0

            result.append(RepoSummary(
                id=repo.id,
                full_name=repo.full_name,
                owner=repo.owner,
                name=repo.name,
                description=repo.description,
                default_branch=repo.default_branch,
                total_prs=total_prs,
                total_workflow_runs=total_runs,
                total_contributors=total_contributors
            ))

        return result
    finally:
        db.close()


@router.get("/{owner}/{repo_name}")
async def get_repository(owner: str, repo_name: str):
    db = SessionLocal()
    try:
        full_name = f"{owner}/{repo_name}"
        repo = db.query(Repository).filter_by(full_name=full_name).first()
        if not repo:
            raise HTTPException(
                status_code=404,
                detail=f"Repository {full_name} not found"
            )

        total_prs = db.query(func.count(PullRequest.id)).filter_by(
            repo_id=repo.id
        ).scalar() or 0

        merged_prs = db.query(func.count(PullRequest.id)).filter(
            PullRequest.repo_id == repo.id,
            PullRequest.merged_at.isnot(None)
        ).scalar() or 0

        open_prs = db.query(func.count(PullRequest.id)).filter(
            PullRequest.repo_id == repo.id,
            PullRequest.state == "open"
        ).scalar() or 0

        total_runs = db.query(func.count(WorkflowRun.id)).filter_by(
            repo_id=repo.id
        ).scalar() or 0

        failed_runs = db.query(func.count(WorkflowRun.id)).filter(
            WorkflowRun.repo_id == repo.id,
            WorkflowRun.conclusion == "failure"
        ).scalar() or 0

        top_contributors = db.query(
            PullRequest.author,
            func.count(PullRequest.id).label("pr_count")
        ).filter_by(repo_id=repo.id).group_by(
            PullRequest.author
        ).order_by(func.count(PullRequest.id).desc()).limit(5).all()

        return {
            "id": repo.id,
            "full_name": repo.full_name,
            "owner": repo.owner,
            "name": repo.name,
            "description": repo.description,
            "default_branch": repo.default_branch,
            "stats": {
                "total_prs": total_prs,
                "merged_prs": merged_prs,
                "open_prs": open_prs,
                "total_workflow_runs": total_runs,
                "failed_workflow_runs": failed_runs,
                "failure_rate": round(
                    failed_runs / total_runs if total_runs > 0 else 0, 4
                )
            },
            "top_contributors": [
                {"username": r.author, "pr_count": r.pr_count}
                for r in top_contributors
            ]
        }
    finally:
        db.close()
    