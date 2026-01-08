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
          "group relative flex items-center transition-all duration-300 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary/20 mb-1 overflow-hidden",
          collapsed ? "h-10 w-10 justify-center mx-auto" : "h-10 w-full justify-start px-3 gap-3",
          isActive 
            ? "text-primary font-medium" 
            : "text-muted-foreground hover:text-foreground"
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* Active Background - Sleek glass */}
          {isActive && (
            <motion.div
              layoutId="nav-active-bg"
              className={cn(
                "absolute z-0 bg-primary/10 border border-primary/10 shadow-xs",
                collapsed ? "inset-0 rounded-xl" : "inset-0 rounded-xl"
              )}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
            />
          )}

          {/* Hover Effect */}
          {!isActive && (
            <div className={cn(
              "absolute inset-0 bg-muted/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
               collapsed ? "rounded-xl" : "rounded-xl"
            )} />
          )}

          {/* Icon Wrapper - Precise alignment */}
          <div className={cn(
            "relative z-10 flex items-center justify-center shrink-0 transition-all duration-300",
            isActive ? "text-primary scale-100" : "text-muted-foreground group-hover:text-primary/80 group-hover:scale-105",
            collapsed ? "h-5 w-5" : "h-5 w-5",
            "[&>svg]:h-[18px] [&>svg]:w-[18px] [&>svg]:stroke-[1.5]"
          )}>
            {icon}
          </div>

          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "relative z-10 text-[13px] tracking-tight whitespace-nowrap overflow-hidden transition-all duration-300",
                isActive ? "font-semibold text-primary" : "font-medium text-muted-foreground group-hover:text-foreground"
              )}
            >
              {label}
            </motion.span>
          )}

          {/* Active Sidebar Indicator Line (Optional, decorative) */}
           {isActive && !collapsed && (
            <motion.div 
              layoutId="nav-indicator"
              className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-primary"
            />
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
        <TooltipContent side="right" sideOffset={12} className="font-semibold text-[11px] tracking-wide uppercase bg-foreground text-background border-none px-3 py-1.5 shadow-xl rounded-md">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
};
