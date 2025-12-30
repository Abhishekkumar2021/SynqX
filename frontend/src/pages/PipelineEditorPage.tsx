import React from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { PipelineCanvas } from '@/components/features/pipelines/PipelineCanvas';
import { PageMeta } from '@/components/common/PageMeta';

export const PipelineEditorPage: React.FC = () => {
    return (
        <div className="h-full w-full bg-background relative glass-panel overflow-hidden shadow-2xl">
            <PageMeta title="Editor" description="Visual pipeline editor." />
            <ReactFlowProvider>
                <PipelineCanvas />
            </ReactFlowProvider>
        </div>
    );
}