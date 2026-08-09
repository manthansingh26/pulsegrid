import { useEffect, useState } from 'react';
import { fetchIncidents, type Incident } from '../api/client';
import { LoadingState, ErrorState, EmptyState } from '../components/ui';
import { IncidentsTable } from '../components/tables';

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchIncidents(50)
      .then(setIncidents)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Incidents</h1>
      </div>

      <div className="card">
        {incidents.length === 0 ? (
          <EmptyState title="No incidents recorded." />
        ) : (
          <IncidentsTable incidents={incidents} />
        )}
      </div>
    </div>
  );
}
