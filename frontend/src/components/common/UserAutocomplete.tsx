import * as React from "react"
import { Check, Mail, Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { searchUsers } from "@/lib/api"
import { useQuery } from "@tanstack/react-query"
import { useDebounce } from "@/hooks/useDebounce"

interface UserAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelect: (email: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  autoFocus?: boolean
}

export function UserAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Search users by email...",
  disabled = false,
  className,
  autoFocus = false,
}: UserAutocompleteProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [activeIndex, setActiveIndex] = React.useState(-1)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const scrollAreaRef = React.useRef<HTMLDivElement>(null)

  const debouncedQuery = useDebounce(value, 300)

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users-search', debouncedQuery],
    queryFn: () => searchUsers(debouncedQuery),
    enabled: debouncedQuery.length >= 3 && isOpen,
  })

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return

    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter") {
        e.preventDefault()
        setIsOpen(true)
      }
      return
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setActiveIndex((prev) => {
          const nextIndex = prev + 1
          return nextIndex >= users.length ? 0 : nextIndex
        })
        break

      case "ArrowUp":
        e.preventDefault()
        setActiveIndex((prev) => {
          const nextIndex = prev - 1
          return nextIndex < 0 ? users.length - 1 : nextIndex
        })
        break

      case "Enter":
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < users.length) {
          handleSelect(users[activeIndex].email)
        }
        break

      case "Escape":
        e.preventDefault()
        setIsOpen(false)
        break

      case "Tab":
        setIsOpen(false)
        break

      default:
        break
    }
  }

  const handleSelect = React.useCallback(
    (email: string) => {
      onSelect(email)
      onChange(email)
      setIsOpen(false)
      setActiveIndex(-1)
    },
    [onSelect, onChange]
  )

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => {
        document.removeEventListener("mousedown", handleClickOutside)
      }
    }
  }, [isOpen])

  return (
    <div className={cn("relative w-full group", className)} ref={containerRef}>
      <div className="relative">
        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors z-10 pointer-events-none" />
        
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className="pl-10 h-12 bg-muted/20 border-border/40 rounded-2xl font-medium focus-visible:ring-primary/20 transition-all"
          autoFocus={autoFocus}
        />

        {isLoading && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-primary/40" />
          </div>
        )}
      </div>
      
      <AnimatePresence>
        {isOpen && debouncedQuery.length >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-2 overflow-hidden rounded-2xl border border-border/40 bg-popover/95 backdrop-blur-xl shadow-2xl flex flex-col"
          >
            <div ref={scrollAreaRef} className="max-h-60 overflow-y-auto p-1.5 space-y-1">
              {users.length === 0 && !isLoading ? (
                <div className="py-6 text-center text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-50">
                  No system users found
                </div>
              ) : (
                users.map((user, index) => {
                  const isActive = activeIndex === index
                  return (
                    <div
                      key={user.id}
                      className={cn(
                        "flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-200",
                        isActive ? "bg-primary/10 text-primary" : "hover:bg-muted/50 text-foreground/80"
                      )}
                      onClick={() => handleSelect(user.email)}
                      onMouseEnter={() => setActiveIndex(index)}
                    >
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-black uppercase text-primary border border-primary/20 shrink-0">
                        {user.full_name?.charAt(0) || user.email.charAt(0)}
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-xs font-bold truncate leading-tight">{user.full_name || 'Anonymous User'}</span>
                        <span className="text-[10px] opacity-50 truncate font-medium">{user.email}</span>
                      </div>
                      {value === user.email && <Check className="ml-auto h-3.5 w-3.5 text-primary" />}
                    </div>
                  )
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
