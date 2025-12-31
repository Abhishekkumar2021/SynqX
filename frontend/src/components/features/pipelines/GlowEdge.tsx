/* eslint-disable @typescript-eslint/no-explicit-any */
import { memo } from 'react';
import { 
    BaseEdge, 
    getSmoothStepPath, 
    type EdgeProps, 
    EdgeLabelRenderer
} from '@xyflow/react';
import { cn } from '@/lib/utils';

const GlowEdge = ({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    selected,
    animated,
    data
}: EdgeProps) => {
    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        borderRadius: 20,
    });

    const isRunning = (data as any)?.status === 'running' || animated;
    const isError = (data as any)?.status === 'failed';
    const diffStatus = (data as any)?.diffStatus || 'none';
    const isAdded = diffStatus === 'added';
    const isRemoved = diffStatus === 'removed';

    const getEdgeColor = () => {
        if (isError) return 'var(--color-destructive)';
        if (isAdded) return '#10b981';
        if (isRemoved) return '#ef4444';
        return 'var(--color-primary)';
    };

    return (
        <>
            {/* The Primary Path - Clean and Sharp */}
            <BaseEdge
                path={edgePath}
                markerEnd={markerEnd}
                style={{
                    ...style,
                    strokeWidth: isAdded || isRemoved ? 3 : 2,
                    stroke: getEdgeColor(),
                    strokeDasharray: isRemoved ? '8,8' : undefined,
                    opacity: selected || isAdded || isRemoved ? 1 : 0.4,
                    transition: 'opacity 0.3s ease, stroke 0.3s ease',
                }}
            />

            {/* Moving Point Effect (Particle) */}
            {(isRunning || isAdded) && (
                <circle r="3" fill={getEdgeColor()} className={cn("drop-shadow-[0_0_5px_currentColor]", isAdded ? "text-emerald-500" : "text-primary")}>
                    <animateMotion
                        dur={isAdded ? "3s" : "1.5s"}
                        repeatCount="indefinite"
                        path={edgePath}
                    />
                </circle>
            )}

            {/* Hidden wider path for better click interaction */}
            <path
                d={edgePath}
                fill="none"
                stroke="transparent"
                strokeWidth={20}
                className="react-flow__edge-interaction"
            />

            <EdgeLabelRenderer>
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        pointerEvents: 'none',
                    }}
                    className="nodrag nopan"
                >
                    {isRemoved && (
                        <div className="bg-destructive text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded-sm shadow-lg border border-white/20">
                            Removed
                        </div>
                    )}
                    {isAdded && (
                        <div className="bg-emerald-500 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded-sm shadow-lg border border-white/20">
                            Added
                        </div>
                    )}
                </div>
            </EdgeLabelRenderer>
        </>
    );
};

export default memo(GlowEdge);