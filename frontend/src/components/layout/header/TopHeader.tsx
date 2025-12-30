import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    Search, Menu, Command, Maximize2, HelpCircle, Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '../ModeToggle';
import { NotificationsBell } from '../navigation/NotificationsBell';
import {
    Tooltip,
    TooltipContent,
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
        
        // Always start with Home/Dashboard
        const breadcrumbs = [
            <BreadcrumbItem key="home">
                <BreadcrumbLink asChild>
                    <Link to="/dashboard" className="flex items-center gap-1.5 hover:text-primary transition-colors">
                        <Home className="h-4 w-4" />
                        <span className="hidden sm:inline-block">Home</span>
                    </Link>
                </BreadcrumbLink>
            </BreadcrumbItem>
        ];

        // Process path segments
        pathnames.forEach((value, index) => {
            const to = `/${pathnames.slice(0, index + 1).join('/')}`;
            const isLast = index === pathnames.length - 1;
            
            // Format segment name
            let name = value.replace(/-/g, ' ');
            
            // Check if it's likely an ID (numeric or long mixed alphanumeric)
            // Simple heuristic: if it contains numbers and is > 3 chars, treat as ID or specific resource
            // For better UX, we could fetch names, but statically:
            if (/^\d+$/.test(value) || (value.length > 12 && /\d/.test(value))) {
                 name = `Resource ${value.substring(0, 6)}...`; // Or keep full ID if preferred
            } else {
                 name = name.charAt(0).toUpperCase() + name.slice(1);
            }

            breadcrumbs.push(
                <BreadcrumbSeparator key={`sep-${index}`} />
            );

            breadcrumbs.push(
                <BreadcrumbItem key={to}>
                    {isLast ? (
                        <BreadcrumbPage className="font-semibold text-foreground">{name}</BreadcrumbPage>
                    ) : (
                        <BreadcrumbLink asChild>
                            <Link to={to} className="hover:text-primary transition-colors">{name}</Link>
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
                
                {/* Breadcrumbs */}
                <div className="hidden md:flex items-center text-sm">
                    <Breadcrumb>
                        <BreadcrumbList>
                            {generateBreadcrumbs()}
                        </BreadcrumbList>
                    </Breadcrumb>
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
    );
};