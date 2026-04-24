import sys
import os
import asyncio
from datetime import datetime, timezone
from loguru import logger
from dotenv import load_dotenv
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import httpx

load_dotenv()

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'collector'))

from slack_client import SlackClient

API_GATEWAY_URL = os.getenv("API_GATEWAY_URL", "http://localhost:8000")
TARGET_REPO = os.getenv("GITHUB_TARGET_REPO", "fastapi/fastapi")

slack = SlackClient()
scheduler = AsyncIOScheduler()


async def fetch_json(url: str, params: dict = None) -> dict:
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to fetch {url}: {e}")
            return {}


async def check_dora_metrics():
    logger.info(f"Checking DORA metrics for {TARGET_REPO}")

    data = await fetch_json(
        f"{API_GATEWAY_URL}/metrics/dora",
        {"repo": TARGET_REPO, "days": 30}
    )

    if not data:
        return

    checks = [
        ("Change Failure Rate", data.get("change_failure_rate", 0),
         data.get("change_failure_rate_label", ""), ["Low", "Medium"]),
        ("Deployment Frequency", data.get("deployment_frequency", 0),
         data.get("deployment_frequency_label", ""), ["Low"]),
        ("Lead Time", data.get("lead_time_hours", 0),
         data.get("lead_time_label", ""), ["Low"]),
    ]

    for metric_name, value, label, alert_labels in checks:
        if label in alert_labels:
            logger.warning(f"DORA Alert: {metric_name} is {label} ({value})")
            await slack.send_dora_alert(TARGET_REPO, metric_name, value, label)


async def check_burnout():
    logger.info(f"Checking contributor burnout for {TARGET_REPO}")

    data = await fetch_json(
        f"{API_GATEWAY_URL}/ml/burnout",
        {"repo": TARGET_REPO}
    )

    if not data:
        return

    for contributor in data:
        if contributor.get("burnout_risk"):
            username = contributor["username"]
            score = contributor["anomaly_score"]
            logger.warning(f"Burnout Alert: {username} flagged (score: {score})")
            await slack.send_burnout_alert(username, TARGET_REPO, score)


async def check_pr_risk():
    logger.info(f"Checking PR risk for {TARGET_REPO}")

    data = await fetch_json(
        f"{API_GATEWAY_URL}/ml/pr-risk",
        {"repo": TARGET_REPO, "limit": 50}
    )

    if not data:
        return

    high_risk = [pr for pr in data if pr.get("risk_label") == "High Risk"]

    for pr in high_risk:
        logger.warning(
            f"High Risk PR: #{pr['pr_number']} by {pr['author']} "
            f"(score: {pr['risk_score']})"
        )
        await slack.send_pr_risk_alert(
            pr_number=pr["pr_number"],
            title=pr["title"],
            author=pr["author"],
            repo=TARGET_REPO,
            risk_score=pr["risk_score"],
            risk_factors=pr["risk_factors"]
        )


async def run_all_checks():
    logger.info("Running all alerting checks")
    await check_dora_metrics()
    await check_burnout()
    await check_pr_risk()
    logger.info("All checks complete")


async def main():
    logger.info("Alerting service starting")
    logger.info(f"Monitoring: {TARGET_REPO}")
    logger.info(f"Slack enabled: {slack.enabled}")

    await run_all_checks()

    scheduler.add_job(run_all_checks, "interval", hours=6, id="all_checks")
    scheduler.start()

    logger.info("Scheduler started — checks run every 6 hours")

    try:
        while True:
            await asyncio.sleep(60)
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown()
        logger.info("Alerting service stopped")


if __name__ == "__main__":
    asyncio.run(main())
