import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import EthiopiaMap from '@/components/shared/EthiopiaMap';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Package, Users, Truck, AlertTriangle,
  ArrowUpRight, Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiGet, DATA_BASE } from '@/lib/apiClient';

const mockChartData = [
  { hour: '00:00', posted: 12, matched: 8, delivered: 5 },
  { hour: '04:00', posted: 18, matched: 15, delivered: 10 },
  { hour: '08:00', posted: 45, matched: 38, delivered: 25 },
  { hour: '12:00', posted: 62, matched: 55, delivered: 40 },
  { hour: '16:00', posted: 58, matched: 50, delivered: 45 },
  { hour: '20:00', posted: 35, matched: 30, delivered: 28 },
];

const engines = [
  { name: 'Identity', port: 3001, status: 'healthy' },
  { name: 'Optimizer', port: 3002, status: 'healthy' },
  { name: 'Corridor', port: 3003, status: 'degraded' },
  { name: 'Liquidity', port: 3004, status: 'healthy' },
  { name: 'Shock', port: 3005, status: 'healthy' },
  { name: 'Incident', port: 3006, status: 'healthy' },
  { name: 'Dispatch', port: 3015, status: 'healthy' },
  { name: 'Location', port: 3014, status: 'healthy' },
];

interface PlatformSummary {
  totalUsers: number;
  totalDrivers: number;
  totalFleetOwners: number;
  totalOrderers: number;
  completedTrips: number;
  activeTrips: number;
  openIncidents: number;
  openFraudFlags: number;
  activeShockEvents: number;
  openLoads: number;
}

const Overview = () => {
  const { data: summary } = useQuery<PlatformSummary>({
    queryKey: ['platform-summary'],
    queryFn: () => apiGet<PlatformSummary>(`${DATA_BASE}/api/v1/data/platform/summary`),
    refetchInterval: 30000,
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: KPIs and Charts */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-isuzet-surface border-isuzet-border p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                  <Package size={18} />
                </div>
                <Badge variant="outline" className="text-[10px] border-brand-success text-brand-success bg-brand-success/5">
                  <ArrowUpRight size={10} className="mr-1" /> Live
                </Badge>
              </div>
              <div className="text-2xl font-bold text-isuzet-text tabular-nums">{summary?.openLoads ?? '—'}</div>
              <div className="text-[10px] text-isuzet-secondary uppercase font-bold tracking-wider">Open Loads</div>
            </Card>

            <Card className="bg-isuzet-surface border-isuzet-border p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded bg-brand-accent/10 flex items-center justify-center text-brand-accent">
                  <Users size={18} />
                </div>
                <div className="text-[10px] text-isuzet-secondary font-medium">
                  {summary?.totalFleetOwners ?? 0} fleet owners
                </div>
              </div>
              <div className="text-2xl font-bold text-isuzet-text tabular-nums">{summary?.totalDrivers ?? '—'}</div>
              <div className="text-[10px] text-isuzet-secondary uppercase font-bold tracking-wider">Total Drivers</div>
            </Card>

            <Card className="bg-isuzet-surface border-isuzet-border p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded bg-brand-success/10 flex items-center justify-center text-brand-success">
                  <Truck size={18} />
                </div>
              </div>
              <div className="text-2xl font-bold text-isuzet-text tabular-nums">{summary?.activeTrips ?? '—'}</div>
              <div className="text-[10px] text-isuzet-secondary uppercase font-bold tracking-wider">Active Trips</div>
            </Card>

            <Card className="bg-isuzet-surface border-isuzet-border p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded bg-brand-danger/10 flex items-center justify-center text-brand-danger">
                  <AlertTriangle size={18} />
                </div>
                <Badge variant="outline" className="text-[10px] border-brand-accent text-brand-accent bg-brand-accent/5">
                  {summary?.openFraudFlags ?? 0} fraud flags
                </Badge>
              </div>
              <div className="text-2xl font-bold text-isuzet-text tabular-nums">{summary?.openIncidents ?? '—'}</div>
              <div className="text-[10px] text-isuzet-secondary uppercase font-bold tracking-wider">Open Incidents</div>
            </Card>
          </div>

          <Card className="bg-isuzet-surface border-isuzet-border p-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-isuzet-text">Today's Load Volume</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-brand-primary" />
                  <span className="text-[10px] text-isuzet-secondary uppercase">Posted</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-brand-accent" />
                  <span className="text-[10px] text-isuzet-secondary uppercase">Matched</span>
                </div>
              </div>
            </div>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#30363D" vertical={false} />
                  <XAxis 
                    dataKey="hour" 
                    stroke="#7D8590" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#7D8590" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#161B22', border: '1px solid #30363D', borderRadius: '4px' }}
                    itemStyle={{ fontSize: '10px' }}
                  />
                  <Bar dataKey="posted" fill="#0F6E56" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="matched" fill="#BA7517" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Right Column: Map and Engine Health */}
        <div className="space-y-6">
          <EthiopiaMap className="h-[400px]" />
          
          <Card className="bg-isuzet-surface border-isuzet-border p-4">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={14} className="text-isuzet-secondary" />
              <h3 className="text-[10px] font-bold text-isuzet-secondary uppercase tracking-widest">Engine Health Status</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {engines.map(engine => (
                <div 
                  key={engine.name}
                  className="flex items-center gap-2 px-2 py-1 bg-isuzet-bg border border-isuzet-border rounded text-[10px] font-medium text-isuzet-text"
                >
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    engine.status === 'healthy' ? "bg-brand-success" : "bg-brand-accent animate-pulse"
                  )} />
                  {engine.name}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Overview;