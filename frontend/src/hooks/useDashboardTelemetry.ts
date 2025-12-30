import { useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

export function useDashboardTelemetry() {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const wsBase = API_BASE_URL.replace(/^http/, 'ws');
    const wsUrl = `${wsBase}/ws/dashboard`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'dashboard_update') {
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        }
      } catch (err) {
        console.error('Failed to parse dashboard update', err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onerror = (err) => {
      console.error('WebSocket dashboard error', err);
    };

    return () => {
      ws.close();
    };
  }, [queryClient]);

  return { isConnected };
}
