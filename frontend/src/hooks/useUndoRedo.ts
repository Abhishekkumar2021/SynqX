import { useState, useCallback } from 'react';
import type { Node, Edge } from '@xyflow/react';

export const useUndoRedo = () => {
  const [past, setPast] = useState<{nodes: Node[], edges: Edge[]}[]>([]);
  const [future, setFuture] = useState<{nodes: Node[], edges: Edge[]}[]>([]);

  const takeSnapshot = useCallback((nodes: Node[], edges: Edge[]) => {
    // Deep copy to ensure we don't store references that get mutated
    const nodesCopy = JSON.parse(JSON.stringify(nodes));
    const edgesCopy = JSON.parse(JSON.stringify(edges));
    
    setPast((p) => {
        // Limit history size if needed, e.g., last 50 steps
        const newPast = [...p, { nodes: nodesCopy, edges: edgesCopy }];
        if (newPast.length > 50) return newPast.slice(newPast.length - 50);
        return newPast;
    });
    setFuture([]);
  }, []);

  const undo = useCallback((
      currentNodes: Node[], 
      currentEdges: Edge[], 
      setNodes: (n: Node[]) => void, 
      setEdges: (e: Edge[]) => void
  ) => {
    if (past.length === 0) return;
    
    const newPast = [...past];
    const previous = newPast.pop();
    
    if (previous) {
        setPast(newPast);
        
        // Save current state to future
        const nodesCopy = JSON.parse(JSON.stringify(currentNodes));
        const edgesCopy = JSON.parse(JSON.stringify(currentEdges));
        setFuture((f) => [{ nodes: nodesCopy, edges: edgesCopy }, ...f]);
        
        setNodes(previous.nodes);
        setEdges(previous.edges);
    }
  }, [past]);

  const redo = useCallback((
      currentNodes: Node[], 
      currentEdges: Edge[], 
      setNodes: (n: Node[]) => void, 
      setEdges: (e: Edge[]) => void
  ) => {
    if (future.length === 0) return;
    
    const newFuture = [...future];
    const next = newFuture.shift();
    
    if (next) {
        setFuture(newFuture);
        
        // Save current state to past
        const nodesCopy = JSON.parse(JSON.stringify(currentNodes));
        const edgesCopy = JSON.parse(JSON.stringify(currentEdges));
        setPast((p) => [...p, { nodes: nodesCopy, edges: edgesCopy }]);
        
        setNodes(next.nodes);
        setEdges(next.edges);
    }
  }, [future]);
  
  return { 
      undo, 
      redo, 
      takeSnapshot, 
      canUndo: past.length > 0, 
      canRedo: future.length > 0,
      past,
      future 
  };
};
