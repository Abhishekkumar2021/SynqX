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
import { MAIN_NAV, CONFIG_NAV } from '@/lib/main-nav';

interface MobileSidebarProps {
    isMobileMenuOpen: boolean;
    setIsMobileMenuOpen: (isOpen: boolean) => void;
}

const mobileMenuVariants: Variants = {
    closed: { 
        x: "-100%",
        transition: { 
            type: "spring" as const,
            stiffness: 400, 
            damping: 40,
            mass: 1
        }
    },
    open: { 
        x: "0%",
        transition: { 
            type: "spring" as const,
            stiffness: 400, 
            damping: 40,
            mass: 1
        }
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
                        className="fixed inset-y-0 left-0 z-105 w-[85vw] max-w-[320px] bg-background border-r border-border shadow-2xl flex flex-col overflow-hidden"
                        role="dialog"
                        aria-label="Mobile navigation menu"
                    >
                        {/* Mobile Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0 bg-background sticky top-0 z-10">
                            <Link 
                                to="/" 
                                onClick={handleMobileNavClick} 
                                className="flex items-center gap-3 group"
                                aria-label="SynqX Home"
                            >
                                <div className="h-10 w-10 rounded-xl bg-linear-to-br from-primary to-blue-600 flex items-center justify-center text-primary-foreground shadow-lg">
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
                                className="h-9 w-9 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
                                aria-label="Close menu"
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Scrollable Navigation */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-none">
                            {/* Context Switching for Docs */}
                            {isDocs ? (
                                <div className="space-y-6">
                                    <div className="px-2">
                                        <h3 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                                            <Book className="h-5 w-5 text-primary" />
                                            Documentation
                                        </h3>
                                    </div>
                                    <div onClick={handleMobileNavClick}>
                                        <DocsSidebar collapsed={false} />
                                    </div>
                                </div>
                            ) : (
                                <nav className="flex flex-col gap-1.5 w-full" aria-label="Main navigation">
                                    {MAIN_NAV.map((item) => (
                                        <NavItem 
                                            key={item.to}
                                            to={item.to} 
                                            icon={item.icon} 
                                            label={item.label} 
                                            onClick={handleMobileNavClick} 
                                            end={item.end}
                                        />
                                    ))}

                                    <div className="my-4 px-2">
                                        <div className="h-px w-full bg-linear-to-r from-transparent via-border to-transparent" />
                                    </div>

                                    <div className="px-3 mb-1 mt-4">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-70">
                                            Configuration
                                        </span>
                                    </div>

                                    {CONFIG_NAV.map((item) => (
                                        <NavItem 
                                            key={item.to}
                                            to={item.to} 
                                            icon={item.icon} 
                                            label={item.label} 
                                            onClick={handleMobileNavClick} 
                                            end={item.end}
                                        />
                                    ))}
                                </nav>
                            )}
                        </div>

                        {/* Mobile User Footer */}
                        <div className="p-4 border-t border-border bg-muted/20 shrink-0 mt-auto">
                            {user ? (
                                <div className="flex items-center gap-3 p-3 rounded-2xl bg-background border border-border shadow-sm transition-transform duration-200">
                                    <Avatar className="h-10 w-10 border border-border shrink-0 ring-2 ring-background">
                                        <AvatarImage src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user?.email || 'synqx'}`} alt={user?.full_name || 'User'} />
                                        <AvatarFallback>{user?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                                        <span className="text-sm font-bold truncate text-foreground">{user?.full_name}</span>
                                        <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={handleLogout} 
                                        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
                                        aria-label="Log out"
                                    >
                                        <LogOut className="h-5 w-5" />
                                    </Button>
                                </div>
                            ) : (
                                <Link to="/login" className="block w-full" onClick={handleMobileNavClick}>
                                    <Button className="w-full font-bold shadow-lg rounded-xl h-12 text-base" size="lg">
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