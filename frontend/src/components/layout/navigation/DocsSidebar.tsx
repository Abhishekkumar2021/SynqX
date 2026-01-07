import { cn } from '@/lib/utils';
import { NavItem } from './NavItem';
import { DOCS_NAV } from '@/lib/docs-nav';

export const DocsSidebar = ({ collapsed }: { collapsed: boolean }) => {
  return (
    <div className={cn(
      "flex flex-col gap-8 animate-in fade-in duration-500",
      collapsed ? "items-center" : ""
    )}>
      {DOCS_NAV.map((section) => (
        <div key={section.title} className={cn("space-y-3 w-full", collapsed ? "flex flex-col items-center" : "")}>
          {!collapsed && (
            <h4 className="px-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">
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
                end={item.end}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
