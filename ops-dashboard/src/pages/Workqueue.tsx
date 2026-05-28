import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  ShieldCheck, AlertTriangle, Package, Eye, Wallet, 
  Clock, CheckCircle2, RefreshCw, ChevronRight 
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
type ItemType = 'KYC_PENDING' | 'INCIDENT_SLA_WARNING' | 'LOAD_UNMATCHED' | 'FRAUD_FLAG' | 'EXPOSURE_CAP_WARNING' | 'DOCUMENT_EXPIRING' | 'LOAD_STUCK_OPEN';

interface WorkItem {
  id: string;
  priority: Priority;
  type: ItemType;
  title: string;
  subtitle: string;
  timeCreated: string;
  slaCountdown?: string;
}

const DATA_BASE = import.meta.env.VITE_DATA_API_BASE || 'http://localhost:3008';

async function fetchWorkqueue(): Promise<WorkItem[]> {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${DATA_BASE}/api/v1/data/ops/workqueue`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Workqueue fetch failed (${res.status})`);
  const body = await res.json();
  const d = body?.data ?? body;

  // Map API response keys to WorkItem shape
  const items: WorkItem[] = [];

  if (d.slaBreachedCount > 0) {
    items.push({
      id: 'sla-breach',
      priority: 'CRITICAL',
      type: 'INCIDENT_SLA_WARNING',
      title: `${d.slaBreachedCount} Incident SLA Breach${d.slaBreachedCount > 1 ? 'es' : ''}`,
      subtitle: 'Requires immediate investigator assignment',
      timeCreated: new Date().toISOString(),
    });
  }
  if (d.openFraudFlags > 0) {
    items.push({
      id: 'fraud',
      priority: 'HIGH',
      type: 'FRAUD_FLAG',
      title: `${d.openFraudFlags} Open Fraud Flag${d.openFraudFlags > 1 ? 's' : ''}`,
      subtitle: 'Review shadow broker and GPS spoofing patterns',
      timeCreated: new Date().toISOString(),
    });
  }
  if (d.openIncidents > 0) {
    items.push({
      id: 'incidents',
      priority: 'HIGH',
      type: 'INCIDENT_SLA_WARNING',
      title: `${d.openIncidents} Open Incident${d.openIncidents > 1 ? 's' : ''}`,
      subtitle: 'Cargo damage, accidents, or driver reports pending',
      timeCreated: new Date().toISOString(),
    });
  }
  if (d.pendingKycReviews > 0) {
    items.push({
      id: 'kyc',
      priority: 'HIGH',
      type: 'KYC_PENDING',
      title: `${d.pendingKycReviews} KYC Document${d.pendingKycReviews > 1 ? 's' : ''} Pending Review`,
      subtitle: 'Driver and fleet owner identity documents awaiting approval',
      timeCreated: new Date().toISOString(),
    });
  }
  if (d.openDisputeCount > 0) {
    items.push({
      id: 'disputes',
      priority: 'MEDIUM',
      type: 'LOAD_UNMATCHED',
      title: `${d.openDisputeCount} Open Dispute${d.openDisputeCount > 1 ? 's' : ''}`,
      subtitle: 'Payment or delivery disputes requiring resolution',
      timeCreated: new Date().toISOString(),
    });
  }

  return items;
}

const getPriorityColor = (p: Priority) => {
  switch (p) {
    case 'CRITICAL': return 'bg-brand-danger text-white';
    case 'HIGH': return 'bg-orange-600 text-white';
    case 'MEDIUM': return 'bg-brand-accent text-white';
    case 'LOW': return 'bg-isuzet-secondary text-white';
  }
};

const getTypeIcon = (type: ItemType) => {
  switch (type) {
    case 'KYC_PENDING': return ShieldCheck;
    case 'INCIDENT_SLA_WARNING': return AlertTriangle;
    case 'LOAD_UNMATCHED': return Package;
    case 'FRAUD_FLAG': return Eye;
    case 'EXPOSURE_CAP_WARNING': return Wallet;
    case 'DOCUMENT_EXPIRING': return ShieldCheck;
    case 'LOAD_STUCK_OPEN': return RefreshCw;
  }
};

const Workqueue = () => {
  const { data: items = [], isLoading, isError, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['workqueue'],
    queryFn: fetchWorkqueue,
    refetchInterval: 60000,
    retry: 2,
  });

  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.priority]) acc[item.priority] = [];
    acc[item.priority].push(item);
    return acc;
  }, {} as Record<Priority, WorkItem[]>);

  const priorities: Priority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-isuzet-text">Operations Workqueue</h1>
          <p className="text-sm text-isuzet-secondary">Prioritized tasks requiring immediate attention</p>
        </div>
        <div className="flex items-center gap-3">
          {isError && (
            <span className="text-[10px] text-brand-danger uppercase font-bold">Engine unreachable — data may be stale</span>
          )}
          {!isError && dataUpdatedAt > 0 && (
            <span className="text-[10px] text-isuzet-secondary uppercase font-bold">
              Last updated: {new Date(dataUpdatedAt).toLocaleTimeString()}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading} className="h-8 border-isuzet-border bg-isuzet-surface text-isuzet-text hover:bg-isuzet-border">
            <RefreshCw size={14} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-brand-success/10 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 size={32} className="text-brand-success" />
          </div>
          <h2 className="text-lg font-bold text-isuzet-text">All caught up</h2>
          <p className="text-isuzet-secondary">Next review in 60s</p>
        </div>
      ) : (
        <div className="space-y-8">
          {priorities.map(priority => {
            const group = groupedItems[priority];
            if (!group || group.length === 0) return null;

            return (
              <div key={priority} className="space-y-3">
                <div className="flex items-center gap-2 sticky top-[52px] bg-isuzet-bg py-2 z-10">
                  <Badge className={cn("text-[10px] font-bold px-1.5 py-0", getPriorityColor(priority))}>
                    {priority}
                  </Badge>
                  <span className="text-[10px] text-isuzet-secondary font-bold uppercase tracking-wider">
                    {group.length} {group.length === 1 ? 'Item' : 'Items'}
                  </span>
                  <div className="flex-1 h-[1px] bg-isuzet-border" />
                </div>

                <div className="grid gap-2">
                  {group.map(item => {
                    const Icon = getTypeIcon(item.type);
                    return (
                      <Card key={item.id} className="bg-isuzet-surface border-isuzet-border hover:border-brand-primary/50 transition-colors group cursor-pointer">
                        <div className="p-3 flex items-center gap-4">
                          <div className="w-10 h-10 rounded bg-isuzet-bg flex items-center justify-center text-isuzet-secondary group-hover:text-brand-primary transition-colors">
                            <Icon size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-isuzet-text truncate">{item.title}</h3>
                              {item.slaCountdown && (
                                <Badge variant="outline" className="text-[10px] border-brand-danger text-brand-danger h-4 px-1">
                                  <Clock size={10} className="mr-1" /> {item.slaCountdown}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-isuzet-secondary truncate">{item.subtitle}</p>
                          </div>
                          <Button variant="ghost" size="sm" className="h-8 text-brand-primary hover:bg-brand-primary/10">
                            Take Action <ChevronRight size={14} className="ml-1" />
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Workqueue;