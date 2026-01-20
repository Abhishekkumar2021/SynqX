import React from 'react'
import { Globe, Box, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface RegistrySidebarProps {
  facets: {
    authorities: string[]
    sources: string[]
    types: string[]
  }
  selectedAuthorities: string[]
  setSelectedAuthorities: (value: string[]) => void
  selectedTypes: string[]
  setSelectedTypes: (value: string[]) => void
}

export const RegistrySidebar: React.FC<RegistrySidebarProps> = ({
  facets,
  selectedAuthorities,
  setSelectedAuthorities,
  selectedTypes,
  setSelectedTypes,
}) => {
  const toggleFacet = (list: string[], setList: (v: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value])
  }

  return (
    <div className="w-72 border-r border-border/40 bg-card flex flex-col shrink-0 shadow-lg z-20 h-full">
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-8">
          {/* Authority Facet */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2 px-1">
              <Globe size={12} /> Authority Domains
            </h4>
            <div className="space-y-1.5">
              {facets.authorities.map((a) => (
                <div
                  key={a}
                  className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted group cursor-pointer transition-all border border-transparent hover:border-border/10"
                  onClick={() => toggleFacet(selectedAuthorities, setSelectedAuthorities, a)}
                >
                  <Checkbox
                    checked={selectedAuthorities.includes(a)}
                    className="h-4.5 w-4.5 rounded-md border-border/40"
                  />
                  <span
                    className={cn(
                      'text-[13px] font-bold transition-colors',
                      selectedAuthorities.includes(a)
                        ? 'text-foreground'
                        : 'text-muted-foreground group-hover:text-foreground'
                    )}
                  >
                    {a}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Separator className="opacity-10" />

          {/* Data Type Facet */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 flex items-center gap-2 px-1">
              <Box size={12} /> Entity Groups
            </h4>
            <div className="space-y-1.5">
              {facets.types.map((t) => (
                <div
                  key={t}
                  className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted group cursor-pointer transition-all border border-transparent hover:border-border/10"
                  onClick={() => toggleFacet(selectedTypes, setSelectedTypes, t)}
                >
                  <Checkbox
                    checked={selectedTypes.includes(t)}
                    className="h-4.5 w-4.5 rounded-md border-border/40"
                  />
                  <span
                    className={cn(
                      'text-[13px] font-bold transition-colors truncate',
                      selectedTypes.includes(t)
                        ? 'text-foreground'
                        : 'text-muted-foreground group-hover:text-foreground'
                    )}
                  >
                    {t}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      {(selectedAuthorities.length > 0 || selectedTypes.length > 0) && (
        <div className="p-4 border-t border-border/10 bg-primary/5">
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-10 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2 hover:bg-primary/10 text-primary"
            onClick={() => {
              setSelectedAuthorities([])
              setSelectedTypes([])
            }}
          >
            <X size={14} /> Clear All Facets
          </Button>
        </div>
      )}
    </div>
  )
}
