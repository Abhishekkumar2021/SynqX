import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",

        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",

        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",

        outline:
          "text-foreground border-border",

        // Premium Glass Effect (Theme Aware)
        glass:
          "border-border/50 bg-background/60 backdrop-blur-md text-foreground shadow-sm hover:bg-background/80 dark:bg-white/5 dark:border-white/10",

        // Semantic Status Badges
        success:
          "border-success/20 bg-success/15 text-success hover:bg-success/25 shadow-[0_0_10px_-4px_rgba(var(--success),0.3)]",

        warning:
          "border-warning/20 bg-warning/15 text-warning hover:bg-warning/25 shadow-[0_0_10px_-4px_rgba(var(--warning),0.3)]",

        info:
          "border-info/20 bg-info/15 text-info hover:bg-info/25 shadow-[0_0_10px_-4px_rgba(var(--info),0.3)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export { Badge, badgeVariants }