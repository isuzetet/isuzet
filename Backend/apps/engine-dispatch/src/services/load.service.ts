/**
 * ISUZET Load Management Service
 * Handles load status transitions and dispatches loads for matching
 */

import { prisma } from '@ruit/shared-db';
import { dispatchService } from './dispatch.service';

export const loadService = {
  /**
   * Transition load to MATCHING status and trigger dispatch
   */
  async transitionToMatching(loadId: string): Promise<{ success: boolean; dispatched?: boolean; error?: string }> {
    console.log(`[LoadService] Transitioning load ${loadId} to MATCHING status`);

    // Update load status to READY_TO_MATCH
    const updatedLoad = await prisma.load.update({
      where: { id: loadId },
      data: { status: 'READY_TO_MATCH' },
    });

    if (!updatedLoad) {
      return { success: false, error: 'Load not found' };
    }

    // Trigger dispatch
    try {
      const dispatchResult = await dispatchService.dispatchLoad(loadId);
      return {
        success: true,
        dispatched: dispatchResult.success
      };
    } catch (error: any) {
      console.error(`[LoadService] Dispatch failed for load ${loadId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Get load status
   */
  async getLoadStatus(loadId: string): Promise<{ status: string | null; error?: string }> {
    try {
      const load = await prisma.load.findUnique({
        where: { id: loadId },
        select: { status: true },
      });

      if (!load) {
        return { status: null, error: 'Load not found' };
      }

      return { status: load.status };
    } catch (error: any) {
      return { status: null, error: error.message };
    }
  },

  /**
   * Update load status (general purpose)
   */
  async updateLoadStatus(loadId: string, newStatus: string): Promise<{ success: boolean; error?: string }> {
    try {
      await prisma.load.update({
        where: { id: loadId },
        data: { status: newStatus },
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
};