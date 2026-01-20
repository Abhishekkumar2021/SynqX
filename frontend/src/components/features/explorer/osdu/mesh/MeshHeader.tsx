import React, { useState, useEffect } from 'react'
import { Search, RefreshCw, X, Layers, Sparkles, Box, Code, Info, SlidersHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CodeBlock } from '@/components/ui/docs/CodeBlock'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet'
import { QueryBuilder } from './QueryBuilder'

interface MeshHeaderProps {
  searchQuery: string
  onQueryChange: (q: string) => void
  onExecute: () => void
  isLoading: boolean
  onToggleAI: () => void
  selectedKind: string | null
  onKindChange: (kind: string | null) => void
  payload?: any
}

export const MeshHeader: React.FC<MeshHeaderProps> = ({
  searchQuery,
  onQueryChange,
  onExecute,
  isLoading,
  onToggleAI,
  selectedKind,
  onKindChange,
  payload,
}) => {
  const [localQuery, setLocalQuery] = useState(searchQuery)
  const [isBuilderOpen, setIsBuilderOpen] = useState(false)

  // Sync local state with prop changes (e.g. AI applying a query)
  useEffect(() => {
    setLocalQuery(searchQuery)
  }, [searchQuery])

  const handleSearch = () => {
    onQueryChange(localQuery)
    // Small timeout to allow state sync if needed, though URL params usually batch
    setTimeout(() => onExecute(), 50)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch()
    }
  }

  const handleClear = () => {
    setLocalQuery('*')
    onQueryChange('*')
    setTimeout(() => onExecute(), 50)
  }

  const ROOT_FIELDS = ['id', 'kind', 'acl', 'legal', 'ancestry', 'version', 'createUser', 'createTime', 'modifyUser', 'modifyTime', 'tags']
  
  // Find if any root field is being accessed via data. prefix
  const incorrectField = ROOT_FIELDS.find(field => localQuery.includes(`data.${field}:`))

  return (
    <div className="border-b border-border/40 bg-muted/5 relative z-20 flex flex-col shrink-0 shadow-sm">
      <div className="h-20 px-8 flex items-center gap-8">
        {/* Branding */}
        <div className="flex items-center gap-4 min-w-0">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner shrink-0">
            <Layers size={24} />
          </div>
          <div className="min-w-0 mr-4">
            <h2 className="text-xl font-black tracking-tighter text-foreground uppercase leading-none">
              Data Mesh
            </h2>
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-1.5 leading-none opacity-60">
              Partition Discovery
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-3xl relative group">
          <div className="absolute inset-0 bg-primary/5 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
          <Search className="z-20 absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search partition via Lucene query..."
            className="h-12 pl-11 pr-32 rounded-2xl bg-background border-border/40 focus:border-primary/40 focus:ring-4 focus:ring-primary/5 transition-all text-sm font-medium shadow-sm"
            value={localQuery === '*' ? '' : localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <AnimatePresence>
              {localQuery && localQuery !== '*' && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={handleClear}
                  className="h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X size={16} />
                </motion.button>
              )}
            </AnimatePresence>
            
            <Sheet open={isBuilderOpen} onOpenChange={setIsBuilderOpen}>
                <SheetTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5"
                        title="Open Query Builder"
                    >
                        <SlidersHorizontal size={16} />
                    </Button>
                </SheetTrigger>
                <SheetContent className="w-screen sm:max-w-none p-0 border-l border-border/40 bg-background/95 backdrop-blur-2xl shadow-2xl flex flex-col">
                    <SheetHeader className="p-6 border-b border-border/40 bg-muted/5">
                        <SheetTitle className="text-xl font-bold tracking-tight">Advanced Query Builder</SheetTitle>
                        <SheetDescription className="text-xs font-medium text-muted-foreground">
                            Construct complex Lucene expressions using visual rules and logic operators.
                        </SheetDescription>
                    </SheetHeader>
                    <div className="flex-1 overflow-hidden p-6 bg-background/50">
                        <QueryBuilder 
                            initialQuery={localQuery} 
                            onQueryChange={(q) => setLocalQuery(q)} 
                        />
                    </div>
                    <div className="p-6 border-t border-border/40 bg-muted/5 flex justify-end gap-3">
                        <Button 
                            size="lg" 
                            onClick={() => { 
                                handleSearch(); 
                                setIsBuilderOpen(false); 
                            }} 
                            className="rounded-xl font-bold uppercase text-[11px] tracking-widest shadow-xl shadow-primary/20"
                        >
                            Apply Query
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>

            <div className="w-px h-4 bg-border/40 mx-1" />

            <Button
              variant="outline"
              size="sm"
              onClick={handleSearch}
              disabled={isLoading}
              className="h-8 px-4 rounded-xl font-black uppercase text-[10px] tracking-widest border-border/40"
            >
              {isLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'Execute'}
            </Button>
          </div>
          {incorrectField && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute -bottom-8 left-0 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20 flex items-center gap-2"
            >
              <Sparkles size={10} />
              <span>Did you mean <code className="bg-amber-500/20 px-1 rounded">{incorrectField}:</code>? The field <b>{incorrectField}</b> is at the root level.</span>
            </motion.div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 shrink-0 pl-4 border-l border-border/10">
          {payload && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-muted/50 text-muted-foreground">
                    <Code size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="end" className="w-[400px] p-0 border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl">
                  <div className="p-3 border-b border-border/40 bg-muted/20 flex items-center gap-2">
                    <Info size={14} className="text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Request Payload Preview</span>
                  </div>
                  <div className="p-0">
                    <CodeBlock 
                      code={JSON.stringify(payload, null, 2)} 
                      language="json" 
                      className="border-none bg-transparent text-[10px] max-h-[300px]" 
                      rounded={false}
                    />
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <Button
            variant="default"
            size="sm"
            onClick={onToggleAI}
            className="h-11 px-6 rounded-2xl gap-3 bg-primary hover:bg-primary/90 text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95"
          >
            <Sparkles size={16} className="animate-pulse" />
            AI Neural Discovery
          </Button>

          <div className="flex items-center gap-2">
            {selectedKind && (
              <Badge className="bg-primary/5 text-primary border border-primary/20 rounded-xl px-3 py-1.5 font-black uppercase text-[9px] tracking-widest gap-2 h-9 shadow-sm">
                <Box size={12} />
                {selectedKind.split(':').pop()?.split('--').pop()}
                <button
                  onClick={() => onKindChange(null)}
                  className="hover:text-rose-500 transition-colors ml-1"
                >
                  <X size={12} />
                </button>
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl border border-border/40 hover:bg-muted"
              onClick={() => {
                // We'll let the parent handle the "clear selection" logic if this refresh implies reset
                onExecute()
              }}
            >
              <RefreshCw size={18} className={cn(isLoading && 'animate-spin opacity-40')} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
