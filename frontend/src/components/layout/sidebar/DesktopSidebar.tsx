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
            <AnimatePresence mode="wait">
                {!isZenMode && (
                    <motion.aside
                        initial={{ x: -300, opacity: 0 }}
                        animate={{ 
                            x: 0, 
                            opacity: 1,
                            width: isSidebarCollapsed ? 72 : 260,
                        }}
                        exit={{ 
                            x: -300, 
                            opacity: 0,
                        }}
                        transition={{ 
                            type: "spring", 
                            stiffness: 300, 
                            damping: 30,
                            mass: 0.8
                        }}
                        className="relative hidden md:flex flex-col z-30 my-4 ml-4 overflow-visible shrink-0"
                    >
                        {/* Toggle Button - Enhanced with better positioning */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "absolute -right-3 top-6 z-50 h-6 w-6 rounded-full border border-border/60 bg-background shadow-md hover:shadow-lg hover:border-primary/40 hover:bg-primary/5 transition-all duration-300",
                                isSidebarCollapsed && "rotate-180",
                                "hover:scale-110 active:scale-95"
                            )}
                            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        >
                            <PanelLeft className={cn(
                                "h-3 w-3 transition-colors duration-300",
                                isSidebarCollapsed ? "text-muted-foreground" : "text-foreground"
                            )} />
                        </Button>

                        <div className="absolute inset-0 rounded-2xl overflow-hidden flex flex-col border border-border/40 bg-card/50 backdrop-blur-xl shadow-lg transition-all duration-500">
                            {/* Brand Header - Minimal & Clean */}
                            <Link
                                to="/"
                                className={cn(
                                    "flex h-16 items-center transition-all duration-500 overflow-hidden shrink-0 relative",
                                    isSidebarCollapsed ? "justify-center px-0 w-full" : "px-5 gap-3"
                                )}
                            >
                                <div className={cn(
                                    "relative shrink-0 flex items-center justify-center rounded-lg bg-primary/10 text-primary transition-all duration-300",
                                    isSidebarCollapsed ? "h-8 w-8" : "h-8 w-8"
                                )}>
                                    <Workflow className="h-4.5 w-4.5 stroke-[2]" />
                                </div>
                                
                                <AnimatePresence mode="wait">
                                    {!isSidebarCollapsed && (
                                        <motion.div 
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="flex flex-col"
                                        >
                                            <span className="font-bold text-[20px] tracking-tight text-foreground">SynqX</span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </Link>

                            {/* Main Content - Improved scrolling */}
                            <div className={cn(
                                "flex-1 overflow-y-auto overflow-x-hidden py-4", // Increased vertical padding
                                isSidebarCollapsed ? "px-2 items-center flex flex-col" : "px-4", // Increased horizontal padding
                                "scrollbar-thin scrollbar-thumb-border/40 scrollbar-track-transparent hover:scrollbar-thumb-border/60"
                            )}>
                                <nav className={cn(
                                    "flex flex-col gap-2", // Increased gap
                                    isSidebarCollapsed && "items-center w-full"
                                )}>
                                    {location.pathname.startsWith('/docs') ? (
                                        <DocsSidebar collapsed={isSidebarCollapsed} />
                                    ) : (
                                        NAV_STRUCTURE.map((group, groupIndex) => (
                                            <div key={group.title} className={cn("flex flex-col", isSidebarCollapsed ? "items-center w-full gap-1" : "gap-1 mb-2")}>
                                                
                                                {!isSidebarCollapsed && (
                                                    <motion.h4 
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: 0.1, duration: 0.3 }}
                                                        className="px-4 mt-4 mb-2 text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-wider"
                                                    >
                                                        {group.title}
                                                    </motion.h4>
                                                )}

                                                {/* Separator for collapsed state to keep groups distinct */}
                                                {isSidebarCollapsed && groupIndex > 0 && (
                                                     <div className="h-px w-8 bg-border/40 my-2" />
                                                )}

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
                                            </div>
                                        ))
                                    )}
                                </nav>
                            </div>

                            {/* User Profile Footer - Enhanced interactions */}
                            <div className="p-4 mt-auto bg-gradient-to-t from-background/50 to-transparent border-t border-border/10 backdrop-blur-md">
                                {user && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className={cn(
                                                "flex items-center rounded-xl transition-all duration-300 w-full outline-none border border-transparent group/user relative overflow-hidden",
                                                isSidebarCollapsed ? "justify-center h-11 w-11 mx-auto p-0" : "h-16 px-3 gap-3 hover:bg-background/60 hover:border-border/30 hover:shadow-md"
                                            )}>
                                                {/* Shimmer effect on hover - only visible when expanded */}
                                                {!isSidebarCollapsed && (
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent -translate-x-full group-hover/user:translate-x-full transition-transform duration-1000" />
                                                )}
                                                
                                                <div className="relative shrink-0 flex items-center justify-center">
                                                    <Avatar className={cn(
                                                        "border-2 border-background shadow-md transition-all duration-300 group-hover/user:scale-110 group-hover/user:border-primary/20 group-hover/user:shadow-lg",
                                                        isSidebarCollapsed ? "h-9 w-9" : "h-9 w-9"
                                                    )}>
                                                        <AvatarImage src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user.email}`} />
                                                        <AvatarFallback className="bg-primary/10 text-primary font-bold">{user.email.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <motion.div 
                                                        animate={{ scale: [1, 1.1, 1] }}
                                                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                                        className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
                                                    />
                                                </div>
                                                
                                                <AnimatePresence mode="wait">
                                                    {!isSidebarCollapsed && (
                                                        <motion.div 
                                                            initial={{ opacity: 0, x: -10 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            exit={{ opacity: 0, x: -10 }}
                                                            transition={{ duration: 0.2 }}
                                                            className="flex flex-col items-start overflow-hidden text-left relative"
                                                        >
                                                            <span className="text-[13px] font-semibold truncate w-36 text-foreground/90">{user.full_name || 'Operator'}</span>
                                                            <span className="text-[10px] text-muted-foreground/70 truncate w-36">{user.email}</span>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                                
                                                {!isSidebarCollapsed && (
                                                    <ChevronRight className={cn(
                                                        "ml-auto h-4 w-4 text-muted-foreground/40 transition-all duration-300",
                                                        "group-hover/user:text-foreground/60 group-hover/user:translate-x-1"
                                                    )} />
                                                )}
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent 
                                            align="end" 
                                            side="right" 
                                            sideOffset={24} 
                                            alignOffset={-4} 
                                            className="w-72 p-2 rounded-2xl glass-panel shadow-2xl border-border/50 overflow-hidden bg-background/95 backdrop-blur-3xl"
                                        >
                                            <motion.div 
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="p-4 mb-2 rounded-xl bg-gradient-to-br from-primary/8 via-primary/3 to-transparent border border-primary/10 relative overflow-hidden"
                                            >
                                                {/* Animated gradient background */}
                                                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 animate-pulse" />
                                                
                                                <div className="flex items-center gap-3 relative">
                                                    <Avatar className="h-10 w-10 rounded-xl border-2 border-primary/20 shadow-md">
                                                        <AvatarImage src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user.email}`} />
                                                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">{user.email.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[14px] font-semibold text-foreground truncate">{user.full_name || 'SynqX Operator'}</span>
                                                        <span className="text-[11px] text-muted-foreground/80 truncate">{user.email}</span>
                                                    </div>
                                                </div>
                                            </motion.div>

                                            <div className="space-y-1">
                                                {[
                                                    { label: 'Profile Settings', desc: 'Account & Identity', icon: User, tab: 'general' },
                                                    { label: 'Workspace', desc: 'Manage environments', icon: Building2, tab: 'workspace' },
                                                    { label: 'Security', desc: 'API keys & Access', icon: Key, tab: 'security' },
                                                    { label: 'Notifications', desc: 'Alert protocols', icon: Bell, tab: 'notifications' },
                                                ].map((item, idx) => (
                                                    <motion.div
                                                        key={item.tab}
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: idx * 0.05 }}
                                                    >
                                                        <DropdownMenuItem 
                                                            className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer group focus:bg-primary/8 focus:text-primary transition-all duration-200 hover:translate-x-1"
                                                            onClick={() => navigate(`/settings?tab=${item.tab}`)}
                                                        >
                                                            <div className="h-8 w-8 rounded-lg bg-background border border-border/40 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:border-primary/30 group-hover:bg-primary/5 transition-all duration-200 shadow-sm">
                                                                <item.icon size={15} />
                                                            </div>
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="text-[13px] font-medium leading-none">{item.label}</span>
                                                                <span className="text-[10px] text-muted-foreground/60 leading-none">{item.desc}</span>
                                                            </div>
                                                        </DropdownMenuItem>
                                                    </motion.div>
                                                ))}
                                            </div>

                                            <Separator className="bg-border/20 my-2" />

                                            <DropdownMenuItem 
                                                className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer group focus:bg-destructive/8 text-destructive/80 hover:text-destructive transition-all duration-200 hover:translate-x-1" 
                                                onClick={() => logout()}
                                            >
                                                <div className="h-8 w-8 rounded-lg bg-destructive/8 border border-destructive/20 flex items-center justify-center group-hover:bg-destructive/15 transition-all duration-200">
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