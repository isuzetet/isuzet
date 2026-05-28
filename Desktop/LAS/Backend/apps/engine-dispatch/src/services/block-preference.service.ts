import 'dotenv/config';
import { prisma, generateId } from '@ruit/shared-db';
import { BlockPreferenceType } from '@prisma/client';

export interface BlockPreferenceResult {
  blocked: boolean;
  preferred: boolean;
}

/**
 * Check if two users have a mutual block or preference relationship
 * Returns blocked=true if either user has blocked the other
 * Returns preferred=true if both are preferred (mutual)
 */
export async function checkBlockPreference(
  fromUserId: string,
  toUserId: string
): Promise<BlockPreferenceResult> {
  try {
    // Check both directions for block
    const fromBlocks = await prisma.loadBlockPreference.findUnique({
      where: { fromUserId_toUserId: { fromUserId, toUserId } },
    });

    const toBlocks = await prisma.loadBlockPreference.findUnique({
      where: { fromUserId_toUserId: { fromUserId: toUserId, toUserId: fromUserId } },
    });

    const blocked = 
      (fromBlocks?.type === 'BLOCKED') || 
      (toBlocks?.type === 'BLOCKED');

    // Check for mutual PREFERRED (both must have marked each other as PREFERRED)
    const mutualPreferred = 
      fromBlocks?.type === 'PREFERRED' && 
      toBlocks?.type === 'PREFERRED';

    return {
      blocked,
      preferred: !!mutualPreferred,
    };
  } catch (error) {
    console.error('[BlockPreference] checkBlockPreference error:', error);
    return { blocked: false, preferred: false };
  }
}

/**
 * Set a block or preference for a user pair
 * Upsert LoadBlockPreference record
 * If BLOCKED and user now blocked by 5+ orderers: create OPS alert
 */
export async function setBlockPreference(data: {
  fromUserId: string;
  toUserId: string;
  type: BlockPreferenceType;
  reason?: string;
}): Promise<{ success: boolean; error?: { code: string; message: string } }> {
  try {
    const { fromUserId, toUserId, type, reason } = data;

    // Validate
    if (!fromUserId || !toUserId) {
      return {
        success: false,
        error: { code: 'INVALID_PARAMS', message: 'fromUserId and toUserId required' },
      };
    }

    if (fromUserId === toUserId) {
      return {
        success: false,
        error: { code: 'INVALID_PARAMS', message: 'Cannot block yourself' },
      };
    }

    // Upsert the preference
    const prefId = generateId('pref');
    await prisma.loadBlockPreference.upsert({
      where: { fromUserId_toUserId: { fromUserId, toUserId } },
      update: { type, reason },
      create: {
        id: prefId,
        fromUserId,
        toUserId,
        type,
        reason,
      },
    });

    // If blocking, check if this user (toUserId) is now blocked by 5+ users (potential orderers)
    if (type === 'BLOCKED') {
      const blockCount = await prisma.loadBlockPreference.count({
        where: {
          toUserId,
          type: 'BLOCKED',
        },
      });

      // If this is the 5th block, create an OPS alert
      if (blockCount >= 5) {
        // Create an alert for OPS (could be a log or alert record)
        console.warn(`[BlockPreference] User ${toUserId} has been blocked by ${blockCount} users. OPS alert needed.`);
        
        // In a production system, we might create an OpsAlert record or send a notification
        // For now, we log it and OPS can monitor the logs
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('[BlockPreference] setBlockPreference error:', error);
    return {
      success: false,
      error: {
        code: 'SET_BLOCK_PREFERENCE_FAILED',
        message: error.message,
      },
    };
  }
}

/**
 * Get all block/preference records for a user
 */
export async function getBlockPreferenceList(userId: string, direction: 'outgoing' | 'incoming' = 'outgoing'): Promise<any[]> {
  try {
    if (direction === 'outgoing') {
      // Get preferences set BY this user
      return await prisma.loadBlockPreference.findMany({
        where: { fromUserId: userId },
      });
    } else {
      // Get preferences set ABOUT this user
      return await prisma.loadBlockPreference.findMany({
        where: { toUserId: userId },
      });
    }
  } catch (error: any) {
    console.error('[BlockPreference] getBlockPreferenceList error:', error);
    return [];
  }
}
