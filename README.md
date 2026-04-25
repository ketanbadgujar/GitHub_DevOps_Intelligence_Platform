# 🚀 GitHub DevOps Intelligence Platform

> **Real-time DevOps analytics powered by machine learning.**
> Track DORA metrics, predict PR risk with XGBoost, and detect contributor burnout with Isolation Forest — all in one beautiful dashboard.

<div align="center">

![Dashboard Preview](https://img.shields.io/badge/Dashboard-Live-22d3ee?style=for-the-badge&logo=react)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql)

</div>

---

## 🧠 What is this?

Most engineering teams fly blind. They ship code, hope for the best, and only find out something's wrong when production is on fire or a burnt-out engineer quits.

This platform changes that.

It continuously collects data from the GitHub API, computes the **four DORA metrics** that elite engineering teams use to benchmark themselves, runs **XGBoost** to score every open PR by merge risk, and applies **Isolation Forest** anomaly detection to flag contributors showing burnout patterns — before it becomes a problem.

Everything surfaces in a real-time React dashboard that's dark, fast, and actually useful.

---

## ✨ Features

### 📊 DORA Metrics (Google's DevOps Benchmarks)
The four metrics that separate elite teams from everyone else, computed continuously from your GitHub data:

| Metric | What it measures | Elite benchmark |
|--------|-----------------|-----------------|
| **Deployment Frequency** | How often you ship | Multiple times/day |
| **Lead Time for Changes** | Commit → production | Less than 1 hour |
| **Change Failure Rate** | % of deploys that break things | Less than 5% |
| **Mean Time to Restore** | How fast you recover | Less than 1 hour |

### 🤖 PR Risk Scoring (XGBoost)
Every open pull request gets a risk score from 0–100%. The model looks at file count, lines changed, author history, review coverage, time open, and more. Catch the dangerous ones before they merge.

### 🔥 Contributor Burnout Detection (Isolation Forest)
Isolation Forest anomaly detection flags contributors whose commit patterns have drifted into dangerous territory — late-night commits, weekend work spikes, review overload. Catch burnout before someone quits.

### 🎛️ Real-time Dashboard
A React + Recharts dashboard with:
- DORA metric cards with performance band classification
- 14-day trend charts for all four metrics
- Sortable, filterable PR risk table
- Contributor health cards with radar charts and action recommendations
- Platform health view with service status

### 🔔 Slack Alerting
Automatic Slack notifications when risk scores cross thresholds — high-risk PRs, burnout detection, DORA metric degradation.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        GitHub API                           │
└─────────────────────┬───────────────────────────────────────┘
                      │ collects repos, PRs, commits, workflows
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   Data Collector                            │
│              (Phase 1 — Python worker)                      │
└─────────────────────┬───────────────────────────────────────┘
                      │ stores raw data
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL :5432                         │
└──────┬──────────────────────────────────┬───────────────────┘
       │                                  │
       ▼                                  ▼
┌──────────────┐                 ┌────────────────┐
│ DORA Service │                 │   ML Service   │
│   :8002      │                 │    :8003       │
│              │                 │                │
│ Deployment   │                 │ XGBoost        │
│ Frequency    │                 │ PR Risk        │
│ Lead Time    │                 │                │
│ CFR / MTTR   │                 │ Isolation      │
│              │                 │ Forest Burnout │
└──────┬───────┘                 └───────┬────────┘
       │                                 │
       └──────────────┬──────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Gateway :8000                         │
│              FastAPI + Swagger UI                           │
│         + Slack alerting integration                        │
└─────────────────────┬───────────────────────────────────────┘
                      │ REST API + Nginx proxy
                      ▼
┌─────────────────────────────────────────────────────────────┐
│               React Dashboard :3000                         │
│    Overview · DORA · PR Risk · Burnout · Platform           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Project Structure

```
github-devops-platform/
│
├── services/
│   ├── collector/          # Phase 1 — GitHub API data ingestion
│   ├── metrics/            # Phase 2 — DORA metrics FastAPI service
│   ├── ml/                 # Phase 3 — XGBoost + Isolation Forest
│   ├── api/                # Phase 4 — API gateway + Slack alerting
│   └── alerting/           # Phase 4 — Alert scheduler
│
├── devops-dashboard/       # Phase 6 — React frontend
│   ├── src/
│   │   ├── pages/          # Overview, DORA, PR Risk, Burnout, Platform
│   │   ├── components/     # UI primitives (cards, charts, badges)
│   │   ├── services/       # API client layer
│   │   ├── hooks/          # useData fetch hook
│   │   └── utils/          # DORA classifiers, formatters
│   ├── Dockerfile          # Multi-stage: Node build → Nginx serve
│   └── nginx.conf          # SPA routing + API proxy
│
├── models/                 # Trained ML model artifacts
├── data/migrations/        # PostgreSQL schema
├── .github/workflows/      # Phase 5 — GitHub Actions CI/CD
└── docker-compose.yml      # Full stack orchestration
```

---

## ⚡ Quick Start

### Prerequisites
- Docker & Docker Compose
- GitHub Personal Access Token
- (Optional) Slack Bot Token for alerts

### 1. Clone the repo
```bash
git clone https://github.com/ketanbadgujar/GitHub_DevOps_Intelligence_Platform.git
cd GitHub_DevOps_Intelligence_Platform
```

### 2. Configure environment
```bash
cp .env.example .env
```

Edit `.env` with your values:
```env
POSTGRES_DB=devops_platform
POSTGRES_USER=devops_user
POSTGRES_PASSWORD=your_secure_password

GITHUB_TOKEN=ghp_your_github_token
GITHUB_TARGET_REPO=fastapi/fastapi

SLACK_BOT_TOKEN=xoxb-your-slack-token     # optional
SLACK_CHANNEL_ID=C0XXXXXXXXX              # optional
```

### 3. Launch everything
```bash
docker compose up --build
```

That's it. All 7 containers start, the collector pulls GitHub data, models train, and the dashboard is live.

### 4. Open the dashboard
```
http://localhost:3000
```

| Service | URL |
|---------|-----|
| 🎛️ Dashboard | http://localhost:3000 |
| 📡 API Gateway + Swagger | http://localhost:8000/docs |
| 📊 DORA Metrics API | http://localhost:8002/docs |
| 🤖 ML Service API | http://localhost:8003/docs |

---

## 📸 Dashboard Pages

### Overview
The command center. DORA metric cards with performance band classification, a 14-day deployment trend chart, and live feeds of high-risk PRs and burnout alerts.

### DORA Metrics
Deep dive into all four metrics with historical trend charts, period selector (7/14/30/60/90 days), and DORA Elite/High/Medium/Low band classification.

### PR Risk
Every open PR scored by XGBoost. Sortable table with risk progress bars, distribution chart, and filters by risk level. See at a glance which PRs need more review before merge.

### Contributor Health
Isolation Forest anomaly scores for every contributor. Click any card to open a radar chart breakdown of risk factors with specific action recommendations (from "schedule a 1:1" to "force-schedule time off").

### Platform Health
Live service status for all microservices, Docker Compose stack view, architecture diagram, and Slack alert history.

---

## 🔬 The ML Models

### XGBoost PR Risk Classifier
Trained on historical PR data. Features include:
- Number of files changed
- Lines added / deleted
- Number of reviewers
- Time open before merge
- Author's historical merge success rate
- PR complexity score

Outputs a risk score 0.0–1.0 with labels: LOW / MEDIUM / HIGH / CRITICAL

### Isolation Forest Burnout Detector
Unsupervised anomaly detection on contributor activity patterns. Features include:
- Weekly PR volume (historical vs recent)
- Review participation rate
- Commit timing patterns
- Weekend/off-hours activity

Flags contributors whose recent patterns are anomalous relative to their own baseline — not compared to some arbitrary threshold.

---

## 🔧 Development

### Run the dashboard in dev mode (hot reload)
```bash
cd devops-dashboard
npm install
npm run dev
# → http://localhost:3000
```

The Vite dev server proxies `/api` calls to `localhost:8000`. If the backend isn't running, the dashboard automatically shows mock data so you can develop the UI independently.

### Run individual services
```bash
# Just the backend stack (no dashboard)
docker compose up postgres redis metrics ml api alerting

# Just rebuild the dashboard
docker compose up --build dashboard
```

### API documentation
Every service has auto-generated Swagger UI. When the stack is running:
- Gateway: http://localhost:8000/docs
- DORA: http://localhost:8002/docs
- ML: http://localhost:8003/docs

---

<div align="center">

Built with 🔥 by [Ketan Badgujar](https://github.com/ketanbadgujar)

</div>
