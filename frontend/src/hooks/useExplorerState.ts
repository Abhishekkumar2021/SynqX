import { useSearchParams } from 'react-router-dom'
import { useCallback } from 'react'

export const useExplorerState = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  const selectedKind = searchParams.get('kind')
  const activeRecordId = searchParams.get('recordId')
  const query = searchParams.get('q') || '*'
  const activeTab = searchParams.get('tab') || 'records'

  const setKind = useCallback(
    (kind: string | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (kind) next.set('kind', kind)
          else next.delete('kind')
          next.delete('recordId') // Reset record when kind changes
          return next
        },
        { replace: true }
      )
    },
    [setSearchParams]
  )

  const setRecord = useCallback(
    (id: string | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (id) next.set('recordId', id)
          else next.delete('recordId')
          return next
        },
        { replace: true }
      )
    },
    [setSearchParams]
  )

  const setQuery = useCallback(
    (q: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (q && q !== '*') next.set('q', q)
          else next.delete('q')
          return next
        },
        { replace: true }
      )
    },
    [setSearchParams]
  )

  const setTab = useCallback(
    (tab: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set('tab', tab)
          return next
        },
        { replace: true }
      )
    },
    [setSearchParams]
  )

  return {
    selectedKind,
    activeRecordId,
    query,
    activeTab,
    setKind,
    setRecord,
    setQuery,
    setTab,
  }
}
