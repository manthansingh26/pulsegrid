import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { AlertTriangle } from 'lucide-react';
import {
  fetchIncidentDetails,
  fetchIncidentTimeline,
  type Incident,
  type TimelineEvent,
} from '../api/client';
import { LoadingState, ErrorState, StatusBadge } from '../components/ui';

export default function IncidentDetail() {
  const { id } = useParams();
  const incidentId = parseInt(id as string, 10);

  const [incident, setIncident] = useState<Incident | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [timelineError, setTimelineError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchIncidentDetails(incidentId)
      .then(setIncident)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    fetchIncidentTimeline(incidentId)
      .then(setTimeline)
      .catch(() => setTimelineError('Timeline temporarily unavailable'));
  }, [incidentId]);

  if (loading) return <LoadingState />;
  if (error || !incident) return <ErrorState message={error || 'Not found'} />;

  const rootServices = incident.affected_services?.filter((s) => s.role === 'root') || [];
  const affectedServices = incident.affected_services?.filter((s) => s.role === 'affected') || [];

  return (
    <div>
      <Link to="/" className="back-link">← Back to Dashboard</Link>

      <div className="page-header">
        <div>
          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="page-title">INC-{incident.id}</h1>
            <span className={`status-badge ${incident.status === 'open' ? 'down' : 'up'}`}>
              {incident.status}
            </span>
            <span
              className="status-badge unknown"
              style={{
                backgroundColor:
                  incident.severity === 'critical'
                    ? 'rgba(239, 68, 68, 0.2)'
                    : 'rgba(245, 158, 11, 0.2)',
              }}
            >
              {incident.severity}
            </span>
          </div>
          <div className="text-muted mt-4">
            Started: {format(new Date(incident.started_at), 'yyyy-MM-dd HH:mm:ss')}{' '}
            {incident.resolved_at &&
              ` • Resolved: ${format(new Date(incident.resolved_at), 'yyyy-MM-dd HH:mm:ss')}`}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Blast Radius</h2>

        <div style={{ marginBottom: '2rem' }}>
          <h3 className="text-sm text-muted mb-4 uppercase" style={{ fontWeight: 600, letterSpacing: '0.05em' }}>
            Root Cause
          </h3>
          {rootServices.map((s) => (
            <div key={s.id} className="mb-4">
              <Link to={`/services/${s.id}`} className="font-semibold" style={{ fontSize: '1.125rem' }}>
                {s.name}
              </Link>
              <div className="text-sm text-muted">{s.url}</div>
            </div>
          ))}
        </div>

        <div>
          <h3 className="text-sm text-muted mb-4 uppercase" style={{ fontWeight: 600, letterSpacing: '0.05em' }}>
            Affected Services
          </h3>
          {affectedServices.length === 0 ? (
            <div className="text-sm text-muted">No downstream services affected.</div>
          ) : (
            <ul style={{ listStyleType: 'none' }}>
              {affectedServices.map((s) => (
                <li key={s.id} className="mb-4">
                  <Link to={`/services/${s.id}`} className="font-semibold">
                    {s.name}
                  </Link>
                  <div className="text-sm text-muted">{s.url}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Incident Timeline</h2>

        {timelineError && (
          <div className="warning-banner" role="status">
            <AlertTriangle size={16} />
            {timelineError}
          </div>
        )}

        {!timelineError && timeline.length === 0 && (
          <div className="text-sm text-muted">No check events recorded during the incident period.</div>
        )}

        <div className="timeline">
          <div className="timeline-item marker">
            <div className="timeline-time">
              {format(new Date(incident.started_at), 'HH:mm:ss')}
            </div>
            <div className="timeline-content">
              <span className="font-semibold">Incident OPENED</span>
              <span className="text-muted text-sm">{incident.root_service_name}</span>
            </div>
          </div>

          {timeline.map((ev) => (
            <div key={`${ev.checked_at}-${ev.service_id}`} className={`timeline-item ${ev.status}`}>
              <div className="timeline-time">{format(new Date(ev.checked_at), 'HH:mm:ss')}</div>
              <div className="timeline-content">
                <Link to={`/services/${ev.service_id}`} className="font-semibold">
                  {ev.service_name}
                </Link>
                <StatusBadge status={ev.status} />
                {ev.latency_ms != null && <span className="text-sm text-muted">{ev.latency_ms}ms</span>}
                {ev.http_status_code != null && (
                  <span className="text-sm text-muted">HTTP {ev.http_status_code}</span>
                )}
                {ev.error_message && (
                  <span className="text-sm text-muted timeline-error">{ev.error_message}</span>
                )}
              </div>
            </div>
          ))}

          {incident.status === 'resolved' && incident.resolved_at && (
            <div className="timeline-item marker">
              <div className="timeline-time">
                {format(new Date(incident.resolved_at), 'HH:mm:ss')}
              </div>
              <div className="timeline-content">
                <span className="font-semibold">Incident RESOLVED</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
