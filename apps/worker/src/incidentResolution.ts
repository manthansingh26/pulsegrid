import { pool } from './db';

export async function resolveIncidentIfRecovered(serviceId: number) {
  const client = await pool.connect();
  try {
    // Find all open incidents where this service is a participant
    const openIncidentsRes = await client.query(
      `SELECT i.id 
       FROM incidents i
       JOIN incident_services iserv ON i.id = iserv.incident_id
       WHERE iserv.service_id = $1 AND i.status = 'open'`,
      [serviceId]
    );

    const openIncidentIds = openIncidentsRes.rows.map(r => r.id);

    for (const incidentId of openIncidentIds) {
      await client.query('BEGIN');
      
      try {
        // Lock the incident row. If it was resolved concurrently, this returns 0 rows.
        const lockRes = await client.query(
          `SELECT id FROM incidents WHERE id = $1 AND status = 'open' FOR UPDATE`,
          [incidentId]
        );

        if (lockRes.rows.length === 0) {
          // Already resolved or doesn't exist
          await client.query('ROLLBACK');
          continue;
        }

        // Get the latest check status for ALL services participating in this incident
        const statusesRes = await client.query(
          `SELECT
            iserv.service_id,
            (
              SELECT status
              FROM checks
              WHERE checks.service_id = iserv.service_id
              ORDER BY checked_at DESC
              LIMIT 1
            ) as latest_status
           FROM incident_services iserv
           WHERE iserv.incident_id = $1`,
          [incidentId]
        );

        let allUp = true;
        let downCount = 0;
        for (const row of statusesRes.rows) {
          if (row.latest_status !== 'up') {
            allUp = false;
            downCount++;
          }
        }

        if (allUp) {
          await client.query(
            `UPDATE incidents 
             SET status = 'resolved', resolved_at = NOW(), updated_at = NOW() 
             WHERE id = $1`,
            [incidentId]
          );
          console.log(`[worker] Incident=${incidentId} resolved; all services recovered`);
        } else {
          console.log(`[worker] Incident=${incidentId} remains open; ${downCount} services are still down`);
        }

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[worker] Error resolving incident=${incidentId}:`, err);
      }
    }
  } catch (err) {
    console.error(`[worker] Error finding open incidents for service=${serviceId}:`, err);
  } finally {
    client.release();
  }
}
