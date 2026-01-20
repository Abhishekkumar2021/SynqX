 
import React, { useState, useMemo } from 'react'
import cronstrue from 'cronstrue'
import { Input } from '@/components/ui/input'
import { AlertCircle, CheckCircle2, Info, CalendarClock, Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

interface CronBuilderProps {
  value: string
  onChange: (value: string) => void
}

const PRESETS = [
  { label: 'Every Minute', value: '* * * * *', desc: 'Runs every 60 seconds' },
  { label: 'Hourly', value: '0 * * * *', desc: 'At the start of every hour' },
  { label: 'Daily', value: '0 0 * * *', desc: 'Every day at midnight' },
  { label: 'Weekly', value: '0 0 * * 0', desc: 'Every Sunday at midnight' },
  { label: 'Work Hours', value: '0 9-17 * * 1-5', desc: 'Hourly, 9 AM - 5 PM, Mon-Fri' },
  { label: 'Monthly', value: '0 0 1 * *', desc: 'First day of every month' },
]

export const CronBuilder: React.FC<CronBuilderProps> = ({ value, onChange }) => {
  const [modeOverride, setModeOverride] = useState<'preset' | 'custom' | null>(null)

  const isMatchingPreset = useMemo(() => PRESETS.some((p) => p.value === value), [value])
  const mode = modeOverride || (isMatchingPreset || !value ? 'preset' : 'custom')

  const { humanReadable, isValid, parts } = useMemo(() => {
    let hr = 'Invalid Cron Expression'
    let valid = false
    const p = value ? value.split(' ') : []

    try {
      if (value) {
        hr = cronstrue.toString(value, { use24HourTimeFormat: true })
        valid = true
      }
    } catch (e) {
      valid = false
    }

    return {
      humanReadable: hr,
      isValid: valid,
      parts: {
        min: p[0] || '*',
        hour: p[1] || '*',
        day: p[2] || '*',
        month: p[3] || '*',
        week: p[4] || '*',
      },
    }
  }, [value])

  return (
    <div className="flex flex-col gap-6 p-1 relative text-foreground">
      {/* --- Navigation Toggle --- */}
      <div className="flex items-center justify-between px-2 mb-2">
        <div className="flex flex-col">
          <span className="font-bold text-xs tracking-[0.2em] leading-none uppercase text-muted-foreground/60 flex items-center gap-2">
            <CalendarClock className="h-3 w-3" /> Sync Schedule
          </span>
        </div>

        <div className="flex p-1 bg-muted/20 backdrop-blur-md rounded-xl border border-border/20 shadow-inner">
          {(['preset', 'custom'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModeOverride(m)}
              className={cn(
                'px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all duration-500',
                mode === m
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105'
                  : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted/40'
              )}
            >
              {m === 'preset' ? 'Templates' : 'Custom SQL'}
            </button>
          ))}
        </div>
      </div>

      <div className="px-1">
        {/* --- PRESET VIEW --- */}
        {mode === 'preset' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in slide-in-from-left-4 duration-500">
            {PRESETS.map((preset) => (
              <button
                type="button"
                key={preset.label}
                onClick={() => {
                  onChange(preset.value)
                  setModeOverride('preset')
                }}
                className={cn(
                  'relative flex flex-col items-start p-4 rounded-2xl border text-left transition-all duration-300 outline-none group overflow-hidden',
                  value === preset.value
                    ? 'bg-primary/10 border-primary/40 ring-1 ring-primary/20 shadow-xl shadow-primary/5'
                    : 'bg-slate-100/50 dark:bg-muted/40 border-border/60 dark:border-border/40 hover:bg-slate-200/50 dark:hover:bg-muted/60 hover:border-border/80'
                )}
              >
                <div className="flex justify-between w-full mb-1 relative z-10">
                  <span
                    className={cn(
                      'text-[10px] font-bold uppercase tracking-widest',
                      value === preset.value ? 'text-primary' : 'text-foreground/70'
                    )}
                  >
                    {preset.label}
                  </span>
                  {value === preset.value && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary animate-in zoom-in duration-500 shadow-sm" />
                  )}
                </div>
                <span className="text-[9px] text-muted-foreground/60 font-bold tracking-tight mb-3 line-clamp-1 relative z-10 uppercase">
                  {preset.desc}
                </span>
                <code
                  className={cn(
                    'text-[9px] px-2 py-0.5 rounded-md font-mono font-bold transition-all relative z-10 tracking-widest',
                    value === preset.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground/60'
                  )}
                >
                  {preset.value}
                </code>
              </button>
            ))}

            <button
              type="button"
              onClick={() => setModeOverride('custom')}
              className="flex flex-col items-center justify-center p-4 rounded-2xl border border-dashed border-border/40 text-muted-foreground/40 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all gap-2 group"
            >
              <Settings2 className="h-4 w-4 opacity-40 group-hover:opacity-100 group-hover:rotate-90 transition-all duration-500" />
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-60">
                Manual Config
              </span>
            </button>
          </div>
        )}

        {/* --- CUSTOM VIEW --- */}
        {mode === 'custom' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-2">
              <Label className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40 ml-1">
                Precision Expression
              </Label>
              <div className="relative group">
                <Input
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  className={cn(
                    'font-mono text-center tracking-[0.4em] text-lg h-14 rounded-2xl bg-slate-100/50 dark:bg-muted/10 border-border/40 dark:border-border/40 shadow-inner placeholder:opacity-20 focus:ring-4 focus:ring-primary/5 transition-all pr-10 uppercase',
                    isValid && 'border-emerald-500/30 text-emerald-500',
                    !isValid && value && 'border-red-500/30 text-red-500'
                  )}
                  placeholder="* * * * *"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {isValid ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500/40" />
                  ) : value ? (
                    <AlertCircle className="h-4 w-4 text-red-500/40 animate-pulse" />
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2">
              <CronSlot label="Min" value={parts.min} />
              <CronSlot label="Hour" value={parts.hour} />
              <CronSlot label="Day" value={parts.day} />
              <CronSlot label="Mon" value={parts.month} />
              <CronSlot label="Wk" value={parts.week} />
            </div>

            <div className="rounded-2xl bg-muted/5 border border-border/20 p-4 shadow-sm relative overflow-hidden">
              <div className="flex items-center gap-2 mb-3 text-muted-foreground/40 relative z-10">
                <Info className="h-3 w-3" />
                <span className="text-[8px] font-bold uppercase tracking-[0.3em]">
                  Quick Reference
                </span>
              </div>
              <div className="grid grid-cols-4 gap-4 text-[9px] font-bold text-muted-foreground/60 relative z-10">
                {[
                  ['*', 'All'],
                  [',', 'List'],
                  ['-', 'Range'],
                  ['/', 'Step'],
                ].map(([s, l]) => (
                  <div key={s} className="flex flex-col items-center gap-1">
                    <code className="text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded text-[10px]">
                      {s}
                    </code>
                    <span className="opacity-60 uppercase text-[7px] tracking-widest">{l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div
        className={cn(
          'px-5 py-3 border border-border/20 bg-white/80 dark:bg-background/40 backdrop-blur-md flex items-center justify-between rounded-2xl shadow-xl transition-all duration-500',

          isValid ? 'border-emerald-500/20' : value ? 'border-red-500/20' : ''
        )}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <span className="text-[8px] font-bold uppercase tracking-[0.3em] text-muted-foreground/40 shrink-0">
            Status
          </span>

          <div className="h-3 w-px bg-border/20 shrink-0" />

          <span
            className={cn(
              'text-[10px] font-bold tracking-tight truncate',

              isValid ? 'text-foreground/80' : 'text-red-500/60 '
            )}
          >
            {humanReadable}
          </span>
        </div>

        {isValid && (
          <Badge
            variant="outline"
            className="h-5 text-[7px] font-bold border-emerald-500/20 text-emerald-500 bg-emerald-500/10 tracking-widest uppercase rounded-md px-1.5"
          >
            Active
          </Badge>
        )}
      </div>
    </div>
  )
}

const CronSlot = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col items-center gap-1.5 group">
    <div className="w-full aspect-square flex items-center justify-center rounded-xl bg-background/40 border border-border/20 shadow-sm font-mono text-xs font-bold text-foreground/80 transition-all group-hover:border-primary/40 group-hover:shadow-md ring-1 ring-border/5 backdrop-blur-sm group-hover:scale-105 duration-300">
      {value}
    </div>

    <span className="text-[7px] uppercase font-bold text-muted-foreground/30 tracking-[0.2em]">
      {label}
    </span>
  </div>
)
