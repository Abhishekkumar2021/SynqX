/* eslint-disable @typescript-eslint/no-unused-vars */
import * as React from "react"
import { Check, Search, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface PackageAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelect: (value: string) => void
  options: string[]
  placeholder?: string
  disabled?: boolean
  className?: string
  leftIcon?: React.ElementType
  emptyMessage?: string
  showClearButton?: boolean
  maxHeight?: number
  filterFn?: (option: string, query: string) => boolean
  renderOption?: (option: string, isSelected: boolean, isActive: boolean) => React.ReactNode
  onBlur?: () => void
  onFocus?: () => void
  autoFocus?: boolean
  loading?: boolean
  loadingMessage?: string
}

export function PackageAutocomplete({
  value,
  onChange,
  onSelect,
  options,
  placeholder = "Select package...",
  disabled = false,
  className,
  leftIcon: LeftIcon = Search,
  emptyMessage = "No results found",
  showClearButton = true,
  maxHeight = 240,
  filterFn,
  renderOption,
  onBlur,
  onFocus,
  autoFocus = false,
  loading = false,
  loadingMessage = "Loading...",
}: PackageAutocompleteProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [activeIndex, setActiveIndex] = React.useState(-1)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const scrollAreaRef = React.useRef<HTMLDivElement>(null)
  const optionRefs = React.useRef<Map<number, HTMLDivElement>>(new Map())

  // Default filter function
  const defaultFilterFn = React.useCallback(
    (option: string, query: string) =>
      option.toLowerCase().includes(query.toLowerCase()),
    []
  )

  const activeFilterFn = filterFn || defaultFilterFn

  // Filtered options with memoization
  const filteredOptions = React.useMemo(() => {
    if (!value) return options
    return options.filter((option) => activeFilterFn(option, value))
  }, [options, value, activeFilterFn])

  // Reset active index when value changes
  React.useEffect(() => {
    setActiveIndex(-1)
  }, [value])

  // Auto-focus input if requested
  React.useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  // Scroll active option into view
  React.useEffect(() => {
    if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
      const activeOption = optionRefs.current.get(activeIndex)
      if (activeOption && scrollAreaRef.current) {
        const optionTop = activeOption.offsetTop
        const optionBottom = optionTop + activeOption.offsetHeight
        const scrollTop = scrollAreaRef.current.scrollTop
        const scrollBottom = scrollTop + scrollAreaRef.current.clientHeight

        if (optionBottom > scrollBottom) {
          scrollAreaRef.current.scrollTop = optionBottom - scrollAreaRef.current.clientHeight
        } else if (optionTop < scrollTop) {
          scrollAreaRef.current.scrollTop = optionTop
        }
      }
    }
  }, [activeIndex, filteredOptions.length])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled || loading) return

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
          return nextIndex >= filteredOptions.length ? 0 : nextIndex
        })
        break

      case "ArrowUp":
        e.preventDefault()
        setActiveIndex((prev) => {
          const nextIndex = prev - 1
          return nextIndex < 0 ? filteredOptions.length - 1 : nextIndex
        })
        break

      case "Enter":
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
          handleSelect(filteredOptions[activeIndex])
        } else if (filteredOptions.length === 1) {
          // Auto-select if only one option
          handleSelect(filteredOptions[0])
        }
        break

      case "Escape":
        e.preventDefault()
        setIsOpen(false)
        inputRef.current?.blur()
        break

      case "Tab":
        setIsOpen(false)
        break

      default:
        break
    }
  }

  // Handle option selection
  const handleSelect = React.useCallback(
    (option: string) => {
      onSelect(option)
      onChange(option)
      setIsOpen(false)
      setActiveIndex(-1)
      // Keep focus on input for keyboard users
      inputRef.current?.focus()
    },
    [onSelect, onChange]
  )

  // Handle clear button
  const handleClear = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onChange("")
      setIsOpen(false)
      setActiveIndex(-1)
      inputRef.current?.focus()
    },
    [onChange]
  )

  // Click outside handler
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setActiveIndex(-1)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => {
        document.removeEventListener("mousedown", handleClickOutside)
      }
    }
  }, [isOpen])

  // Handle input focus
  const handleFocus = React.useCallback(() => {
    setIsOpen(true)
    onFocus?.()
  }, [onFocus])

  // Handle input blur
  const handleBlur = React.useCallback(() => {
    // Delay to allow click events to fire
    setTimeout(() => {
      onBlur?.()
    }, 150)
  }, [onBlur])

  // Default option renderer
  const defaultRenderOption = React.useCallback(
    (option: string, _isSelected: boolean, _isActive: boolean) => (
      <>
        <span className="flex-1 truncate">{option}</span>
      </>
    ),
    []
  )

  const activeRenderOption = renderOption || defaultRenderOption

  // Show dropdown
  const shouldShowDropdown = isOpen && !disabled && (loading || filteredOptions.length > 0)

  return (
    <div 
      className={cn("relative w-full max-w-60 group", className)} 
      ref={containerRef}
    >
      <div className="relative">
        <LeftIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/50 group-focus-within:text-primary transition-colors z-10 pointer-events-none" />
        
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setIsOpen(true)
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="autocomplete-listbox"
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `option-${activeIndex}` : undefined}
          className={cn(
            "w-full h-8 pl-8 text-[11px] rounded-xl transition-all duration-200",
            "bg-background/50 backdrop-blur-sm border border-input/50",
            "text-foreground placeholder:text-muted-foreground/50",
            "shadow-sm shadow-black/5 hover:shadow-md",
            "hover:bg-accent/5 hover:border-accent/50",
            "focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/50",
            "disabled:cursor-not-allowed disabled:opacity-50",
            showClearButton && value && "pr-7"
          )}
        />

        {showClearButton && value && !disabled && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleClear}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 rounded-lg hover:bg-muted/50 transition-colors"
              tabIndex={-1}
              aria-label="Clear selection"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </Button>
          </motion.div>
        )}
      </div>
      
      <AnimatePresence>
        {shouldShowDropdown && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ 
              duration: 0.2, 
              ease: [0.4, 0, 0.2, 1] // Custom easing for smoother feel
            }}
            className={cn(
              "absolute z-50 w-full mt-1.5 overflow-hidden rounded-xl border border-border/50",
              "bg-popover/95 backdrop-blur-3xl text-popover-foreground shadow-2xl shadow-black/20",
              "flex flex-col"
            )}
            role="listbox"
            id="autocomplete-listbox"
          >
            <div 
              ref={scrollAreaRef}
              style={{ maxHeight: `${maxHeight}px` }} 
              className="overflow-y-auto custom-scroll p-1"
            >
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center justify-center py-6 text-[11px] text-muted-foreground"
                  >
                    <div className="flex items-center gap-2">
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent"
                      />
                      <span>{loadingMessage}</span>
                    </div>
                  </motion.div>
                ) : filteredOptions.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center justify-center py-6 text-[11px] text-muted-foreground"
                  >
                    {emptyMessage}
                  </motion.div>
                ) : (
                  <motion.div
                    key="options"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {filteredOptions.map((option, index) => {
                      const isSelected = value === option
                      const isActive = activeIndex === index

                      return (
                        <motion.div
                          key={`${option}-${index}`}
                          ref={(el) => {
                            if (el) {
                              optionRefs.current.set(index, el)
                            } else {
                              optionRefs.current.delete(index)
                            }
                          }}
                          id={`option-${index}`}
                          role="option"
                          aria-selected={isSelected}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ 
                            opacity: 1, 
                            x: 0,
                            scale: isActive ? 1.02 : 1
                          }}
                          transition={{ 
                            duration: 0.15,
                            delay: index * 0.02, // Stagger effect
                            scale: { duration: 0.1 }
                          }}
                          whileHover={{ 
                            scale: 1.02,
                            transition: { duration: 0.1 }
                          }}
                          whileTap={{ scale: 0.98 }}
                          className={cn(
                            "relative flex w-full cursor-pointer select-none items-center rounded-lg py-1.5 px-2.5 text-[11px] outline-none transition-colors",
                            "hover:bg-muted/50 focus:bg-accent focus:text-accent-foreground",
                            isSelected && "bg-primary/10 text-primary font-semibold",
                            isActive && !isSelected && "bg-accent/50",
                            !isSelected && !isActive && "text-foreground/70"
                          )}
                          onClick={() => handleSelect(option)}
                          onMouseEnter={() => setActiveIndex(index)}
                          onMouseLeave={() => {
                            if (activeIndex === index) {
                              setActiveIndex(-1)
                            }
                          }}
                        >
                          {activeRenderOption(option, isSelected, isActive)}
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ 
                                type: "spring", 
                                stiffness: 500, 
                                damping: 30 
                              }}
                            >
                              <Check className="h-3 w-3 ml-2 text-primary opacity-100 shrink-0" />
                            </motion.div>
                          )}
                        </motion.div>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}