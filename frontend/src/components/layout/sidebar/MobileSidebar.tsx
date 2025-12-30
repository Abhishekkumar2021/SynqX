import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Cable, Workflow, Activity, Settings,
    Search, X, LogOut, Book, Sparkles, ChevronLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { NavItem } from '../navigation/NavItem';
import { useAuth } from '@/hooks/useAuth';
import { DocsSidebar } from '../navigation/DocsSidebar';
import { MAIN_NAV, KNOWLEDGE_NAV, CONFIG_NAV } from '@/lib/main-nav';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface MobileSidebarProps {
    isMobileMenuOpen: boolean;
    setIsMobileMenuOpen: (isOpen: boolean) => void;
}

const mobileMenuVariants = {
    closed: { 
        x: "-100%",
        transition: { 
            type: "spring", 
            stiffness: 400, 
            damping: 40,
            mass: 1
        }
    },
    open: { 
        x: "0%",
        transition: { 
            type: "spring", 
            stiffness: 400, 
            damping: 40,
            mass: 1
        }
    }
};

const backdropVariants = {
    closed: { opacity: 0 },
    open: { opacity: 1 }
};

export const MobileSidebar: React.FC<MobileSidebarProps> = ({ isMobileMenuOpen, setIsMobileMenuOpen }) => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const isDocs = location.pathname.startsWith('/docs');

    const handleMobileNavClick = () => {
        setIsMobileMenuOpen(false);
    };

    return (
        <AnimatePresence>
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-[100] md:hidden isolate">
                    {/* Backdrop */}
                    <motion.div
                        initial="closed"
                        animate="open"
                        exit="closed"
                        variants={backdropVariants}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-background/80 dark:bg-black/80 backdrop-blur-md z-[100]"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                    
                    {/* Sidebar Drawer */}
                    <motion.div
                        initial="closed"
                        animate="open"
                        exit="closed"
                        variants={mobileMenuVariants}
                        className="fixed inset-y-0 left-0 z-[105] w-[85vw] max-w-[320px] h-[100dvh] bg-background/95 supports-[backdrop-filter]:bg-background/80 backdrop-blur-3xl border-r border-border shadow-2xl flex flex-col overflow-hidden"
                    >
                        {/* Mobile Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-border/40 shrink-0 bg-background/50 backdrop-blur-xl sticky top-0 z-10">
                            <Link to="/" onClick={handleMobileNavClick} className="flex items-center gap-3 group">
                                <div className="h-10 w-10 rounded-xl bg-linear-to-br from-primary to-blue-600 flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20 ring-1 ring-white/10">
                                    <Workflow className="h-5 w-5" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-black text-xl tracking-tight leading-none text-foreground">SynqX</span>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Enterprise</span>
                                </div>
                            </Link>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setIsMobileMenuOpen(false)} 
                                className="h-9 w-9 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors active:scale-95"
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Scrollable Navigation */}
                        <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-4 space-y-6 scrollbar-thin scrollbar-thumb-border/50">
                            
                            {/* Context Switching for Docs */}
                            {isDocs ? (
                                <div className="space-y-6" onClick={handleMobileNavClick}>
                                    <div className="px-2">
                                        <h3 className="text-lg font-bold tracking-tight text-foreground/90 flex items-center gap-2">
                                            <Book className="h-5 w-5 text-primary" />
                                            Documentation
                                        </h3>
                                    </div>
                                    <DocsSidebar collapsed={false} />
                                </div>
                            ) : (
                                <nav className="flex flex-col gap-1.5 w-full">
                                    <TooltipProvider delayDuration={0}>
                                        {MAIN_NAV.map((item) => (
                                            <Tooltip key={item.to}>
                                                <TooltipTrigger asChild>
                                                    <div className="w-full">
                                                        <NavItem 
                                                            to={item.to} 
                                                            icon={item.icon} 
                                                            label={item.label} 
                                                            onClick={handleMobileNavClick} 
                                                            end={item.end}
                                                        />
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent side="right" className="z-[110] font-semibold" sideOffset={10} collisionPadding={10}>
                                                    {item.label}
                                                </TooltipContent>
                                            </Tooltip>
                                        ))}

                                        <div className="my-4 px-2">
                                            <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />
                                        </div>

                                        <div className="px-3 mb-1">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-70">
                                                Knowledge
                                            </span>
                                        </div>

                                        {KNOWLEDGE_NAV.map((item) => (
                                            <Tooltip key={item.to}>
                                                <TooltipTrigger asChild>
                                                    <div className="w-full">
                                                        <NavItem 
                                                            to={item.to} 
                                                            icon={item.icon} 
                                                            label={item.label} 
                                                            onClick={handleMobileNavClick} 
                                                            end={item.end}
                                                        />
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent side="right" className="z-[110] font-semibold" sideOffset={10} collisionPadding={10}>
                                                    {item.label}
                                                </TooltipContent>
                                            </Tooltip>
                                        ))}

                                        <div className="px-3 mb-1 mt-4">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-70">
                                                Configuration
                                            </span>
                                        </div>

                                        {CONFIG_NAV.map((item) => (
                                            <Tooltip key={item.to}>
                                                <TooltipTrigger asChild>
                                                    <div className="w-full">
                                                        <NavItem 
                                                            to={item.to} 
                                                            icon={item.icon} 
                                                            label={item.label} 
                                                            onClick={handleMobileNavClick} 
                                                            end={item.end}
                                                        />
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent side="right" className="z-[110] font-semibold" sideOffset={10} collisionPadding={10}>
                                                    {item.label}
                                                </TooltipContent>
                                            </Tooltip>
                                        ))}
                                    </TooltipProvider>
                                </nav>
                            )}
                        </div>

                        {/* Mobile User Footer */}
                        <div className="p-4 border-t border-border/40 bg-muted/20 shrink-0 mt-auto backdrop-blur-md">
                            {user ? (
                                <div className="flex items-center gap-3 p-3 rounded-2xl bg-background border border-border/50 shadow-sm active:scale-[0.98] transition-transform duration-200">
                                    <Avatar className="h-10 w-10 border border-border/40 shrink-0 ring-2 ring-background">
                                        <AvatarImage src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user?.email || 'synqx'}`} />
                                        <AvatarFallback>{user?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                                        <span className="text-sm font-bold truncate text-foreground">{user?.full_name}</span>
                                        <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => logout()} 
                                        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
                                    >
                                        <LogOut className="h-5 w-5" />
                                    </Button>
                                </div>
                            ) : (
                                <Link to="/login" className="block w-full">
                                    <Button className="w-full font-bold shadow-lg rounded-xl h-12 text-base" size="lg">Sign In</Button>
                                </Link>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};