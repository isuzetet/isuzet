import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, MapPin } from 'lucide-react';
import { apiGet, CORRIDOR_BASE } from '@/lib/apiClient';

interface Corridor {
  id: string;
  name: string;
  originCity: string;
  destinationCity: string;
  distanceKm: number;
  baseRateEtb: number;
  demandIndex: number;
  isStrategic: boolean;
  status: string;
}

const Corridors = () => {
  const { data: corridors = [], isLoading, isError, refetch } = useQuery<Corridor[]>({
    queryKey: ['ops-corridors'],
    queryFn: () => apiGet<Corridor[]>(`${CORRIDOR_BASE}/api/v1/corridor/corridors`),
    refetchInterval: 120000,
    retry: 2,
  });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-isuzet-text">Corridor Management</h1>
          <p className="text-sm text-isuzet-secondary">{corridors.length} corridors configured</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}
          className="h-8 border-isuzet-border bg-isuzet-surface text-isuzet-text hover:bg-isuzet-border">
          <RefreshCw size={14} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {isError && (
        <div className="mb-4 p-3 bg-brand-danger/10 border border-brand-danger/30 rounded-lg text-sm text-brand-danger">
          Could not reach corridor engine.
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-isuzet-surface rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-isuzet-border text-isuzet-secondary text-left">
                <th className="pb-2 pr-4 font-medium">Corridor</th>
                <th className="pb-2 pr-4 font-medium">Route</th>
                <th className="pb-2 pr-4 font-medium">Distance (km)</th>
                <th className="pb-2 pr-4 font-medium">Base Rate (ETB)</th>
                <th className="pb-2 pr-4 font-medium">Demand Index</th>
                <th className="pb-2 pr-4 font-medium">Strategic</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {corridors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-isuzet-secondary">
                    <MapPin size={32} className="mx-auto mb-2 opacity-40" />
                    No corridors found
                  </td>
                </tr>
              ) : (
                corridors.map((c) => (
                  <tr key={c.id} className="border-b border-isuzet-border/50 hover:bg-isuzet-surface transition-colors">
                    <td className="py-3 pr-4">
                      <div className="text-isuzet-text font-medium">{c.name}</div>
                      <div className="text-[11px] font-mono text-isuzet-secondary">{c.id.slice(-8)}</div>
                    </td>
                    <td className="py-3 pr-4 text-isuzet-text">{c.originCity} → {c.destinationCity}</td>
                    <td className="py-3 pr-4 text-isuzet-text">{c.distanceKm?.toLocaleString()}</td>
                    <td className="py-3 pr-4 text-isuzet-text">{c.baseRateEtb?.toLocaleString()}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-1">
                        <div className="h-1.5 w-16 bg-isuzet-border rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-accent rounded-full"
                            style={{ width: `${Math.min((c.demandIndex ?? 0) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-isuzet-secondary">{((c.demandIndex ?? 0) * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      {c.isStrategic ? (
                        <Badge className="bg-brand-primary text-white text-[10px] font-bold px-1.5 py-0">YES</Badge>
                      ) : (
                        <span className="text-isuzet-secondary text-xs">No</span>
                      )}
                    </td>
                    <td className="py-3">
                      <Badge className={`text-[10px] font-bold px-1.5 py-0 ${c.status === 'ACTIVE' ? 'bg-green-700 text-white' : 'bg-gray-600 text-white'}`}>
                        {c.status ?? 'ACTIVE'}
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

export default Corridors;
