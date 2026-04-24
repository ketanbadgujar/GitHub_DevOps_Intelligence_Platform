import os
import httpx
from loguru import logger
from dotenv import load_dotenv

load_dotenv()

SLACK_BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN", "")
SLACK_CHANNEL_ID = os.getenv("SLACK_CHANNEL_ID", "")


class SlackClient:
    def __init__(self):
        self.token = SLACK_BOT_TOKEN
        self.channel = SLACK_CHANNEL_ID
        self.enabled = bool(self.token and self.channel)

        if not self.enabled:
            logger.warning(
                "Slack not configured — alerts will be logged only. "
                "Set SLACK_BOT_TOKEN and SLACK_CHANNEL_ID in .env to enable."
            )

    async def send_message(self, text: str, blocks: list = None) -> bool:
        if not self.enabled:
            logger.info(f"[SLACK ALERT - not sent] {text}")
            return False

        async with httpx.AsyncClient() as client:
            try:
                payload = {
                    "channel": self.channel,
                    "text": text,
                }
                if blocks:
                    payload["blocks"] = blocks

                response = await client.post(
                    "https://slack.com/api/chat.postMessage",
                    headers={
                        "Authorization": f"Bearer {self.token}",
                        "Content-Type": "application/json"
                    },
                    json=payload
                )
                data = response.json()
                if data.get("ok"):
                    logger.info("Slack message sent successfully")
                    return True
                else:
                    logger.error(f"Slack error: {data.get('error')}")
                    return False
            except Exception as e:
                logger.error(f"Failed to send Slack message: {e}")
                return False

    async def send_dora_alert(self, repo: str, metric: str,
                               value: float, threshold: str):
        text = f"DevOps Alert: {metric} issue detected for {repo}"
        blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"DevOps Alert — {repo}"
                }
            },
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": f"*Metric:*\n{metric}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Value:*\n{value}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Rating:*\n{threshold}"
                    }
                ]
            }
        ]
        return await self.send_message(text, blocks)

    async def send_burnout_alert(self, username: str,
                                  repo: str, score: float):
        text = f"Burnout Risk Alert: {username} flagged in {repo}"
        blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": "Contributor Burnout Risk Detected"
                }
            },
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": f"*Contributor:*\n{username}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Repository:*\n{repo}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Anomaly Score:*\n{score}"
                    }
                ]
            }
        ]
        return await self.send_message(text, blocks)

    async def send_pr_risk_alert(self, pr_number: int, title: str,
                                  author: str, repo: str,
                                  risk_score: float, risk_factors: list):
        text = f"High Risk PR Alert: PR #{pr_number} in {repo}"
        factors_text = "\n".join(f"• {f}" for f in risk_factors)
        blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"High Risk PR Detected — {repo}"
                }
            },
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": f"*PR:*\n#{pr_number} — {title[:50]}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Author:*\n{author}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Risk Score:*\n{risk_score}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Risk Factors:*\n{factors_text}"
                    }
                ]
            }
        ]
        return await self.send_message(text, blocks)
