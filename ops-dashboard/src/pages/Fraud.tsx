import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Eye } from 'lucide-react';
import { apiGet, FRAUD_BASE } from '@/lib/apiClient';

interface FraudFlag {
  id: string;
  type: string;
  severity: string;
  status: string;
  entityType: string;
  entityId: string;
  description: string;
  riskScore: number;
  createdAt: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  LOW:      'bg-blue-600 text-white',
  MEDIUM:   'bg-yellow-600 text-white',
  HIGH:     'bg-orange-600 text-white',
  CRITICAL: 'bg-red-700 text-white',
};

const Fraud = () => {
  const [statusFilter, setStatusFilter] = useState('OPEN');

  const { data, isLoading, isError, refetch } = useQuery<{ flags: FraudFlag[]; total: number }>({
    queryKey: ['ops-fraud', statusFilter],
    queryFn: () => {
      const url = new URL(`${FRAUD_BASE}/api/v1/fraud/flags`);
      if (statusFilter) url.searchParams.set('status', statusFilter);
      url.searchParams.set('limit', '50');
      return apiGet<{ flags: FraudFlag[]; total: number }>(url.toString());
    },
    refetchInterval: 30000,
    retry: 2,
  });

  const flags: FraudFlag[] = Array.isArray(data) ? data : (data?.flags ?? []);
  const total = Array.isArray(data) ? data.length : (data?.total ?? flags.length);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-isuzet-text">Fraud Monitoring</h1>
          <p className="text-sm text-isuzet-secondary">{total} flags</p>
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
            <option value="DISMISSED">Dismissed</option>
          </select>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}
            className="h-8 border-isuzet-border bg-isuzet-surface text-isuzet-text hover:bg-isuzet-border">
            <RefreshCw size={14} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {isError && (
        <div className="mb-4 p-3 bg-brand-danger/10 border border-brand-danger/30 rounded-lg text-sm text-brand-danger">
          Could not reach fraud detection engine (port 3009).
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-isuzet-surface rounded-lg animate-pulse" />
          ))}
        </div>
      ) : flags.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-isuzet-secondary">
          <Eye size={32} className="mb-2 opacity-40" />
          No {statusFilter.toLowerCase()} fraud flags
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-isuzet-border text-isuzet-secondary text-left">
                <th className="pb-2 pr-4 font-medium">Severity</th>
                <th className="pb-2 pr-4 font-medium">Type</th>
                <th className="pb-2 pr-4 font-medium">Entity</th>
                <th className="pb-2 pr-4 font-medium">Description</th>
                <th className="pb-2 pr-4 font-medium">Risk Score</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {flags.map((flag) => (
                <tr key={flag.id} className="border-b border-isuzet-border/50 hover:bg-isuzet-surface transition-colors">
                  <td className="py-3 pr-4">
                    <Badge className={`text-[10px] font-bold px-1.5 py-0 ${SEVERITY_COLORS[flag.severity] ?? 'bg-gray-600 text-white'}`}>
                      {flag.severity}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4 text-isuzet-text text-xs">{flag.type}</td>
                  <td className="py-3 pr-4">
                    <div className="text-xs text-isuzet-secondary">{flag.entityType}</div>
                    <div className="font-mono text-[11px] text-isuzet-secondary">{flag.entityId?.slice(-10)}</div>
                  </td>
                  <td className="py-3 pr-4 text-isuzet-text text-xs max-w-xs truncate">{flag.description}</td>
                  <td className="py-3 pr-4">
                    <span className={`font-bold text-sm ${flag.riskScore >= 80 ? 'text-brand-danger' : flag.riskScore >= 50 ? 'text-brand-accent' : 'text-isuzet-secondary'}`}>
                      {flag.riskScore}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <Badge className={`text-[10px] font-bold px-1.5 py-0 ${flag.status === 'OPEN' ? 'bg-red-700 text-white' : 'bg-gray-600 text-white'}`}>
                      {flag.status}
                    </Badge>
                  </td>
                  <td className="py-3 text-xs text-isuzet-secondary">
                    {new Date(flag.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Fraud;
