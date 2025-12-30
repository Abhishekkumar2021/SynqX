
/* eslint-disable react-refresh/only-export-components */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { 
  Info, AlertTriangle, CheckCircle2, XCircle, 
  Lightbulb, NotebookPen, Server, Database, 
  GitGraph, Activity, FileJson, Laptop, Bell, 
  Workflow, Hash, Check, AlertCircle, Search,
  Copy, CheckCheck, ExternalLink, ChevronDown, 
  Clock, Tag
} from 'lucide-react';
import { ApiReference } from './ApiReference';
import { Mermaid } from './Mermaid';

// Utility function (inline since we can't import in artifact)
const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

/**
 * COPY BUTTON - Enhanced with feedback
 */
const CopyButton = ({ content, className }: any) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "flex items-center justify-center rounded-lg transition-all duration-200",
        "hover:bg-primary/10 hover:scale-105 active:scale-95",
        "border border-border/60 backdrop-blur-sm",
        copied ? "bg-success/10 border-success/30" : "bg-background/80",
        className
      )}
      aria-label={copied ? "Copied!" : "Copy code"}
    >
      {copied ? (
        <CheckCheck size={16} className="text-success" />
      ) : (
        <Copy size={16} className="text-muted-foreground" />
      )}
    </button>
  );
};


/**
 * TABS COMPONENTS
 */
const TabsContext = React.createContext<any>(null);

const TabsRoot = ({ defaultValue, children, className }: any) => {
  const [activeTab, setActiveTab] = React.useState(defaultValue);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={cn("my-8", className)}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

const TabsList = ({ children, className }: any) => (
  <div className={cn(
    "inline-flex items-center gap-1 p-1 rounded-xl backdrop-blur-xl",
    "bg-muted/20 border border-border/40 h-11",
    className
  )}>
    {children}
  </div>
);

const TabsTrigger = ({ value, children, className }: any) => {
  const { activeTab, setActiveTab } = React.useContext(TabsContext);
  const isActive = activeTab === value;

  return (
    <button
      onClick={() => setActiveTab(value)}
      className={cn(
        "relative px-6 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest",
        "transition-all duration-300 whitespace-nowrap",
        "hover:bg-background/50",
        isActive && "bg-background text-primary shadow-md",
        !isActive && "text-muted-foreground hover:text-foreground",
        className
      )}
    >
      {children}
    </button>
  );
};

const TabsContent = ({ value, children, className }: any) => {
  const { activeTab } = React.useContext(TabsContext);
  if (activeTab !== value) return null;

  return (
    <div className={cn("mt-6", className)}>
      {children}
    </div>
  );
};

/**
 * PREMIUM CARD
 */
export const Card = ({ title, icon, href, description, children, className }: any) => {
  const isExternal = href?.startsWith('http');
  
  const content = (
    <div className={cn(
      "group relative h-full flex flex-col overflow-hidden",
      "p-6 rounded-2xl glass-card",
      "transition-all duration-500 ease-out",
      "hover:-translate-y-1 hover:border-primary/40",
      href && "cursor-pointer",
      className
    )}>
      {/* Icon with animation */}
      {icon && (
        <div className="mb-4 p-2.5 w-fit rounded-xl bg-muted/20 text-primary border border-border/40 group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-500">
          {React.cloneElement(icon as React.ReactElement, { size: 20 } as any)}
        </div>
      )}
      
      {/* Content */}
      <div className="flex-1">
        {title && (
          <h4 className="font-bold text-lg mb-2 text-foreground tracking-tight">
            {title}
          </h4>
        )}
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed font-medium">
            {description}
          </p>
        )}
        {children}
      </div>
      
      {/* External link indicator */}
      {isExternal && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-primary font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <span>Learn more</span>
          <ExternalLink size={12} />
        </div>
      )}
    </div>
  );

  if (href) {
    if (isExternal) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="no-underline block h-full">
          {content}
        </a>
      );
    }
    return (
      <a href={href} className="no-underline block h-full">
        {content}
      </a>
    );
  }

  return content;
};

export const Cards = ({ children, className }: any) => (
  <div className={cn(
    "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 my-8",
    className
  )}>
    {children}
  </div>
);

/**
 * STEPS - Visual timeline
 */
export const Steps = ({ children }: any) => (
  <div className="space-y-8 my-8 relative before:absolute before:left-[19px] before:top-4 before:bottom-4 before:w-px before:bg-linear-to-b before:from-primary/40 before:via-border/40 before:to-transparent">
    {children}
  </div>
);

export const Step = ({ title, children, number }: any) => (
  <div className="relative pl-12 group">
    {/* Step indicator */}
    <div className="absolute left-0 top-0 h-10 w-10 rounded-xl glass-panel flex items-center justify-center z-10 border border-border/60 shadow-lg group-hover:border-primary/40 transition-all duration-500">
      {number ? (
        <span className="text-sm font-bold text-primary">{number}</span>
      ) : (
        <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
      )}
    </div>
    
    {title && (
      <h3 className="text-xl font-bold mb-3 mt-0 tracking-tight text-foreground">
        {title}
      </h3>
    )}
    <div className="text-muted-foreground leading-relaxed font-medium text-[14.5px]">
      {children}
    </div>
  </div>
);

/**
 * CALLOUT - Semantic alerts
 */
export const Callout = ({ type = 'info', title, children }: any) => {
  const icons: any = {
    info: <Info size={18} />,
    warn: <AlertTriangle size={18} />,
    success: <CheckCircle2 size={18} />,
    error: <XCircle size={18} />
  };

  const statusClass: any = {
    info: "bg-blue-500/5 text-blue-500 border-blue-500/20",
    warn: "bg-amber-500/5 text-amber-500 border-amber-500/20",
    success: "bg-emerald-500/5 text-emerald-500 border-emerald-500/20",
    error: "bg-destructive/5 text-destructive border-destructive/20"
  };

  return (
    <div className={cn(
      "p-5 rounded-2xl border flex gap-4 my-8 backdrop-blur-md",
      "transition-all duration-300 hover:scale-[1.01]",
      statusClass[type]
    )}>
      {/* Icon container */}
      <div className="shrink-0 mt-0.5">
        <div className="p-1.5 rounded-lg bg-current/10 border border-current/10 h-fit">
          {icons[type]}
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        {title && (
          <div className="font-bold text-[10px] uppercase tracking-widest opacity-80">
            {title}
          </div>
        )}
        <div className="text-[14px] opacity-90 leading-relaxed font-semibold text-foreground/90">
          {children}
        </div>
      </div>
    </div>
  );
};

/**
 * TABS WRAPPER
 */
export const Tab = ({ children, value, label }: any) => (
  <TabsContent value={value || label}>
    {children}
  </TabsContent>
);

export const Tabs = ({ children, items, defaultValue }: any) => {
  const tabItems = items || React.Children.map(children, (child: any) => {
    return child.props?.value || child.props?.label;
  })?.filter(Boolean) || [];

  return (
    <TabsRoot defaultValue={defaultValue || tabItems[0]}>
      <TabsList>
        {tabItems.map((item: string) => (
          <TabsTrigger key={item} value={item}>
            {item}
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </TabsRoot>
  );
};

/**
 * MDX COMPONENTS EXPORT
 */
export const components = {
  Card,
  Cards,
  Steps,
  Step,
  Callout,
  Tab,
  Tabs,
  Mermaid,
  ApiReference,
  
  Info,
  Lightbulb,
  NotebookPen,
  Server,
  Database,
  GitGraph,
  Activity,
  FileJson,
  Laptop,
  Bell,
  Workflow,
  Hash,
  Check,
  AlertCircle,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  CheckCheck,
  ExternalLink,
  ChevronDown,
  Clock,
  Tag,
  
  // Typography
  h1: (props: any) => (
    <h1 className="scroll-m-20 text-4xl font-bold tracking-tight mt-12 mb-6 text-foreground leading-tight" {...props} />
  ),
  
  h2: (props: any) => (
    <h2 className="scroll-m-20 text-2xl font-bold tracking-tight mt-10 mb-4 pb-2 border-b border-border/40 text-foreground/90 flex items-center gap-2" {...props} />
  ),
  
  h3: (props: any) => (
    <h3 className="scroll-m-20 text-xl font-semibold tracking-tight mt-8 mb-3 text-foreground/80" {...props} />
  ),
  
  h4: (props: any) => (
    <h4 className="scroll-m-20 text-lg font-semibold tracking-tight mt-6 mb-2 text-foreground/85" {...props} />
  ),
  
  p: (props: any) => (
    <p className="leading-relaxed mb-5 text-muted-foreground font-medium text-[15px] max-w-4xl" {...props} />
  ),
  
  // Lists
  ul: (props: any) => (
    <ul className="list-disc pl-6 mb-6 space-y-2 text-muted-foreground font-medium text-[14.5px]" {...props} />
  ),
  
  ol: (props: any) => (
    <ol className="list-decimal pl-6 mb-6 space-y-2 text-muted-foreground font-medium text-[14.5px]" {...props} />
  ),
  
  li: (props: any) => (
    <li className="pl-1" {...props} />
  ),
  
  // Code blocks with language badge and copy button
  pre: React.memo(({ children, ...props }: any) => {
    const preRef = React.useRef<HTMLPreElement>(null);
    const [content, setContent] = React.useState('');
    
    React.useEffect(() => {
      if (preRef.current) {
        setContent(preRef.current.innerText || '');
      }
    }, [children]);
    
    // Check if it's a mermaid diagram
    const isMermaid = React.Children.toArray(children).some(
      (child: any) => child.props?.['data-language'] === 'mermaid' || child.props?.className === 'language-mermaid'
    );
    if (isMermaid) return <>{children}</>;

    // Extract language from data-language or className
    const language = props['data-language'] || 
      React.Children.toArray(children).map((child: any) => {
        const className = child.props?.className || '';
        const match = className.match(/language-(\w+)/);
        return match ? match[1] : null;
      }).find(Boolean) || 'code';

    return (
      <div className="relative group my-8 transition-all duration-300">
        {/* Language badge and copy button */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
          <div className="px-2 py-0.5 rounded-md bg-muted/80 dark:bg-background/50 backdrop-blur-md border border-border/40 text-[10px] font-bold text-muted-foreground uppercase tracking-wider shadow-sm">
            {language}
          </div>
          <CopyButton 
            content={content} 
            className="h-7 w-7 bg-muted/80 dark:bg-background/50 shadow-sm"
          />
        </div>
        
        <pre 
          ref={preRef}
          className={cn(
            "rounded-xl border border-border/40 overflow-hidden font-mono text-[13.5px] leading-relaxed transition-colors",
            "bg-muted/10 dark:bg-black/40",
            "selection:bg-primary/20 shadow-sm",
            props.className
          )} 
          {...props} 
        />
      </div>
    );
  }),
  
  // Inline and block code
  code: (props: any) => {
    // Check if it's a mermaid diagram
    const isMermaid = props['data-language'] === 'mermaid' || props.className === 'language-mermaid';
    if (isMermaid) return <Mermaid chart={props.children.toString()} />;

    // Inline code (no className)
    if (!props.className) {
      return (
        <code className="bg-muted/40 dark:bg-white/5 px-1.5 py-0.5 rounded-md text-primary font-mono font-semibold text-[0.9em] border border-border/20" {...props} />
      );
    }
    
    // Block code (inside pre)
    return (
      <code className="block px-5 py-4 overflow-x-auto custom-scrollbar bg-transparent" {...props} />
    );
  },

  // Tables
  table: (props: any) => (
    <div className="my-8 w-full overflow-hidden rounded-xl border border-border/40 bg-card/30">
      <table className="w-full text-[14px] text-left border-collapse" {...props} />
    </div>
  ),
  
  thead: (props: any) => (
    <thead className="bg-muted/30" {...props} />
  ),
  
  th: (props: any) => (
    <th className="px-4 py-3 bg-muted/30 font-semibold text-[12px] uppercase tracking-wider text-foreground/70 border-b border-border/40" {...props} />
  ),
  
  td: (props: any) => (
    <td className="px-4 py-3 border-b border-border/5 font-medium text-muted-foreground" {...props} />
  ),
  
  tr: (props: any) => (
    <tr className="transition-colors hover:bg-muted/20" {...props} />
  ),
  
  // Blockquote
  blockquote: (props: any) => (
    <blockquote className="border-l-4 border-primary rounded-r-xl bg-primary/5 px-6 py-4 italic my-8 text-lg font-medium text-foreground/80 relative overflow-hidden backdrop-blur-sm shadow-lg" {...props} />
  ),
  
  // Horizontal rule
  hr: (props: any) => (
    <hr className="my-12 border-border/30" {...props} />
  ),
  
  // Links
  a: ({ href, children, ...props }: any) => {
    const isExternal = href?.startsWith('http');
    
    return (
      <a
        href={href}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        className={cn(
          "text-primary font-bold",
          "underline decoration-primary/20 underline-offset-4",
          "hover:decoration-primary",
          "px-0.5 rounded transition-all duration-300",
          isExternal && "inline-flex items-center gap-1"
        )}
        {...props}
      >
        {children}
        {isExternal && <ExternalLink size={12} className="inline" />}
      </a>
    );
  },

  // Image
  img: (props: any) => (
    <img 
      className="rounded-xl border border-border/40 shadow-lg my-8 max-w-full h-auto"
      {...props} 
    />
  ),
};