 
import { useMemo } from 'react'
import { type ColumnLineage } from '@/lib/api/types'

interface HighlightableEdge {
  id: string
  source: string
  target: string
  data?: {
    pipeline_id?: number | any
    [key: string]: any
  }
}

/**
 * Hook to calculate which nodes and edges should be highlighted
 * based on a selected column's lineage path.
 */
export const useLineagePathHighlight = (
  edges: HighlightableEdge[],
  colLineage: ColumnLineage | undefined
) => {
  return useMemo(() => {
    if (!colLineage || !colLineage.path.length) {
      return { highlightedNodes: new Set<string>(), highlightedEdges: new Set<string>() }
    }

    const highlightedNodes = new Set<string>()
    const highlightedEdges = new Set<string>()

    // 1. Identify all pipelines involved in the path
    const pipelineIds = new Set(colLineage.path.map((p) => p.pipeline_id))

    // 2. Highlight edges that belong to these pipelines
    // In our lineage graph, edge.data.pipeline_id stores this mapping
    edges.forEach((edge) => {
      const edgePipelineId = edge.data?.pipeline_id
      if (edgePipelineId && pipelineIds.has(Number(edgePipelineId))) {
        highlightedEdges.add(edge.id)
        // Also ensure source and target nodes are highlighted
        highlightedNodes.add(edge.source)
        highlightedNodes.add(edge.target)
      }
    })

    return { highlightedNodes, highlightedEdges }
  }, [edges, colLineage])
}
