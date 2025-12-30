import React from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { JobLogViewer } from '@/components/features/jobs/JobLogViewer';
import { type Job, getJobRun, cancelJob, retryJob, getPipeline } from '@/lib/api';
import { toast } from 'sonner';
import { formatDuration } from '@/lib/utils';
import { JobSummary } from './JobSummary';
import { TooltipProvider } from "@/components/ui/tooltip";
import { JobDetailsHeader } from './JobDetailsHeader';
import { JobDetailsEmpty } from './JobDetailsEmpty';
import { JobGraph } from './JobGraph';
import { ReactFlowProvider } from '@xyflow/react';
import { useJobTelemetry } from '@/hooks/useJobTelemetry';

interface JobDetailsProps {
    job: Job | undefined;
    onClose?: () => void; 
}

export const JobDetails: React.FC<JobDetailsProps> = ({ job }) => {
    const queryClient = useQueryClient();
    const [view, setView] = React.useState<'summary' | 'logs' | 'graph'>('summary');
    const [elapsed, setElapsed] = React.useState<string>('-');

    // Enable real-time telemetry for this specific job across all tabs
    useJobTelemetry(job?.id);

    // Fetch pipeline details for breadcrumbs
    const { data: pipeline } = useQuery({
        queryKey: ['pipeline', job?.pipeline_id],
        queryFn: () => getPipeline(job!.pipeline_id),
        enabled: !!job?.pipeline_id
    });

    // Live duration timer
    React.useEffect(() => {
        if (!job?.started_at) {
            setElapsed('-');
            return;
        }

        const update = () => {
            setElapsed(formatDuration(job.started_at, job.completed_at || null));
        };

        update();
        if (job.status === 'running' || job.status === 'pending') {
            const timer = setInterval(update, 1000);
            return () => clearInterval(timer);
        }
    }, [job?.started_at, job?.completed_at, job?.status]);

    // Fetch deep run data for summary
    const { data: run, isLoading: isLoadingRun, refetch: refetchRun, isRefetching: isRefetchingRun } = useQuery({
        queryKey: ['job-run', job?.id],
        queryFn: () => getJobRun(job!.id),
        enabled: !!job,
        refetchInterval: (data) => (data?.status === 'running' || data?.status === 'pending' ? 3000 : false)
    });

    const cancelMutation = useMutation({
        mutationFn: cancelJob,
        onSuccess: () => {
            toast.success("Job cancellation requested");
            queryClient.invalidateQueries({ queryKey: ['jobs'] });
        },
        onError: () => toast.error("Failed to cancel job")
    });

    const retryMutation = useMutation({
        mutationFn: retryJob,
        onSuccess: (newJob) => {
            toast.success("Job retry initiated");
            queryClient.invalidateQueries({ queryKey: ['jobs'] });
            // Automatically navigate to the new job ID
            if (newJob?.id) {
                navigate(`/jobs/${newJob.id}`);
            }
        },
        onError: () => toast.error("Failed to retry job")
    });

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard`);
    };

    return (
        <div className="lg:col-span-8 flex flex-col h-full bg-transparent overflow-hidden relative">
            {job ? (
                <TooltipProvider>
                    <JobDetailsHeader
                        job={job}
                        pipeline={pipeline}
                        elapsed={elapsed}
                        view={view}
                        setView={setView}
                        isRefetchingRun={isRefetchingRun}
                        onRefetch={refetchRun}
                        onCancel={() => cancelMutation.mutate(job.id)}
                        onRetry={() => retryMutation.mutate(job.id)}
                        isCancelPending={cancelMutation.isPending}
                        isRetryPending={retryMutation.isPending}
                        copyToClipboard={copyToClipboard}
                    />

                    {/* Dynamic Content */}
                    <div className="flex-1 overflow-hidden flex flex-col">
                        {view === 'summary' ? (
                            isLoadingRun ? (
                                <div className="flex-1 flex flex-col items-center justify-center gap-4 opacity-40">
                                    <RefreshCw className="h-8 w-8 animate-spin" />
                                    <span className="text-xs font-black uppercase tracking-widest">Collating Execution Metrics...</span>
                                </div>
                            ) : (
                                <JobSummary job={job} run={run} />
                            )
                        ) : view === 'logs' ? (
                            <JobLogViewer jobId={job.id} />
                        ) : (
                            run && (
                                <ReactFlowProvider>
                                    <JobGraph run={run} />
                                </ReactFlowProvider>
                            )
                        )}
                    </div>
                </TooltipProvider>
            ) : (
                <JobDetailsEmpty />
            )}
        </div>
    );
};
