"use client"

import { format } from "date-fns"
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { LayoutGroup } from "framer-motion"

interface DateRangePickerProps {
    className?: string;
    date: DateRange | undefined;
    setDate: (date: DateRange | undefined) => void;
}

export function DateRangePicker({
  className,
  date,
  setDate
}: DateRangePickerProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "flex h-10 w-[280px] items-center justify-between rounded-xl px-2 py-2 text-sm transition-all duration-200",
              "border border-input/50 bg-background/50 backdrop-blur-sm",
              "text-foreground placeholder:text-muted-foreground",
              "shadow-sm shadow-black/5 hover:shadow-md hover:bg-accent/5 hover:border-accent/50",
              "focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/50",
              !date && "text-muted-foreground"
            )}
          >
            <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
                    <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                </div>
                
                <div className="flex flex-col items-start justify-center -space-y-0.5 overflow-hidden">
                    {date?.from ? (
                        <>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70">
                                Timeframe
                            </span>
                            <span className="text-[12px] font-semibold tracking-tight flex items-center gap-1.5 truncate">
                                {format(date.from, "MMM dd")} 
                                <div className="h-0.5 w-0.5 rounded-full bg-muted-foreground/30" />
                                {date.to ? format(date.to, "MMM dd, y") : "Selecting..."}
                            </span>
                        </>
                    ) : (
                        <span className="text-sm font-medium">Select Date Range</span>
                    )}
                </div>
            </div>

            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-0 border-none bg-transparent shadow-none" 
          align="end" 
          sideOffset={8}
        >
          <div className="glass-panel p-4 shadow-2xl ring-1 ring-white/10 dark:ring-white/5 border border-white/10 overflow-hidden">
            <div className="mb-4 px-2 py-1 flex items-center justify-between min-h-[32px] border-b border-border/20 pb-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/90">
                    Range Selection
                </p>
                {date?.from && date?.to ? (
                    <div className="px-3 py-1 rounded-full bg-primary/15 border border-primary/20 text-[9px] font-black text-primary uppercase tracking-tight animate-in fade-in zoom-in-95 duration-200">
                        {Math.ceil((date.to.getTime() - date.from.getTime()) / (1000 * 60 * 60 * 24)) + 1} Days
                    </div>
                ) : (
                    <div className="h-6 w-1" />
                )}
            </div>
            <LayoutGroup id="dashboard-calendar">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
                className="bg-transparent"
              />
            </LayoutGroup>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}