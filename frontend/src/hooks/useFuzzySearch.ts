import { useMemo } from 'react'
import Fuse, { type IFuseOptions } from 'fuse.js'

interface UseFuzzySearchOptions<T> extends IFuseOptions<T> {
  enabled?: boolean
}

/**
 * A reusable hook for performing fuzzy search on an array of items.
 * Uses fuse.js for weighted, high-performance fuzzy matching.
 *
 * @param items The array of objects to search through.
 * @param query The search string.
 * @param options Fuse.js options (keys, threshold, etc.)
 */
export function useFuzzySearch<T>(items: T[], query: string, options: UseFuzzySearchOptions<T>) {
  const { enabled = true, ...fuseOptions } = options

  const fuse = useMemo(() => {
    if (!enabled || items.length === 0) return null
    return new Fuse(items, {
      threshold: 0.3, // 0.0 is perfect match, 1.0 matches everything. 0.3 is a good balance.
      location: 0,
      distance: 100,
      minMatchCharLength: 1,
      findAllMatches: false,
      useExtendedSearch: true,
      ...fuseOptions,
    })
  }, [items, fuseOptions, enabled])

  return useMemo(() => {
    if (!query || !fuse) return items
    return fuse.search(query).map((result) => result.item)
  }, [fuse, query, items])
}
