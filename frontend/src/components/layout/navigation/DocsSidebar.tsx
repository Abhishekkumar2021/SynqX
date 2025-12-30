import { cn } from '@/lib/utils';
import { 
  ChevronRight, Book, Server, Database, 
  GitGraph, Activity, FileJson, Laptop,
  Lock, Zap, Terminal, Bell, Workflow
} from 'lucide-react';
import { NavItem } from './NavItem';

const DOCS_NAV = [
  {
    title: "Getting Started",
    items: [
      { title: "Introduction", href: "/docs/intro", icon: <Zap /> },
      { title: "Architecture", href: "/docs/architecture", icon: <Server /> },
    ]
  },
  {
    title: "Core Concepts",
    items: [
      { title: "Data Models", href: "/docs/data-models", icon: <Database /> },
      { title: "Pipelines & DAGs", href: "/docs/pipelines", icon: <GitGraph /> },
      { title: "Connectors", href: "/docs/connectors", icon: <Zap /> },
    ]
  },
  {
    title: "Execution & Monitoring",
    items: [
      { title: "Runtime engine", href: "/docs/execution", icon: <Activity /> },
      { title: "Observability", href: "/docs/observability", icon: <FileJson /> },
      { title: "Notifications", href: "/docs/observability/notifications", icon: <Bell /> },
      { title: "Live Forensic", href: "/docs/observability/realtime-logs", icon: <Terminal /> },
    ]
  },
  {
    title: "Guides",
    items: [
      { title: "Console UI", href: "/docs/frontend-ui", icon: <Laptop /> },
      { title: "Visual Editor", href: "/docs/pipelines/editor", icon: <Book /> },
      { title: "Navigation (⌘K)", href: "/docs/guides/navigation", icon: <ChevronRight /> },
      { title: "Security", href: "/docs/guides/security", icon: <Lock /> },
    ]
  },
  {
    title: "Developer",
    items: [
      { title: "API Reference", href: "/docs/api-reference", icon: <Terminal /> },
      { title: "Connectors", href: "/docs/connectors", icon: <Zap /> },
      { title: "Custom Operators", href: "/docs/operators/custom", icon: <Workflow /> },
    ]
  }
];

export const DocsSidebar = ({ collapsed }: { collapsed: boolean }) => {
  return (
    <div className={cn(
      "flex flex-col gap-8 animate-in fade-in duration-500",
      collapsed ? "items-center" : ""
    )}>
      {DOCS_NAV.map((section) => (
        <div key={section.title} className={cn("space-y-3 w-full", collapsed ? "flex flex-col items-center" : "")}>
          {!collapsed && (
            <h4 className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">
              {section.title}
            </h4>
          )}
          {collapsed && (
             <div className="h-px bg-border/40 w-8 mx-auto mb-2" />
          )}
          <div className={cn("flex flex-col gap-1 w-full", collapsed ? "items-center" : "")}>
            {section.items.map((item) => (
              <NavItem
                key={item.href}
                to={item.href}
                icon={item.icon}
                label={item.title}
                collapsed={collapsed}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
