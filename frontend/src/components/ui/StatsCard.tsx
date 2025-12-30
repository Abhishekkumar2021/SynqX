import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
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

// Create a motion component from the Shadcn Card
const MotionCard = motion(Card);

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
    const variantConfig = {
        primary: "text-primary bg-primary/10 border-primary/20",
        success: "text-success bg-success/10 border-success/20",
        warning: "text-warning bg-warning/10 border-warning/20",
        info: "text-info bg-info/10 border-info/20",
        destructive: "text-destructive bg-destructive/10 border-destructive/20",
    };

    const activeConfig = {
        primary: "border-primary/40 bg-primary/5 shadow-primary/10",
        success: "border-success/40 bg-success/5 shadow-success/10",
        warning: "border-warning/40 bg-warning/5 shadow-warning/10",
        info: "border-info/40 bg-info/5 shadow-info/10",
        destructive: "border-destructive/40 bg-destructive/5 shadow-destructive/10",
    };

    return (
        <MotionCard
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={cn(
                "relative overflow-hidden border transition-all duration-300 metric-card",
                active && activeConfig[variant],
                className
            )}
        >
            <CardContent className="p-5 md:p-6 relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between space-y-0 pb-4">
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.2em]">{title}</p>
                    <div className={cn(
                        "p-2 rounded-xl border transition-all duration-500 group-hover:scale-110 shadow-sm",
                        active
                            ? `bg-${variant} text-${variant}-foreground border-${variant} shadow-lg shadow-${variant}/20`
                            : variantConfig[variant]
                    )}>
                        <Icon className="h-4 w-4" />
                    </div>
                </div>

                {/* Value & Trends */}
                <div className="flex flex-col gap-0.5">
                    <h3 
                        className="text-3xl md:text-4xl font-bold tracking-tighter tabular-nums text-foreground leading-[0.9]"
                    >
                        {value}
                    </h3>

                    {(trend || subtext) && (
                        <div className="flex items-center gap-2 text-[10px] mt-3">
                            {trend && (
                                <span className={cn(
                                    "flex items-center px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider shadow-sm",
                                    trendUp
                                        ? "text-success bg-success/10 border-success/20"
                                        : "text-destructive bg-destructive/10 border-destructive/20"
                                )}>
                                    {trendUp ? <TrendingUp className="mr-1 h-2.5 w-2.5" /> : <TrendingDown className="mr-1 h-2.5 w-2.5" />}
                                    {trend}
                                </span>
                            )}
                            {subtext && (
                                <span className={cn(
                                    "text-muted-foreground font-bold tracking-tight opacity-70 truncate",
                                    subtextSize || "text-[10px]"
                                )}>
                                    {subtext}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </CardContent>

            {/* --- Decorative Elements --- */}

            {/* Hover Glow Gradient */}
            <div className={cn(
                "absolute -top-20 -right-20 h-60 w-60 blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-full",
                `bg-${variant}/20`
            )} />

            {/* Bottom Active Line */}
            {active && (
                <div className={cn(
                    "absolute bottom-0 left-0 w-full h-[3px] bg-linear-to-r from-transparent via-current to-transparent opacity-80",
                    `text-${variant}`
                )}></div>
            )}
        </MotionCard>
    );
};