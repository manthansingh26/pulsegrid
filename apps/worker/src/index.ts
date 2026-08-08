import { runScheduler } from './scheduler';

console.log('[worker] Starting PulseGrid Worker Process');

runScheduler().catch(err => {
  console.error('[worker] Fatal error in scheduler', err);
  process.exit(1);
});
