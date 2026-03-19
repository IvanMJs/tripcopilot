import { useState, useEffect } from "react";

export type NotificationLogEntry = {
  type: string;
  sent_at: string;
};

export function useNotificationLog(flightId: string, enabled: boolean) {
  const [logs, setLogs] = useState<NotificationLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/notifications/log?flightId=${flightId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setLogs(data.logs ?? []);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [flightId, enabled]);

  return { logs, loading };
}
