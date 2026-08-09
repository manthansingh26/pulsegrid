import { AlertTriangle } from 'lucide-react';
import { useLiveServices } from '../hooks/useLiveServices';
import { LoadingState, ErrorState, EmptyState } from '../components/ui';
import { ServicesTable } from '../components/tables';

export default function ServicesPage() {
  const { services, statuses, statusError, loading, error } = useLiveServices();

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Services</h1>
      </div>

      {statusError && (
        <div className="warning-banner" role="status">
          <AlertTriangle size={16} />
          {statusError} — showing service list without live status.
        </div>
      )}

      <div className="card">
        {services.length === 0 ? (
          <EmptyState title="No services monitored yet." />
        ) : (
          <ServicesTable services={services} statuses={statuses} />
        )}
      </div>
    </div>
  );
}
