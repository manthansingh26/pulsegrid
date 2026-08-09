export interface Service {
  id: number;
  name: string;
  url: string;
  check_interval_seconds: number;
  description: string;
  is_active: boolean;
  region_label: string;
}

export interface ServiceStatus {
  service_id: number;
  status: 'up' | 'degraded' | 'down';
  latency_ms: number;
  updated_at: string;
}

export interface Incident {
  id: number;
  root_service_id: number;
  root_service_name: string;
  status: 'open' | 'resolved';
  severity: 'critical' | 'warning';
  started_at: string;
  resolved_at: string | null;
  updated_at: string;
  affected_services?: Array<{
    id: number;
    name: string;
    url: string;
    role: 'root' | 'affected';
  }>;
}

export interface HistoricalCheck {
  status: 'up' | 'degraded' | 'down';
  latency_ms: number;
  http_status_code: number;
  error_message: string;
  region: string;
  checked_at: string;
}

export interface ServiceStats {
  '1h': { uptime_percentage: number | null; avg_latency_ms: number | null };
  '24h': { uptime_percentage: number | null; avg_latency_ms: number | null };
  '7d': { uptime_percentage: number | null; avg_latency_ms: number | null };
}

export interface TimelineEvent {
  service_id: number;
  service_name: string;
  status: 'up' | 'degraded' | 'down';
  latency_ms: number | null;
  http_status_code: number | null;
  error_message: string | null;
  region: string | null;
  checked_at: string;
}

export const fetchServices = async (): Promise<Service[]> => {
  const res = await fetch('/api/services');
  if (!res.ok) throw new Error('Failed to fetch services');
  return res.json();
};

export const fetchServiceStatuses = async (): Promise<ServiceStatus[]> => {
  const res = await fetch('/api/services/status');
  if (!res.ok) throw new Error('Failed to fetch statuses');
  return res.json();
};

export const fetchServiceDetails = async (id: number): Promise<Service> => {
  const res = await fetch(`/api/services/${id}`);
  if (!res.ok) throw new Error('Failed to fetch service');
  return res.json();
};

export const fetchDependencies = async (id: number) => {
  const res = await fetch(`/api/services/${id}/dependencies`);
  if (!res.ok) throw new Error('Failed to fetch dependencies');
  return res.json();
};

export const fetchHistoricalChecks = async (id: number): Promise<HistoricalCheck[]> => {
  const res = await fetch(`/api/services/${id}/checks?limit=100`);
  if (!res.ok) throw new Error('Failed to fetch historical checks');
  return res.json();
};

export const fetchServiceStats = async (id: number): Promise<ServiceStats> => {
  const res = await fetch(`/api/services/${id}/stats`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
};

export const fetchIncidents = async (limit = 20): Promise<Incident[]> => {
  const res = await fetch(`/api/incidents?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch incidents');
  return res.json();
};

export const fetchIncidentDetails = async (id: number): Promise<Incident> => {
  const res = await fetch(`/api/incidents/${id}`);
  if (!res.ok) throw new Error('Failed to fetch incident details');
  return res.json();
};

export const fetchIncidentTimeline = async (id: number): Promise<TimelineEvent[]> => {
  const res = await fetch(`/api/incidents/${id}/timeline`);
  if (!res.ok) throw new Error('Failed to fetch incident timeline');
  return res.json();
};
