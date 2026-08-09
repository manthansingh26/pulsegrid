import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { fetchIncidents, type Incident } from '../api/client';
import { useLiveServices } from '../hooks/useLiveServices';
import { StatCard, LoadingState, ErrorState, EmptyState } from '../components/ui';
import { ServicesTable, IncidentsTable } from '../components/tables';

export default function Dashboard() {
  const { services, statuses, statusError, loading, error } = useLiveServices();
  const [incidents, setIncidents] = useState<Incident[]>([]);

  // Incidents come from PostgreSQL and are independent of Valkey.
  // Poll them (same cadence as before) so new incidents appear without a refresh;
  // failures are non-fatal and never break the dashboard.
  useEffect(() => {
    fetchIncidents(10)
      .then(setIncidents)
      .catch(() => {});
    const interval = setInterval(() => {
      fetchIncidents(10)
        .then(setIncidents)
        .catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  // When Valkey is unavailable we never fabricate counts - show a neutral dash.
  const up = statusError ? null : Object.values(statuses).filter((s) => s.status === 'up').length;
  const degraded = statusError ? null : Object.values(statuses).filter((s) => s.status === 'degraded').length;
  const down = statusError ? null : Object.values(statuses).filter((s) => s.status === 'down').length;
  const openIncidents = incidents.filter((i) => i.status === 'open').length;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Global Dashboard</h1>
      </div>

      {statusError && (
        <div className="warning-banner" role="status">
          <AlertTriangle size={16} />
          {statusError} — showing service list without live status.
        </div>
      )}

      <div className="grid-cards">
        <StatCard label="Total Services" value={services.length} />
        <StatCard label="UP" value={up ?? '—'} />
        <StatCard label="DEGRADED" value={degraded ?? '—'} />
        <StatCard label="DOWN" value={down ?? '—'} />
        <StatCard label="OPEN INCIDENTS" value={openIncidents} />
      </div>

      <div className="card">
        <h2 className="card-title">Services</h2>
        {services.length === 0 ? (
          <EmptyState title="No services monitored yet." />
        ) : (
          <ServicesTable services={services} statuses={statuses} />
        )}
      </div>

      {incidents.length > 0 && (
        <div className="card" style={{ marginTop: '2rem' }}>
          <h2 className="card-title">Recent Incidents</h2>
          <IncidentsTable incidents={incidents} />
        </div>
      )}
    </div>
  );
}
