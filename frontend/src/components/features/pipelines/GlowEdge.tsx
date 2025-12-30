/* eslint-disable @typescript-eslint/no-explicit-any */
import { memo } from 'react';
import { 
    BaseEdge, 
    getSmoothStepPath, 
    type EdgeProps, 
    EdgeLabelRenderer
} from '@xyflow/react';

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

    return (
        <>
            {/* The Primary Path - Clean and Sharp */}
            <BaseEdge
                path={edgePath}
                markerEnd={markerEnd}
                style={{
                    ...style,
                    strokeWidth: 2,
                    stroke: isError ? 'var(--color-destructive)' : 'var(--color-primary)',
                    opacity: selected ? 1 : 0.4,
                    transition: 'opacity 0.3s ease, stroke 0.3s ease',
                }}
            />

            {/* Moving Point Effect (Particle) */}
            {isRunning && (
                <circle r="3" fill="var(--color-primary)" className="drop-shadow-[0_0_5px_var(--color-primary)]">
                    <animateMotion
                        dur="1.5s"
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
                        pointerEvents: 'all',
                    }}
                    className="nodrag nopan"
                />
            </EdgeLabelRenderer>
        </>
    );
};

export default memo(GlowEdge);