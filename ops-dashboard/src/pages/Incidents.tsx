import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { apiGet, INCIDENT_BASE } from '@/lib/apiClient';

interface Incident {
  id: string;
  type: string;
  severity: string;
  status: string;
  description: string;
  tripId: string;
  createdAt: string;
  resolvedAt?: string | null;
}

const SEVERITY_COLORS: Record<string, string> = {
  LOW:      'bg-blue-600 text-white',
  MEDIUM:   'bg-yellow-600 text-white',
  HIGH:     'bg-orange-600 text-white',
  CRITICAL: 'bg-red-700 text-white',
};

const STATUS_COLORS: Record<string, string> = {
  OPEN:        'bg-yellow-600 text-white',
  INVESTIGATING: 'bg-blue-600 text-white',
  RESOLVED:    'bg-green-700 text-white',
  CLOSED:      'bg-gray-600 text-white',
};

const Incidents = () => {
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, isError, refetch } = useQuery<{ items: Incident[]; total: number }>({
    queryKey: ['ops-incidents', statusFilter],
    queryFn: () => {
      const url = new URL(`${INCIDENT_BASE}/api/v1/incident/incidents`);
      if (statusFilter) url.searchParams.set('status', statusFilter);
      url.searchParams.set('limit', '50');
      return apiGet<{ items: Incident[]; total: number }>(url.toString());
    },
    refetchInterval: 30000,
    retry: 2,
  });

  const incidents: Incident[] = Array.isArray(data) ? data : (data?.items ?? []);
  const total = Array.isArray(data) ? data.length : (data?.total ?? incidents.length);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-isuzet-text">Incident Management</h1>
          <p className="text-sm text-isuzet-secondary">{total} incidents</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 px-2 text-xs rounded border border-isuzet-border bg-isuzet-surface text-isuzet-text focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="INVESTIGATING">Investigating</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}
            className="h-8 border-isuzet-border bg-isuzet-surface text-isuzet-text hover:bg-isuzet-border">
            <RefreshCw size={14} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {isError && (
        <div className="mb-4 p-3 bg-brand-danger/10 border border-brand-danger/30 rounded-lg text-sm text-brand-danger">
          Could not reach incident engine.
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-isuzet-surface rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {incidents.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-isuzet-secondary">
              <AlertTriangle size={32} className="mb-2 opacity-40" />
              No incidents found
            </div>
          ) : (
            incidents.map((inc) => (
              <div key={inc.id} className="p-4 bg-isuzet-surface border border-isuzet-border rounded-lg hover:border-brand-primary/40 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`text-[10px] font-bold px-1.5 py-0 ${SEVERITY_COLORS[inc.severity] ?? 'bg-gray-600 text-white'}`}>
                        {inc.severity}
                      </Badge>
                      <Badge className={`text-[10px] font-bold px-1.5 py-0 ${STATUS_COLORS[inc.status] ?? 'bg-gray-600 text-white'}`}>
                        {inc.status}
                      </Badge>
                      <span className="text-[11px] text-isuzet-secondary">{inc.type}</span>
                    </div>
                    <p className="text-sm text-isuzet-text truncate">{inc.description}</p>
                    <p className="text-xs text-isuzet-secondary mt-1">Trip: {inc.tripId?.slice(-8)}</p>
                  </div>
                  <div className="text-right text-xs text-isuzet-secondary shrink-0">
                    <div>{new Date(inc.createdAt).toLocaleDateString()}</div>
                    {inc.resolvedAt && (
                      <div className="text-green-500">Resolved {new Date(inc.resolvedAt).toLocaleDateString()}</div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Incidents;
