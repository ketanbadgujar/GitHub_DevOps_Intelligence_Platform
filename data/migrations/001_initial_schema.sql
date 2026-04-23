-- Repositories table
CREATE TABLE IF NOT EXISTS repositories (
    id SERIAL PRIMARY KEY,
    github_id BIGINT UNIQUE NOT NULL,
    owner VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    default_branch VARCHAR(100) DEFAULT 'main',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pull requests table
CREATE TABLE IF NOT EXISTS pull_requests (
    id SERIAL PRIMARY KEY,
    github_id BIGINT UNIQUE NOT NULL,
    repo_id INTEGER REFERENCES repositories(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    title TEXT NOT NULL,
    state VARCHAR(50) NOT NULL,
    author VARCHAR(255) NOT NULL,
    base_branch VARCHAR(255) NOT NULL,
    head_branch VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    merged_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    additions INTEGER DEFAULT 0,
    deletions INTEGER DEFAULT 0,
    changed_files INTEGER DEFAULT 0,
    commits_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    review_comments_count INTEGER DEFAULT 0,
    labels JSONB DEFAULT '[]',
    is_draft BOOLEAN DEFAULT FALSE,
    merged_by VARCHAR(255)
);

-- PR reviews table
CREATE TABLE IF NOT EXISTS pr_reviews (
    id SERIAL PRIMARY KEY,
    github_id BIGINT UNIQUE NOT NULL,
    pr_id INTEGER REFERENCES pull_requests(id) ON DELETE CASCADE,
    reviewer VARCHAR(255) NOT NULL,
    state VARCHAR(50) NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE,
    body TEXT
);

-- Commits table
CREATE TABLE IF NOT EXISTS commits (
    id SERIAL PRIMARY KEY,
    sha VARCHAR(40) UNIQUE NOT NULL,
    repo_id INTEGER REFERENCES repositories(id) ON DELETE CASCADE,
    pr_id INTEGER REFERENCES pull_requests(id) ON DELETE SET NULL,
    author VARCHAR(255),
    committer VARCHAR(255),
    message TEXT,
    additions INTEGER DEFAULT 0,
    deletions INTEGER DEFAULT 0,
    changed_files INTEGER DEFAULT 0,
    committed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CI workflow runs table
CREATE TABLE IF NOT EXISTS workflow_runs (
    id SERIAL PRIMARY KEY,
    github_id BIGINT UNIQUE NOT NULL,
    repo_id INTEGER REFERENCES repositories(id) ON DELETE CASCADE,
    pr_id INTEGER REFERENCES pull_requests(id) ON DELETE SET NULL,
    name VARCHAR(255),
    event VARCHAR(100),
    status VARCHAR(50),
    conclusion VARCHAR(50),
    head_branch VARCHAR(255),
    head_sha VARCHAR(40),
    run_number INTEGER,
    run_started_at TIMESTAMP WITH TIME ZONE,
    run_completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contributors table
CREATE TABLE IF NOT EXISTS contributors (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    email VARCHAR(255),
    avatar_url TEXT,
    first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily contributor stats (for burnout detection)
CREATE TABLE IF NOT EXISTS contributor_daily_stats (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    repo_id INTEGER REFERENCES repositories(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    commits_count INTEGER DEFAULT 0,
    prs_opened INTEGER DEFAULT 0,
    prs_merged INTEGER DEFAULT 0,
    reviews_given INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    additions INTEGER DEFAULT 0,
    deletions INTEGER DEFAULT 0,
    UNIQUE(username, repo_id, date)
);

-- DORA metrics snapshots table
CREATE TABLE IF NOT EXISTS dora_snapshots (
    id SERIAL PRIMARY KEY,
    repo_id INTEGER REFERENCES repositories(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    deployment_frequency FLOAT,
    lead_time_hours FLOAT,
    change_failure_rate FLOAT,
    mttr_hours FLOAT,
    pr_cycle_time_hours FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(repo_id, snapshot_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_prs_repo_id ON pull_requests(repo_id);
CREATE INDEX IF NOT EXISTS idx_prs_state ON pull_requests(state);
CREATE INDEX IF NOT EXISTS idx_prs_author ON pull_requests(author);
CREATE INDEX IF NOT EXISTS idx_prs_created_at ON pull_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_prs_merged_at ON pull_requests(merged_at);
CREATE INDEX IF NOT EXISTS idx_commits_repo_id ON commits(repo_id);
CREATE INDEX IF NOT EXISTS idx_commits_author ON commits(author);
CREATE INDEX IF NOT EXISTS idx_commits_committed_at ON commits(committed_at);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_repo_id ON workflow_runs(repo_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_conclusion ON workflow_runs(conclusion);
CREATE INDEX IF NOT EXISTS idx_contributor_daily_stats_username ON contributor_daily_stats(username);
CREATE INDEX IF NOT EXISTS idx_contributor_daily_stats_date ON contributor_daily_stats(date);