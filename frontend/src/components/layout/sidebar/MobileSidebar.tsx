import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    Workflow, 
    X, LogOut, Book} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { NavItem } from '../navigation/NavItem';
import { useAuth } from '@/hooks/useAuth';
import { DocsSidebar } from '../navigation/DocsSidebar';
import { NAV_STRUCTURE } from '@/lib/main-nav';
import { LAYOUT_TRANSITION } from '@/lib/animations';

interface MobileSidebarProps {
    isMobileMenuOpen: boolean;
    setIsMobileMenuOpen: (isOpen: boolean) => void;
}

const mobileMenuVariants: Variants = {
    closed: { 
        x: "-100%",
        transition: LAYOUT_TRANSITION
    },
    open: { 
        x: "0%",
        transition: LAYOUT_TRANSITION
    }
};

const backdropVariants: Variants = {
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

    const handleLogout = () => {
        logout();
        setIsMobileMenuOpen(false);
    };

    return (
        <AnimatePresence mode="wait">
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-100 md:hidden">
                    {/* Backdrop */}
                    <motion.div
                        initial="closed"
                        animate="open"
                        exit="closed"
                        variants={backdropVariants}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-100"
                        onClick={() => setIsMobileMenuOpen(false)}
                        aria-hidden="true"
                    />
                    
                    {/* Sidebar Drawer */}
                    <motion.aside
                        initial="closed"
                        animate="open"
                        exit="closed"
                        variants={mobileMenuVariants}
                        className="fixed inset-y-0 left-0 z-105 w-[85vw] max-w-[300px] bg-background border-r border-border shadow-2xl flex flex-col overflow-hidden"
                        role="dialog"
                        aria-label="Mobile navigation menu"
                    >
                        {/* Mobile Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0 bg-background sticky top-0 z-10">
                            <Link 
                                to="/" 
                                onClick={handleMobileNavClick} 
                                className="flex items-center gap-3 group"
                                aria-label="SynqX Home"
                            >
                                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-lg transition-transform group-active:scale-95">
                                    <Workflow className="h-4 w-4 stroke-[1.5]" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-xl tracking-tight leading-none text-foreground">SynqX</span>
                                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mt-1">Enterprise</span>
                                </div>
                            </Link>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setIsMobileMenuOpen(false)} 
                                className="h-8 w-8 rounded-full hover:bg-muted transition-colors"
                                aria-label="Close menu"
                            >
                                <X className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </div>

                        {/* Scrollable Navigation */}
                        <div className="flex-1 overflow-y-auto p-4 scrollbar-none">
                            {/* Context Switching for Docs */}
                            {isDocs ? (
                                <div className="space-y-6">
                                    <div className="px-2">
                                        <h3 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
                                            <Book className="h-5 w-5 text-primary" />
                                            Documentation
                                        </h3>
                                    </div>
                                    <div onClick={handleMobileNavClick}>
                                        <DocsSidebar collapsed={false} />
                                    </div>
                                </div>
                            ) : (
                                <nav className="flex flex-col w-full gap-2" aria-label="Main navigation">
                                    {NAV_STRUCTURE.map((group) => (
                                        <div key={group.title} className="flex flex-col mb-2">
                                            <h4 className="px-3 mb-2 text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-wider">
                                                {group.title}
                                            </h4>
                                            <div className="flex flex-col">
                                                {group.items.map((item) => (
                                                    <NavItem 
                                                        key={item.to}
                                                        to={item.to} 
                                                        icon={item.icon} 
                                                        label={item.label} 
                                                        onClick={handleMobileNavClick} 
                                                        end={item.end}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </nav>
                            )}
                        </div>

                        {/* Mobile User Footer */}
                        <div className="p-4 border-t border-border/10 bg-muted/5 shrink-0 mt-auto">
                            {user ? (
                                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-card border border-border/40 shadow-sm">
                                    <div className="relative">
                                        <Avatar className="h-9 w-9 border border-border/40 shrink-0">
                                            <AvatarImage src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user?.email || 'synqx'}`} alt={user?.full_name || 'User'} />
                                            <AvatarFallback className="bg-primary/10 text-primary font-medium uppercase text-xs">{user?.email?.charAt(0) || 'U'}</AvatarFallback>
                                        </Avatar>
                                        <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-500" />
                                    </div>
                                    <div className="flex flex-col flex-1 min-w-0 overflow-hidden text-left">
                                        <span className="text-[13px] font-medium truncate text-foreground">{user?.full_name}</span>
                                        <span className="text-[10px] font-medium text-muted-foreground/40 truncate">{user?.email}</span>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={handleLogout} 
                                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                        aria-label="Log out"
                                    >
                                        <LogOut className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <Link to="/login" className="block w-full" onClick={handleMobileNavClick}>
                                    <Button className="w-full font-semibold shadow-lg rounded-xl h-12 text-base" size="lg">
                                        Sign In
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </motion.aside>
                </div>
            )}
        </AnimatePresence>
    );
};