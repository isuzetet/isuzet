import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Settings2 } from 'lucide-react';
import { apiGet, CORRIDOR_BASE } from '@/lib/apiClient';

interface Zone {
  id: string;
  name: string;
  type: string;
  truckDemandIndex: number;
  corridorCount: number;
  isStrategicHub: boolean;
  surgeMultiplier: number;
}

const Strategy = () => {
  const { data: zones = [], isLoading, isError, refetch } = useQuery<Zone[]>({
    queryKey: ['ops-zones'],
    queryFn: () => apiGet<Zone[]>(`${CORRIDOR_BASE}/api/v1/corridor/zones`),
    refetchInterval: 120000,
    retry: 2,
  });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-isuzet-text">Strategy Configuration</h1>
          <p className="text-sm text-isuzet-secondary">Geographic zones and demand settings</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-isuzet-surface rounded-xl animate-pulse" />
          ))}
        </div>
      ) : zones.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-isuzet-secondary">
          <Settings2 size={32} className="mb-2 opacity-40" />
          No zones configured
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {zones.map((zone) => (
            <div key={zone.id} className="p-5 bg-isuzet-surface border border-isuzet-border rounded-xl hover:border-brand-primary/40 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-sm font-bold text-isuzet-text">{zone.name}</div>
                  <div className="text-xs text-isuzet-secondary">{zone.type}</div>
                </div>
                {zone.isStrategicHub && (
                  <Badge className="bg-brand-primary text-white text-[10px] font-bold px-1.5 py-0">Hub</Badge>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-isuzet-secondary text-xs">Demand Index</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-isuzet-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-accent rounded-full transition-all"
                        style={{ width: `${Math.min((zone.truckDemandIndex ?? 0) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-isuzet-text w-8 text-right">
                      {((zone.truckDemandIndex ?? 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                <div className="flex justify-between">
                  <span className="text-isuzet-secondary text-xs">Corridors</span>
                  <span className="text-xs text-isuzet-text font-medium">{zone.corridorCount ?? 0}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-isuzet-secondary text-xs">Surge Multiplier</span>
                  <span className={`text-xs font-bold ${(zone.surgeMultiplier ?? 1) > 1.2 ? 'text-brand-accent' : 'text-isuzet-text'}`}>
                    {(zone.surgeMultiplier ?? 1).toFixed(2)}×
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Strategy;
