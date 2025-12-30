import React from 'react';
import { Terminal } from 'lucide-react';

export const JobDetailsEmpty: React.FC = () => {
    return (
        <div className="h-full flex flex-col items-center justify-center text-center p-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="relative mb-8 group cursor-default">
                <div 
                    // Theme-aware primary glow effect
                    className="absolute inset-0 bg-primary/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" 
                />
                <div 
                    // Theme-aware Glass panel look
                    className="relative h-32 w-32 rounded-[2.5rem] bg-card/40 border border-border/60 shadow-2xl shadow-black/30 flex items-center justify-center rotate-3 group-hover:rotate-0 transition-transform duration-500 backdrop-blur-sm"
                >
                    <Terminal className="h-14 w-14 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                </div>
            </div>
            <h3 className="text-2xl font-bold mb-3 text-foreground tracking-tight">Select an Execution</h3>
            <p className="max-w-xs text-base text-muted-foreground leading-relaxed font-medium">
                Click on a job from the list to view detailed logs, metadata, and error traces.
            </p>
        </div>
    );
};
