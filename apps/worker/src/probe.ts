import { pool } from './db';
import { handleIncidentCreation } from './incident';


const TIMEOUT_MS = 10000; // 10 seconds timeout

export type ProbeResult = 'up' | 'degraded' | 'down';

export async function probeService(service: any) {
  const { id: service_id, url, region_label: region, name } = service;

  console.log(`[worker] probing service=${name} (${url})`);

  const startTime = performance.now();
  let status: ProbeResult = 'down';
  let latency_ms: number | null = null;
  let http_status_code: number | null = null;
  let error_message: string | null = null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    // Perform the HTTP GET request.
    // Setting redirect: 'manual' to intercept 3xx responses natively for accurate classification.
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'manual'
    });

    clearTimeout(timeoutId);

    const endTime = performance.now();
    latency_ms = Math.round(endTime - startTime);
    http_status_code = response.status;

    if (http_status_code >= 200 && http_status_code < 300) {
      if (latency_ms > 2000) {
        status = 'degraded';
      } else {
        status = 'up';
      }
    } else if (http_status_code >= 300 && http_status_code < 400) {
      status = 'degraded';
    } else {
      status = 'down'; // 4xx, 5xx
    }

  } catch (err: any) {
    status = 'down';

    if (err.name === 'AbortError') {
      error_message = `Timeout after ${TIMEOUT_MS}ms`;
    } else {
      // Safe error description without exposing secrets
      error_message = err.message || 'Unknown network error';
    }
  }

  console.log(`[worker] result service=${name} status=${status} latency=${latency_ms}ms code=${http_status_code || 'N/A'} err=${error_message || 'none'}`);

  try {
    await pool.query(
      `INSERT INTO checks (service_id, status, latency_ms, http_status_code, error_message, region, checked_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [service_id, status, latency_ms, http_status_code, error_message, region]
    );

    if (status === 'down') {
      await handleIncidentCreation(service_id, status);
    }
  } catch (dbErr) {
    console.error(`[worker] Database or Incident operation failed for service=${name}`, dbErr);
  }
}
