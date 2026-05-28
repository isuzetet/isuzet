"use strict";
/**
 * ISUZET Dispatch Service
 * Handles automated load-to-driver matching and offer management
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispatchService = void 0;
const shared_db_1 = require("@ruit/shared-db");
const engine_optimizer_1 = require("@ruit/engine-optimizer");
const engine_optimizer_2 = require("@ruit/engine-optimizer");
const orderer_reliability_service_1 = require("./orderer-reliability.service");
// ════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════
const OFFER_EXPIRY_MINUTES = 15; // Offers expire after 15 minutes
const MAX_OFFER_ROUNDS = 3; // Maximum rounds of offers before escalation
const MAX_DECLINES_PER_ROUND = 3; // Maximum declines before moving to next round
// ════════════════════════════════════════════════════════════════════════════
// SERVICE FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════
/**
 * Main dispatch orchestrator - matches load to driver and sends offer
 */
async function dispatchLoad(loadId) {
    try {
        // Load the load with current dispatch state
        const load = await shared_db_1.prisma.load.findUnique({
            where: { id: loadId },
            include: {
                orderer: true,
                corridor: true
            }
        });
        if (!load) {
            return {
                success: false,
                loadId,
                offerSent: false,
                error: 'Load not found'
            };
        }
        // Check if load is ready for dispatch
        if (load.status !== 'READY_TO_MATCH' && load.status !== 'OPEN') {
            return {
                success: false,
                loadId,
                offerSent: false,
                error: `Load status is ${load.status}, not ready for dispatch`
            };
        }
        // Check if load has a ready trip
        const trip = await shared_db_1.prisma.trip.findFirst({
            where: {
                loadId: load.id,
                status: 'PENDING'
            }
        });
        if (!trip) {
            return {
                success: false,
                loadId,
                offerSent: false,
                error: 'No pending trip found for load'
            };
        }
        // Get orderer reliability score for WDM weighting
        const ordererReliabilityScore = await orderer_reliability_service_1.ordererReliabilityService.getReliabilityScore(load.ordererId);
        // Get scored drivers for this load
        const scoredDrivers = await engine_optimizer_2.wdmService.scoreDriversForLoad({
            loadId: load.id,
            ordererReliabilityScore
        });
        if (scoredDrivers.length === 0) {
            // No drivers available - escalate immediately
            await escalateUnmatchedLoad(load.id);
            return {
                success: false,
                loadId,
                offerSent: false,
                error: 'No drivers available for load'
            };
        }
        // Find the best available driver (not currently being offered to)
        let selectedDriver = null;
        for (const driver of scoredDrivers) {
            // Check if this driver is currently being offered another load
            const activeOffer = await shared_db_1.prisma.loadOfferRecord.findFirst({
                where: {
                    driverId: driver.driverId,
                    status: 'PENDING',
                    expiresAt: {
                        gt: new Date()
                    }
                }
            });
            if (!activeOffer) {
                selectedDriver = driver;
                break;
            }
        }
        if (!selectedDriver) {
            // All top drivers are busy - escalate
            await escalateUnmatchedLoad(load.id);
            return {
                success: false,
                loadId,
                offerSent: false,
                error: 'All suitable drivers are currently busy'
            };
        }
        // Calculate pricing for the offer
        const pricingQuote = await engine_optimizer_1.pricingV2Service.getPricingQuoteForLoad(load.id);
        // Create offer record
        const offerExpiresAt = new Date(Date.now() + OFFER_EXPIRY_MINUTES * 60 * 1000);
        const offerRecord = await shared_db_1.prisma.loadOfferRecord.create({
            data: {
                loadId: load.id,
                driverId: selectedDriver.driverId,
                truckId: selectedDriver.truckId,
                offerAmountEtb: pricingQuote.netAmountToDriverEtb,
                expiresAt: offerExpiresAt,
                status: 'PENDING'
            }
        });
        // Update load with current offer info
        await shared_db_1.prisma.load.update({
            where: { id: load.id },
            data: {
                currentOfferDriverId: selectedDriver.driverId,
                offerSentAt: new Date(),
                offerExpiresAt,
                offerRound: load.offerRound + 1
            }
        });
        // Send notification to driver (via notification engine internal API)
        try {
            const notificationEngineUrl = process.env.NOTIFICATION_ENGINE_URL || 'http://localhost:3013';
            await fetch(`${notificationEngineUrl}/internal/sms`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: selectedDriver.driverId, // Will be resolved by notification engine
                    message: `New load offer: ETB ${pricingQuote.netAmountToDriverEtb} - expires in ${OFFER_EXPIRY_MINUTES} minutes. Reply to accept.`,
                    template: null
                })
            });
            // Mark notification as sent
            await shared_db_1.prisma.loadOfferRecord.update({
                where: { id: offerRecord.id },
                data: { notificationSentApp: true }
            });
        }
        catch (notificationError) {
            console.error('Failed to send notification:', notificationError);
            // Continue - notification failure shouldn't block dispatch
        }
        return {
            success: true,
            loadId,
            assignedDriverId: selectedDriver.driverId,
            assignedTruckId: selectedDriver.truckId,
            offerSent: true,
            offerExpiresAt
        };
    }
    catch (error) {
        console.error('Dispatch load error:', error);
        return {
            success: false,
            loadId,
            offerSent: false,
            error: error instanceof Error ? error.message : 'Unknown dispatch error'
        };
    }
}
/**
 * Handle driver accepting an offer
 */
async function acceptOffer(loadId, driverId) {
    try {
        // Find the active offer
        const offer = await shared_db_1.prisma.loadOfferRecord.findFirst({
            where: {
                loadId,
                driverId,
                status: 'PENDING',
                expiresAt: {
                    gt: new Date()
                }
            }
        });
        if (!offer) {
            return {
                success: false,
                loadId,
                driverId,
                action: 'ACCEPTED',
                error: 'No active offer found for this load and driver'
            };
        }
        // Update offer status
        await shared_db_1.prisma.loadOfferRecord.update({
            where: { id: offer.id },
            data: { status: 'ACCEPTED' }
        });
        // Update load status to MATCHED (valid schema status)
        await shared_db_1.prisma.load.update({
            where: { id: loadId },
            data: {
                status: 'MATCHED',
                currentOfferDriverId: null,
                offerSentAt: null,
                offerExpiresAt: null
            }
        });
        // Update trip status to PENDING (valid trip status)
        await shared_db_1.prisma.trip.updateMany({
            where: { loadId },
            data: { status: 'PENDING' }
        });
        // Create assignment record
        const { ulid } = await Promise.resolve().then(() => __importStar(require('ulid')));
        const strategyVersion = await shared_db_1.prisma.strategyVersion.findFirst({
            where: { isActive: true },
            select: { id: true }
        });
        await shared_db_1.prisma.assignment.create({
            data: {
                id: ulid(),
                loadId,
                driverId,
                truckId: offer.truckId,
                fleetOwnerId: driverId, // Will be resolved downstream; use driverId as placeholder
                status: 'ACCEPTED',
                acceptanceDeadline: new Date(Date.now() + 15 * 60 * 1000),
                acceptedAt: new Date(),
                strategyVersionId: strategyVersion?.id || 'str_default',
                optimizationScore: offer.offerAmountEtb
            }
        });
        return {
            success: true,
            loadId,
            driverId,
            action: 'ACCEPTED'
        };
    }
    catch (error) {
        console.error('Accept offer error:', error);
        return {
            success: false,
            loadId,
            driverId,
            action: 'ACCEPTED',
            error: error instanceof Error ? error.message : 'Unknown accept offer error'
        };
    }
}
/**
 * Handle driver declining an offer
 */
async function declineOffer(loadId, driverId) {
    try {
        // Find the active offer
        const offer = await shared_db_1.prisma.loadOfferRecord.findFirst({
            where: {
                loadId,
                driverId,
                status: 'PENDING',
                expiresAt: {
                    gt: new Date()
                }
            }
        });
        if (!offer) {
            return {
                success: false,
                loadId,
                driverId,
                action: 'DECLINED',
                error: 'No active offer found for this load and driver'
            };
        }
        // Update offer status
        await shared_db_1.prisma.loadOfferRecord.update({
            where: { id: offer.id },
            data: { status: 'DECLINED' }
        });
        // Update load decline count
        const load = await shared_db_1.prisma.load.findUnique({
            where: { id: loadId }
        });
        if (!load) {
            return {
                success: false,
                loadId,
                driverId,
                action: 'DECLINED',
                error: 'Load not found'
            };
        }
        const newDeclineCount = load.totalDeclines + 1;
        await shared_db_1.prisma.load.update({
            where: { id: loadId },
            data: {
                totalDeclines: newDeclineCount,
                currentOfferDriverId: null,
                offerSentAt: null,
                offerExpiresAt: null
            }
        });
        // Check if we should try another round or escalate
        const currentRound = load.offerRound;
        const declinesThisRound = await shared_db_1.prisma.loadOfferRecord.count({
            where: {
                loadId,
                round: currentRound,
                status: 'DECLINED'
            }
        });
        if (declinesThisRound >= MAX_DECLINES_PER_ROUND && currentRound < MAX_OFFER_ROUNDS) {
            // Start new round immediately
            await dispatchLoad(loadId);
        }
        else if (currentRound >= MAX_OFFER_ROUNDS) {
            // Max rounds reached - escalate
            await escalateUnmatchedLoad(loadId);
        }
        return {
            success: true,
            loadId,
            driverId,
            action: 'DECLINED'
        };
    }
    catch (error) {
        console.error('Decline offer error:', error);
        return {
            success: false,
            loadId,
            driverId,
            action: 'DECLINED',
            error: error instanceof Error ? error.message : 'Unknown decline offer error'
        };
    }
}
/**
 * Process expired offers and trigger next actions
 */
async function handleExpiredOffers() {
    const result = {
        processedCount: 0,
        escalatedLoads: [],
        errors: []
    };
    try {
        // Find all expired pending offers
        const expiredOffers = await shared_db_1.prisma.loadOfferRecord.findMany({
            where: {
                status: 'PENDING',
                expiresAt: {
                    lte: new Date()
                }
            },
            include: {
                load: true
            }
        });
        for (const offer of expiredOffers) {
            try {
                // Mark offer as expired
                await shared_db_1.prisma.loadOfferRecord.update({
                    where: { id: offer.id },
                    data: { status: 'EXPIRED' }
                });
                // Update load decline count
                const load = offer.load;
                const newDeclineCount = load.totalDeclines + 1;
                await shared_db_1.prisma.load.update({
                    where: { id: load.id },
                    data: {
                        totalDeclines: newDeclineCount,
                        currentOfferDriverId: null,
                        offerSentAt: null,
                        offerExpiresAt: null
                    }
                });
                // Check if we should try another round or escalate
                const currentRound = load.offerRound;
                const declinesThisRound = await shared_db_1.prisma.loadOfferRecord.count({
                    where: {
                        loadId: load.id,
                        round: currentRound,
                        status: { in: ['DECLINED', 'EXPIRED'] }
                    }
                });
                if (declinesThisRound >= MAX_DECLINES_PER_ROUND && currentRound < MAX_OFFER_ROUNDS) {
                    // Start new round
                    await dispatchLoad(load.id);
                }
                else if (currentRound >= MAX_OFFER_ROUNDS) {
                    // Max rounds reached - escalate
                    await escalateUnmatchedLoad(load.id);
                    result.escalatedLoads.push(load.id);
                }
                result.processedCount++;
            }
            catch (offerError) {
                const errorMsg = `Failed to process expired offer ${offer.id}: ${offerError instanceof Error ? offerError.message : 'Unknown error'}`;
                result.errors.push(errorMsg);
                console.error(errorMsg);
            }
        }
    }
    catch (error) {
        const errorMsg = `Failed to handle expired offers: ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(errorMsg);
        console.error(errorMsg);
    }
    return result;
}
/**
 * Escalate unmatched load to manual intervention
 */
async function escalateUnmatchedLoad(loadId) {
    try {
        // Update load status back to OPEN for manual intervention
        await shared_db_1.prisma.load.update({
            where: { id: loadId },
            data: {
                status: 'OPEN',
                dispatchAttempts: {
                    increment: 1
                },
                currentOfferDriverId: null,
                offerSentAt: null,
                offerExpiresAt: null
            }
        });
        // Wire to notification engine — notify ops team of escalation
        try {
            const notificationEngineUrl = process.env.NOTIFICATION_ENGINE_URL || 'http://localhost:3013';
            await fetch(`${notificationEngineUrl}/internal/sms`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: process.env.OPS_ALERT_PHONE || '+251911000000',
                    message: `Load ${loadId} requires manual dispatch intervention. All offer rounds exhausted.`,
                    template: null
                })
            });
        }
        catch (notifyErr) {
            console.error('Failed to notify ops of escalation:', notifyErr);
        }
        console.log(`Load ${loadId} escalated for manual dispatch intervention`);
    }
    catch (error) {
        console.error(`Failed to escalate load ${loadId}:`, error);
        throw error;
    }
}
// ════════════════════════════════════════════════════════════════════════════
// EXPORT SERVICE OBJECT
// ════════════════════════════════════════════════════════════════════════════
exports.dispatchService = {
    dispatchLoad,
    acceptOffer,
    declineOffer,
    handleExpiredOffers,
    escalateUnmatchedLoad
};
//# sourceMappingURL=dispatch.service.js.map