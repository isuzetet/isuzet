import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Users } from 'lucide-react';
import { apiGet, IDENTITY_BASE } from '@/lib/apiClient';

interface Driver {
  id: string;
  userId: string;
  status: string;
  trustScore: number;
  trustTier: number;
  totalTripsCompleted: number;
  onTimeRate: number;
  incidentCount90d: number;
  user?: { id: string; fullName: string; phone: string; role: string; kycTier: number } | null;
}

const Drivers = () => {
  const { data: drivers = [], isLoading, isError, refetch } = useQuery<Driver[]>({
    queryKey: ['ops-drivers'],
    queryFn: () => apiGet<Driver[]>(`${IDENTITY_BASE}/api/v1/identity/drivers`),
    refetchInterval: 60000,
    retry: 2,
  });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-isuzet-text">Driver Management</h1>
          <p className="text-sm text-isuzet-secondary">{drivers.length} drivers</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}
          className="h-8 border-isuzet-border bg-isuzet-surface text-isuzet-text hover:bg-isuzet-border">
          <RefreshCw size={14} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {isError && (
        <div className="mb-4 p-3 bg-brand-danger/10 border border-brand-danger/30 rounded-lg text-sm text-brand-danger">
          Could not reach data engine.
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 bg-isuzet-surface rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-isuzet-border text-isuzet-secondary text-left">
                <th className="pb-2 pr-4 font-medium">Driver</th>
                <th className="pb-2 pr-4 font-medium">Total Trips</th>
                <th className="pb-2 pr-4 font-medium">On-Time %</th>
                <th className="pb-2 pr-4 font-medium">Incidents</th>
                <th className="pb-2 pr-4 font-medium">Avg Rating</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {drivers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-isuzet-secondary">
                    <Users size={32} className="mx-auto mb-2 opacity-40" />
                    No driver data available
                  </td>
                </tr>
              ) : (
                drivers.map((d) => (
                  <tr key={d.id} className="border-b border-isuzet-border/50 hover:bg-isuzet-surface transition-colors">
                    <td className="py-3 pr-4">
                      <div className="text-isuzet-text font-medium">{d.user?.fullName ?? '—'}</div>
                      <div className="text-[11px] text-isuzet-secondary font-mono">{d.id.slice(-8)}</div>
                    </td>
                    <td className="py-3 pr-4 text-isuzet-text">{d.totalTripsCompleted}</td>
                    <td className="py-3 pr-4">
                      <span className={`font-medium ${Number(d.onTimeRate) >= 0.9 ? 'text-brand-success' : Number(d.onTimeRate) >= 0.7 ? 'text-brand-accent' : 'text-brand-danger'}`}>
                        {(Number(d.onTimeRate) * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={d.incidentCount90d > 0 ? 'text-brand-danger font-medium' : 'text-isuzet-secondary'}>
                        {d.incidentCount90d}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-isuzet-text">{Number(d.trustScore).toFixed(1)}</td>
                    <td className="py-3">
                      <Badge className={`text-[10px] font-bold px-1.5 py-0 ${d.status === 'ACTIVE' ? 'bg-green-700 text-white' : 'bg-isuzet-border text-isuzet-secondary'}`}>
                        {d.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Drivers;
