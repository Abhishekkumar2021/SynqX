import { useEffect, useRef, useState } from 'react'
import { API_BASE_URL } from '@/lib/api'
import { useAuth } from './useAuth'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export function useNotifications() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!user?.id) return

    const wsBase = API_BASE_URL.replace(/^http/, 'ws')
    // Prioritize workspace notifications to receive all team and system events
    const channelPath = user.active_workspace_id
      ? `/ws/notifications/workspace/${user.active_workspace_id}`
      : `/ws/notifications/${user.id}`

    const wsUrl = `${wsBase}${channelPath}`

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'new_alert') {
          // Invalidate alerts history to trigger a refetch
          queryClient.invalidateQueries({ queryKey: ['alerts-history'] })

          // Show a toast for the new alert
          toast(data.message, {
            description: `Pipeline: ${data.pipeline_id}`,
            action: data.job_id
              ? {
                  label: 'View Job',
                  onClick: () => (window.location.href = `/jobs/${data.job_id}`),
                }
              : undefined,
          })
        }
      } catch (err) {
        console.error('Failed to parse notification', err)
      }
    }

    ws.onclose = () => {
      setIsConnected(false)
    }

    ws.onerror = (err) => {
      console.error('WebSocket notification error', err)
    }

    return () => {
      ws.close()
    }
  }, [user?.id, user?.active_workspace_id, queryClient])

  return { isConnected }
}
