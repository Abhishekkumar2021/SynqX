import React, { useState, useEffect } from 'react';
import { useLocation, Link, Outlet } from 'react-router-dom';
import {
    LayoutDashboard, Cable, Workflow, Activity, Settings,
    Search, Menu, X, ChevronRight, Home, LogOut,
    User, CreditCard, Users, PanelLeft, Command, Book, Sparkles,
    Maximize2, Minimize2, HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ModeToggle } from './ModeToggle';
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
import { useAuth } from '@/hooks/useAuth';
import { useZenMode } from '@/context/ZenContext';
import { motion, AnimatePresence } from 'framer-motion';
import { NavGroup } from './navigation/NavGroup';
import { NavItem } from './navigation/NavItem';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

import { SearchDialog } from './navigation/SearchDialog';
import { NotificationsBell } from './navigation/NotificationsBell';
import { DocsSidebar } from './navigation/DocsSidebar';

interface LayoutProps {
    children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = () => {
    const location = useLocation();
    const { user, logout } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const { isZenMode, setIsZenMode } = useZenMode();

    // Global CMD+K Shortcut
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsSearchOpen((open) => !open);
            }
        };
        window.addEventListener("keydown", down, { capture: true });
        return () => window.removeEventListener("keydown", down, { capture: true });
    }, []);

    const handleMobileNavClick = () => {
        setIsMobileMenuOpen(false);
    };

    if (location.pathname === '/') {
        return (
            <div className="min-h-screen bg-background text-foreground font-sans antialiased selection:bg-primary/20">
                <Outlet />
            </div>
        );
    }

    return (
        <div className="flex h-screen w-full overflow-hidden font-sans antialiased bg-transparent">

            {/* --- Floating Glass Sidebar --- */}
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
                                        <NavItem to="/dashboard" icon={<LayoutDashboard />} label="Dashboard" collapsed={isSidebarCollapsed} />
                                        <NavItem to="/connections" icon={<Cable />} label="Connections" collapsed={isSidebarCollapsed} />
                                        <NavItem to="/explorer" icon={<Search />} label="Explorer" collapsed={isSidebarCollapsed} />
                                        <NavItem to="/operators" icon={<Sparkles />} label="Operators" collapsed={isSidebarCollapsed} />
                                        <NavItem to="/pipelines" icon={<Workflow />} label="Pipelines" collapsed={isSidebarCollapsed} />
                                        <NavItem to="/jobs" icon={<Activity />} label="Jobs & Runs" collapsed={isSidebarCollapsed} />
                                    </NavGroup>

                                    {/* Theme-aware divider */}
                                    <div className={cn("mx-4 border-t border-border/40 transition-all duration-300", isSidebarCollapsed && "mx-2")} />

                                    <NavGroup collapsed={isSidebarCollapsed} title="Knowledge">
                                        <NavItem to="/docs/intro" icon={<Book />} label="Knowledge Base" collapsed={isSidebarCollapsed} />
                                    </NavGroup>

                                    <NavGroup collapsed={isSidebarCollapsed} title="Configuration">
                                        <NavItem to="/settings" icon={<Settings />} label="Settings" collapsed={isSidebarCollapsed} />
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
            {/* --- Main Content Area --- */}
            <motion.div 
                layout
                className="flex flex-1 flex-col overflow-hidden relative"
            >
                {/* Floating Header */}
                <AnimatePresence>
                    {!isZenMode && (
                        <motion.header
                            initial={{ y: -100, opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
                            animate={{ 
                                y: 0, 
                                opacity: 1, 
                                height: 64, // 16 * 4 (h-16)
                                marginTop: 16, // mt-4
                                marginBottom: 0 
                            }}
                            exit={{ 
                                y: -100, 
                                opacity: 0, 
                                height: 0, 
                                marginTop: 0, 
                                marginBottom: 0 
                            }}
                            transition={{ type: "spring", stiffness: 450, damping: 35 }}
                            className="flex h-16 items-center justify-between mx-4 mt-4 rounded-[2rem] px-6 z-20 sticky top-0 transition-all border border-border/60 bg-card/40 backdrop-blur-2xl shadow-[0_16px_32px_-8px_rgba(0,0,0,0.1)] dark:shadow-[0_16px_32px_-8px_rgba(0,0,0,0.4)] overflow-hidden"
                        >
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMobileMenuOpen(true)}>
                            <Menu className="h-5 w-5" />
                        </Button>
                        
                        {/* Status Indicator */}
                        <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/5 border border-emerald-500/20 mr-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">System Live</span>
                        </div>

                        <div className="hidden md:flex items-center text-sm text-muted-foreground/80">
                            <Link to="/dashboard" className="hover:text-primary transition-colors flex items-center gap-1.5 group">
                                <div className="p-1.5 rounded-lg group-hover:bg-primary/10 transition-all">
                                    <Home className="h-4 w-4" />
                                </div>
                                <span className="sr-only">Dashboard</span>
                            </Link>
                            {location.pathname !== '/dashboard' && (
                                <>
                                    <ChevronRight className="h-3.5 w-3.5 mx-1 opacity-30" />
                                    <span className="font-bold text-foreground capitalize tracking-tight px-2 py-1 rounded-lg bg-muted/30 border border-border/20">
                                        {location.pathname.split('/')[1]?.replace(/-/g, ' ') || 'Dashboard'}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Search Bar - Sleeker */}
                        <div className="relative group hidden lg:block">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors z-20" />
                            <input 
                                type="text"
                                readOnly
                                onClick={() => setIsSearchOpen(true)}
                                placeholder="Quick search..."
                                className="h-10 w-64 pl-10 pr-12 rounded-2xl border border-border/60 bg-background/40 text-sm text-muted-foreground cursor-pointer hover:bg-muted/30 hover:border-primary/30 transition-all outline-none"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-md border border-border/40 bg-muted/20 px-1.5 font-mono text-[10px] font-bold text-muted-foreground opacity-70">
                                <Command className="h-2.5 w-2.5" />
                                <span>K</span>
                            </div>
                        </div>

                        <div className="h-8 w-px bg-border/30 mx-1 hidden sm:block"></div>
                        
                        <div className="flex items-center gap-1">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Link to="/docs/intro">
                                            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-primary/5 hover:text-primary">
                                                <HelpCircle className="h-4.5 w-4.5" />
                                            </Button>
                                        </Link>
                                    </TooltipTrigger>
                                    <TooltipContent>Knowledge Base</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={() => setIsZenMode(true)} title="Enter Zen Mode (Alt+Z)" className="rounded-xl hover:bg-primary/5 hover:text-primary">
                                            <Maximize2 className="h-4.5 w-4.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Zen Mode (Alt+Z)</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>

                        <div className="h-8 w-px bg-border/30 mx-1 hidden sm:block"></div>
                        
                        <ModeToggle />
                        {user && <NotificationsBell />}
                    </div>
                        </motion.header>
                    )}
                </AnimatePresence>

                {/* Search Dialog */}
                <SearchDialog isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

                <AnimatePresence>
                    {isZenMode && (
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className="fixed bottom-6 right-6 z-50"
                        >
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 rounded-full bg-background/20 backdrop-blur-md border border-border/40 shadow-lg hover:bg-primary/20 hover:text-primary hover:border-primary/50 transition-all duration-300 group"
                                onClick={() => setIsZenMode(false)}
                                title="Exit Zen Mode (Alt+Z or Esc)"
                            >
                                <Minimize2 className="h-4 w-4 opacity-60 group-hover:opacity-100" />
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Scrollable Content with Page Transitions */}
                <main className="flex-1 overflow-auto p-4 md:p-6 scrollbar-thin scrollbar-thumb-border/50">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname.startsWith('/jobs') ? '/jobs' : location.pathname}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ 
                                opacity: { duration: 0.2 },
                                y: { duration: 0.2 }
                            }}
                            className={cn(
                                "mx-auto h-full w-full",
                                isZenMode ? "max-w-none" : "max-w-8xl"
                            )}
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </main>
            </motion.div>

            {/* --- Mobile Overlay --- */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <div className="fixed inset-0 z-50 md:hidden flex isolate">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            // Theme-aware backdrop
                            className="fixed inset-0 bg-background/80 dark:bg-black/60 backdrop-blur-sm"
                            onClick={() => setIsMobileMenuOpen(false)}
                        ></motion.div>
                        <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            // Uses glass-panel utility
                            className="relative w-[85%] max-w-[320px] glass-panel h-full p-6 shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-10">
                                <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 font-bold text-xl hover:opacity-80 transition-opacity">
                                    <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
                                        <Workflow className="h-5 w-5" />
                                    </div>
                                    <span>SynqX</span>
                                </Link>
                                {/* Theme-aware close button */}
                                <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)} className="rounded-full hover:bg-muted/10">
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>
                            <nav className="flex flex-col gap-2">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <NavItem to="/dashboard" icon={<LayoutDashboard />} label="Dashboard" onClick={handleMobileNavClick} />
                                        </TooltipTrigger>
                                        <TooltipContent side="right">Dashboard</TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <NavItem to="/connections" icon={<Cable />} label="Connections" onClick={handleMobileNavClick} />
                                        </TooltipTrigger>
                                        <TooltipContent side="right">Connections</TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <NavItem to="/explorer" icon={<Search />} label="Explorer" onClick={handleMobileNavClick} />
                                        </TooltipTrigger>
                                        <TooltipContent side="right">Explorer</TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <NavItem to="/operators" icon={<Sparkles />} label="Operators" onClick={handleMobileNavClick} />
                                        </TooltipTrigger>
                                        <TooltipContent side="right">Operators</TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <NavItem to="/pipelines" icon={<Workflow />} label="Pipelines" onClick={handleMobileNavClick} />
                                        </TooltipTrigger>
                                        <TooltipContent side="right">Pipelines</TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <NavItem to="/jobs" icon={<Activity />} label="Jobs & Runs" onClick={handleMobileNavClick} />
                                        </TooltipTrigger>
                                        <TooltipContent side="right">Jobs & Runs</TooltipContent>
                                    </Tooltip>

                                    <div className="h-px bg-border/40 my-4"></div>

                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <NavItem to="/settings" icon={<Settings />} label="Settings" onClick={handleMobileNavClick} />
                                        </TooltipTrigger>
                                        <TooltipContent side="right">Settings</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </nav>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};