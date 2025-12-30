"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { motion } from "framer-motion"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group z-100000"
      expand={true}
      gap={12}
      toastOptions={{
        classNames: {
          toast:
            "group toast " +
            // Base Glass (Transparency adjusted for Light vs Dark)
            "group-[.toaster]:bg-white/70 dark:group-[.toaster]:bg-black/40 " +
            "group-[.toaster]:backdrop-blur-2xl group-[.toaster]:backdrop-saturate-150 " +
            // Explicit Text Colors to prevent "White on White" in light mode
            "group-[.toaster]:text-foreground " +
            // Borders & Shadows
            "group-[.toaster]:border-border/40 group-[.toaster]:shadow-[0_12px_32px_rgba(0,0,0,0.08)] " +
            "dark:group-[.toaster]:shadow-[0_20px_40px_rgba(0,0,0,0.4)] " +
            "group-[.toaster]:rounded-[1.5rem] group-[.toaster]:p-5 " +
            // Refractive edge
            "group-[.toaster]:ring-1 group-[.toaster]:ring-inset group-[.toaster]:ring-white/40 dark:group-[.toaster]:ring-white/10",

          title:
            "group-[.toast]:text-[13px] group-[.toast]:font-black group-[.toast]:uppercase group-[.toast]:tracking-[0.1em] !text-foreground",

          description:
            "group-[.toast]:text-[11px] group-[.toast]:font-medium group-[.toast]:leading-relaxed !text-muted-foreground group-[.toast]:mt-1",

          actionButton:
            "group-[.toast]:!bg-primary group-[.toast]:!text-primary-foreground group-[.toast]:font-black group-[.toast]:uppercase group-[.toast]:text-[10px] group-[.toast]:rounded-xl group-[.toast]:h-8 group-[.toast]:px-4 group-[.toast]:hover:scale-105 group-[.toast]:transition-transform group-[.toast]:shadow-lg group-[.toast]:shadow-primary/20 group-[.toast]:border-none",

          cancelButton:
            "group-[.toast]:!bg-muted/50 group-[.toast]:!text-muted-foreground group-[.toast]:font-bold group-[.toast]:uppercase group-[.toast]:text-[10px] group-[.toast]:rounded-xl group-[.toast]:h-8 group-[.toast]:px-4 group-[.toast]:hover:bg-muted group-[.toast]:transition-colors group-[.toast]:border-none",

          closeButton:
            "group-[.toast]:!bg-background/20 group-[.toast]:backdrop-blur-md group-[.toast]:!text-muted-foreground group-[.toast]:!border-border/40 group-[.toast]:hover:!bg-background/40 group-[.toast]:transition-all !opacity-100 group-[.toast]:ring-1 group-[.toast]:ring-white/10",
        },
      }}
      style={
        {
          // Forcing the CSS variables to match your OKLCH theme explicitly
          "--normal-bg": "transparent",
          "--normal-text": "var(--foreground)",
          "--title-color": "var(--foreground)",
          "--description-color": "var(--muted-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "1.5rem",
          "--action-button-bg": "var(--primary)",
          "--action-button-foreground": "var(--primary-foreground)",
          "--close-button-bg": "transparent",
          "--close-button-border": "var(--border)",
        } as React.CSSProperties
      }
      icons={{
        success: (
          <motion.div initial={{ scale: 0.5, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
            <CircleCheckIcon className="size-5 text-success" />
          </motion.div>
        ),
        info: (
          <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400 }}>
            <InfoIcon className="size-5 text-info" />
          </motion.div>
        ),
        warning: (
          <motion.div initial={{ y: -5, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <TriangleAlertIcon className="size-5 text-warning" />
          </motion.div>
        ),
        error: (
          <motion.div initial={{ x: -5 }} animate={{ x: 0 }} transition={{ type: "spring", repeat: 2, repeatType: "reverse", duration: 0.1 }}>
            <OctagonXIcon className="size-5 text-destructive" />
          </motion.div>
        ),
        loading: <Loader2Icon className="size-5 animate-spin text-primary" />,
      }}
      {...props}
    />
  )
}

export { Toaster }