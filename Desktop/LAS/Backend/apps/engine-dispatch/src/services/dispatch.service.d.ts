/**
 * ISUZET Dispatch Service
 * Handles automated load-to-driver matching and offer management
 */
interface DispatchResult {
    success: boolean;
    loadId: string;
    assignedDriverId?: string;
    assignedTruckId?: string;
    offerSent: boolean;
    offerExpiresAt?: Date;
    error?: string;
}
interface OfferResult {
    success: boolean;
    loadId: string;
    driverId: string;
    action: 'ACCEPTED' | 'DECLINED';
    error?: string;
}
interface ExpiredOffersResult {
    processedCount: number;
    escalatedLoads: string[];
    errors: string[];
}
/**
 * Main dispatch orchestrator - matches load to driver and sends offer
 */
declare function dispatchLoad(loadId: string): Promise<DispatchResult>;
/**
 * Handle driver accepting an offer
 */
declare function acceptOffer(loadId: string, driverId: string): Promise<OfferResult>;
/**
 * Handle driver declining an offer
 */
declare function declineOffer(loadId: string, driverId: string): Promise<OfferResult>;
/**
 * Process expired offers and trigger next actions
 */
declare function handleExpiredOffers(): Promise<ExpiredOffersResult>;
/**
 * Escalate unmatched load to manual intervention
 */
declare function escalateUnmatchedLoad(loadId: string): Promise<void>;
export declare const dispatchService: {
    dispatchLoad: typeof dispatchLoad;
    acceptOffer: typeof acceptOffer;
    declineOffer: typeof declineOffer;
    handleExpiredOffers: typeof handleExpiredOffers;
    escalateUnmatchedLoad: typeof escalateUnmatchedLoad;
};
export {};
//# sourceMappingURL=dispatch.service.d.ts.map