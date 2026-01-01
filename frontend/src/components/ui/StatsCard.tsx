import React from 'react';
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface StatsCardProps {
    title: string;
    value: string | number;
    subtext?: string;
    subtextSize?: string;
    trend?: string;
    trendUp?: boolean;
    icon: LucideIcon;
    active?: boolean;
    variant?: 'primary' | 'success' | 'warning' | 'info' | 'destructive';
    className?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
    title,
    value,
    subtext,
    subtextSize,
    trend,
    trendUp,
    icon: Icon,
    active,
    variant = 'primary',
    className
}) => {
    const variantColors = {
        primary: "text-primary bg-primary/10 border-primary/20 shadow-primary/5",
        success: "text-success bg-success/10 border-success/20 shadow-success/5",
        warning: "text-warning bg-warning/10 border-warning/20 shadow-warning/5",
        info: "text-info bg-info/10 border-info/20 shadow-info/5",
        destructive: "text-destructive bg-destructive/10 border-destructive/20 shadow-destructive/5",
    };

    const ambientGlow = {
        primary: "from-primary/10 to-transparent",
        success: "from-success/10 to-transparent",
        warning: "from-warning/10 to-transparent",
        info: "from-info/10 to-transparent",
        destructive: "from-destructive/10 to-transparent",
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
                "relative group overflow-hidden rounded-[2.5rem] border border-border/40 p-1",
                "bg-card/95 dark:bg-card/98 backdrop-blur-3xl transition-all duration-500",
                "shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_32px_64px_rgba(0,0,0,0.12)] hover:border-primary/30",
                active && "border-primary/40 ring-1 ring-primary/10 shadow-primary/5",
                className
            )}
        >
            {/* Top Rim Light */}
            <div className="absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent pointer-events-none z-20" />

            <div className="relative z-10 p-6 md:p-8 flex flex-col h-full min-h-40 justify-between">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="space-y-1.5">
                        <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">{title}</p>
                        <div className="h-0.5 w-4 bg-muted-foreground/20 rounded-full group-hover:w-10 group-hover:bg-primary/40 transition-all duration-500" />
                    </div>
                    <div className={cn(
                        "p-3 rounded-2xl border transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-lg",
                        variantColors[variant]
                    )}>
                        <Icon className="h-5 w-5" />
                    </div>
                </div>

                {/* Value Section */}
                <div className="space-y-4">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-4xl md:text-5xl font-black tracking-tight tabular-nums text-foreground leading-none">
                            {value}
                        </h3>
                    </div>

                    {(trend || subtext) && (
                        <div className="flex items-center gap-3 flex-wrap">
                            {trend && (
                                <div className={cn(
                                    "flex items-center px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider shadow-xs backdrop-blur-sm",
                                    trendUp
                                        ? "text-success bg-success/10 border-success/20"
                                        : "text-destructive bg-destructive/10 border-destructive/20"
                                )}>
                                    {trendUp ? <TrendingUp className="mr-1.5 h-3 w-3" /> : <TrendingDown className="mr-1.5 h-3 w-3" />}
                                    {trend}
                                </div>
                            )}
                            {subtext && (
                                <span className={cn(
                                    "text-muted-foreground/60 font-bold tracking-tight truncate uppercase text-[9px] tracking-widest",
                                    subtextSize
                                )}>
                                    {subtext}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* --- Stylish Decorative Elements --- */}
            
            {/* Soft Ambient Inner Glow */}
            <div className={cn(
                "absolute inset-0 bg-linear-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none",
                ambientGlow[variant]
            )} />

            {/* Corner Light Burst */}
            <div className={cn(
                "absolute -top-24 -right-24 h-48 w-48 blur-[80px] opacity-0 group-hover:opacity-20 transition-opacity duration-1000 pointer-events-none rounded-full",
                variant === 'primary' ? "bg-primary" : 
                variant === 'success' ? "bg-success" :
                variant === 'warning' ? "bg-warning" :
                variant === 'info' ? "bg-info" : "bg-destructive"
            )} />

            {/* Bottom Glow Bar */}
            <div className={cn(
                "absolute bottom-0 inset-x-12 h-0.5 opacity-0 group-hover:opacity-100 blur-sm transition-all duration-700",
                variant === 'primary' ? "bg-primary" : 
                variant === 'success' ? "bg-success" :
                variant === 'warning' ? "bg-warning" :
                variant === 'info' ? "bg-info" : "bg-destructive"
            )} />
        </motion.div>
    );
};