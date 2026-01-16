import React, { useState } from 'react';
import { X, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
} from "@/components/ui/dialog";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface DashboardWidgetProps {
    title: string;
    description?: string;
    icon?: React.ElementType;
    children: React.ReactNode;
    className?: string;
    headerActions?: React.ReactNode;
}

export const DashboardWidget: React.FC<DashboardWidgetProps> = ({
    title,
    description,
    icon: Icon,
    children,
    className,
    headerActions
}) => {
    const [isMaximized, setIsMaximized] = useState(false);

    const HeaderContent = (isFull: boolean) => (
        <div className={cn(
            "flex items-center justify-between shrink-0",
            isFull ? "px-8 py-6 border-b border-border/40 bg-muted/20" : "px-8 pt-8 pb-4"
        )}>
            <div className="flex items-center gap-4">
                {Icon && (
                    <div className={cn(
                        "flex items-center justify-center rounded-xl border shadow-sm",
                        isFull ? "h-12 w-12" : "h-10 w-10",
                        "bg-primary/10 text-primary border-primary/20"
                    )}>
                        <Icon size={isFull ? 24 : 20} />
                    </div>
                )}
                <div>
                    <h3 className={cn(
                        "font-bold tracking-tighter uppercase text-foreground",
                        isFull ? "text-2xl" : "text-lg"
                    )}>
                        {title}
                    </h3>
                    {description && (
                        <p className={cn(
                            "font-bold text-muted-foreground/60 uppercase tracking-widest",
                            isFull ? "text-sm mt-1" : "text-[10px]"
                        )}>
                            {description}
                        </p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2">
                {headerActions}
                <div className="h-6 w-px bg-border/20 mx-2" />
                {isFull ? (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-xl hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all"
                        onClick={() => setIsMaximized(false)}
                    >
                        <X size={20} />
                    </Button>
                ) : (
                    <>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 rounded-xl hover:bg-primary/5 text-muted-foreground transition-all"
                                    onClick={() => setIsMaximized(true)}
                                >
                                    <Maximize2 size={18} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="font-bold uppercase tracking-widest text-[9px]">
                                Presentation View
                            </TooltipContent>
                        </Tooltip>
                    </>
                )}
            </div>
        </div>
    );

    return (
        <>
            <motion.div 
                className={cn(
                    "relative overflow-hidden flex flex-col rounded-3xl border border-white/10",
                    "bg-gradient-to-b from-card/80 to-card/30 backdrop-blur-2xl",
                    "shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-white/5 dark:ring-white/10 dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)]",
                    className
                )}
            >
                {/* Inner Glow */}
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/5 via-transparent to-transparent opacity-30" />
                
                {HeaderContent(false)}
                <div className="flex-1 min-h-0 relative z-10">
                    {children}
                </div>
            </motion.div>

            <Dialog open={isMaximized} onOpenChange={setIsMaximized}>
                <DialogContent className="max-w-7xl w-[90vw] h-[85vh] p-0 gap-0 border-border/40 rounded-3xl bg-background/95 backdrop-blur-3xl overflow-hidden flex flex-col focus-visible:outline-none shadow-2xl [&>button]:hidden">
                    <DialogHeader className="p-0 space-y-0 text-left">
                        {HeaderContent(true)}
                    </DialogHeader>
                    <div className="flex-1 w-full h-full p-8 overflow-hidden">
                        {children}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};
