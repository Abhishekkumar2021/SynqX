import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export const DiscoverySkeleton: React.FC = () => (
  <div className="flex h-full gap-0 overflow-hidden">
    {/* Sidebar Skeleton */}
    <aside className="w-72 flex flex-col border-r border-border/40 bg-muted/5 p-6 space-y-6">
      <Skeleton className="h-8 w-3/4 rounded-lg" />
      <Skeleton className="h-10 w-full rounded-xl" />
      <div className="space-y-3 pt-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-10 w-full rounded-xl opacity-50" />
        ))}
      </div>
    </aside>

    {/* Grid Skeleton */}
    <main className="flex-1 flex flex-col min-w-0 bg-background/20">
      <header className="h-12 px-8 border-b border-border/20 flex items-center justify-between shrink-0">
        <Skeleton className="h-4 w-48 rounded-md" />
        <Skeleton className="h-8 w-32 rounded-xl" />
      </header>
      <div className="p-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="p-6 rounded-[2.5rem] border border-border/40 bg-card/40 space-y-4"
          >
            <Skeleton className="h-4 w-1/4 rounded-md" />
            <Skeleton className="h-6 w-3/4 rounded-md" />
            <Skeleton className="h-10 w-full rounded-md opacity-30" />
            <div className="pt-4 border-t border-border/20 flex justify-between">
              <Skeleton className="h-3 w-1/3 rounded-md" />
              <Skeleton className="h-6 w-6 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </main>
  </div>
)
