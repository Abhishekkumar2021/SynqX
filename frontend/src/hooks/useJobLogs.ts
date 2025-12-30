import { useEffect, useRef, useState } from 'react';
import { getJobLogs, API_BASE_URL } from '@/lib/api';

export interface LogMessage {
  type: 'job_log' | 'step_log';
  id: number;
  level: string;
  message: string;
  timestamp: string;
  source: string;
  job_id?: number;
  step_run_id?: number;
}

export function useJobLogs(jobId: number | null) {
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch initial logs (history)
  useEffect(() => {
    if (!jobId) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLogs([]);
        return;
    }

    const fetchHistory = async () => {
        try {
            const history = await getJobLogs(jobId);
            setLogs(history);
        } catch (e) {
            console.error("Failed to fetch log history", e);
        }
    };

    fetchHistory();
  }, [jobId]);

  // Connect WebSocket for real-time updates
  useEffect(() => {
    if (!jobId) return;

    // Dynamically construct WS URL from API base
    const wsBase = API_BASE_URL.replace(/^http/, 'ws');
    const wsUrl = `${wsBase}/ws/jobs/${jobId}`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(`Connected to job logs: ${jobId}`);
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLogs((prev) => {
            // Avoid duplicates if message ID exists
            if (prev.some(l => l.id === data.id)) return prev;
            return [...prev, data];
        });
      } catch (err) {
        console.error('Failed to parse log message', err);
      }
    };

    ws.onclose = () => {
      console.log(`Disconnected from job logs: ${jobId}`);
      setIsConnected(false);
    };

    ws.onerror = (err) => {
      console.error('WebSocket error', err);
    };

    return () => {
      ws.close();
    };
  }, [jobId]);

  return { logs, isConnected };
}
