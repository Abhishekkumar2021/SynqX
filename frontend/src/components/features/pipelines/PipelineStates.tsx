import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Workflow, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const LoadingSkeleton = () => (
    <div className="space-y-8 p-6 w-full max-w-[1600px] mx-auto animate-in fade-in duration-500">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-12">
            <div className="space-y-3">
                <Skeleton className="h-9 w-48 rounded-lg bg-muted/50" />
                <Skeleton className="h-4 w-72 rounded-md bg-muted/30" />
            </div>
            <Skeleton className="h-10 w-32 rounded-full bg-muted/50" />
        </div>

        {/* Grid Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
                <div 
                    key={i} 
                    className="flex flex-col h-[280px] rounded-[2rem] p-6 border border-border/40 bg-background/20 space-y-6"
                >
                    {/* Card Header */}
                    <div className="flex justify-between items-start">
                        <div className="flex gap-4">
                            <Skeleton className="h-12 w-12 rounded-2xl bg-muted/40" />
                            <div className="space-y-2">
                                <Skeleton className="h-5 w-32 rounded-md bg-muted/40" />
                                <Skeleton className="h-3 w-20 rounded-md bg-muted/30" />
                            </div>
                        </div>
                        <Skeleton className="h-8 w-8 rounded-full bg-muted/30" />
                    </div>

                    {/* Card Body (Metrics) */}
                    <div className="flex-1 space-y-4 pt-2">
                        <div className="flex justify-between items-center">
                            <Skeleton className="h-3 w-16 rounded bg-muted/20" />
                            <Skeleton className="h-3 w-10 rounded bg-muted/20" />
                        </div>
                        <Skeleton className="h-2 w-full rounded-full bg-muted/20" />
                        
                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div className="space-y-2">
                                <Skeleton className="h-3 w-12 rounded bg-muted/20" />
                                <Skeleton className="h-5 w-16 rounded bg-muted/30" />
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-3 w-12 rounded bg-muted/20" />
                                <Skeleton className="h-5 w-16 rounded bg-muted/30" />
                            </div>
                        </div>
                    </div>

                    {/* Card Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-border/20">
                        <Skeleton className="h-4 w-24 rounded bg-muted/30" />
                        <Skeleton className="h-6 w-16 rounded-full bg-muted/30" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

interface EmptyStateProps {
    onCreate?: () => void;
    title?: string;
    description?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
    onCreate, 
    title = "No pipelines found", 
    description = "Create your first workflow to get started with data processing." 
}) => (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full p-8 text-center animate-in zoom-in-95 duration-500">
        <div className="relative group cursor-default">
            {/* Background Decorator */}
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-700" />
            
            {/* Icon Container */}
            <div className={cn(
                "h-32 w-32 rounded-[2.5rem] flex items-center justify-center mb-8",
                "bg-linear-to-br from-background/80 to-muted/30",
                "border border-border/50 shadow-xl",
                "rotate-12 group-hover:rotate-6 transition-transform duration-500 ease-out"
            )}>
                <Workflow className="h-14 w-14 text-muted-foreground/40 -rotate-12 group-hover:-rotate-6 transition-transform duration-500" />
            </div>
        </div>

        <h3 className="text-2xl font-bold tracking-tight text-foreground/90 mb-3">
            {title}
        </h3>
        
        <p className="text-base text-muted-foreground max-w-[400px] leading-relaxed mb-8">
            {description}
        </p>

        {onCreate && (
            <Button 
                onClick={onCreate} 
                size="lg" 
                className="rounded-full px-8 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all hover:-translate-y-1"
            >
                <Plus className="mr-2 h-5 w-5" />
                Create Pipeline
            </Button>
        )}
    </div>
);