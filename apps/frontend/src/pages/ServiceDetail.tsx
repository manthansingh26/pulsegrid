import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  fetchServiceDetails, 
  fetchServiceStatuses, 
  fetchDependencies,
  fetchHistoricalChecks,
  fetchServiceStats,
  type Service, 
  type ServiceStatus, 
  type HistoricalCheck,
  type ServiceStats
} from '../api/client';
import { StatCard, StatusBadge, LoadingState, ErrorState } from '../components/ui';

export default function ServiceDetail() {
  const { id } = useParams();
  const serviceId = parseInt(id as string, 10);
  
  const [service, setService] = useState<Service | null>(null);
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [dependencies, setDependencies] = useState<any>({ incoming: [], outgoing: [] });
  const [checks, setChecks] = useState<HistoricalCheck[]>([]);
  const [stats, setStats] = useState<ServiceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [svc, sts, deps, chks, stts] = await Promise.all([
        fetchServiceDetails(serviceId),
        fetchServiceStatuses(),
        fetchDependencies(serviceId),
        fetchHistoricalChecks(serviceId),
        fetchServiceStats(serviceId)
      ]);
      setService(svc);
      setStatus(sts.find(s => s.service_id === serviceId) || null);
      setDependencies(deps);
      setChecks(chks);
      setStats(stts);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      fetchServiceStatuses().then(sts => {
        setStatus(sts.find(s => s.service_id === serviceId) || null);
      }).catch(e => console.error("Poll err", e));
    }, 5000);
    return () => clearInterval(interval);
  }, [serviceId]);

  if (loading) return <LoadingState />;
  if (error || !service) return <ErrorState message={error || 'Not found'} />;

  return (
    <div>
      <Link to="/" className="back-link">← Back to Dashboard</Link>
      <div className="page-header">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="page-title">{service.name}</h1>
            <StatusBadge status={status?.status || 'unknown'} />
          </div>
          <div className="text-muted mt-4">
            {service.url} • Region: {service.region_label}
          </div>
        </div>
      </div>
      
      {service.description && (
        <div className="card mb-4">
          {service.description}
        </div>
      )}

      {stats && (
        <div className="grid-cards">
          <StatCard label="1h Uptime" value={stats['1h'].uptime_percentage != null ? `${stats['1h'].uptime_percentage}%` : 'N/A'} />
          <StatCard label="24h Uptime" value={stats['24h'].uptime_percentage != null ? `${stats['24h'].uptime_percentage}%` : 'N/A'} />
          <StatCard label="7d Uptime" value={stats['7d'].uptime_percentage != null ? `${stats['7d'].uptime_percentage}%` : 'N/A'} />
          <StatCard label="Avg Latency (24h)" value={stats['24h'].avg_latency_ms != null ? `${stats['24h'].avg_latency_ms}ms` : 'N/A'} />
        </div>
      )}

      <div className="detail-grid mb-4">
        <div className="card" style={{ marginBottom: 0 }}>
          <h2 className="card-title">Depends on (Outgoing)</h2>
          {dependencies.outgoing.length === 0 ? <span className="text-muted text-sm">No dependencies</span> : (
             <ul style={{ listStyleType: 'none' }}>
              {dependencies.outgoing.map((d: any) => (
                <li key={d.id} className="mb-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted">↓</span>
                    <Link to={`/services/${d.id}`} className="font-semibold">{d.name}</Link>
                  </div>
                </li>
              ))}
             </ul>
          )}
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <h2 className="card-title">Dependents (Incoming)</h2>
          {dependencies.incoming.length === 0 ? <span className="text-muted text-sm">No dependents</span> : (
             <ul style={{ listStyleType: 'none' }}>
              {dependencies.incoming.map((d: any) => (
                <li key={d.id} className="mb-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted">↑</span>
                    <Link to={`/services/${d.id}`} className="font-semibold">{d.name}</Link>
                  </div>
                </li>
              ))}
             </ul>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Recent Checks (PostgreSQL)</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Status</th>
                <th>Latency</th>
                <th>HTTP Code</th>
                <th>Error Message</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((chk, i) => (
                <tr key={i}>
                  <td className="text-sm">{format(new Date(chk.checked_at), 'yyyy-MM-dd HH:mm:ss')}</td>
                  <td><StatusBadge status={chk.status} /></td>
                  <td>{chk.latency_ms != null ? `${chk.latency_ms}ms` : '-'}</td>
                  <td>{chk.http_status_code || '-'}</td>
                  <td className="text-sm text-muted">{chk.error_message || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
