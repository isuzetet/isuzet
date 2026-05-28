// Root-level seed runner for proper module resolution
import { seedDefaultStrategy } from './apps/engine-strategy/src/seeds/default-strategy.seed';

console.log('[SEED] Running default strategy seed...');
seedDefaultStrategy()
  .then(() => {
    console.log('[SEED] Default strategy seed completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[SEED] Default strategy seed failed:', error);
    process.exit(1);
  });
