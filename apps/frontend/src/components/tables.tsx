import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { StatusBadge } from './ui';
import type { Service, ServiceStatus, Incident } from '../api/client';

export const ServicesTable = ({
  services,
  statuses,
}: {
  services: Service[];
  statuses: Record<number, ServiceStatus>;
}) => (
  <div className="table-container">
    <table>
      <thead>
        <tr>
          <th>Status</th>
          <th>Service</th>
          <th>Region</th>
          <th>Latency</th>
          <th>Last Checked</th>
        </tr>
      </thead>
      <tbody>
        {services.map((s) => {
          const st = statuses[s.id];
          return (
            <tr key={s.id}>
              <td>
                <StatusBadge status={st?.status} />
              </td>
              <td>
                <Link to={`/services/${s.id}`} style={{ fontWeight: 600 }}>
                  {s.name}
                </Link>
                <div className="text-sm text-muted">{s.url}</div>
              </td>
              <td>{s.region_label}</td>
              <td>{st?.latency_ms != null ? `${st.latency_ms}ms` : '-'}</td>
              <td className="text-sm text-muted">
                {st?.updated_at
                  ? formatDistanceToNow(new Date(st.updated_at), { addSuffix: true })
                  : 'Never'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

export const IncidentsTable = ({ incidents }: { incidents: Incident[] }) => (
  <div className="table-container">
    <table>
      <thead>
        <tr>
          <th>Incident</th>
          <th>Root Service</th>
          <th>Status</th>
          <th>Severity</th>
          <th>Started</th>
        </tr>
      </thead>
      <tbody>
        {incidents.map((inc) => (
          <tr key={inc.id}>
            <td>
              <Link to={`/incidents/${inc.id}`} style={{ fontWeight: 600 }}>
                INC-{inc.id}
              </Link>
            </td>
            <td>{inc.root_service_name}</td>
            <td>
              <span className={`status-badge ${inc.status === 'open' ? 'down' : 'up'}`}>
                {inc.status}
              </span>
            </td>
            <td>{inc.severity}</td>
            <td className="text-sm text-muted">
              {formatDistanceToNow(new Date(inc.started_at), { addSuffix: true })}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
