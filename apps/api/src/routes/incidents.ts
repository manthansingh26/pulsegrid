import { Router } from 'express';
import { pool } from '../db/index';

export const incidentsRouter = Router();

// GET /incidents - List recent incidents
incidentsRouter.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const query = `
      SELECT 
        i.id,
        i.root_service_id,
        s.name as root_service_name,
        i.status,
        i.severity,
        i.started_at,
        i.resolved_at,
        i.updated_at
      FROM incidents i
      JOIN services s ON i.root_service_id = s.id
      ORDER BY i.started_at DESC
      LIMIT $1
    `;
    const { rows } = await pool.query(query, [limit]);

    res.status(200).json(rows);
  } catch (err) {
    console.error('Error fetching incidents:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /incidents/:id/timeline - Chronological check events for the incident period
incidentsRouter.get('/:id/timeline', async (req, res) => {
  try {
    const { id } = req.params;

    // Incident period: started_at -> resolved_at (or now for open incidents)
    const incidentRes = await pool.query(
      'SELECT started_at, COALESCE(resolved_at, NOW()) AS end_at FROM incidents WHERE id = $1',
      [id]
    );

    if (incidentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    const { started_at, end_at } = incidentRes.rows[0];

    // Real check events for the incident's services (root + affected) during the incident window.
    // Single query, fully parameterized - no N+1. The inner query keeps the 1000 most recent
    // events so a long-running open incident never drops its newest events; the outer query
    // returns them in chronological order.
    const { rows } = await pool.query(
      `SELECT * FROM (
         SELECT
           c.service_id,
           s.name AS service_name,
           c.status,
           c.latency_ms,
           c.http_status_code,
           c.error_message,
           c.region,
           c.checked_at
         FROM checks c
         JOIN incident_services iserv ON iserv.incident_id = $1 AND iserv.service_id = c.service_id
         JOIN services s ON s.id = c.service_id
         WHERE c.checked_at >= $2 AND c.checked_at <= $3
         ORDER BY c.checked_at DESC
         LIMIT 1000
       ) recent
       ORDER BY checked_at ASC`,
      [id, started_at, end_at]
    );

    res.status(200).json(rows);
  } catch (err) {
    console.error('Error fetching incident timeline:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /incidents/:id - Get incident details + blast radius
incidentsRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch incident base details
    const incidentQuery = `
      SELECT 
        i.id,
        i.root_service_id,
        s.name as root_service_name,
        i.status,
        i.severity,
        i.started_at,
        i.resolved_at,
        i.updated_at
      FROM incidents i
      JOIN services s ON i.root_service_id = s.id
      WHERE i.id = $1
    `;
    const incidentRes = await pool.query(incidentQuery, [id]);

    if (incidentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    const incident = incidentRes.rows[0];

    // Fetch affected services
    const servicesQuery = `
      SELECT 
        s.id,
        s.name,
        s.url,
        iserv.role
      FROM incident_services iserv
      JOIN services s ON iserv.service_id = s.id
      WHERE iserv.incident_id = $1
    `;
    const servicesRes = await pool.query(servicesQuery, [id]);

    incident.affected_services = servicesRes.rows;

    res.status(200).json(incident);
  } catch (err) {
    console.error('Error fetching incident:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
