import React from 'react'
import { ChevronRight, ChevronDown, FileJson, Braces, Brackets } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface JsonTreeProps {
  data: any
  label?: string
  level?: number
  defaultOpen?: boolean
}

const getType = (value: any) => {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

const ValueDisplay = ({ value, type }: { value: any; type: string }) => {
  if (type === 'null') return <span className="text-muted-foreground/50 italic">null</span>
  if (type === 'boolean')
    return (
      <span className={cn('font-bold', value ? 'text-emerald-500' : 'text-rose-500')}>
        {String(value)}
      </span>
    )
  if (type === 'number') return <span className="text-amber-500 font-mono">{value}</span>
  if (type === 'string') return <span className="text-sky-500 break-all">"{value}"</span>
  return <span className="text-foreground">{String(value)}</span>
}

export const JsonTree: React.FC<JsonTreeProps> = ({
  data,
  label,
  level = 0,
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen || level < 1)
  const type = getType(data)
  const isObject = type === 'object'
  const isArray = type === 'array'
  const isExpandable = isObject || isArray
  const count = isExpandable ? Object.keys(data).length : 0

  if (!isExpandable) {
    return (
      <div className="flex items-start gap-2 py-1 hover:bg-muted/5 rounded-lg px-2 group transition-colors">
        <span className="text-[10px] font-mono text-muted-foreground mt-0.5 shrink-0 select-none opacity-50">
          {level > 0 && '├─'}
        </span>
        {label && (
          <span className="text-xs font-bold text-muted-foreground/80 shrink-0 select-none mr-1">
            {label}:
          </span>
        )}
        <div className="text-xs font-mono">
          <ValueDisplay value={data} type={type} />
        </div>
      </div>
    )
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <div className="flex items-center gap-1 py-1 group hover:bg-muted/5 rounded-lg px-1 transition-colors">
        <span className="text-[10px] font-mono text-muted-foreground shrink-0 select-none opacity-50 ml-1">
          {level > 0 && '├─'}
        </span>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 p-0 hover:bg-transparent flex items-center gap-1.5 min-w-0"
          >
            <div className="h-4 w-4 flex items-center justify-center rounded-sm bg-muted/10 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
              {isOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            </div>
            {label && (
              <span className="text-xs font-bold text-foreground/70 group-hover:text-foreground transition-colors">
                {label}
              </span>
            )}
            <Badge
              variant="secondary"
              className="h-4 px-1.5 text-[9px] font-mono font-normal text-muted-foreground bg-muted/20 border-0 group-hover:bg-primary/5 group-hover:text-primary/70"
            >
              {isArray ? `[${count}]` : `{${count}}`}
            </Badge>
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <div
          className={cn(
            'pl-3 border-l border-border/20 ml-2.5 flex flex-col gap-0.5',
            level > 5 && 'border-l-0 pl-0' // Avoid too much indentation on deep nests
          )}
        >
          {Object.entries(data).map(([key, value], idx) => (
            <JsonTree key={key} label={isArray ? undefined : key} data={value} level={level + 1} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
