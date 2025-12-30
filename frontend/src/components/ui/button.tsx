import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // Base styles: Focus rings, transitions, centering
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 hover:shadow-primary/30 border border-primary/10",

        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 border border-destructive/20 focus-visible:ring-destructive/50 shadow-sm",

        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground shadow-sm",

        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm border border-transparent",

        ghost:
          "hover:bg-accent hover:text-accent-foreground",

        link:
          "text-primary underline-offset-4 hover:underline",

        // New: Useful for low-emphasis actions that still need color
        soft:
          "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/5",

        // Updated: Matches your new Glass/iOS aesthetic
        glass:
          "bg-background/60 backdrop-blur-lg border border-border/50 text-foreground hover:bg-background/80 shadow-sm hover:shadow-md",
      },
      size: {
        default: "h-10 px-5 py-2",
        xs: "h-7 rounded-full px-3 text-xs", // For dense tables
        sm: "h-9 rounded-full px-4 text-xs",
        lg: "h-12 rounded-full px-8 text-base",
        xl: "h-14 rounded-full px-10 text-lg", // For hero sections
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
  isLoading?: boolean
  loadingText?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isLoading = false, loadingText, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isLoading || props.disabled}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading && (
          <Loader2 className={cn("mr-2 h-4 w-4 animate-spin", loadingText ? "" : "mr-0")} />
        )}
        {isLoading && loadingText ? loadingText : children}
      </Comp>
    )
  }
)
Button.displayName = "Button"

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants }