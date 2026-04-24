import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useData – generic fetch hook with:
 *   - loading / error / data states
 *   - auto-refresh on interval
 *   - mock-data fallback when fetcher throws
 *   - manual refetch trigger
 */
export function useData(fetcher, mockFallback = null, options = {}) {
  const { interval = null, deps = [] } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMock, setIsMock] = useState(false);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      if (mountedRef.current) {
        setData(result);
        setIsMock(false);
      }
    } catch (err) {
      if (mountedRef.current) {
        if (mockFallback !== null) {
          setData(typeof mockFallback === 'function' ? mockFallback() : mockFallback);
          setIsMock(true);
          setError(null);
        } else {
          setError(err.message || 'Failed to fetch');
        }
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => { mountedRef.current = false; };
  }, [load]);

  useEffect(() => {
    if (!interval) return;
    const id = setInterval(load, interval);
    return () => clearInterval(id);
  }, [load, interval]);

  return { data, loading, error, isMock, refetch: load };
}

/**
 * useRepo – shared repo selector state
 */
export function useRepo(repos, defaultRepo) {
  const [repo, setRepo] = useState(defaultRepo || '');
  useEffect(() => {
    if (!repo && repos?.length > 0) setRepo(repos[0].name);
  }, [repos, repo]);
  return [repo, setRepo];
}
