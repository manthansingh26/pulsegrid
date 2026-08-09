import { Router } from 'express';
import { pool } from '../db/index';
import { valkey } from '../valkey';

export const servicesRouter = Router();

// Validation helper
const isValidUrl = (urlString: string) => {
  try {
    new URL(urlString);
    return true;
  } catch (e) {
    return false;
  }
};

// GET /services - Return active services
servicesRouter.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM services WHERE is_active = true ORDER BY created_at DESC'
    );
    res.status(200).json(rows);
  } catch (err) {
    console.error('Error fetching services:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /services - Create a service
servicesRouter.post('/', async (req, res) => {
  try {
    const { name, url, check_interval_seconds, description, owner_id, region_label } = req.body;

    // Validate
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!url || typeof url !== 'string' || !isValidUrl(url)) {
      return res.status(400).json({ error: 'A valid URL is required' });
    }
    
    const interval = check_interval_seconds !== undefined ? parseInt(check_interval_seconds, 10) : 60;
    if (isNaN(interval) || interval < 30 || interval > 300) {
      return res.status(400).json({ error: 'check_interval_seconds must be between 30 and 300' });
    }

    const region = region_label || 'default';
    
    const query = `
      INSERT INTO services (name, url, check_interval_seconds, description, owner_id, region_label, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING *;
    `;
    const values = [name, url, interval, description || null, owner_id || null, region];

    const { rows } = await pool.query(query, values);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating service:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /services/status - Return current status from Valkey for all services
servicesRouter.get('/status', async (req, res) => {
  try {
    const keys = await valkey.keys('pulsegrid:service:*:status');
    if (keys.length === 0) {
      return res.status(200).json([]);
    }

    const values = await valkey.mget(keys);
    const statuses = values
      .filter((val) => val !== null)
      .map((val) => JSON.parse(val as string));

    res.status(200).json(statuses);
  } catch (err) {
    console.error('Error fetching current statuses from Valkey:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /services/:id - Return one active service
servicesRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      'SELECT * FROM services WHERE id = $1 AND is_active = true',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.status(200).json(rows[0]);
  } catch (err) {
    console.error('Error fetching service:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /services/:id - Update a service
servicesRouter.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, url, check_interval_seconds, description, region_label, is_active } = req.body;

    const currentService = await pool.query('SELECT * FROM services WHERE id = $1', [id]);
    if (currentService.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    const updates: string[] = [];
    const values: any[] = [];
    let argCounter = 1;

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'Name cannot be empty' });
      }
      updates.push(`name = $${argCounter++}`);
      values.push(name);
    }

    if (url !== undefined) {
      if (typeof url !== 'string' || !isValidUrl(url)) {
        return res.status(400).json({ error: 'A valid URL is required' });
      }
      updates.push(`url = $${argCounter++}`);
      values.push(url);
    }

    if (check_interval_seconds !== undefined) {
      const interval = parseInt(check_interval_seconds, 10);
      if (isNaN(interval) || interval < 30 || interval > 300) {
        return res.status(400).json({ error: 'check_interval_seconds must be between 30 and 300' });
      }
      updates.push(`check_interval_seconds = $${argCounter++}`);
      values.push(interval);
    }

    if (description !== undefined) {
      updates.push(`description = $${argCounter++}`);
      values.push(description);
    }

    if (region_label !== undefined) {
      updates.push(`region_label = $${argCounter++}`);
      values.push(region_label);
    }
    
    if (is_active !== undefined) {
      updates.push(`is_active = $${argCounter++}`);
      values.push(Boolean(is_active));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update' });
    }

    updates.push(`updated_at = NOW()`);

    const query = `
      UPDATE services
      SET ${updates.join(', ')}
      WHERE id = $${argCounter}
      RETURNING *;
    `;
    values.push(id);

    const { rows } = await pool.query(query, values);
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error('Error updating service:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /services/:id - Soft delete a service
servicesRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const currentService = await pool.query('SELECT * FROM services WHERE id = $1 AND is_active = true', [id]);
    if (currentService.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    await pool.query(
      'UPDATE services SET is_active = false, updated_at = NOW() WHERE id = $1',
      [id]
    );

    res.status(204).send();
  } catch (err) {
    console.error('Error soft deleting service:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /services/:id/dependencies - Create a dependency
servicesRouter.post('/:id/dependencies', async (req, res) => {
  try {
    const { id } = req.params;
    const { depends_on_service_id } = req.body;

    if (!depends_on_service_id) {
      return res.status(400).json({ error: 'depends_on_service_id is required' });
    }

    if (id === String(depends_on_service_id)) {
      return res.status(400).json({ error: 'A service cannot depend on itself' });
    }

    // Verify both services exist and are active
    const sourceService = await pool.query('SELECT id FROM services WHERE id = $1 AND is_active = true', [id]);
    if (sourceService.rows.length === 0) {
      return res.status(404).json({ error: 'Source service not found or inactive' });
    }

    const targetService = await pool.query('SELECT id FROM services WHERE id = $1 AND is_active = true', [depends_on_service_id]);
    if (targetService.rows.length === 0) {
      return res.status(404).json({ error: 'Target dependency service not found or inactive' });
    }

    // Insert dependency
    try {
      await pool.query(
        'INSERT INTO dependencies (service_id, depends_on_service_id, created_at) VALUES ($1, $2, NOW())',
        [id, depends_on_service_id]
      );
      res.status(201).json({ message: 'Dependency created successfully' });
    } catch (dbErr: any) {
      if (dbErr.code === '23505') { // Unique violation
        return res.status(409).json({ error: 'Dependency already exists' });
      }
      throw dbErr;
    }
  } catch (err) {
    console.error('Error creating dependency:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /services/:id/dependencies - List dependencies
servicesRouter.get('/:id/dependencies', async (req, res) => {
  try {
    const { id } = req.params;

    // Outgoing dependencies (services this service depends on)
    const outgoingResult = await pool.query(`
      SELECT s.id, s.name, s.url, s.is_active, d.created_at as dependency_created_at
      FROM dependencies d
      JOIN services s ON d.depends_on_service_id = s.id
      WHERE d.service_id = $1
    `, [id]);

    // Incoming dependencies (services that depend on this service)
    const incomingResult = await pool.query(`
      SELECT s.id, s.name, s.url, s.is_active, d.created_at as dependency_created_at
      FROM dependencies d
      JOIN services s ON d.service_id = s.id
      WHERE d.depends_on_service_id = $1
    `, [id]);

    res.status(200).json({
      outgoing: outgoingResult.rows,
      incoming: incomingResult.rows
    });
  } catch (err) {
    console.error('Error fetching dependencies:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /services/:id/dependencies/:dependencyId - Remove a dependency
servicesRouter.delete('/:id/dependencies/:dependencyId', async (req, res) => {
  try {
    const { id, dependencyId } = req.params;

    const result = await pool.query(
      'DELETE FROM dependencies WHERE service_id = $1 AND depends_on_service_id = $2 RETURNING *',
      [id, dependencyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dependency not found' });
    }

    res.status(204).send();
  } catch (err) {
    console.error('Error deleting dependency:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /services/:id/checks - List recent checks
servicesRouter.get('/:id/checks', async (req, res) => {
  try {
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const { rows } = await pool.query(
      'SELECT status, latency_ms, http_status_code, error_message, region, checked_at FROM checks WHERE service_id = $1 ORDER BY checked_at DESC LIMIT $2',
      [id, limit]
    );

    res.status(200).json(rows);
  } catch (err) {
    console.error('Error fetching checks:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /services/:id/stats - Uptime and latency statistics
servicesRouter.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    
    // We calculate stats for 1h, 24h, 7d
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM checks WHERE service_id = $1 AND checked_at >= NOW() - INTERVAL '1 hour') as total_1h,
        (SELECT COUNT(*) FROM checks WHERE service_id = $1 AND status = 'up' AND checked_at >= NOW() - INTERVAL '1 hour') as up_1h,
        (SELECT AVG(latency_ms) FROM checks WHERE service_id = $1 AND checked_at >= NOW() - INTERVAL '1 hour') as latency_1h,
        
        (SELECT COUNT(*) FROM checks WHERE service_id = $1 AND checked_at >= NOW() - INTERVAL '24 hours') as total_24h,
        (SELECT COUNT(*) FROM checks WHERE service_id = $1 AND status = 'up' AND checked_at >= NOW() - INTERVAL '24 hours') as up_24h,
        (SELECT AVG(latency_ms) FROM checks WHERE service_id = $1 AND checked_at >= NOW() - INTERVAL '24 hours') as latency_24h,
        
        (SELECT COUNT(*) FROM checks WHERE service_id = $1 AND checked_at >= NOW() - INTERVAL '7 days') as total_7d,
        (SELECT COUNT(*) FROM checks WHERE service_id = $1 AND status = 'up' AND checked_at >= NOW() - INTERVAL '7 days') as up_7d,
        (SELECT AVG(latency_ms) FROM checks WHERE service_id = $1 AND checked_at >= NOW() - INTERVAL '7 days') as latency_7d
    `;
    
    const { rows } = await pool.query(query, [id]);
    const r = rows[0];

    const formatStat = (total: number, up: number, latency: string | null) => ({
      uptime_percentage: total > 0 ? Number(((up / total) * 100).toFixed(2)) : null,
      avg_latency_ms: latency ? Math.round(Number(latency)) : null
    });

    res.status(200).json({
      '1h': formatStat(Number(r.total_1h), Number(r.up_1h), r.latency_1h),
      '24h': formatStat(Number(r.total_24h), Number(r.up_24h), r.latency_24h),
      '7d': formatStat(Number(r.total_7d), Number(r.up_7d), r.latency_7d),
    });
  } catch (err) {
    console.error('Error calculating stats:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
