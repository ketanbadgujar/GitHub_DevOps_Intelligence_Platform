import asyncio
import os
import sys
from datetime import datetime, timezone
from loguru import logger
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert

load_dotenv()

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, test_connection
from models import (
    Repository, PullRequest, PRReview,
    Commit, WorkflowRun, ContributorDailyStat
)
from github_client import GitHubClient


def parse_datetime(dt_str: str):
    if not dt_str:
        return None
    try:
        return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
    except Exception:
        return None


def upsert_repository(db: Session, repo_data: dict) -> Repository:
    existing = db.query(Repository).filter_by(
        github_id=repo_data["id"]
    ).first()

    if existing:
        existing.description = repo_data.get("description")
        existing.updated_at = parse_datetime(repo_data.get("updated_at"))
        db.commit()
        return existing

    repo = Repository(
        github_id=repo_data["id"],
        owner=repo_data["owner"]["login"],
        name=repo_data["name"],
        full_name=repo_data["full_name"],
        description=repo_data.get("description"),
        default_branch=repo_data.get("default_branch", "main"),
        created_at=parse_datetime(repo_data.get("created_at")),
        updated_at=parse_datetime(repo_data.get("updated_at")),
    )
    db.add(repo)
    db.commit()
    db.refresh(repo)
    logger.info(f"Saved repository: {repo.full_name}")
    return repo


def upsert_pull_request(db: Session, pr_data: dict, repo_id: int) -> PullRequest:
    existing = db.query(PullRequest).filter_by(
        github_id=pr_data["id"]
    ).first()

    values = dict(
        repo_id=repo_id,
        number=pr_data["number"],
        title=pr_data["title"],
        state=pr_data["state"],
        author=pr_data["user"]["login"],
        base_branch=pr_data["base"]["ref"],
        head_branch=pr_data["head"]["ref"],
        created_at=parse_datetime(pr_data.get("created_at")),
        updated_at=parse_datetime(pr_data.get("updated_at")),
        merged_at=parse_datetime(pr_data.get("merged_at")),
        closed_at=parse_datetime(pr_data.get("closed_at")),
        additions=pr_data.get("additions", 0),
        deletions=pr_data.get("deletions", 0),
        changed_files=pr_data.get("changed_files", 0),
        commits_count=pr_data.get("commits", 0),
        comments_count=pr_data.get("comments", 0),
        review_comments_count=pr_data.get("review_comments", 0),
        labels=[l["name"] for l in pr_data.get("labels", [])],
        is_draft=pr_data.get("draft", False),
        merged_by=pr_data.get("merged_by", {}).get("login") if pr_data.get("merged_by") else None,
    )

    if existing:
        for key, value in values.items():
            setattr(existing, key, value)
        db.commit()
        return existing

    pr = PullRequest(github_id=pr_data["id"], **values)
    db.add(pr)
    db.commit()
    db.refresh(pr)
    return pr


def upsert_reviews(db: Session, reviews: list, pr_id: int):
    for review in reviews:
        if not review.get("id"):
            continue
        existing = db.query(PRReview).filter_by(
            github_id=review["id"]
        ).first()
        if existing:
            continue
        r = PRReview(
            github_id=review["id"],
            pr_id=pr_id,
            reviewer=review["user"]["login"],
            state=review["state"],
            submitted_at=parse_datetime(review.get("submitted_at")),
            body=review.get("body", ""),
        )
        db.add(r)
    db.commit()


def upsert_workflow_runs(db: Session, runs: list, repo_id: int):
    new_count = 0
    for run in runs:
        existing = db.query(WorkflowRun).filter_by(
            github_id=run["id"]
        ).first()
        if existing:
            continue

        started = parse_datetime(run.get("run_started_at"))
        completed = parse_datetime(run.get("updated_at"))
        duration = None
        if started and completed:
            duration = int((completed - started).total_seconds())

        w = WorkflowRun(
            github_id=run["id"],
            repo_id=repo_id,
            name=run.get("name"),
            event=run.get("event"),
            status=run.get("status"),
            conclusion=run.get("conclusion"),
            head_branch=run.get("head_branch"),
            head_sha=run.get("head_sha"),
            run_number=run.get("run_number"),
            run_started_at=started,
            run_completed_at=completed,
            duration_seconds=duration,
            created_at=parse_datetime(run.get("created_at")),
        )
        db.add(w)
        new_count += 1

    db.commit()
    logger.info(f"Saved {new_count} new workflow runs")


def update_contributor_stats(db: Session, pr_data: dict, repo_id: int):
    author = pr_data["user"]["login"]
    created_date = parse_datetime(pr_data.get("created_at"))
    if not created_date:
        return

    date = created_date.date()
    stat = db.query(ContributorDailyStat).filter_by(
        username=author,
        repo_id=repo_id,
        date=date
    ).first()

    if not stat:
        stat = ContributorDailyStat(
            username=author,
            repo_id=repo_id,
            date=date
        )
        db.add(stat)

    stat.prs_opened = (stat.prs_opened or 0) + 1

    if pr_data.get("merged_at"):
        stat.prs_merged = (stat.prs_merged or 0) + 1

    stat.additions = (stat.additions or 0) + pr_data.get("additions", 0)
    stat.deletions = (stat.deletions or 0) + pr_data.get("deletions", 0)

    db.commit()


async def collect_repository(owner: str, repo_name: str, max_pr_pages: int = 3):
    logger.info(f"Starting collection for {owner}/{repo_name}")
    db = SessionLocal()

    try:
        async with GitHubClient() as client:
            # 1. Check rate limit first
            rate = await client.check_rate_limit()
            if int(rate.get("remaining", 0)) < 100:
                logger.warning("Rate limit too low, aborting collection")
                return

            # 2. Fetch and save repository
            repo_data = await client.get_repository(owner, repo_name)
            if not repo_data:
                logger.error(f"Repository {owner}/{repo_name} not found")
                return

            repo = upsert_repository(db, repo_data)
            logger.info(f"Repository ID in DB: {repo.id}")

            # 3. Fetch and save pull requests
            logger.info("Fetching pull requests...")
            prs = await client.get_pull_requests(
                owner, repo_name,
                state="all",
                max_pages=max_pr_pages
            )
            logger.info(f"Fetched {len(prs)} pull requests")

            pr_count = 0
            for pr_data in prs:
                pr = upsert_pull_request(db, pr_data, repo.id)
                update_contributor_stats(db, pr_data, repo.id)

                # Fetch reviews for each PR (throttled)
                reviews = await client.get_pr_reviews(owner, repo_name, pr_data["number"])
                if reviews:
                    upsert_reviews(db, reviews, pr.id)

                pr_count += 1
                if pr_count % 10 == 0:
                    logger.info(f"Processed {pr_count}/{len(prs)} PRs")

                await asyncio.sleep(0.3)

            logger.info(f"Saved {pr_count} pull requests")

            # 4. Fetch and save workflow runs
            logger.info("Fetching workflow runs...")
            runs = await client.get_workflow_runs(owner, repo_name, max_pages=3)
            upsert_workflow_runs(db, runs, repo.id)

            logger.info(f"Collection complete for {owner}/{repo_name}")
            return repo.id

    except Exception as e:
        logger.error(f"Collection failed: {e}")
        raise
    finally:
        db.close()


async def main():
    logger.info("DevOps Platform — Collector Service starting")

    if not test_connection():
        logger.error("Cannot connect to database. Is Docker running?")
        return

    target_repo = os.getenv("GITHUB_TARGET_REPO", "torvalds/linux")
    owner, repo_name = target_repo.split("/")

    await collect_repository(owner, repo_name, max_pr_pages=3)

    # Quick summary
    db = SessionLocal()
    try:
        pr_count = db.query(PullRequest).count()
        review_count = db.query(PRReview).count()
        run_count = db.query(WorkflowRun).count()
        contributor_count = db.query(ContributorDailyStat).count()

        logger.info("=" * 50)
        logger.info("Collection Summary")
        logger.info("=" * 50)
        logger.info(f"Pull requests:       {pr_count}")
        logger.info(f"Reviews:             {review_count}")
        logger.info(f"Workflow runs:       {run_count}")
        logger.info(f"Contributor records: {contributor_count}")
        logger.info("=" * 50)
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(main())

    