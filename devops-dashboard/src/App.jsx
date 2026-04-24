import React, { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import OverviewPage from './pages/OverviewPage';
import DoraPage from './pages/DoraPage';
import PRRiskPage from './pages/PRRiskPage';
import BurnoutPage from './pages/BurnoutPage';
import PlatformPage from './pages/PlatformPage';
import { useData } from './hooks/useData';
import { doraApi, mlApi, platformApi, mockData } from './services/api';

function normalizeDora(raw) {
  if (!raw) return null;
  return {
    deployment_frequency: raw.deployment_frequency,
    lead_time_for_changes: raw.lead_time_hours,
    change_failure_rate: raw.change_failure_rate * 100,
    mean_time_to_restore: raw.mttr_hours,
    performance_level: raw.deployment_frequency_label || 'Unknown',
    period_days: raw.period_days || 30,
  };
}

function normalizeHealth(raw) {
  if (!raw) return null;
  return {
    status: raw.status,
    services: {
      gateway: 'up',
      database: raw.database === 'connected' ? 'up' : 'down',
      collector: raw.services?.collector === 'running' ? 'up' : 'down',
      metrics: raw.services?.metrics ? 'up' : 'down',
      ml: raw.services?.ml ? 'up' : 'down',
    },
  };
}

const DEFAULT_REPO = 'fastapi/fastapi';

export default function App() {
  const [selectedRepo, setSelectedRepo] = useState(DEFAULT_REPO);
  const [refreshTick, setRefreshTick] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);

  const triggerRefresh = useCallback(() => {
    setRefreshTick(t => t + 1);
    setLastUpdated(new Date().toISOString());
  }, []);

  const { data: rawHealth } = useData(
    () => platformApi.getHealth(),
    mockData.health,
    { interval: 30000, deps: [] }
  );
  const health = rawHealth?.services?.gateway !== undefined
    ? rawHealth
    : normalizeHealth(rawHealth);

  const { data: repos } = useData(
    () => platformApi.getRepos(),
    mockData.repos,
    { deps: [] }
  );

  const { data: rawDora, loading: doraLoading, isMock: doraMock } = useData(
    () => doraApi.getMetrics(selectedRepo, 30),
    null,
    { deps: [selectedRepo, refreshTick] }
  );

  const doraMetrics = rawDora
    ? (rawDora.deployment_frequency_label !== undefined ? normalizeDora(rawDora) : rawDora)
    : mockData.doraMetrics;

  const doraHistory = mockData.doraHistory;

  const { data: rawPRRisk, loading: prLoading, isMock: prMock } = useData(
    () => mlApi.getPRRisk(selectedRepo, 100),
    null,
    { deps: [selectedRepo, refreshTick] }
  );
  const prRisk = rawPRRisk || mockData.prRisk;

  const { data: rawBurnout, loading: burnoutLoading, isMock: burnoutMock } = useData(
    () => mlApi.getBurnout(selectedRepo),
    null,
    { deps: [selectedRepo, refreshTick] }
  );
  const burnout = rawBurnout || mockData.burnout;

  const anyMock = !rawDora || !rawPRRisk || !rawBurnout;
  const overallLoading = doraLoading || prLoading || burnoutLoading;

  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden bg-base-950">
        <Sidebar health={health} />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header
            repos={repos}
            selectedRepo={selectedRepo}
            onRepoChange={setSelectedRepo}
            lastUpdated={lastUpdated}
            onRefresh={triggerRefresh}
            refreshing={overallLoading}
            isMock={anyMock}
          />
          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={
                <OverviewPage
                  doraMetrics={doraMetrics}
                  doraHistory={doraHistory}
                  prRisk={prRisk}
                  burnout={burnout}
                  loading={overallLoading}
                />
              } />
              <Route path="/dora" element={
                <DoraPage
                  metrics={doraMetrics}
                  history={doraHistory}
                  loading={doraLoading}
                />
              } />
              <Route path="/pr-risk" element={
                <PRRiskPage prRisk={prRisk} loading={prLoading} />
              } />
              <Route path="/burnout" element={
                <BurnoutPage burnout={burnout} loading={burnoutLoading} />
              } />
              <Route path="/platform" element={
                <PlatformPage health={health} loading={!health} />
              } />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
