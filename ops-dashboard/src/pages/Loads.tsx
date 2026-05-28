import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RefreshCw, Package } from 'lucide-react';
import { apiGet, DISPATCH_BASE } from '@/lib/apiClient';

interface Load {
  id: string;
  status: string;
  originCity: string;
  destinationCity: string;
  cargoType: string;
  weightKg: number;
  systemQuoteEtb?: number;
  finalRateEtb?: number;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  OPEN:        'bg-yellow-600 text-white',
  MATCHING:    'bg-blue-600 text-white',
  OFFERED:     'bg-purple-600 text-white',
  IN_TRANSIT:  'bg-green-700 text-white',
  DELIVERED:   'bg-green-900 text-white',
  CANCELLED:   'bg-gray-600 text-white',
  DISPUTED:    'bg-red-700 text-white',
};

const Loads = () => {
  const { data: loads = [], isLoading, isError, refetch } = useQuery<Load[]>({
    queryKey: ['ops-loads'],
    queryFn: () => apiGet<Load[]>(`${DISPATCH_BASE}/api/v1/dispatch/loads`),
    refetchInterval: 30000,
    retry: 2,
  });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-isuzet-text">Load Management</h1>
          <p className="text-sm text-isuzet-secondary">{loads.length} total loads</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}
          className="h-8 border-isuzet-border bg-isuzet-surface text-isuzet-text hover:bg-isuzet-border">
          <RefreshCw size={14} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {isError && (
        <div className="mb-4 p-3 bg-brand-danger/10 border border-brand-danger/30 rounded-lg text-sm text-brand-danger">
          Could not reach dispatch engine — showing cached data if available.
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-isuzet-surface rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-isuzet-border text-isuzet-secondary text-left">
                <th className="pb-2 pr-4 font-medium">ID</th>
                <th className="pb-2 pr-4 font-medium">Route</th>
                <th className="pb-2 pr-4 font-medium">Cargo</th>
                <th className="pb-2 pr-4 font-medium">Weight (kg)</th>
                <th className="pb-2 pr-4 font-medium">Rate (ETB)</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {loads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-isuzet-secondary">
                    <Package size={32} className="mx-auto mb-2 opacity-40" />
                    No loads found
                  </td>
                </tr>
              ) : (
                loads.map((load) => (
                  <tr key={load.id} className="border-b border-isuzet-border/50 hover:bg-isuzet-surface transition-colors">
                    <td className="py-3 pr-4 font-mono text-xs text-isuzet-secondary">{load.id.slice(-8)}</td>
                    <td className="py-3 pr-4 text-isuzet-text">
                      {load.originCity} → {load.destinationCity}
                    </td>
                    <td className="py-3 pr-4 text-isuzet-secondary">{load.cargoType}</td>
                    <td className="py-3 pr-4 text-isuzet-text">{load.weightKg?.toLocaleString()}</td>
                    <td className="py-3 pr-4 text-isuzet-text">
                      {(load.finalRateEtb ?? load.systemQuoteEtb) ? (load.finalRateEtb ?? load.systemQuoteEtb)!.toLocaleString() : '—'}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge className={`text-[10px] font-bold px-1.5 py-0 ${STATUS_COLORS[load.status] ?? 'bg-gray-600 text-white'}`}>
                        {load.status}
                      </Badge>
                    </td>
                    <td className="py-3 text-xs text-isuzet-secondary">
                      {new Date(load.createdAt).toLocaleDateString()}
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

export default Loads;
