import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Lock, Copy, Check, MousePointer2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfigFieldProps {
    label: string;
    value: React.ReactNode;
    sensitive?: boolean;
    copyable?: boolean;
    className?: string;
}

export const ConfigField: React.FC<ConfigFieldProps> = ({ 
    label, 
    value, 
    sensitive = false, 
    copyable = false,
    className 
}) => {
    const [copied, setCopied] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (typeof value === 'string' || typeof value === 'number') {
            navigator.clipboard.writeText(String(value));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast.success(`${label} copied`, {
                icon: <Check className="h-4 w-4 text-emerald-500" />
            });
        }
    };

    return (
        <div 
            className={cn("space-y-1.5 group/field", className)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/60 transition-colors group-hover/field:text-primary/80">
                    {label}
                </label>
                {sensitive && (
                    <div className="flex items-center gap-1 text-[9px] font-bold text-amber-500/80 uppercase tracking-tighter">
                        <Lock className="h-2.5 w-2.5" />
                        Encrypted
                    </div>
                )}
            </div>

            <div 
                className={cn(
                    "relative min-h-[44px] flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border transition-all duration-300",
                    "bg-muted/5 border-border/40 backdrop-blur-sm",
                    "group-hover/field:border-primary/30 group-hover/field:bg-primary/5 group-hover/field:shadow-sm",
                    copyable && "cursor-pointer active:scale-[0.98]",
                    sensitive && "font-mono tracking-[0.2em]"
                )}
                onClick={copyable ? handleCopy : undefined}
            >
                <div className="flex-1 min-w-0">
                    {typeof value === 'string' || typeof value === 'number' ? (
                        <span className={cn(
                            "text-sm font-bold truncate block",
                            sensitive ? "text-foreground/30" : "text-foreground/90 group-hover/field:text-foreground"
                        )}>
                            {value}
                        </span>
                    ) : (
                        <div className="flex items-center">{value}</div>
                    )}
                </div>

                <div className="flex items-center shrink-0 ml-auto gap-2">
                    <AnimatePresence mode="wait">
                        {copyable && isHovered && !copied && (
                            <motion.div
                                initial={{ opacity: 0, x: 5 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 5 }}
                                className="flex items-center gap-1.5 text-[9px] font-black text-primary/60 uppercase tracking-widest"
                            >
                                <MousePointer2 className="h-2.5 w-2.5" />
                                Click to copy
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {copyable && (
                        <div 
                            className={cn(
                                "p-1.5 rounded-lg border transition-all duration-300",
                                copied 
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" 
                                    : "bg-background/50 border-border/40 text-muted-foreground group-hover/field:border-primary/30 group-hover/field:text-primary"
                            )}
                        >
                            {copied ? (
                                <Check className="h-3.5 w-3.5" />
                            ) : (
                                <Copy className="h-3.5 w-3.5" />
                            )}
                        </div>
                    )}
                </div>

                {/* Subtle highlight line on top */}
                <div className="absolute inset-x-4 top-0 h-px bg-linear-to-r from-transparent via-primary/10 to-transparent opacity-0 group-hover/field:opacity-100 transition-opacity" />
            </div>
        </div>
    );
};