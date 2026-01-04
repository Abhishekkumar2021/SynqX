import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    Workflow, 
    PanelLeft, LogOut,
    User, Users, Building2,
    ShieldCheck,
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
import { Badge } from '@/components/ui/badge';

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
                        initial={{ x: -300, opacity: 0, width: 0, marginLeft: 0, marginRight: 0 }}
                        animate={{ 
                            x: 0, 
                            opacity: 1,
                            width: isSidebarCollapsed ? 80 : 280,
                            marginLeft: 16,
                            marginRight: 16
                        }}
                        exit={{ 
                            x: -300, 
                            opacity: 0, 
                            width: 0,
                            marginLeft: 0,
                            marginRight: 0
                        }}
                        transition={{ type: "spring", stiffness: 450, damping: 35 }}
                        className="relative hidden md:flex flex-col z-30 my-4 overflow-visible shrink-0"
                    >
                {/* Toggle Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "absolute -right-3 top-8 z-50 h-7 w-7 rounded-full border border-border/50 bg-background shadow-md hover:bg-primary/10 hover:text-primary transition-all duration-300",
                        isSidebarCollapsed && "rotate-180"
                    )}
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                >
                    <PanelLeft className="h-3.5 w-3.5" />
                </Button>

            <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden flex flex-col border border-border/60 bg-card/40 backdrop-blur-3xl shadow-2xl dark:shadow-none">
                {/* Brand Header */}
                <Link
                    to="/"
                    className={cn(
                        "flex h-20 items-center transition-all duration-500 overflow-hidden shrink-0",
                        isSidebarCollapsed ? "justify-center px-0" : "px-8 gap-3"
                    )}
                >
                    <div className="shrink-0 flex items-center justify-center h-10 w-10 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 rotate-3 group-hover:rotate-0 transition-transform">
                        <Workflow className="h-6 w-6" />
                    </div>
                    {!isSidebarCollapsed && (
                        <span className="font-black text-xl tracking-tighter">SynqX</span>
                    )}
                </Link>

                {/* Main Content */}
                <div className={cn(
                    "flex-1 overflow-y-auto overflow-x-hidden scrollbar-none py-2",
                    isSidebarCollapsed ? "px-0" : "px-3"
                )}>
                    <nav className="flex flex-col gap-6">
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
                <div className="p-4 mt-auto border-t border-border/20 bg-muted/5">
                    {user && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className={cn(
                                    "flex items-center rounded-2xl transition-all w-full outline-none h-14 hover:bg-primary/5 border border-transparent hover:border-primary/20 group/user",
                                    isSidebarCollapsed ? "justify-center" : "px-3 gap-3"
                                )}>
                                    <Avatar className="h-9 w-9 border-2 border-background shadow-lg transition-transform group-hover/user:scale-105">
                                        <AvatarImage src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user.email}`} />
                                        <AvatarFallback className="bg-primary/10 text-primary font-black uppercase">{user.email.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    {!isSidebarCollapsed && (
                                        <div className="flex flex-col items-start overflow-hidden leading-tight">
                                            <span className="text-xs font-black truncate w-36 text-foreground tracking-tight uppercase">{user.full_name || 'Operator'}</span>
                                            <span className="text-[10px] font-bold text-muted-foreground/60 truncate w-36 lowercase opacity-80">{user.email}</span>
                                        </div>
                                    )}
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" side="right" sideOffset={20} alignOffset={-10} className="w-80 p-0 rounded-[2.5rem] glass-panel shadow-2xl border-border/40 overflow-hidden bg-background/95 backdrop-blur-xl animate-in fade-in slide-in-from-left-2 duration-300">
                                <div className="p-6 bg-linear-to-br from-primary/10 via-background to-background border-b border-border/20 relative group/hero">
                                    <div className="absolute top-4 right-4 opacity-10 group-hover/hero:opacity-20 transition-opacity">
                                        <ShieldCheck size={48} className="text-primary" />
                                    </div>
                                    <div className="flex items-center gap-4 relative z-10">
                                        <Avatar className="h-14 w-14 rounded-2xl border-2 border-background shadow-xl ring-1 ring-primary/20">
                                            <AvatarImage src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user.email}`} />
                                            <AvatarFallback className="bg-primary/10 text-primary font-black uppercase text-xl">{user.email.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-base font-black text-foreground truncate uppercase tracking-tight">{user.full_name || 'SynqX Operator'}</span>
                                            <div className="flex items-center gap-2">
                                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                <span className="text-[10px] font-bold text-primary/60 truncate uppercase tracking-widest italic">{user.email}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-2.5 space-y-1">
                                    <div className="px-3 py-2 flex items-center justify-between">
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 leading-none">Management Console</p>
                                        <Badge variant="outline" className="text-[8px] h-4 font-black bg-muted/30 border-border/40">v1.0.0</Badge>
                                    </div>

                                    <motion.div initial={false} className="space-y-1">
                                        {[
                                            { label: 'Profile Identity', desc: 'Personal manifest & theme', icon: User, tab: 'general', color: 'primary' },
                                            { label: 'Workspace Config', desc: 'Routing & Governance', icon: Building2, tab: 'workspace', color: 'emerald' },
                                            { label: 'Security & Keys', desc: 'API access & encryption', icon: Key, tab: 'security', color: 'blue' },
                                            { label: 'Alert Protocols', desc: 'Surveillance & Registry', icon: Bell, tab: 'notifications', color: 'purple' },
                                        ].map((item) => (
                                            <DropdownMenuItem 
                                                key={item.tab}
                                                className={cn(
                                                    "flex items-center gap-3 p-3 rounded-2xl cursor-pointer group transition-all duration-300 border border-transparent",
                                                    `focus:bg-${item.color}-500/5 focus:text-${item.color}-600 focus:border-${item.color}-500/10`
                                                )} 
                                                onClick={() => navigate(`/settings?tab=${item.tab}`)}
                                            >
                                                <div className={cn(
                                                    "h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center transition-all duration-500 group-hover:scale-110",
                                                    `group-hover:bg-${item.color}-500/10 group-hover:text-${item.color}-600`
                                                )}>
                                                    <item.icon size={20} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[13px] font-black uppercase tracking-tight text-foreground/80 group-hover:text-foreground leading-none mb-1">{item.label}</span>
                                                    <span className="text-[10px] opacity-50 font-medium leading-none">{item.desc}</span>
                                                </div>
                                                <ChevronRight size={14} className="ml-auto opacity-0 group-hover:opacity-40 transition-all -translate-x-2 group-hover:translate-x-0" />
                                            </DropdownMenuItem>
                                        ))}
                                    </motion.div>

                                    <DropdownMenuSeparator className="bg-border/20 mx-2 my-2" />

                                    <DropdownMenuItem className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer group transition-all duration-300 focus:bg-primary/5 focus:text-primary border border-transparent focus:border-primary/10" onClick={() => navigate('/team')}>
                                        <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                            <Users size={20} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[13px] font-black uppercase tracking-tight text-foreground/80 group-hover:text-foreground leading-none mb-1">Collaboration Team</span>
                                            <span className="text-[10px] opacity-50 font-medium leading-none">Manage workspace members</span>
                                        </div>
                                    </DropdownMenuItem>
                                </div>

                                <div className="p-2.5 bg-muted/5 border-t border-border/20">
                                    <DropdownMenuItem className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer group transition-all duration-300 text-destructive focus:bg-destructive/10 focus:text-destructive border border-transparent focus:border-destructive/10" onClick={() => logout()}>
                                        <div className="h-10 w-10 rounded-xl bg-destructive/5 flex items-center justify-center group-hover:bg-destructive/10 transition-colors shadow-sm">
                                            <LogOut size={20} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[13px] font-black uppercase tracking-widest leading-none mb-1">Terminate Session</span>
                                            <span className="text-[10px] opacity-50 font-bold italic leading-none uppercase">Secure Exit Protocol</span>
                                        </div>
                                    </DropdownMenuItem>
                                </div>
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