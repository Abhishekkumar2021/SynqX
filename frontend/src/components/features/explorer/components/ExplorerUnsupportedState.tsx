import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Layout, MessageSquare, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExplorerUnsupportedStateProps {
    connectorType: string;
    onBack: () => void;
}

export const ExplorerUnsupportedState: React.FC<ExplorerUnsupportedStateProps> = ({ 
    connectorType, 
    onBack 
}) => (
    <motion.div 
        key="unsupported" 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center h-full p-12 text-center"
    >
        <div className="max-w-md w-full p-8 rounded-[2.5rem] border border-border/40 bg-muted/5 space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
                <Layout className="h-32 w-32 rotate-12" />
            </div>
            
            <div className="h-16 w-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto shadow-inner">
                <AlertTriangle className="h-8 w-8 text-amber-500" />
            </div>
            
            <div className="space-y-2 relative z-10">
                <h3 className="text-xl font-bold tracking-tight">Module Unavailable</h3>
                <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                    The Explorer currently does not support rich interaction for <span className="text-foreground font-bold">{connectorType}</span>.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-4 relative z-10">
                <Button variant="outline" className="rounded-2xl font-bold text-xs gap-2 py-6 border-border/40 hover:bg-primary/5 hover:text-primary transition-all group">
                    <MessageSquare className="h-4 w-4" /> Request Explorer Module
                    <ArrowRight className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                </Button>
                <Button variant="ghost" className="rounded-2xl font-bold text-xs opacity-60" onClick={onBack}>
                    Back to Connections
                </Button>
            </div>
        </div>
    </motion.div>
);
