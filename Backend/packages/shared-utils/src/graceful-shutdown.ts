import { prisma } from '@ruit/shared-db';
import { getRedisClient } from './cache.js';

/**
 * Graceful shutdown handler for microservices
 * Cleanly closes connections and flushes pending work
 */
export class GracefulShutdown {
  private shutdownTimeout: number = 30000; // 30 seconds
  private isShuttingDown: boolean = false;
  private cleanupCallbacks: Array<() => Promise<void>> = [];

  constructor(timeoutMs?: number) {
    if (timeoutMs) {
      this.shutdownTimeout = timeoutMs;
    }
  }

  /**
   * Register callback to run during shutdown
   * Useful for custom cleanup (flushing job queues, etc.)
   */
  onShutdown(callback: () => Promise<void>): void {
    this.cleanupCallbacks.push(callback);
  }

  /**
   * Start listening for shutdown signals (SIGTERM, SIGINT)
   */
  start(): void {
    const signals = ['SIGTERM', 'SIGINT', 'SIGHUP'];
    
    for (const signal of signals) {
      process.on(signal, async () => {
        if (this.isShuttingDown) {
          console.warn(`[GRACEFUL_SHUTDOWN] ${signal} received again, forcing exit`);
          process.exit(1);
        }
        
        this.isShuttingDown = true;
        console.log(`[GRACEFUL_SHUTDOWN] ${signal} received, starting graceful shutdown...`);
        await this.shutdown();
      });
    }

    // Unhandled rejections should trigger shutdown
    process.on('uncaughtException', async (error) => {
      console.error('[GRACEFUL_SHUTDOWN] Uncaught exception, shutting down:', error);
      await this.shutdown();
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason, promise) => {
      console.error('[GRACEFUL_SHUTDOWN] Unhandled rejection, shutting down:', reason);
      await this.shutdown();
      process.exit(1);
    });
  }

  /**
   * Perform graceful shutdown
   */
  async shutdown(): Promise<void> {
    const timeoutId = setTimeout(() => {
      console.error('[GRACEFUL_SHUTDOWN] Shutdown timeout exceeded, forcing exit');
      process.exit(1);
    }, this.shutdownTimeout);

    try {
      // Run custom cleanup callbacks first (e.g., drain job queues)
      for (const callback of this.cleanupCallbacks) {
        try {
          console.log('[GRACEFUL_SHUTDOWN] Running cleanup callback...');
          await callback();
        } catch (error) {
          console.error('[GRACEFUL_SHUTDOWN] Cleanup callback failed:', error);
        }
      }

      // Close database connections
      try {
        console.log('[GRACEFUL_SHUTDOWN] Closing database connections...');
        await prisma.$disconnect();
      } catch (error) {
        console.error('[GRACEFUL_SHUTDOWN] Failed to close database:', error);
      }

      // Close Redis connections
      try {
        console.log('[GRACEFUL_SHUTDOWN] Closing cache connections...');
        const redis = getRedisClient();
        await redis.quit();
      } catch (error) {
        console.error('[GRACEFUL_SHUTDOWN] Failed to close cache:', error);
      }

      console.log('[GRACEFUL_SHUTDOWN] Shutdown complete');
      clearTimeout(timeoutId);
      process.exit(0);
    } catch (error) {
      console.error('[GRACEFUL_SHUTDOWN] Error during shutdown:', error);
      clearTimeout(timeoutId);
      process.exit(1);
    }
  }
}

/**
 * Create and start a graceful shutdown handler
 * Call once in your app main()
 * 
 * Example:
 * ```
 * const shutdown = setupGracefulShutdown();
 * shutdown.onShutdown(async () => {
 *   await queue.drain();
 * });
 * ```
 */
export function setupGracefulShutdown(timeoutMs?: number): GracefulShutdown {
  const shutdown = new GracefulShutdown(timeoutMs);
  shutdown.start();
  return shutdown;
}
