import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  collapsed?: boolean;
  onClick?: () => void;
}

export const NavItem: React.FC<NavItemProps> = ({ to, icon, label, collapsed, onClick }) => {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          "flex items-center rounded-2xl py-2.5 transition-all duration-300 group relative min-h-12",
          collapsed ? "justify-center px-2" : "justify-start px-4 gap-3.5",
          isActive
            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 font-medium"
            : // FIX: Use semantic background for hover state
            "text-muted-foreground hover:bg-muted hover:text-foreground",
        )
      }
    >
      {() => (
        <>
          <span className={cn(
            "flex items-center justify-center transition-transform duration-300 shrink-0",
            collapsed && "group-hover:scale-110",
            // Class to ensure icons are consistently sized
            "[&>svg]:h-[22px] [&>svg]:w-[22px]"
          )}>
            {icon}
          </span>

          <motion.span
            animate={{ opacity: collapsed ? 0 : 1, width: collapsed ? 0 : "auto" }}
            className="whitespace-nowrap overflow-hidden"
          >
            {label}
          </motion.span>

          {/* Tooltip for collapsed state */}
          {collapsed && (
            <span
              // FIX: Use semantic border/popover colors for theme awareness
              className="absolute left-full ml-4 rounded-lg bg-popover px-3 py-1.5 text-xs font-medium text-popover-foreground shadow-xl border border-border/60 opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap z-50 pointer-events-none translate-x-2 group-hover:translate-x-0"
            >
              {label}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
};