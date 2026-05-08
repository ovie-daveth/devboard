'use client';

import { Fragment, useState, useEffect, useCallback } from 'react';

interface Log {
  id: string;
  timestamp: string;
  receivedAt: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  service: string;
  environment: 'development' | 'staging' | 'production';
  message: string;
  traceId?: string;
  spanId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

interface Pagination {
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
}

interface LogsResponse {
  data: Log[];
  pagination: Pagination;
}

const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
const ENVIRONMENTS = ['development', 'staging', 'production'] as const;

export default function LogsViewer() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [service, setService] = useState('');
  const [level, setLevel] = useState('');
  const [environment, setEnvironment] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [limit, setLimit] = useState(50);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [query, setQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  const fetchLogs = useCallback(async (resetCursor = true) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (query) params.set('service', query);
      if (service) params.set('service', service);
      if (level) params.set('level', level);
      if (environment) params.set('environment', environment);
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      params.set('limit', limit.toString());

      if (!resetCursor && cursor) {
        params.set('cursor', cursor);
      }

      const response = await fetch(`/api/logs?${params}`);
      const data: LogsResponse = await response.json();

      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }

      if (resetCursor) {
        setLogs(data.data);
      } else {
        setLogs(prev => [...prev, ...data.data]);
      }

      setHasMore(data.pagination.hasMore);
      setCursor(data.pagination.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [query, service, level, environment, fromDate, toDate, limit, cursor]);

  useEffect(() => {
    fetchLogs(true);
  }, [fetchLogs]);

  const handleFilterChange = () => {
    setCursor(null);
    fetchLogs(true);
  };

  const clearFilters = () => {
    setService('');
    setLevel('');
    setEnvironment('');
    setFromDate('');
    setToDate('');
    setCursor(null);
    setQuery('');
    fetchLogs(true);
  };

  const removeFilter = (filter: string) => {
    switch (filter) {
      case 'service':
        setService('');
        break;
      case 'level':
        setLevel('');
        break;
      case 'environment':
        setEnvironment('');
        break;
      case 'from':
        setFromDate('');
        break;
      case 'to':
        setToDate('');
        break;
      case 'query':
        setQuery('');
        break;
      default:
        break;
    }
    setCursor(null);
    fetchLogs(true);
  };

  const toggleRow = (id: string) => {
    setExpandedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'bg-rose-100 text-rose-700';
      case 'warn': return 'bg-amber-100 text-amber-700';
      case 'info': return 'bg-sky-100 text-sky-700';
      case 'debug': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const formatTimestamp = (timestamp: string) => new Date(timestamp).toLocaleString();

  const activeFilters = [
    query && { key: 'query', label: `Search: ${query}` },
    service && { key: 'service', label: `Service: ${service}` },
    level && { key: 'level', label: `Level: ${level.toUpperCase()}` },
    environment && { key: 'environment', label: `Environment: ${environment}` },
    fromDate && { key: 'from', label: `From: ${fromDate}` },
    toDate && { key: 'to', label: `To: ${toDate}` },
  ].filter(Boolean) as { key: string; label: string }[];

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-full">
        <div className="rounded-[32px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)] border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-6 sm:px-8 sm:py-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">Activity log</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Activity log</h1>
              </div>
              <div className="flex items-center gap-3">
                {/* <button
                  type="button"
                  className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
                >
                  + Add filter
                </button> */}
                <div className="inline-flex h-11 items-center rounded-full bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm">
                  JD
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">🔍</span>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search activity..."
                  className="w-full border-b-l rounded-3xl md:w-[40%] border-slate-200 py-3 pl-12 pr-4 text-slate-900  outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
              </div>
              {/* <button
                onClick={handleFilterChange}
                className="inline-flex h-11 items-center justify-center rounded-full bg-slate-900 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                Apply
              </button> */}
            </div>
            {activeFilters.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-3">
                {activeFilters.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => removeFilter(filter.key)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-200"
                  >
                    <span>{filter.label}</span>
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm">×</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="px-6 py-8 sm:px-8">
            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Service</span>
                  <input
                    type="text"
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    placeholder="api-gateway"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Level</span>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  >
                    <option value="">All Levels</option>
                    {LOG_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>{lvl.toUpperCase()}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Environment</span>
                  <select
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  >
                    <option value="">All Environments</option>
                    {ENVIRONMENTS.map((env) => (
                      <option key={env} value={env}>{env}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Rows per page</span>
                  <select
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>From Date</span>
                  <input
                    type="datetime-local"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>To Date</span>
                  <input
                    type="datetime-local"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  />
                </label>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-6 py-4 font-semibold uppercase tracking-wide"></th>
                      <th className="px-6 py-4 font-semibold uppercase tracking-wide">Date and time</th>
                      <th className="px-6 py-4 font-semibold uppercase tracking-wide">Service</th>
                      <th className="px-6 py-4 font-semibold uppercase tracking-wide">Environment</th>
                      <th className="px-6 py-4 font-semibold uppercase tracking-wide">Message</th>
                      <th className="px-6 py-4 font-semibold uppercase tracking-wide">Trace ID</th>
                      <th className="px-6 py-4 font-semibold uppercase tracking-wide">Request ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {logs.map((log) => {
                      const isExpanded = expandedRows.includes(log.id);
                      return (
                        <Fragment key={log.id}>
                          <tr className="hover:bg-slate-50">
                            <td className="px-4 py-4 text-slate-500">
                              <button
                                type="button"
                                onClick={() => toggleRow(log.id)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                                aria-label={isExpanded ? 'Collapse metadata' : 'Expand metadata'}
                              >
                                {isExpanded ? '−' : '+'}
                              </button>
                            </td>
                            <td className="px-6 py-4 text-slate-900">{formatTimestamp(log.timestamp)}</td>
                            <td className="px-6 py-4 text-slate-900 font-medium">{log.service}</td>
                            <td className="px-6 py-4 text-slate-700">{log.environment}</td>
                            <td className="px-6 py-4 text-slate-900">{log.message}</td>
                            <td className="px-6 py-4 text-slate-600 font-mono break-words max-w-[180px]">{log.traceId || '-'}</td>
                            <td className="px-6 py-4 text-slate-600 font-mono break-words max-w-[180px]">{log.requestId || '-'}</td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-slate-50">
                              <td colSpan={7} className="px-6 py-4">
                                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                                  <p className="text-sm font-semibold text-slate-700">Metadata</p>
                                  <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-600">
{log.metadata && Object.keys(log.metadata).length > 0 ? JSON.stringify(log.metadata, null, 2) : 'No metadata available'}
                                  </pre>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">Showing {logs.length} logs</p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (cursor) {
                        fetchLogs(false);
                      }
                    }}
                    disabled={!hasMore || loading}
                    className="inline-flex h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Load more
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
