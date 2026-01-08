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
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';
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
                            width: isSidebarCollapsed ? 80 : 260,
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
                        "absolute -right-3 top-8 z-50 h-6 w-6 rounded-full border border-border/60 bg-background shadow-md hover:bg-primary/10 hover:text-primary transition-all duration-300",
                        isSidebarCollapsed && "rotate-180"
                    )}
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                >
                    <PanelLeft className="h-3 w-3" />
                </Button>

            <div className="absolute inset-0 rounded-3xl overflow-hidden flex flex-col border border-border/50 bg-card/30 backdrop-blur-2xl shadow-2xl transition-all duration-500">
                {/* Brand Header */}
                <Link
                    to="/"
                    className={cn(
                        "flex h-20 items-center transition-all duration-500 overflow-hidden shrink-0",
                        isSidebarCollapsed ? "justify-center px-0" : "px-6 gap-4"
                    )}
                >
                    <div className="shrink-0 flex items-center justify-center h-9 w-9 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-500 hover:scale-105">
                        <Workflow className="h-5 w-5 stroke-[1.5]" />
                    </div>
                    {!isSidebarCollapsed && (
                        <div className="flex flex-col">
                            <span className="font-bold text-[19px] tracking-tight text-foreground">SynqX</span>
                            <span className="text-[10px] font-medium text-muted-foreground/60 tracking-wider uppercase">Enterprise Engine</span>
                        </div>
                    )}
                </Link>

                {/* Main Content */}
                <div className={cn(
                    "flex-1 overflow-y-auto overflow-x-hidden scrollbar-none py-2",
                    isSidebarCollapsed ? "px-2" : "px-3"
                )}>
                    <nav className="flex flex-col gap-1">
                        {location.pathname.startsWith('/docs') ? (
                            <DocsSidebar collapsed={isSidebarCollapsed} />
                        ) : (
                            NAV_STRUCTURE.map((group, groupIndex) => (
                                <div key={group.title} className="flex flex-col">
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
                                    {/* Subtle Separator between groups, but not after the last one */}
                                    {groupIndex < NAV_STRUCTURE.length - 1 && (
                                        <div className={cn(
                                            "my-2 mx-2",
                                            isSidebarCollapsed ? "border-b border-border/20" : "px-2"
                                        )}>
                                            {!isSidebarCollapsed && <Separator className="bg-border/30" />}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </nav>
                </div>

                {/* User Profile Footer */}
                <div className="p-3 mt-auto bg-background/20 border-t border-border/10 backdrop-blur-md">
                    {user && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className={cn(
                                    "flex items-center rounded-xl transition-all w-full outline-none h-14 hover:bg-background/40 border border-transparent hover:border-border/20 group/user",
                                    isSidebarCollapsed ? "justify-center" : "px-3 gap-3"
                                )}>
                                    <div className="relative shrink-0">
                                        <Avatar className="h-9 w-9 border-2 border-background shadow-sm transition-all duration-300 group-hover/user:scale-105">
                                            <AvatarImage src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user.email}`} />
                                            <AvatarFallback className="bg-primary/10 text-primary font-bold">{user.email.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                                    </div>
                                    {!isSidebarCollapsed && (
                                        <div className="flex flex-col items-start overflow-hidden text-left">
                                            <span className="text-[13px] font-semibold truncate w-36 text-foreground/90">{user.full_name || 'Operator'}</span>
                                            <span className="text-[10px] text-muted-foreground truncate w-36">{user.email}</span>
                                        </div>
                                    )}
                                    {!isSidebarCollapsed && (
                                        <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground/40 group-hover/user:text-foreground/60 group-hover/user:translate-x-0.5 transition-all" />
                                    )}
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" side="right" sideOffset={24} alignOffset={-4} className="w-72 p-1.5 rounded-2xl glass-panel shadow-2xl border-border/40 overflow-hidden bg-background/80 backdrop-blur-3xl">
                                <div className="p-4 mb-2 rounded-xl bg-linear-to-br from-primary/5 via-primary/2 to-transparent border border-primary/5">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10 rounded-xl border border-primary/10 shadow-sm">
                                            <AvatarImage src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user.email}`} />
                                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">{user.email.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[14px] font-semibold text-foreground truncate">{user.full_name || 'SynqX Operator'}</span>
                                            <span className="text-[11px] text-muted-foreground truncate opacity-80">{user.email}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    {[
                                        { label: 'Profile Settings', desc: 'Account & Identity', icon: User, tab: 'general' },
                                        { label: 'Workspace', desc: 'Manage environments', icon: Building2, tab: 'workspace' },
                                        { label: 'Security', desc: 'API keys & Access', icon: Key, tab: 'security' },
                                        { label: 'Notifications', desc: 'Alert protocols', icon: Bell, tab: 'notifications' },
                                    ].map((item) => (
                                        <DropdownMenuItem 
                                            key={item.tab}
                                            className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer group focus:bg-primary/5 focus:text-primary transition-all duration-200"
                                            onClick={() => navigate(`/settings?tab=${item.tab}`)}
                                        >
                                            <div className="h-8 w-8 rounded-lg bg-background border border-border/40 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:border-primary/20 transition-colors shadow-sm">
                                                <item.icon size={15} />
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[13px] font-medium leading-none">{item.label}</span>
                                                <span className="text-[10px] text-muted-foreground/60 leading-none">{item.desc}</span>
                                            </div>
                                        </DropdownMenuItem>
                                    ))}
                                </div>

                                <Separator className="bg-border/20 my-2" />

                                <DropdownMenuItem className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer group focus:bg-destructive/5 text-destructive/80 hover:text-destructive transition-all duration-200" onClick={() => logout()}>
                                    <div className="h-8 w-8 rounded-lg bg-destructive/5 border border-destructive/10 flex items-center justify-center group-hover:bg-destructive/10 transition-colors">
                                        <LogOut size={15} />
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[13px] font-medium leading-none">Sign Out</span>
                                        <span className="text-[10px] opacity-60 font-normal leading-none">Terminate session</span>
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