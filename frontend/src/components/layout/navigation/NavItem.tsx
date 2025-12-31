import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  collapsed?: boolean;
  onClick?: () => void;
  end?: boolean;
}

export const NavItem: React.FC<NavItemProps> = ({ to, icon, label, collapsed, onClick, end }) => {
  const content = (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          "group relative flex h-12 w-full items-center transition-all duration-300 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
          collapsed ? "justify-center px-0" : "justify-start px-4 gap-3",
          isActive 
            ? "text-primary font-black" 
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* Active Background - Shared layoutId for premium sliding effect */}
          {isActive && (
            <motion.div
              layoutId="nav-active-bg"
              className={cn(
                "absolute z-0 transition-all duration-500",
                collapsed 
                  ? "h-11 w-11 rounded-full bg-primary/15 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" 
                  : "inset-0 rounded-xl bg-primary/10"
              )}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
            />
          )}

          {/* Active Indicator Bar - Sleek vertical bar for expanded mode */}
          {isActive && !collapsed && (
            <motion.div
              layoutId="nav-indicator"
              className="absolute -left-1 w-1 h-6 bg-primary rounded-r-full z-20"
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
            />
          )}

          {/* Icon Wrapper */}
          <div className={cn(
            "relative z-10 flex items-center justify-center shrink-0 transition-all duration-300",
            isActive ? "text-primary scale-110" : "text-muted-foreground group-hover:text-foreground",
            collapsed ? "h-11 w-11" : "",
            "[&>svg]:h-5 [&>svg]:w-5"
          )}>
            {icon}
          </div>

          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -5 }}
              className="relative z-10 text-[13.5px] tracking-tight whitespace-nowrap overflow-hidden transition-all duration-300 ml-1"
            >
              {label}
            </motion.span>
          )}
        </>
      )}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={12} className="font-bold border-border/40">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
};
