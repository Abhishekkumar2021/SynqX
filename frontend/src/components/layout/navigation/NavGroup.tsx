import React from 'react';
import { motion } from 'framer-motion';

export const NavGroup = ({ children, title, collapsed }: { children: React.ReactNode, title?: string, collapsed?: boolean }) => {
    return (
        <div className="mb-4 last:mb-0">
            {!collapsed && title && (
                <motion.h4
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/30 whitespace-nowrap overflow-hidden"
                >
                    {title}
                </motion.h4>
            )}
            <div className="flex flex-col">
                {children}
            </div>
        </div>
    )
}