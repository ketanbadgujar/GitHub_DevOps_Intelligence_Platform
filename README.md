# GitHub DevOps Intelligence Platform

A real-time DevOps analytics platform that connects to GitHub repositories,
tracks engineering metrics, and uses ML to predict pipeline failures and
contributor burnout.

## What it does

- Collects real PR, commit, and CI data from any GitHub repo via GitHub API
- Calculates DORA metrics (Deployment Frequency, Lead Time, Change Failure Rate, MTTR)
- ML models predict PR pipeline failure risk and contributor burnout
- Alerts via Slack when anomalies are detected
- Deployed on AWS/GCP with Docker and CI/CD

## Tech stack

- Python 3.12, FastAPI, SQLAlchemy
- PostgreSQL, Redis
- XGBoost, scikit-learn, pandas
- Docker, GitHub Actions
- AWS/GCP, Terraform

## Project phases

- [x] Phase 1 — Data collection (GitHub API + PostgreSQL)
- [ ] Phase 2 — DORA Metrics Engine
- [ ] Phase 3 — ML Models
- [ ] Phase 4 — API & Alerting
- [ ] Phase 5 — Cloud Deployment & CI/CD

## Setup

See setup instructions in the docs folder (coming soon).
