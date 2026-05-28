import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { RefreshCw, Activity, Zap } from 'lucide-react';
import { apiGet, DATA_BASE } from '@/lib/apiClient';

interface PlatformSummary {
  activeLoads: number;
  activeDrivers: number;
  loadsInTransit: number;
  openIncidents: number;
  platformUtilizationRate: number;
  avgMatchTimeMinutes: number;
  todayRevenue: number;
  weeklyGrowthRate: number;
}

interface RecentEvent {
  eventId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  occurredAt: string;
  payload?: Record<string, unknown>;
}

const Intelligence = () => {
  const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } = useQuery<PlatformSummary>({
    queryKey: ['ops-platform-summary'],
    queryFn: () => apiGet<PlatformSummary>(`${DATA_BASE}/api/v1/data/platform/summary`),
    refetchInterval: 30000,
  });

  const { data: events = [], isLoading: loadingEvents, refetch: refetchEvents } = useQuery<RecentEvent[]>({
    queryKey: ['ops-events-recent'],
    queryFn: () => apiGet<RecentEvent[]>(`${DATA_BASE}/api/v1/data/events/recent?limit=30`),
    refetchInterval: 15000,
  });

  const isLoading = loadingSummary || loadingEvents;

  const metrics = summary ? [
    { label: 'Active Loads',        value: summary.activeLoads?.toString()          ?? '—' },
    { label: 'Active Drivers',      value: summary.activeDrivers?.toString()         ?? '—' },
    { label: 'In Transit',          value: summary.loadsInTransit?.toString()        ?? '—' },
    { label: 'Open Incidents',      value: summary.openIncidents?.toString()         ?? '—' },
    { label: 'Platform Utilization', value: summary.platformUtilizationRate != null ? `${summary.platformUtilizationRate.toFixed(1)}%` : '—' },
    { label: 'Avg Match Time',      value: summary.avgMatchTimeMinutes != null ? `${summary.avgMatchTimeMinutes.toFixed(0)} min` : '—' },
  ] : [];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-isuzet-text">Intelligence</h1>
          <p className="text-sm text-isuzet-secondary">Real-time platform signals</p>
        </div>
        <Button variant="outline" size="sm"
          onClick={() => { refetchSummary(); refetchEvents(); }}
          disabled={isLoading}
          className="h-8 border-isuzet-border bg-isuzet-surface text-isuzet-text hover:bg-isuzet-border">
          <RefreshCw size={14} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Platform KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {loadingSummary ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="h-20 bg-isuzet-surface rounded-xl animate-pulse" />
          ))
        ) : (
          metrics.map(({ label, value }) => (
            <div key={label} className="p-4 bg-isuzet-surface border border-isuzet-border rounded-xl text-center">
              <div className="text-xl font-bold text-isuzet-text">{value}</div>
              <div className="text-[10px] text-isuzet-secondary mt-1 uppercase tracking-wider">{label}</div>
            </div>
          ))
        )}
      </div>

      {/* Recent Events Feed */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Activity size={16} className="text-brand-primary" />
          <h2 className="text-sm font-bold text-isuzet-text uppercase tracking-wider">Live Event Feed</h2>
          {loadingEvents && <div className="w-3 h-3 rounded-full bg-brand-primary animate-pulse" />}
        </div>

        <div className="space-y-1 max-h-[480px] overflow-y-auto pr-1">
          {events.length === 0 && !loadingEvents ? (
            <div className="text-center py-8 text-isuzet-secondary text-sm">No recent events</div>
          ) : (
            events.map((ev) => (
              <div key={ev.eventId} className="flex items-start gap-3 p-3 bg-isuzet-surface border border-isuzet-border/50 rounded-lg hover:border-isuzet-border transition-colors">
                <Zap size={14} className="text-brand-accent mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-isuzet-text">{ev.eventType}</span>
                    <span className="text-[10px] text-isuzet-secondary">{ev.aggregateType}</span>
                  </div>
                  <div className="text-[11px] font-mono text-isuzet-secondary truncate">{ev.aggregateId?.slice(-16)}</div>
                </div>
                <div className="text-[11px] text-isuzet-secondary shrink-0">
                  {new Date(ev.occurredAt).toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Intelligence;
