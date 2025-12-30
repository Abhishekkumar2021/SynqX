"use client"

import * as React from "react"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"
import {
  DayPicker,
  getDefaultClassNames,
  type DayButton,
  type DateRange,
} from "react-day-picker"
import { motion, LayoutGroup } from "framer-motion"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "bg-transparent group/calendar p-3 [--cell-size:--spacing(9)]",
        className
      )}
      captionLayout={captionLayout}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn("flex gap-8 flex-col md:flex-row relative", defaultClassNames.months),
        month: cn("flex flex-col w-full gap-4", defaultClassNames.month),
        nav: cn("flex items-center gap-1 w-full absolute top-0 inset-x-0 justify-between px-1 z-20", defaultClassNames.nav),
        button_previous: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 p-0 glass hover:bg-primary/20 text-foreground/70 hover:text-primary transition-all rounded-lg border-border/40",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 p-0 glass hover:bg-primary/20 text-foreground/70 hover:text-primary transition-all rounded-lg border-border/40",
          defaultClassNames.button_next
        ),
        month_caption: cn("flex items-center justify-center h-8 w-full px-8", defaultClassNames.month_caption),
        caption_label: cn("select-none font-bold text-xs uppercase tracking-wider text-foreground/80"),
        table: "w-full border-collapse",
        weekdays: cn("flex justify-between mb-0", defaultClassNames.weekdays),
        weekday: cn("text-muted-foreground/40 w-9 font-bold text-[0.6rem] select-none uppercase tracking-widest text-center"),
        week: cn("flex w-full mt-0 gap-0", defaultClassNames.week),
        day: cn("relative w-9 h-9 p-0 text-center group/day aspect-square select-none overflow-visible"),
        range_start: cn("z-0", defaultClassNames.range_start),
        range_middle: cn("rounded-none font-bold z-0", defaultClassNames.range_middle),
        range_end: cn("z-0", defaultClassNames.range_end),
        today: cn("relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:size-1 after:bg-primary/60 after:rounded-full"),
        outside: "text-muted-foreground/20 opacity-40",
        disabled: "text-muted-foreground/10 opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className, ...props }) => {
            const Icon = orientation === "left" ? ChevronLeftIcon : orientation === "right" ? ChevronRightIcon : ChevronDownIcon;
            return <Icon className={cn("size-4", className)} {...props} />
        },
        DayButton: CalendarDayButton,
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const isRangeStart = !!modifiers.range_start;
  const isRangeEnd = !!modifiers.range_end;
  const isRangeMiddle = !!modifiers.range_middle;
  const isSelected = !!modifiers.selected;
  const isAnyRange = isRangeStart || isRangeEnd || isRangeMiddle;
  const isKnob = isSelected && !isRangeMiddle;

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "relative flex aspect-square size-auto w-full min-w-9 flex-col gap-1 leading-none font-bold",
        "transition-colors duration-300 ease-in-out",
        isKnob ? "text-primary-foreground hover:text-primary-foreground" : "text-foreground/90",
        !isAnyRange && "hover:bg-primary/10 hover:text-primary",
        "select-none overflow-visible z-10 text-[12px]",
        className
      )}
      data-selected={isSelected}
      data-range-start={isRangeStart}
      data-range-end={isRangeEnd}
      data-range-middle={isRangeMiddle}
      {...props}
    >
      {/* Background selection fill */}
      {isAnyRange && (
        <div className={cn(
            "absolute inset-y-1.5 z-[-1] transition-colors duration-300",
            isRangeStart && "left-1/2 right-0 bg-primary/10 rounded-none",
            isRangeEnd && "left-0 right-1/2 bg-primary/10 rounded-none",
            isRangeMiddle && "inset-x-0 bg-primary/10"
        )} />
      )}

      {/* Hover State Animation */}
      {!isAnyRange && (
        <motion.div
          className="absolute inset-0 bg-primary/10 rounded-lg opacity-0"
          whileHover={{ opacity: 1, scale: 1.1 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        />
      )}

      {/* Primary Indicator for Ends or Single Selection */}
      {isKnob && (
        <div
          className={cn(
            "absolute inset-0 bg-primary shadow-md shadow-primary/30 ring-2 ring-white/10 z-0 transition-all duration-200",
            isRangeStart ? "rounded-full" : isRangeEnd ? "rounded-full" : "rounded-xl"
          )}
        />
      )}

      <span className="relative z-20">
        {day.date.getDate()}
      </span>
    </Button>
  )
}

export { Calendar, CalendarDayButton }