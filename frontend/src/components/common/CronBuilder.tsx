/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useMemo } from 'react';
import cronstrue from 'cronstrue';
import { Input } from '@/components/ui/input';
import {
    AlertCircle, CheckCircle2,
    Info, CalendarClock, Settings2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface CronBuilderProps {
    value: string;
    onChange: (value: string) => void;
}

const PRESETS = [
    { label: "Every Minute", value: "* * * * *", desc: "Runs every 60 seconds" },
    { label: "Hourly", value: "0 * * * *", desc: "At the start of every hour" },
    { label: "Daily", value: "0 0 * * *", desc: "Every day at midnight" },
    { label: "Weekly", value: "0 0 * * 0", desc: "Every Sunday at midnight" },
    { label: "Work Hours", value: "0 9-17 * * 1-5", desc: "Hourly, 9 AM - 5 PM, Mon-Fri" },
    { label: "Monthly", value: "0 0 1 * *", desc: "First day of every month" },
];

export const CronBuilder: React.FC<CronBuilderProps> = ({ value, onChange }) => {
    const [modeOverride, setModeOverride] = useState<'preset' | 'custom' | null>(null);

    const isMatchingPreset = useMemo(() => PRESETS.some(p => p.value === value), [value]);
    const mode = modeOverride || (isMatchingPreset || !value ? 'preset' : 'custom');

    const { humanReadable, isValid, parts } = useMemo(() => {
        let hr = 'Invalid Cron Expression';
        let valid = false;
        const p = value ? value.split(' ') : [];

        try {
            if (value) {
                hr = cronstrue.toString(value, { use24HourTimeFormat: true });
                valid = true;
            }
        } catch (e) {
            valid = false;
        }

        return {
            humanReadable: hr,
            isValid: valid,
            parts: {
                min: p[0] || '*',
                hour: p[1] || '*',
                day: p[2] || '*',
                month: p[3] || '*',
                week: p[4] || '*'
            }
        };
    }, [value]);

    return (
        <div className="flex flex-col gap-6 p-1 relative text-foreground">

            {/* --- Navigation Toggle --- */}
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl text-primary ring-1 ring-primary/20">
                        <CalendarClock className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-black text-sm tracking-tight leading-none uppercase">Schedule</span>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-50 mt-1">Recurrence Logic</span>
                    </div>
                </div>

                <div className="flex p-1 bg-muted/30 backdrop-blur-sm rounded-xl border border-border/40 shadow-inner">
                    {(['preset', 'custom'] as const).map((m) => (
                        <button
                            key={m}
                            type="button"
                            onClick={() => setModeOverride(m)}
                            className={cn(
                                "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-300",
                                mode === m
                                    ? "bg-background text-primary shadow-sm ring-1 ring-border/50"
                                    : "text-muted-foreground/60 hover:text-foreground hover:bg-background/50"
                            )}
                        >
                            {m === 'preset' ? 'Presets' : 'Advanced'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="px-1">
                {/* --- PRESET VIEW --- */}
                {mode === 'preset' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-left-4 duration-500">
                        {PRESETS.map((preset) => (
                            <button
                                type="button"
                                key={preset.label}
                                onClick={() => { onChange(preset.value); setModeOverride('preset'); }}
                                className={cn(
                                    "relative flex flex-col items-start p-5 rounded-[1.5rem] border text-left transition-all duration-300 outline-none group overflow-hidden",
                                    value === preset.value
                                        ? "bg-primary/5 border-primary/40 ring-1 ring-primary/20 shadow-xl"
                                        : "bg-muted/10 border-border/40 hover:border-primary/30 hover:bg-muted/20"
                                )}
                            >
                                <div className="flex justify-between w-full mb-1.5 relative z-10">
                                    <span className={cn("text-xs font-black uppercase tracking-widest", value === preset.value ? "text-primary" : "text-foreground/80")}>
                                        {preset.label}
                                    </span>
                                    {value === preset.value && (
                                        <CheckCircle2 className="h-4 w-4 text-primary animate-in zoom-in duration-500" />
                                    )}
                                </div>
                                <span className="text-[10px] text-muted-foreground font-bold tracking-tight mb-4 line-clamp-1 relative z-10">{preset.desc}</span>
                                <code className={cn(
                                    "text-[10px] px-2.5 py-1 rounded-lg font-mono font-bold transition-all relative z-10",
                                    value === preset.value ? "bg-primary text-primary-foreground" : "bg-background/80 text-muted-foreground border border-border/40"
                                )}>
                                    {preset.value}
                                </code>
                            </button>
                        ))}

                        <button
                            type="button"
                            onClick={() => setModeOverride('custom')}
                            className="flex flex-col items-center justify-center p-5 rounded-[1.5rem] border border-dashed border-border/40 text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/2 transition-all gap-3 group"
                        >
                            <div className="p-2 rounded-xl bg-muted group-hover:bg-primary/10 transition-colors">
                                <Settings2 className="h-5 w-5 opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 group-hover:opacity-100 transition-opacity">Custom Definition</span>
                        </button>
                    </div>
                )}

                {/* --- CUSTOM VIEW --- */}
                {mode === 'custom' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Cron Expression</Label>
                            <div className="relative group">
                                <Input
                                    value={value}
                                    onChange={(e) => onChange(e.target.value)}
                                    className={cn(
                                        "font-mono text-center tracking-[0.3em] text-xl h-16 rounded-2xl bg-muted/20 border-border/40 shadow-inner placeholder:opacity-30 focus:ring-1 focus:ring-primary/20 transition-all pr-10",
                                        isValid && "border-emerald-500/40 text-emerald-500",
                                        !isValid && value && "border-destructive/40 text-destructive"
                                    )}
                                    placeholder="* * * * *"
                                />
                                <div className="absolute right-5 top-1/2 -translate-y-1/2">
                                    {isValid ? (
                                        <CheckCircle2 className="h-5 w-5 text-emerald-500/60" />
                                    ) : value ? (
                                        <AlertCircle className="h-5 w-5 text-destructive animate-pulse" />
                                    ) : null}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-5 gap-3">
                            <CronSlot label="Min" value={parts.min} />
                            <CronSlot label="Hour" value={parts.hour} />
                            <CronSlot label="Day" value={parts.day} />
                            <CronSlot label="Mon" value={parts.month} />
                            <CronSlot label="Wk" value={parts.week} />
                        </div>

                        <div className="rounded-[1.5rem] bg-muted/10 border border-border/40 p-6 shadow-inner relative overflow-hidden">
                            <div className="flex items-center gap-2 mb-4 text-muted-foreground relative z-10">
                                <div className="p-1 rounded-md bg-primary/10 text-primary">
                                    <Info className="h-3 w-3" />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-[0.2em]">Reference Syntax</span>
                            </div>
                            <div className="grid grid-cols-2 gap-y-3 gap-x-10 text-[10px] font-bold text-muted-foreground/60 relative z-10">
                                {[['*', 'Wildcard'], [',', 'List'], ['-', 'Range'], ['/', 'Steps']].map(([s, l]) => (
                                    <div key={s} className="flex justify-between items-center border-b border-border/40 pb-1.5">
                                        <code className="text-primary font-black">{s}</code>
                                        <span className="opacity-80">{l}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className={cn(
                "px-6 py-4 border border-border/40 bg-muted/20 backdrop-blur-md flex items-center justify-between rounded-2xl shadow-xl transition-all duration-500",
                isValid ? "bg-emerald-500/3 border-emerald-500/20" : value ? "bg-destructive/3 border-destructive/20" : ""
            )}>
                <div className="flex items-center gap-3 overflow-hidden">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 shrink-0">Translation</span>
                    <div className="h-3 w-px bg-border/40 shrink-0" />
                    <span className={cn(
                        "text-[11px] font-black tracking-tight truncate",
                        isValid ? "text-foreground" : "text-destructive/80 italic"
                    )}>
                        {humanReadable}
                    </span>
                </div>
                {isValid && (
                    <Badge variant="outline" className="text-[8px] font-black border-emerald-500/20 text-emerald-500 bg-emerald-500/10">SYNCED</Badge>
                )}
            </div>
        </div>
    );
};

const CronSlot = ({ label, value }: { label: string, value: string }) => (
    <div className="flex flex-col items-center gap-2 group">
        <div className="w-full aspect-4/5 flex items-center justify-center rounded-xl bg-muted/40 border border-border/40 shadow-inner font-mono text-sm sm:text-base font-black text-foreground transition-all group-hover:border-primary/30 group-hover:shadow-[0_0_15px_-5px_rgba(var(--primary),0.3)] ring-1 ring-border/50 backdrop-blur-sm">
            {value}
        </div>
        <span className="text-[8px] uppercase font-black text-muted-foreground/40 tracking-widest">{label}</span>
    </div>
);