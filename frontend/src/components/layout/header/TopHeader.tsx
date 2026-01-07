import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    Search, Menu, Maximize2, HelpCircle, Home,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '../ModeToggle';
import { NotificationsBell } from '../navigation/NotificationsBell';
import { UnifiedSwitcher } from '../UnifiedSwitcher';
import {
    Tooltip,    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useZenMode } from '@/hooks/useZenMode';

interface TopHeaderProps {
    setIsMobileMenuOpen: (isOpen: boolean) => void;
    setIsSearchOpen: (isOpen: boolean) => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ setIsMobileMenuOpen, setIsSearchOpen }) => {
    const location = useLocation();
    const { user } = useAuth();
    const { isZenMode, setIsZenMode } = useZenMode();

    const generateBreadcrumbs = () => {
        const pathnames = location.pathname.split('/').filter((x) => x);
        const breadcrumbs = [
            <BreadcrumbItem key="home">
                <BreadcrumbLink asChild>
                    <Link to="/dashboard" className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all group">
                        <Home className="h-4 w-4 group-hover:scale-110 transition-transform" />
                    </Link>
                </BreadcrumbLink>
            </BreadcrumbItem>
        ];

        pathnames.forEach((value, index) => {
            const to = `/${pathnames.slice(0, index + 1).join('/')}`;
            const isLast = index === pathnames.length - 1;
            let name = value.replace(/-/g, ' ');
            
            if (/^\d+$/.test(value) || (value.length > 12 && /\d/.test(value))) {
                 name = `...${value.substring(value.length - 4)}`;
            } else {
                 name = name.charAt(0).toUpperCase() + name.slice(1);
            }

            breadcrumbs.push(<BreadcrumbSeparator key={`sep-${index}`} className="opacity-20" />);
            breadcrumbs.push(
                <BreadcrumbItem key={to}>
                    {isLast ? (
                        <BreadcrumbPage className="font-semibold text-foreground tracking-tight px-2 py-1 rounded-md bg-primary/10 border border-primary/20 text-[9px] uppercase text-primary">
                            {name}
                        </BreadcrumbPage>
                    ) : (
                        <BreadcrumbLink asChild>
                            <Link to={to} className="hover:text-primary transition-all font-semibold tracking-tight text-[10px] uppercase opacity-40 hover:opacity-100">
                                {name}
                            </Link>
                        </BreadcrumbLink>
                    )}
                </BreadcrumbItem>
            );
        });

        return breadcrumbs;
    };

    return (
        <AnimatePresence>
            {!isZenMode && (
                <motion.header
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -100, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    className="h-16 mx-4 mt-4 flex items-center justify-between shrink-0 z-40 relative px-4 rounded-3xl border border-border/50 bg-card/30 backdrop-blur-2xl shadow-lg dark:shadow-none"
                >
                    {/* Left: Interactive Breadcrumbs */}
                    <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button variant="ghost" size="icon" className="md:hidden h-10 w-10 rounded-xl border border-border/40 bg-background/40" onClick={() => setIsMobileMenuOpen(true)}>
                                <Menu className="h-5 w-5" />
                            </Button>
                        </motion.div>
                        
                        <div className="hidden md:flex items-center">
                            <Breadcrumb>
                                <BreadcrumbList className="gap-1.5 sm:gap-2">
                                    {generateBreadcrumbs()}
                                </BreadcrumbList>
                            </Breadcrumb>
                        </div>
                    </div>

                    {/* Right: Premium Action Hub */}
                    <div className="flex items-center gap-2.5">
                        
                        {/* Search Bar - Stable & Professional */}
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <motion.button 
                                        onClick={() => setIsSearchOpen(true)}
                                        whileHover={{ scale: 1.01, backgroundColor: "var(--background-hover)" }}
                                        whileTap={{ scale: 0.98 }}
                                        className="h-10 w-52 hidden lg:flex items-center gap-3 px-4 rounded-xl border border-border/40 bg-muted/20 text-muted-foreground transition-all group overflow-hidden relative"
                                    >
                                        <Search className="h-3.5 w-3.5 shrink-0 opacity-40 group-hover:opacity-100 group-hover:text-primary transition-all" />
                                        <span className="text-[11px] font-medium uppercase tracking-wider opacity-40 group-hover:opacity-100 transition-opacity">Search</span>
                                        <div className="ml-auto flex items-center gap-1">
                                            <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border/40 bg-background/50 px-1.5 font-mono text-[9px] font-medium opacity-40 group-hover:opacity-80 transition-opacity">
                                                <span className="text-[8px]">⌘</span>K
                                            </kbd>
                                        </div>
                                    </motion.button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-[10px] font-medium">Omni-Search</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <div className="h-8 w-px bg-border/20 mx-1 hidden lg:block" />

                        {/* Integrated Switcher Hub */}
                        <UnifiedSwitcher />

                        <div className="h-8 w-px bg-border/20 mx-1 hidden sm:block" />

                        {/* Action Stack */}
                        <div className="flex items-center gap-1.5">
                            <TooltipProvider>
                                <motion.div whileHover={{ y: -2 }} transition={{ type: "spring", stiffness: 500 }}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Link to="/docs/intro">
                                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary border border-transparent hover:border-primary/20 transition-all">
                                                    <HelpCircle className="h-5 w-5" />
                                                </Button>
                                            </Link>
                                        </TooltipTrigger>
                                        <TooltipContent>Resources</TooltipContent>
                                    </Tooltip>
                                </motion.div>

                                <motion.div whileHover={{ y: -2 }} transition={{ type: "spring", stiffness: 500 }}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" onClick={() => setIsZenMode(true)} className="h-10 w-10 rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary border border-transparent hover:border-primary/20 hidden sm:flex transition-all">
                                                <Maximize2 className="h-5 w-5" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Focus Mode</TooltipContent>
                                    </Tooltip>
                                </motion.div>
                            </TooltipProvider>
                            
                            <ModeToggle />
                        </div>

                        {user && (
                            <>
                                <div className="h-8 w-px bg-border/20 mx-1 hidden sm:block" />
                                <div className="scale-90 origin-right">
                                    <NotificationsBell />
                                </div>
                            </>
                        )}
                    </div>
                </motion.header>
            )}
        </AnimatePresence>
    );
};
