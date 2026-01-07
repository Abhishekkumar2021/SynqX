import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    Workflow, 
    PanelLeft, LogOut,
    User, Building2,
    Key,
    Bell,
    ChevronRight} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { NavGroup } from '../navigation/NavGroup';
import { NavItem } from '../navigation/NavItem';
import { DocsSidebar } from '../navigation/DocsSidebar';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useZenMode } from '@/hooks/useZenMode';
import { NAV_STRUCTURE } from '@/lib/main-nav';
import {
    TooltipProvider,
} from "@/components/ui/tooltip";

interface DesktopSidebarProps {
    isSidebarCollapsed: boolean;
    setIsSidebarCollapsed: (collapsed: boolean) => void;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({ isSidebarCollapsed, setIsSidebarCollapsed }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { isZenMode } = useZenMode();

    return (
        <TooltipProvider>
            <AnimatePresence>
                {!isZenMode && (
                    <motion.aside
                        initial={{ x: -300, opacity: 0, width: 0 }}
                        animate={{ 
                            x: 0, 
                            opacity: 1,
                            width: isSidebarCollapsed ? 72 : 240,
                        }}
                        exit={{ 
                            x: -300, 
                            opacity: 0, 
                            width: 0,
                        }}
                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                        className="relative hidden md:flex flex-col z-30 my-4 ml-4 overflow-visible shrink-0"
                    >
                {/* Toggle Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "absolute -right-3 top-10 z-50 h-6 w-6 rounded-full border border-border/60 bg-background shadow-sm hover:bg-primary/10 hover:text-primary transition-all duration-300",
                        isSidebarCollapsed && "rotate-180"
                    )}
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                >
                    <PanelLeft className="h-3 w-3" />
                </Button>

            <div className="absolute inset-0 rounded-2xl overflow-hidden flex flex-col border border-border/40 bg-card/30 backdrop-blur-2xl transition-all duration-500">
                {/* Brand Header */}
                <Link
                    to="/"
                    className={cn(
                        "flex h-16 items-center transition-all duration-500 overflow-hidden shrink-0 group",
                        isSidebarCollapsed ? "justify-center px-0" : "px-5 gap-3"
                    )}
                >
                    <div className="shrink-0 flex items-center justify-center h-8 w-8 rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-500 group-hover:scale-105">
                        <Workflow className="h-5 w-5 stroke-[1.5]" />
                    </div>
                    {!isSidebarCollapsed && (
                        <span className="font-semibold text-[17px] tracking-tight text-foreground/90">SynqX</span>
                    )}
                </Link>

                {/* Main Content */}
                <div className={cn(
                    "flex-1 overflow-y-auto overflow-x-hidden scrollbar-none py-2",
                    isSidebarCollapsed ? "px-2" : "px-2.5"
                )}>
                    <nav className="flex flex-col">
                        {location.pathname.startsWith('/docs') ? (
                            <DocsSidebar collapsed={isSidebarCollapsed} />
                        ) : (
                            NAV_STRUCTURE.map((group) => (
                                <NavGroup key={group.title} collapsed={isSidebarCollapsed} title={group.title}>
                                    {group.items.map((item) => (
                                        <NavItem 
                                            key={item.to}
                                            to={item.to} 
                                            icon={item.icon} 
                                            label={item.label} 
                                            collapsed={isSidebarCollapsed} 
                                            end={item.end}
                                        />
                                    ))}
                                </NavGroup>
                            ))
                        )}
                    </nav>
                </div>

                {/* User Profile Footer */}
                <div className="p-2.5 mt-auto border-t border-border/10">
                    {user && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className={cn(
                                    "flex items-center rounded-xl transition-all w-full outline-none h-12 hover:bg-primary/5 group/user border border-transparent hover:border-primary/10",
                                    isSidebarCollapsed ? "justify-center" : "px-2 gap-2.5"
                                )}>
                                    <div className="relative shrink-0">
                                        <Avatar className="h-7 w-7 border border-border/40 shadow-sm transition-all duration-300 group-hover/user:scale-105">
                                            <AvatarImage src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user.email}`} />
                                            <AvatarFallback className="bg-primary/10 text-primary font-medium uppercase text-[10px]">{user.email.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-card bg-emerald-500" />
                                    </div>
                                    {!isSidebarCollapsed && (
                                        <div className="flex flex-col items-start overflow-hidden leading-tight text-left">
                                            <span className="text-[12.5px] font-medium truncate w-32 text-foreground/80">{user.full_name || 'Operator'}</span>
                                            <span className="text-[10px] text-muted-foreground/40 truncate w-32">{user.email}</span>
                                        </div>
                                    )}
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" side="right" sideOffset={16} alignOffset={-10} className="w-64 p-1 rounded-xl glass-panel shadow-2xl border-border/40 overflow-hidden bg-background/95 backdrop-blur-xl">
                                <div className="p-3 mb-1 rounded-lg bg-linear-to-br from-primary/5 via-background to-background border border-primary/5">
                                    <div className="flex items-center gap-2.5">
                                        <Avatar className="h-9 w-9 rounded-lg border border-primary/10 shadow-sm">
                                            <AvatarImage src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user.email}`} />
                                            <AvatarFallback className="bg-primary/10 text-primary font-medium uppercase text-xs">{user.email.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[13px] font-semibold text-foreground truncate">{user.full_name || 'SynqX Operator'}</span>
                                            <span className="text-[10px] text-muted-foreground/60 truncate">{user.email}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-0.5">
                                    {[
                                        { label: 'Profile Settings', desc: 'Account & Identity', icon: User, tab: 'general' },
                                        { label: 'Workspace', desc: 'Manage environments', icon: Building2, tab: 'workspace' },
                                        { label: 'Security', desc: 'API keys & Access', icon: Key, tab: 'security' },
                                        { label: 'Notifications', desc: 'Alert protocols', icon: Bell, tab: 'notifications' },
                                    ].map((item) => (
                                        <DropdownMenuItem 
                                            key={item.tab}
                                            className="flex items-center gap-3 p-2 rounded-lg cursor-pointer group focus:bg-primary/5 transition-colors"
                                            onClick={() => navigate(`/settings?tab=${item.tab}`)}
                                        >
                                            <div className="h-7 w-7 rounded-md bg-muted/40 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                                <item.icon size={14} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[12px] font-medium text-foreground/80 group-hover:text-foreground leading-none mb-0.5">{item.label}</span>
                                                <span className="text-[9px] text-muted-foreground/50 leading-none">{item.desc}</span>
                                            </div>
                                            <ChevronRight size={10} className="ml-auto opacity-0 group-hover:opacity-40 transition-all -translate-x-1 group-hover:translate-x-0" />
                                        </DropdownMenuItem>
                                    ))}
                                </div>

                                <DropdownMenuSeparator className="bg-border/10 my-1" />

                                <DropdownMenuItem className="flex items-center gap-3 p-2 rounded-lg cursor-pointer group focus:bg-destructive/5 text-destructive/80 transition-colors" onClick={() => logout()}>
                                    <div className="h-7 w-7 rounded-md bg-destructive/5 flex items-center justify-center group-hover:bg-destructive/10 transition-colors">
                                        <LogOut size={14} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[12px] font-medium leading-none mb-0.5">Sign Out</span>
                                        <span className="text-[9px] opacity-60 font-normal leading-none">Terminate session</span>
                                    </div>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>
                </motion.aside>
            )}
        </AnimatePresence>
    </TooltipProvider>
  );
};