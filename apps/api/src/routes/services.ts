import { Router } from 'express';
import { pool } from '../db/index';

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
