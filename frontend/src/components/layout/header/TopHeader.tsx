import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Search, Menu, Maximize2, HelpCircle, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ModeToggle } from '../ModeToggle'
import { NotificationsBell } from '../navigation/NotificationsBell'
import { UnifiedSwitcher } from '../UnifiedSwitcher'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { useZenMode } from '@/hooks/useZenMode'
import { HEADER_VARIANTS } from '@/lib/animations'

interface TopHeaderProps {
  setIsMobileMenuOpen: (isOpen: boolean) => void
  setIsPaletteOpen: (isOpen: boolean) => void
}

export const TopHeader: React.FC<TopHeaderProps> = ({ setIsMobileMenuOpen, setIsPaletteOpen }) => {
  const location = useLocation()
  const { user } = useAuth()
  const { isZenMode, setIsZenMode } = useZenMode()

  const generateBreadcrumbs = () => {
    const pathnames = location.pathname.split('/').filter((x) => x)
    const breadcrumbs = [
      <BreadcrumbItem key="home">
        <BreadcrumbLink asChild>
          <Link
            to="/dashboard"
            className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted/40 text-muted-foreground/50 hover:text-foreground transition-all group"
          >
            <Home className="h-4 w-4 group-hover:scale-110 transition-transform" />
          </Link>
        </BreadcrumbLink>
      </BreadcrumbItem>,
    ]

    pathnames.forEach((value, index) => {
      const to = `/${pathnames.slice(0, index + 1).join('/')}`
      const isLast = index === pathnames.length - 1
      let name = value.replace(/-/g, ' ')

      if (/^\d+$/.test(value) || (value.length > 12 && /\d/.test(value))) {
        name = `...${value.substring(value.length - 4)}`
      } else {
        name = name.charAt(0).toUpperCase() + name.slice(1)
      }

      breadcrumbs.push(<BreadcrumbSeparator key={`sep-${index}`} className="opacity-10 mx-0.5" />)
      breadcrumbs.push(
        <BreadcrumbItem key={to}>
          {isLast ? (
            <BreadcrumbPage className="font-bold text-foreground tracking-tight px-2.5 py-1 rounded-lg bg-muted/30 border border-border/40 text-[10px] uppercase shadow-xs">
              {name}
            </BreadcrumbPage>
          ) : (
            <BreadcrumbLink asChild>
              <Link
                to={to}
                className="hover:text-foreground transition-all font-bold tracking-tight text-[10px] uppercase text-muted-foreground/40 hover:bg-muted/20 px-2 py-1 rounded-md"
              >
                {name}
              </Link>
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>
      )
    })

    return breadcrumbs
  }

  return (
    <AnimatePresence>
      {!isZenMode && (
        <motion.header
          variants={HEADER_VARIANTS}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="h-16 mx-4 mt-4 flex items-center justify-between shrink-0 z-40 relative px-4 rounded-2xl border border-white/10 bg-gradient-to-r from-card/80 via-card/50 to-card/80 backdrop-blur-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-500 ring-1 ring-white/5 dark:ring-white/10 dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)]"
        >
          {/* Inner subtle noise/glow */}
          <div className="absolute inset-0 pointer-events-none rounded-2xl bg-gradient-to-b from-white/5 to-transparent opacity-20" />

          {/* Left: Interactive Breadcrumbs */}
          <div className="flex items-center gap-4 flex-1 min-w-0 pr-4 relative z-10">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-10 w-10 rounded-xl border border-border/40 bg-background/40 shadow-sm"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </motion.div>

            <div className="hidden md:flex items-center">
              <Breadcrumb>
                <BreadcrumbList className="gap-1.5">{generateBreadcrumbs()}</BreadcrumbList>
              </Breadcrumb>
            </div>
          </div>

          {/* Right: Premium Action Hub */}
          <div className="flex items-center gap-3">
            {/* Search Bar - Theme-Aware Omni-Search Trigger */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    onClick={() => setIsPaletteOpen(true)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="h-10 w-60 hidden xl:flex items-center gap-3 px-4 rounded-xl border border-border/40 bg-muted/20 text-muted-foreground/60 transition-all group relative shadow-xs hover:shadow-md hover:border-primary/40 hover:bg-muted/30 active:bg-muted/50"
                  >
                    <Search className="h-3.5 w-3.5 shrink-0 opacity-40 group-hover:opacity-100 group-hover:text-primary transition-all duration-300" />
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 group-hover:opacity-100 group-hover:text-foreground transition-all duration-300">
                      Command Palette
                    </span>
                    <div className="ml-auto flex items-center gap-1">
                      <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded-md border border-border/40 bg-background/50 px-1.5 font-mono text-[9px] font-bold opacity-30 group-hover:opacity-100 group-hover:text-primary transition-all shadow-xs">
                        <span className="text-[8px]">⌘</span>K
                      </kbd>
                    </div>
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="text-[10px] font-bold uppercase tracking-widest py-2 px-3"
                >
                  Omni-Search Hub
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="h-7 w-px bg-border/20 mx-0.5 hidden xl:block" />

            {/* Integrated Switcher Hub */}
            <UnifiedSwitcher />

            <div className="h-7 w-px bg-border/20 mx-0.5 hidden sm:block" />

            {/* Action Stack */}
            <div className="flex items-center gap-1.5">
              <TooltipProvider>
                <motion.div whileHover={{ y: -1 }} transition={{ type: 'spring', stiffness: 500 }}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link to="/docs/intro">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 rounded-xl hover:bg-primary/5 text-muted-foreground/50 hover:text-primary border border-transparent hover:border-primary/20 transition-all"
                        >
                          <HelpCircle className="h-4.5 w-4.5" />
                        </Button>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent className="text-[10px] font-bold uppercase tracking-widest py-2 px-3">
                      Knowledge Base
                    </TooltipContent>
                  </Tooltip>
                </motion.div>

                <motion.div whileHover={{ y: -1 }} transition={{ type: 'spring', stiffness: 500 }}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsZenMode(true)}
                        className="h-10 w-10 rounded-xl hover:bg-primary/5 text-muted-foreground/50 hover:text-primary border border-transparent hover:border-primary/20 hidden sm:flex transition-all"
                      >
                        <Maximize2 className="h-4.5 w-4.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-[10px] font-bold uppercase tracking-widest py-2 px-3">
                      Immersive Mode
                    </TooltipContent>
                  </Tooltip>
                </motion.div>
              </TooltipProvider>

              <ModeToggle />
            </div>

            {user && (
              <>
                <div className="h-7 w-px bg-border/20 mx-0.5 hidden sm:block" />
                <div className="scale-90 origin-right">
                  <NotificationsBell />
                </div>
              </>
            )}
          </div>
        </motion.header>
      )}
    </AnimatePresence>
  )
}
