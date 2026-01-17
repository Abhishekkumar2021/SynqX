import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const DomainCatalogSkeleton = () => (
    <div className="flex flex-col h-full p-6 space-y-8 animate-pulse">
        {/* Top Filters Skeleton */}
        <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-3 w-32 rounded-md" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-24 rounded-2xl border border-border/40 bg-muted/5 p-4 flex flex-col justify-between">
                        <div className="flex justify-between">
                            <Skeleton className="h-8 w-8 rounded-lg" />
                            <Skeleton className="h-5 w-8 rounded-md" />
                        </div>
                        <Skeleton className="h-4 w-24 rounded-md" />
                    </div>
                ))}
            </div>
        </div>

        {/* List Skeleton */}
        <div className="space-y-4">
            <div className="flex justify-between px-1">
                <Skeleton className="h-3 w-40 rounded-md" />
                <Skeleton className="h-3 w-16 rounded-md" />
            </div>
            <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-20 rounded-2xl border border-border/40 bg-card/40 p-4 flex items-center gap-4">
                        <Skeleton className="h-5 w-5 rounded-md shrink-0" />
                        <div className="flex-1 grid grid-cols-12 gap-4">
                            <div className="col-span-5 space-y-2">
                                <Skeleton className="h-4 w-48 rounded-md" />
                                <Skeleton className="h-3 w-64 rounded-md opacity-50" />
                            </div>
                            <div className="col-span-3 space-y-2">
                                <Skeleton className="h-3 w-24 rounded-md" />
                                <Skeleton className="h-3 w-32 rounded-md" />
                            </div>
                            <div className="col-span-2">
                                <Skeleton className="h-5 w-16 rounded-full" />
                            </div>
                            <div className="col-span-2 flex justify-end">
                                <Skeleton className="h-8 w-16 rounded-md" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);
