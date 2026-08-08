import { pool } from './db';
import { probeService } from './probe';

// We need to keep track of the last time we checked a service
const lastCheckTimes = new Map<number, number>();

export async function runScheduler() {
  console.log('[worker] Scheduler started. Checking for active services...');
  
  // The loop runs every 5 seconds to check if any service is due for a probe
  setInterval(async () => {
    try {
      // Fetch all active services
      const { rows: services } = await pool.query('SELECT * FROM services WHERE is_active = true');
      
      const now = Date.now();
      
      for (const service of services) {
        const lastCheck = lastCheckTimes.get(service.id) || 0;
        const intervalMs = (service.check_interval_seconds || 60) * 1000;
        
        // If it's time to check this service
        if (now - lastCheck >= intervalMs) {
          // Update the map immediately so we don't fire it multiple times concurrently
          lastCheckTimes.set(service.id, now);
          
          // Fire the probe asynchronously, do NOT await it here to prevent blocking other services
          probeService(service).catch(err => {
            console.error(`[worker] probe failed service=${service.name} error=`, err);
          });
        }
      }
    } catch (err) {
      console.error('[worker] Scheduler failed to fetch services', err);
    }
  }, 5000); 
}
