import { useEffect, useRef, useState, useCallback } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

export function useJobTelemetry(jobId: number | undefined) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!jobId || !isMountedRef.current) return;

    // Avoid multiple simultaneous connection attempts
    if (wsRef.current && (wsRef.current.readyState === WebSocket.CONNECTING || wsRef.current.readyState === WebSocket.OPEN)) {
      return;
    }

    const wsBase = API_BASE_URL.replace(/^http/, 'ws');
    const wsUrl = `${wsBase}/ws/job_telemetry/${jobId}`;
    
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

                

                const isStateTransition = ['run_started', 'run_update', 'run_completed', 'run_failed', 'job_update'].includes(data.type);

                

                if (data.type === 'step_update' || isStateTransition) {
              if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
              
              debounceTimerRef.current = setTimeout(() => {
                  queryClient.invalidateQueries({ queryKey: ['job-run', jobId] });
                  if (isStateTransition) {
                      queryClient.invalidateQueries({ queryKey: ['jobs'] });
                  }
              }, isStateTransition ? 0 : 500);
          }
        } catch (err) {
          console.error('Failed to parse telemetry update', err);
        }
      };

      ws.onclose = (event) => {
        if (isMountedRef.current) {
          setIsConnected(false);
          // Don't reconnect if it was a clean close (1000) or if we're unmounting
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
      console.error('WebSocket connection attempt failed', err);
    }
  }, [jobId, queryClient]);

  useEffect(() => {
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      
      if (wsRef.current) {
        // Only close if it's not already closing or closed
        if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
          wsRef.current.close(1000);
        }
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { isConnected };
}