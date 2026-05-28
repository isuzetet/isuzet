import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';
import { apiGet, apiPut, DATA_BASE, IDENTITY_BASE } from '@/lib/apiClient';

interface KycWorkqueueSummary {
  pendingKycReviews: number;
}

interface KycDocument {
  id: string;
  docType: string;
  status: string;
  entityType: string;
  entityId: string;
  s3Url?: string;
  createdAt: string;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  NATIONAL_ID:       'National ID',
  DRIVERS_LICENSE:   "Driver's License",
  BUSINESS_REG:      'Business Registration',
  TIN_CERTIFICATE:   'TIN Certificate',
  TRUCK_OWNERSHIP:   'Truck Ownership',
};

const KycReview = () => {
  const queryClient = useQueryClient();
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const { data: summary, isLoading: loadingSummary } = useQuery<KycWorkqueueSummary>({
    queryKey: ['ops-kyc-summary'],
    queryFn: () => apiGet<KycWorkqueueSummary>(`${DATA_BASE}/api/v1/data/ops/workqueue`),
    refetchInterval: 30000,
  });

  // Fetch pending KYC documents via identity engine
  const { data: docs = [], isLoading, isError, refetch } = useQuery<KycDocument[]>({
    queryKey: ['ops-kyc-docs'],
    queryFn: () => apiGet<KycDocument[]>(`${IDENTITY_BASE}/api/v1/identity/kyc/pending`),
    refetchInterval: 60000,
    retry: 1,
  });

  const reviewMutation = useMutation({
    mutationFn: ({ docId, decision, notes }: { docId: string; decision: string; notes?: string }) =>
      apiPut(`${IDENTITY_BASE}/api/v1/identity/kyc/${docId}/review`, { decision, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops-kyc-docs'] });
      queryClient.invalidateQueries({ queryKey: ['ops-kyc-summary'] });
      setReviewingId(null);
    },
  });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-isuzet-text">KYC Review</h1>
          <p className="text-sm text-isuzet-secondary">
            {loadingSummary ? '…' : (summary?.pendingKycReviews ?? 0)} pending reviews
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}
          className="h-8 border-isuzet-border bg-isuzet-surface text-isuzet-text hover:bg-isuzet-border">
          <RefreshCw size={14} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {isError && (
        <div className="mb-4 p-3 bg-yellow-600/10 border border-yellow-600/30 rounded-lg text-sm text-yellow-400">
          KYC pending list endpoint not available — review actions require direct document IDs.
          Pending count from workqueue: <strong>{summary?.pendingKycReviews ?? 0}</strong>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-isuzet-surface rounded-lg animate-pulse" />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-isuzet-secondary">
          <ShieldCheck size={40} className="mb-3 text-brand-success" />
          <p className="font-medium text-isuzet-text">All KYC documents reviewed</p>
          <p className="text-sm mt-1">No pending reviews in queue</p>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => (
            <div key={doc.id} className="p-4 bg-isuzet-surface border border-isuzet-border rounded-lg">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-yellow-600 text-white text-[10px] font-bold px-1.5 py-0">
                      {doc.status}
                    </Badge>
                    <span className="text-sm font-medium text-isuzet-text">
                      {DOC_TYPE_LABELS[doc.docType] ?? doc.docType}
                    </span>
                    <span className="text-xs text-isuzet-secondary">{doc.entityType}</span>
                  </div>
                  <div className="text-xs text-isuzet-secondary">
                    Entity: {doc.entityId?.slice(-12)} · Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                  </div>
                  {doc.s3Url && (
                    <a href={doc.s3Url} target="_blank" rel="noreferrer"
                      className="text-xs text-brand-primary hover:underline mt-1 inline-block">
                      View Document ↗
                    </a>
                  )}
                </div>
                {reviewingId === doc.id ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="outline"
                      className="h-7 border-green-600 text-green-400 hover:bg-green-600/10"
                      disabled={reviewMutation.isPending}
                      onClick={() => reviewMutation.mutate({ docId: doc.id, decision: 'APPROVED' })}>
                      <CheckCircle2 size={13} className="mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline"
                      className="h-7 border-red-600 text-red-400 hover:bg-red-600/10"
                      disabled={reviewMutation.isPending}
                      onClick={() => reviewMutation.mutate({ docId: doc.id, decision: 'REJECTED', notes: 'Document unclear' })}>
                      <XCircle size={13} className="mr-1" /> Reject
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-isuzet-secondary"
                      onClick={() => setReviewingId(null)}>Cancel</Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline"
                    className="shrink-0 h-7 border-isuzet-border text-isuzet-text hover:bg-isuzet-border"
                    onClick={() => setReviewingId(doc.id)}>
                    Review
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default KycReview;
