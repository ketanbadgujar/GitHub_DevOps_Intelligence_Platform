import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error('[API Error]', err.response?.status, err.config?.url, err.message);
    return Promise.reject(err);
  }
);

// ─── DORA Metrics ─────────────────────────────────────────────────────────────
export const doraApi = {
  getMetrics: (repo, days = 30) =>
    client.get('/metrics/dora', { params: { repo, days } }).then((r) => r.data),

  getHistory: (repo, days = 30) =>
    client.get('/metrics/dora', { params: { repo, days } }).then((r) => r.data),

  getSummary: (repo) =>
    client.get('/metrics/summary', { params: { repo } }).then((r) => r.data),
};

// ─── ML — normalize to UI shape ───────────────────────────────────────────────
export const mlApi = {
  getPRRisk: (repo, limit = 50) =>
    client.get('/ml/pr-risk', { params: { repo, limit } }).then((r) =>
      (r.data || []).map(pr => ({
        pr_number:       pr.pr_number,
        title:           pr.title,
        author:          pr.author,
        risk_score:      pr.risk_score,
        risk_label:      normalizePRLabel(pr.risk_label),
        files_changed:   pr.files_changed || 0,
        lines_added:     pr.lines_added || 0,
        reviews_requested: pr.risk_factors?.length || 0,
      }))
    ),

  getBurnout: (repo) =>
    client.get('/ml/burnout', { params: { repo } }).then((r) =>
      (r.data || []).map(c => ({
        contributor:    c.username,
        burnout_score:  c.anomaly_score,
        risk_level:     c.health_label,
        anomaly_score:  c.anomaly_score,
        commits_30d:    Math.round((c.avg_weekly_prs_recent || 0) * 4),
        review_hours:   Math.round((c.avg_weekly_reviews_recent || 0) * 4),
        weekend_commits: 0,
      }))
    ),
};

// ─── Platform ─────────────────────────────────────────────────────────────────
export const platformApi = {
  getHealth: () =>
    client.get('/health').then((r) => r.data),

  getRepos: () =>
    client.get('/repos').then((r) =>
      (r.data || []).map(repo => ({
        name: repo.full_name || repo.repo_full_name || repo.name || repo,
        stars: repo.stars || 0,
        last_sync: repo.last_sync || new Date().toISOString(),
      }))
    ),

  getAlerts: (limit = 10) =>
    client.get('/health').then((r) => r.data),
};

// ─── Label normalizer ─────────────────────────────────────────────────────────
function normalizePRLabel(label) {
  if (!label) return 'LOW';
  const l = label.toLowerCase();
  if (l.includes('critical')) return 'CRITICAL';
  if (l.includes('high'))     return 'HIGH';
  if (l.includes('medium') || l.includes('moderate')) return 'MEDIUM';
  return 'LOW';
}

// ─── Mock data fallback ───────────────────────────────────────────────────────
export const mockData = {
  doraMetrics: {
    deployment_frequency: 4.2,
    lead_time_for_changes: 18.5,
    change_failure_rate: 8.3,
    mean_time_to_restore: 2.1,
    performance_level: 'High',
    period_days: 30,
  },
  doraHistory: Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return {
      date: date.toISOString().split('T')[0],
      deployment_frequency: +(Math.random() * 6 + 1).toFixed(1),
      lead_time_hours: +(Math.random() * 30 + 8).toFixed(1),
      cfr: +(Math.random() * 15).toFixed(1),
      mttr_hours: +(Math.random() * 4 + 0.5).toFixed(1),
    };
  }),
  prRisk: [
    { pr_number: 247, title: 'Refactor authentication middleware', author: 'alice', risk_score: 0.87, risk_label: 'HIGH', files_changed: 42, lines_added: 890, reviews_requested: 3 },
    { pr_number: 251, title: 'Add Redis caching layer', author: 'bob', risk_score: 0.72, risk_label: 'HIGH', files_changed: 18, lines_added: 340, reviews_requested: 2 },
    { pr_number: 249, title: 'Update CI pipeline config', author: 'carol', risk_score: 0.44, risk_label: 'MEDIUM', files_changed: 3, lines_added: 45, reviews_requested: 1 },
    { pr_number: 252, title: 'Fix typo in README', author: 'dave', risk_score: 0.09, risk_label: 'LOW', files_changed: 1, lines_added: 2, reviews_requested: 0 },
  ],
  burnout: [
    { contributor: 'alice', burnout_score: 0.82, risk_level: 'HIGH', anomaly_score: -0.41, commits_30d: 187, review_hours: 24.5, weekend_commits: 23 },
    { contributor: 'bob', burnout_score: 0.45, risk_level: 'MEDIUM', anomaly_score: -0.12, commits_30d: 94, review_hours: 12.0, weekend_commits: 8 },
    { contributor: 'carol', burnout_score: 0.21, risk_level: 'LOW', anomaly_score: 0.28, commits_30d: 52, review_hours: 6.0, weekend_commits: 2 },
  ],
  health: {
    status: 'healthy',
    services: { gateway: 'up', dora: 'up', ml: 'up', collector: 'up', database: 'up' },
  },
  repos: [
    { name: 'fastapi/fastapi', stars: 12, last_sync: new Date().toISOString() },
  ],
};
