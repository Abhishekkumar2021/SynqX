import React, { useState, useEffect } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import { Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useZenMode } from '@/hooks/useZenMode';
import { motion, AnimatePresence } from 'framer-motion';

import { GlobalCommandPalette } from './navigation/GlobalCommandPalette';
import { DesktopSidebar } from './sidebar/DesktopSidebar';
import { MobileSidebar } from './sidebar/MobileSidebar';
import { TopHeader } from './header/TopHeader';

interface LayoutProps {
    children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = () => {
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isPaletteOpen, setIsPaletteOpen] = useState(false);
    const { isZenMode, setIsZenMode } = useZenMode();

    // Global CMD+K Shortcut
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key && e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsPaletteOpen((open) => !open);
            }
        };
        window.addEventListener("keydown", down, { capture: true });
        return () => window.removeEventListener("keydown", down, { capture: true });
    }, []);

    if (location.pathname === '/') {
        return (
            <div className="min-h-screen bg-background text-foreground font-sans antialiased selection:bg-primary/20">
                <Outlet />
            </div>
        );
    }

    return (
        <div className="flex h-screen w-full overflow-hidden font-sans antialiased bg-transparent">

            {/* --- Desktop Sidebar --- */}
            <DesktopSidebar 
                isSidebarCollapsed={isSidebarCollapsed} 
                setIsSidebarCollapsed={setIsSidebarCollapsed} 
            />

            {/* --- Main Content Area --- */}
            <motion.div 
                layout
                className="flex flex-1 flex-col overflow-hidden relative"
            >
                {/* --- Top Header --- */}
                <TopHeader 
                    setIsMobileMenuOpen={setIsMobileMenuOpen}
                    setIsPaletteOpen={setIsPaletteOpen}
                />

                {/* Global Command Palette */}
                <GlobalCommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />

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

            {/* --- Mobile Sidebar --- */}
            <MobileSidebar 
                isMobileMenuOpen={isMobileMenuOpen} 
                setIsMobileMenuOpen={setIsMobileMenuOpen} 
            />
        </div>
    );
};