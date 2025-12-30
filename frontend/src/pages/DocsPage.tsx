/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { Suspense, useMemo } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { MDXProvider } from '@mdx-js/react';
import { components } from '@/components/ui/docs/MDXComponents';
import { PageMeta } from '@/components/common/PageMeta';
import { Loader2, ChevronRight, BookOpen, Clock, Tag } from 'lucide-react';
import { getDocBySlug } from '@/lib/docs';
import { cn } from '@/lib/utils';

export const DocsPage: React.FC = () => {
  const { '*': slug } = useParams();
  const currentPath = slug || 'index';

  // Find the matching MDX component
  const mdxModule: any = useMemo(() => getDocBySlug(currentPath), [currentPath]);

  if (!mdxModule) {
    return <Navigate to="/docs" replace />;
  }

  const MDXContent = mdxModule.default;
  const { title, description } = mdxModule.frontmatter || {};
  const isApiReference = currentPath === 'api-reference';

  return (
    <div className={cn(
      "flex flex-col min-h-full mx-auto animate-in fade-in duration-500",
      isApiReference ? "max-w-full" : "max-w-5xl"
    )}>
      <PageMeta title={title || "Documentation"} description={description || "SynqX Documentation"} />

      {/* --- Breadcrumbs --- */}
      <nav className="flex items-center gap-3 mb-12 text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground/40">
        <Link to="/dashboard" className="hover:text-primary transition-all duration-300 flex items-center gap-2 group">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity">-</span>
          Console
        </Link>
        <ChevronRight className="h-3 w-3 opacity-20" />
        <Link to="/docs" className="hover:text-primary transition-all duration-300 group flex items-center gap-2">
          Docs
        </Link>
        {currentPath !== 'index' && (
          <>
            <ChevronRight className="h-3 w-3 opacity-20" />
            <span className="text-primary tracking-[0.3em]">{title || currentPath.split('/').pop()}</span>
          </>
        )}
      </nav>

      {/* --- Article Header --- */}
      <header className="mb-20 space-y-6 relative">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 blur-[120px] rounded-full -z-10 animate-pulse" />
        
        <div className="flex items-center gap-4 text-primary mb-6 animate-in slide-in-from-left-4 duration-700">
          <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 backdrop-blur-xl shadow-xl shadow-primary/5">
            <BookOpen className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70">Technical Documentation</span>
            <span className="text-xs font-bold text-muted-foreground/60">SynqX Intelligence v1.0.0</span>
          </div>
        </div>

        <h1 className="text-7xl font-black tracking-[calc(-0.05em)] text-foreground leading-[0.95] drop-shadow-sm">
          {title || "Untitled Document"}
        </h1>
        
        {description && (
          <p className="text-2xl text-muted-foreground leading-relaxed font-medium max-w-4xl pt-4 border-l-2 border-primary/20 pl-8">
            {description}
          </p>
        )}
        
        <div className="flex items-center gap-8 pt-10 text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.25em]">
          <div className="flex items-center gap-2.5 group cursor-help">
            <Clock className="h-4 w-4 group-hover:text-primary transition-colors" />
            <span className="group-hover:text-foreground/70 transition-colors">5 min reading time</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-border" />
          <div className="flex items-center gap-2.5 group cursor-help">
            <Tag className="h-4 w-4 group-hover:text-primary transition-colors" />
            <span className="group-hover:text-foreground/70 transition-colors">Technical Reference</span>
          </div>
        </div>
      </header>

      {/* --- Content Area --- */}
      <div className="relative">
        {/* Decorative Grid Background for Content */}
        <div className="absolute inset-0 bg-grid-slate-900/[0.04] bg-position-[bottom_1px_center] mask-[linear-gradient(180deg,white,rgba(255,255,255,0))] -z-10" />
        
        <div className="prose dark:prose-invert max-w-none prose-headings:scroll-mt-28">
          <MDXProvider components={components}>
            <Suspense fallback={
              <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-xs font-black uppercase tracking-widest animate-pulse">Rendering Engine...</span>
              </div>
            }>
              <MDXContent />
            </Suspense>
          </MDXProvider>
        </div>
      </div>

      {/* --- Footer Navigation --- */}
      <footer className="mt-20 pt-8 border-t border-border/40 mb-12">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
            © 2025 SynqX Intelligence Engine
          </div>
          <div className="flex items-center gap-4">
            <a href="#" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">Edit on GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
