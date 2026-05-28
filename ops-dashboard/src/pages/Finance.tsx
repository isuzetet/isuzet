import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, DollarSign } from 'lucide-react';
import { apiGet, DATA_BASE } from '@/lib/apiClient';

interface FinancialSummary {
  totalVolumeEtb: number;
  totalCommissionEtb: number;
  totalEscrowHeldEtb: number;
  avgTransactionEtb: number;
  transactionCount: number;
}

function formatEtb(n: number): string {
  return `ETB ${(n ?? 0).toLocaleString('en-ET', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const Finance = () => {
  // Default: last 30 days
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [from, setFrom] = useState(thirtyDaysAgo.toISOString().slice(0, 10));
  const [to, setTo] = useState(now.toISOString().slice(0, 10));

  const { data, isLoading, isError, refetch } = useQuery<FinancialSummary>({
    queryKey: ['ops-finance', from, to],
    queryFn: () => {
      const url = new URL(`${DATA_BASE}/api/v1/data/financial/summary`);
      url.searchParams.set('from', `${from}T00:00:00.000Z`);
      url.searchParams.set('to', `${to}T23:59:59.999Z`);
      return apiGet<FinancialSummary>(url.toString());
    },
    refetchInterval: 60000,
    retry: 2,
  });

  const kpis = data ? [
    { label: 'Total Volume',         value: formatEtb(data.totalVolumeEtb),       icon: TrendingUp,  color: 'text-green-400' },
    { label: 'Commission Earned',    value: formatEtb(data.totalCommissionEtb),   icon: DollarSign,  color: 'text-brand-primary' },
    { label: 'Escrow Held',          value: formatEtb(data.totalEscrowHeldEtb),   icon: DollarSign,  color: 'text-yellow-400' },
    { label: 'Avg Transaction',      value: formatEtb(data.avgTransactionEtb),    icon: DollarSign,  color: 'text-blue-400' },
    { label: 'Transaction Count',    value: (data.transactionCount ?? 0).toString(), icon: TrendingUp, color: 'text-isuzet-text' },
  ] : [];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-isuzet-text">Financial Oversight</h1>
          <p className="text-sm text-isuzet-secondary">Platform revenue and payout summary</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="h-8 px-2 text-xs rounded border border-isuzet-border bg-isuzet-surface text-isuzet-text focus:outline-none" />
          <span className="text-isuzet-secondary text-xs">to</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="h-8 px-2 text-xs rounded border border-isuzet-border bg-isuzet-surface text-isuzet-text focus:outline-none" />
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}
            className="h-8 border-isuzet-border bg-isuzet-surface text-isuzet-text hover:bg-isuzet-border">
            <RefreshCw size={14} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Go
          </Button>
        </div>
      </div>

      {isError && (
        <div className="mb-4 p-3 bg-brand-danger/10 border border-brand-danger/30 rounded-lg text-sm text-brand-danger">
          Could not reach data engine — financial summary unavailable.
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="h-24 bg-isuzet-surface rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {kpis.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="p-5 bg-isuzet-surface border border-isuzet-border rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <Icon size={16} className={color} />
                <span className="text-xs text-isuzet-secondary font-medium uppercase tracking-wider">{label}</span>
              </div>
              <div className={`text-xl font-bold ${color}`}>{value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Finance;
