from sqlalchemy import (
    Column, Integer, BigInteger, String, Text,
    Boolean, Float, DateTime, Date, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from database import Base

class Repository(Base):
    __tablename__ = "repositories"

    id = Column(Integer, primary_key=True)
    github_id = Column(BigInteger, unique=True, nullable=False)
    owner = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    full_name = Column(String(255), unique=True, nullable=False)
    description = Column(Text)
    default_branch = Column(String(100), default="main")
    created_at = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True))

    pull_requests = relationship("PullRequest", back_populates="repository")
    commits = relationship("Commit", back_populates="repository")
    workflow_runs = relationship("WorkflowRun", back_populates="repository")


class PullRequest(Base):
    __tablename__ = "pull_requests"

    id = Column(Integer, primary_key=True)
    github_id = Column(BigInteger, unique=True, nullable=False)
    repo_id = Column(Integer, ForeignKey("repositories.id"), nullable=False)
    number = Column(Integer, nullable=False)
    title = Column(Text, nullable=False)
    state = Column(String(50), nullable=False)
    author = Column(String(255), nullable=False)
    base_branch = Column(String(255), nullable=False)
    head_branch = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True))
    merged_at = Column(DateTime(timezone=True))
    closed_at = Column(DateTime(timezone=True))
    additions = Column(Integer, default=0)
    deletions = Column(Integer, default=0)
    changed_files = Column(Integer, default=0)
    commits_count = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    review_comments_count = Column(Integer, default=0)
    labels = Column(JSON, default=list)
    is_draft = Column(Boolean, default=False)
    merged_by = Column(String(255))

    repository = relationship("Repository", back_populates="pull_requests")
    reviews = relationship("PRReview", back_populates="pull_request")
    commits = relationship("Commit", back_populates="pull_request")
    workflow_runs = relationship("WorkflowRun", back_populates="pull_request")


class PRReview(Base):
    __tablename__ = "pr_reviews"

    id = Column(Integer, primary_key=True)
    github_id = Column(BigInteger, unique=True, nullable=False)
    pr_id = Column(Integer, ForeignKey("pull_requests.id"), nullable=False)
    reviewer = Column(String(255), nullable=False)
    state = Column(String(50), nullable=False)
    submitted_at = Column(DateTime(timezone=True))
    body = Column(Text)

    pull_request = relationship("PullRequest", back_populates="reviews")


class Commit(Base):
    __tablename__ = "commits"

    id = Column(Integer, primary_key=True)
    sha = Column(String(40), unique=True, nullable=False)
    repo_id = Column(Integer, ForeignKey("repositories.id"), nullable=False)
    pr_id = Column(Integer, ForeignKey("pull_requests.id"), nullable=True)
    author = Column(String(255))
    committer = Column(String(255))
    message = Column(Text)
    additions = Column(Integer, default=0)
    deletions = Column(Integer, default=0)
    changed_files = Column(Integer, default=0)
    committed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True))

    repository = relationship("Repository", back_populates="commits")
    pull_request = relationship("PullRequest", back_populates="commits")


class WorkflowRun(Base):
    __tablename__ = "workflow_runs"

    id = Column(Integer, primary_key=True)
    github_id = Column(BigInteger, unique=True, nullable=False)
    repo_id = Column(Integer, ForeignKey("repositories.id"), nullable=False)
    pr_id = Column(Integer, ForeignKey("pull_requests.id"), nullable=True)
    name = Column(String(255))
    event = Column(String(100))
    status = Column(String(50))
    conclusion = Column(String(50))
    head_branch = Column(String(255))
    head_sha = Column(String(40))
    run_number = Column(Integer)
    run_started_at = Column(DateTime(timezone=True))
    run_completed_at = Column(DateTime(timezone=True))
    duration_seconds = Column(Integer)
    created_at = Column(DateTime(timezone=True))

    repository = relationship("Repository", back_populates="workflow_runs")
    pull_request = relationship("PullRequest", back_populates="workflow_runs")


class ContributorDailyStat(Base):
    __tablename__ = "contributor_daily_stats"

    id = Column(Integer, primary_key=True)
    username = Column(String(255), nullable=False)
    repo_id = Column(Integer, ForeignKey("repositories.id"), nullable=False)
    date = Column(Date, nullable=False)
    commits_count = Column(Integer, default=0)
    prs_opened = Column(Integer, default=0)
    prs_merged = Column(Integer, default=0)
    reviews_given = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    additions = Column(Integer, default=0)
    deletions = Column(Integer, default=0)


class DoraSnapshot(Base):
    __tablename__ = "dora_snapshots"

    id = Column(Integer, primary_key=True)
    repo_id = Column(Integer, ForeignKey("repositories.id"), nullable=False)
    snapshot_date = Column(Date, nullable=False)
    deployment_frequency = Column(Float)
    lead_time_hours = Column(Float)
    change_failure_rate = Column(Float)
    mttr_hours = Column(Float)
    pr_cycle_time_hours = Column(Float)
    created_at = Column(DateTime(timezone=True))