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
  badge?: string | number;
}

export const NavItem: React.FC<NavItemProps> = ({
  to,
  icon,
  label,
  collapsed,
  onClick,
  end,
  badge
}) => {
  const [isHovered, setIsHovered] = React.useState(false);

  const navContent = ({ isActive }: { isActive: boolean }) => (
    <>
      {/* Active Background - Clean & Subtle */}
      {isActive && (
        <motion.div
          layoutId="nav-active-bg"
          className="absolute inset-0 bg-primary/10 rounded-lg border border-primary/20"
          initial={false}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30
          }}
        />
      )}

      {/* Hover Background - Subtle */}
      {!isActive && isHovered && (
        <motion.div
          className="absolute inset-0 bg-muted/40 rounded-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        />
      )}

      {/* Icon */}
      <div className={cn(
        "relative z-10 flex items-center justify-center shrink-0 transition-colors duration-200",
        collapsed ? "w-5 h-5" : "w-5 h-5"
      )}>
        <span className={cn(
          "flex items-center justify-center [&>svg]:h-4.5 [&>svg]:w-4.5 transition-colors duration-200",
          isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
        )}>
          {icon}
        </span>
      </div>

      {/* Label */}
      {!collapsed && (
        <span
          className={cn(
            "relative z-10 text-[13.5px] font-medium transition-colors duration-200 truncate",
            isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
          )}
        >
          {label}
        </span>
      )}

      {/* Badge */}
      {badge && (
        <div className={cn(
          "relative z-10 flex items-center justify-center px-1.5 h-4.5 ml-auto rounded-full text-[10px] font-bold shadow-sm transition-all duration-200",
           isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:bg-muted/80",
           collapsed && "absolute -top-1 -right-1 h-4 w-4 p-0"
        )}>
          {badge}
        </div>
      )}

      {/* Active Indicator (Left Pill) */}
      {isActive && !collapsed && (
        <motion.div
          layoutId="nav-indicator"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full"
          initial={false}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30
          }}
        />
      )}
    </>
  );

  return (
    <Tooltip delayDuration={collapsed ? 100 : 999999}>
      <TooltipTrigger asChild>
        <NavLink
          to={to}
          end={end}
          onClick={onClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={cn(
            "group relative flex items-center transition-all duration-200 rounded-lg outline-none",
            "focus-visible:ring-1 focus-visible:ring-primary/40",
            "active:scale-[0.98]",
            "mb-0.5", 
            collapsed 
              ? "h-9 w-9 justify-center mx-auto p-0" 
              : "h-9 w-full justify-start px-3 gap-3"
          )}
        >
          {navContent}
        </NavLink>
      </TooltipTrigger>
      {collapsed && (
        <TooltipContent 
          side="right" 
          className="flex items-center gap-2 font-medium"
          sideOffset={12}
        >
          {label}
          {badge && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-semibold">
              {badge}
            </span>
          )}
        </TooltipContent>
      )}
    </Tooltip>
  );
};