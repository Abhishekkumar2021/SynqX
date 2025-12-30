import React from 'react';
import { motion } from 'framer-motion';

export const NavGroup = ({ children, title, collapsed }: { children: React.ReactNode, title?: string, collapsed?: boolean }) => {
    return (
        <div className="mb-2">
            {!collapsed && title && (
                <motion.h4
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="px-4 mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 whitespace-nowrap overflow-hidden"
                >
                    {title}
                </motion.h4>
            )}
            <div className="flex flex-col gap-1">
                {children}
            </div>
        </div>
    )
}