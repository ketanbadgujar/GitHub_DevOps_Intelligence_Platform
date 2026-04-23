import httpx
import asyncio
import os
from loguru import logger
from tenacity import retry, stop_after_attempt, wait_exponential
from dotenv import load_dotenv

load_dotenv()

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
BASE_URL = "https://api.github.com"
HEADERS = {
    "Authorization": f"Bearer {GITHUB_TOKEN}",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
}

class GitHubClient:
    def __init__(self):
        self.client = httpx.AsyncClient(
            headers=HEADERS,
            timeout=30.0,
            limits=httpx.Limits(max_connections=10)
        )

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        await self.client.aclose()

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    async def _get(self, url: str, params: dict = None) -> dict:
        response = await self.client.get(url, params=params)

        if response.status_code == 403:
            reset_time = int(response.headers.get("X-RateLimit-Reset", 0))
            logger.warning(f"Rate limited. Resets at {reset_time}")
            await asyncio.sleep(60)
            raise Exception("Rate limited")

        if response.status_code == 404:
            logger.error(f"Not found: {url}")
            return {}

        response.raise_for_status()

        remaining = response.headers.get("X-RateLimit-Remaining", "?")
        logger.debug(f"Rate limit remaining: {remaining}")

        return response.json()

    async def _paginate(self, url: str, params: dict = None, max_pages: int = 10) -> list:
        results = []
        page = 1
        params = params or {}

        while page <= max_pages:
            params["page"] = page
            params["per_page"] = 100
            data = await self._get(url, params)

            if not data:
                break

            if isinstance(data, list):
                results.extend(data)
                if len(data) < 100:
                    break
            else:
                results.append(data)
                break

            page += 1
            await asyncio.sleep(0.5)

        return results

    async def get_repository(self, owner: str, repo: str) -> dict:
        url = f"{BASE_URL}/repos/{owner}/{repo}"
        logger.info(f"Fetching repository: {owner}/{repo}")
        return await self._get(url)

    async def get_pull_requests(self, owner: str, repo: str,
                                 state: str = "all", max_pages: int = 10) -> list:
        url = f"{BASE_URL}/repos/{owner}/{repo}/pulls"
        logger.info(f"Fetching PRs for {owner}/{repo} (state={state})")
        return await self._paginate(url, {"state": state}, max_pages)

    async def get_pr_reviews(self, owner: str, repo: str, pr_number: int) -> list:
        url = f"{BASE_URL}/repos/{owner}/{repo}/pulls/{pr_number}/reviews"
        return await self._paginate(url)

    async def get_pr_commits(self, owner: str, repo: str, pr_number: int) -> list:
        url = f"{BASE_URL}/repos/{owner}/{repo}/pulls/{pr_number}/commits"
        return await self._paginate(url)

    async def get_commits(self, owner: str, repo: str,
                          since: str = None, max_pages: int = 5) -> list:
        url = f"{BASE_URL}/repos/{owner}/{repo}/commits"
        params = {}
        if since:
            params["since"] = since
        logger.info(f"Fetching commits for {owner}/{repo}")
        return await self._paginate(url, params, max_pages)

    async def get_workflow_runs(self, owner: str, repo: str,
                                max_pages: int = 5) -> list:
        url = f"{BASE_URL}/repos/{owner}/{repo}/actions/runs"
        logger.info(f"Fetching workflow runs for {owner}/{repo}")
        results = []
        page = 1

        while page <= max_pages:
            params = {"page": page, "per_page": 100}
            data = await self._get(url, params)

            if not data or "workflow_runs" not in data:
                break

            runs = data["workflow_runs"]
            results.extend(runs)

            if len(runs) < 100:
                break

            page += 1
            await asyncio.sleep(0.5)

        return results

    async def check_rate_limit(self) -> dict:
        url = f"{BASE_URL}/rate_limit"
        data = await self._get(url)
        core = data.get("resources", {}).get("core", {})
        logger.info(
            f"Rate limit — remaining: {core.get('remaining')}, "
            f"limit: {core.get('limit')}"
        )
        return core
    
