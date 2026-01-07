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
          "group relative flex h-9 w-full items-center transition-all duration-300 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary/20 mb-0.5",
          collapsed ? "justify-center px-0" : "justify-start px-2.5 gap-3",
          isActive 
            ? "text-primary font-medium" 
            : "text-muted-foreground/60 hover:text-foreground hover:bg-primary/5"
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* Active Background - Sleek glass pill */}
          {isActive && (
            <motion.div
              layoutId="nav-active-bg"
              className={cn(
                "absolute z-0 shadow-[0_2px_10px_-3px_rgba(var(--primary-rgb),0.2)]",
                collapsed 
                  ? "h-8 w-8 rounded-lg bg-primary/10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border border-primary/10" 
                  : "inset-0 rounded-lg bg-primary/8 border border-primary/10"
              )}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}

          {/* Icon Wrapper - Precise alignment */}
          <div className={cn(
            "relative z-10 flex items-center justify-center shrink-0 transition-all duration-300",
            isActive ? "text-primary scale-105" : "text-muted-foreground/50 group-hover:text-primary/80 group-hover:scale-105",
            collapsed ? "h-8 w-8" : "h-5 w-5",
            "[&>svg]:h-[17px] [&>svg]:w-[17px] [&>svg]:stroke-[1.5]"
          )}>
            {icon}
          </div>

          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative z-10 text-[13px] font-medium tracking-tight whitespace-nowrap overflow-hidden transition-all duration-300"
            >
              {label}
            </motion.span>
          )}

          {/* Active Indicator Dot */}
          {isActive && !collapsed && (
            <motion.div 
              layoutId="nav-dot"
              className="absolute right-2 w-1 h-1 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.6)]"
            />
          )}

          {/* Hover Glow Effect */}
          {!isActive && !collapsed && (
            <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-linear-to-r from-primary/5 to-transparent pointer-events-none" />
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
