import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    Workflow, 
    PanelLeft, LogOut,
    User, CreditCard, Users} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { NavGroup } from '../navigation/NavGroup';
import { NavItem } from '../navigation/NavItem';
import { DocsSidebar } from '../navigation/DocsSidebar';
import { useAuth } from '@/hooks/useAuth';
import { useZenMode } from '@/hooks/useZenMode';
import { MAIN_NAV, KNOWLEDGE_NAV, CONFIG_NAV } from '@/lib/main-nav';

interface DesktopSidebarProps {
    isSidebarCollapsed: boolean;
    setIsSidebarCollapsed: (collapsed: boolean) => void;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({ isSidebarCollapsed, setIsSidebarCollapsed }) => {
    const location = useLocation();
    const { user, logout } = useAuth();
    const { isZenMode } = useZenMode();

    return (
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
            {/* Toggle Button (Absolute) */}
            <Button
                variant="ghost"
                size="icon"
                className={cn(
                    // Theme-aware border, background, and hover
                    "absolute -right-3 top-8 z-50 h-7 w-7 rounded-full border border-border/50 bg-background shadow-md hover:bg-primary/10 hover:text-primary transition-all duration-300",
                    isSidebarCollapsed && "rotate-180"
                )}
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            >
                <PanelLeft className="h-3.5 w-3.5" />
            </Button>

            {/* Inner Content Wrapper (Glass & Clipped) */}
            <div className="absolute inset-0 rounded-[2rem] overflow-hidden flex flex-col border border-border/60 bg-card/40 backdrop-blur-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)]">
                {/* Brand Header */}
                <Link
                    to="/"
                    className={cn(
                        "flex h-24 items-center transition-all duration-500 overflow-hidden shrink-0 hover:opacity-80",
                        isSidebarCollapsed ? "justify-center px-0" : "px-8 gap-4"
                    )}
                >
                    <div className="shrink-0 flex items-center justify-center h-12 w-12 rounded-2xl bg-linear-to-br from-primary to-blue-600 text-primary-foreground shadow-xl ring-1 ring-white/20 dark:ring-primary/30 rotate-3 hover:rotate-0 transition-transform duration-300">
                        <Workflow className="h-7 w-7" />
                    </div>

                    <motion.div
                        animate={{ opacity: isSidebarCollapsed ? 0 : 1, width: isSidebarCollapsed ? 0 : "auto" }}
                        className="flex flex-col whitespace-nowrap overflow-hidden"
                    >
                        <span className="font-black text-2xl tracking-tighter bg-clip-text text-transparent bg-linear-to-r from-foreground to-foreground/60">
                            SynqX
                        </span>
                    </motion.div>
                </Link>

                {/* Navigation Items */}
                <div className="flex-1 overflow-y-auto py-6 px-3 scrollbar-none space-y-6">
                    <nav className="flex flex-col gap-1.5">
                        {location.pathname.startsWith('/docs') ? (
                            <DocsSidebar collapsed={isSidebarCollapsed} />
                        ) : (
                            <>
                                <NavGroup collapsed={isSidebarCollapsed}>
                                    {MAIN_NAV.map((item) => (
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

                                {/* Theme-aware divider */}
                                <div className={cn("mx-4 border-t border-border/40 transition-all duration-300", isSidebarCollapsed && "mx-2")} />

                                <NavGroup collapsed={isSidebarCollapsed} title="Knowledge">
                                    {KNOWLEDGE_NAV.map((item) => (
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

                                <NavGroup collapsed={isSidebarCollapsed} title="Configuration">
                                    {CONFIG_NAV.map((item) => (
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
                            </>
                        )}
                    </nav>
                </div>

                {/* User Footer */}
                <div className="p-4 mx-2 mb-2 mt-auto">
                    {!user ? (
                        <Link to="/login" className="w-full">
                            <Button className="w-full rounded-2xl h-14 font-bold uppercase tracking-widest gap-2">
                                <LogOut className="h-4 w-4 rotate-180" />
                                    {!isSidebarCollapsed && "Sign In"}
                                </Button>
                            </Link>
                        ) : (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className={cn(
                                        // Theme-aware hover, background, and border
                                        "flex items-center rounded-2xl transition-all duration-300 w-full outline-none h-14 border border-border/50 hover:border-primary/30 hover:bg-primary/5",
                                        isSidebarCollapsed
                                            ? "justify-center px-0 gap-0"
                                            : "justify-start px-2 gap-3 bg-muted/20 border-border/50"
                                    )}>
                                        {/* Theme-aware Avatar ring and border */}
                                        <Avatar className="h-9 w-9 border border-border/40 shrink-0 ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                                            <AvatarImage src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user?.email || 'synqx'}`} />
                                            <AvatarFallback>{user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}</AvatarFallback>
                                        </Avatar>

                                        <motion.div
                                            animate={{ opacity: isSidebarCollapsed ? 0 : 1, width: isSidebarCollapsed ? 0 : "auto" }}
                                            className="flex flex-col items-start overflow-hidden whitespace-nowrap"
                                        >
                                            <span className="text-sm font-semibold truncate w-32 text-left">{user?.full_name || 'User'}</span>
                                            <span className="text-[11px] text-muted-foreground truncate w-32 text-left">{user?.email || 'guest@synqx.dev'}</span>
                                        </motion.div>
                                    </button>
                                </DropdownMenuTrigger>
                                {/* Theme-aware Dropdown Content */}
                                <DropdownMenuContent align="start" className="w-56 rounded-2xl glass-card shadow-2xl ml-4 mb-2" side="right" sideOffset={15}>
                                    <DropdownMenuLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground/70">My Account</DropdownMenuLabel>
                                    {/* Theme-aware separator and hover background */}
                                    <DropdownMenuSeparator className="bg-border/40" />
                                    <DropdownMenuItem className="rounded-xl focus:bg-primary/10 focus:text-primary cursor-pointer transition-colors font-medium">
                                        <User className="mr-2 h-4 w-4" /> Profile
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="rounded-xl focus:bg-primary/10 focus:text-primary cursor-pointer transition-colors font-medium">
                                        <CreditCard className="mr-2 h-4 w-4" /> Billing
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="rounded-xl focus:bg-primary/10 focus:text-primary cursor-pointer transition-colors font-medium">
                                        <Users className="mr-2 h-4 w-4" /> Team
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-border/40" />
                                    <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-xl cursor-pointer transition-colors font-bold" onClick={() => logout()}>
                                        <LogOut className="mr-2 h-4 w-4" /> Log out
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                                    </div>
                                </motion.aside>
                            )}
            </AnimatePresence>
    );
};
