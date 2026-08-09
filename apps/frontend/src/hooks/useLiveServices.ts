import { useCallback, useEffect, useState } from 'react';
import { fetchServices, fetchServiceStatuses, type Service, type ServiceStatus } from '../api/client';

const STATUS_UNAVAILABLE = 'Live status temporarily unavailable';

/**
 * Loads the service list and current (Valkey-backed) statuses independently.
 *
 * - The service list comes from PostgreSQL and never depends on Valkey.
 * - Statuses come from Valkey; when Valkey is unavailable the statuses stay
 *   empty and `statusError` is set so the UI can show a neutral "Unknown"
 *   state instead of fabricating up/down data.
 * - Polls statuses every 5s; polling stops on unmount.
 */
export function useLiveServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [statuses, setStatuses] = useState<Record<number, ServiceStatus>>({});
  const [statusError, setStatusError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    const [svcResult, stsResult] = await Promise.allSettled([
      fetchServices(),
      fetchServiceStatuses(),
    ]);

    if (svcResult.status === 'fulfilled') {
      setServices(svcResult.value);
      setError('');
    } else {
      setError(svcResult.reason?.message || 'Failed to load services');
    }

    if (stsResult.status === 'fulfilled') {
      const map: Record<number, ServiceStatus> = {};
      stsResult.value.forEach((s) => {
        map[s.service_id] = s;
      });
      setStatuses(map);
      setStatusError('');
    } else {
      setStatusError(STATUS_UNAVAILABLE);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();

    const interval = setInterval(() => {
      fetchServiceStatuses()
        .then((sts) => {
          setStatusError('');
          setStatuses((prev) => {
            const map = { ...prev };
            sts.forEach((s) => {
              map[s.service_id] = s;
            });
            return map;
          });
        })
        .catch(() => setStatusError(STATUS_UNAVAILABLE));
    }, 5000);

    return () => clearInterval(interval);
  }, [loadData]);

  return { services, statuses, statusError, loading, error };
}
