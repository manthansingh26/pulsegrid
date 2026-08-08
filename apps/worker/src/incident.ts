import { pool } from './db';
import { populateIncidentBlastRadius } from './blastRadius';

type IncidentTriggerStatus = 'up' | 'degraded' | 'down';

export async function handleIncidentCreation(serviceId: number, status: IncidentTriggerStatus) {
  // Only trigger incident logic for 'down' state as per Phase 3B requirements.
  if (status !== 'down') {
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Lock the service row to serialize incident creation for this specific service.
    // This safely prevents race conditions without needing a schema change (like a UNIQUE constraint).
    await client.query('SELECT id FROM services WHERE id = $1 FOR UPDATE', [serviceId]);

    // 2. Determine if an open incident already exists for this root service.
    const openIncidentRes = await client.query(
      `SELECT id FROM incidents WHERE root_service_id = $1 AND status = 'open' LIMIT 1`,
      [serviceId]
    );

    let incidentId: number;

    if (openIncidentRes.rows.length > 0) {
      // Reuse existing open incident
      incidentId = openIncidentRes.rows[0].id;
    } else {
      // 3. Create a new incident
      // Determine severity based on PRD: "critical if root is down, warning if only degraded"
      const severity = status === 'down' ? 'critical' : 'warning';
      
      const insertIncidentRes = await client.query(
        `INSERT INTO incidents (root_service_id, status, severity, started_at, created_at, updated_at)
         VALUES ($1, 'open', $2, NOW(), NOW(), NOW())
         RETURNING id`,
        [serviceId, severity]
      );
      
      incidentId = insertIncidentRes.rows[0].id;

      // 4. Create incident_services row for the root service
      await client.query(
        `INSERT INTO incident_services (incident_id, service_id, role, created_at)
         VALUES ($1, $2, 'root', NOW())
         ON CONFLICT (incident_id, service_id) DO NOTHING`,
        [incidentId, serviceId]
      );
      
      console.log(`[worker] Created new incident=${incidentId} for root_service=${serviceId}`);
    }

    // 5. Populate incident blast radius (affected downstream services)
    await populateIncidentBlastRadius(client, incidentId, serviceId);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`[worker] Error handling incident creation for service=${serviceId}:`, err);
  } finally {
    client.release();
  }
}
