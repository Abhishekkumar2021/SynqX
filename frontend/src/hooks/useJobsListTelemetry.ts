import { useEffect, useRef, useState, useCallback } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

export function useJobsListTelemetry() {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isMountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!isMountedRef.current) return;

    if (wsRef.current && (wsRef.current.readyState === WebSocket.CONNECTING || wsRef.current.readyState === WebSocket.OPEN)) {
      return;
    }

    const wsBase = API_BASE_URL.replace(/^http/, 'ws');
    const wsUrl = `${wsBase}/ws/jobs_list`;
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isMountedRef.current) {
          setIsConnected(true);
          reconnectAttemptsRef.current = 0;
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        }
      };

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'job_list_update') {
              queryClient.invalidateQueries({ queryKey: ['jobs'] });
          }
        } catch (err) {
          console.error('Failed to parse jobs list update', err);
        }
      };

      ws.onclose = (event) => {
        if (isMountedRef.current) {
          setIsConnected(false);
          if (event.code !== 1000) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
            reconnectAttemptsRef.current += 1;
            reconnectTimeoutRef.current = setTimeout(connect, delay);
          }
        }
      };

      ws.onerror = () => {
        if (wsRef.current) wsRef.current.close();
      };
    } catch (err) {
      console.error('WebSocket jobs list connection failed', err);
    }
  }, [queryClient]);

  useEffect(() => {
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
          wsRef.current.close(1000);
        }
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { isConnected };
}
