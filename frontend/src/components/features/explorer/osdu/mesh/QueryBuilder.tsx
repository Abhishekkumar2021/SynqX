import React, { useState, useEffect } from 'react'
import { Plus, Trash2, HelpCircle, BookOpen, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface QueryRule {
  id: string
  field: string
  operator: 'exact' | 'wildcard' | 'fuzzy' | 'custom'
  value: string
  logic: 'AND' | 'OR'
}

interface QueryBuilderProps {
  initialQuery?: string
  onQueryChange: (query: string) => void
}

const COMMON_FIELDS = [
  { label: 'ID', value: 'id' },
  { label: 'Kind', value: 'kind' },
  { label: 'Legal Tags', value: 'legal.legaltags' },
  { label: 'ACL Viewers', value: 'acl.viewers' },
  { label: 'Well Name', value: 'data.WellName' },
  { label: 'Wellbore Name', value: 'data.WellboreName' },
  { label: 'Country', value: 'data.Country' },
  { label: 'Operator', value: 'data.Operator' },
  { label: 'Source', value: 'data.Source' },
  { label: 'Status', value: 'data.Status' },
  { label: 'Type', value: 'data.Type' },
]

const HELP_EXAMPLES = [
  { label: 'Exact Match', syntax: 'data.WellName: "Well-01"', desc: 'Finds exact field matches.' },
  {
    label: 'Prefix Wildcard',
    syntax: 'data.WellName: Well*',
    desc: 'Matches Well-01, Well-02, etc.',
  },
  {
    label: 'Fuzzy Search',
    syntax: 'data.Status: Actvie~',
    desc: 'Corrects small typos in your query.',
  },
  {
    label: 'Logical AND',
    syntax: 'kind: "*Well:*" AND data.Status: "Active"',
    desc: 'Filters for records matching both.',
  },
  {
    label: 'Logical OR',
    syntax: 'data.Type: "Seismic" OR data.Type: "Well"',
    desc: 'Returns results matching either.',
  },
]

export const QueryBuilder: React.FC<QueryBuilderProps> = ({ initialQuery, onQueryChange }) => {
  const [rules, setRules] = useState<QueryRule[]>([
    { id: '1', field: 'data.WellName', operator: 'wildcard', value: '', logic: 'AND' },
  ])
  const [showHelp, setShowHelp] = useState(true)

  // Rebuild query string
  useEffect(() => {
    if (rules.length === 0) {
      onQueryChange('*')
      return
    }
    const query = rules
      .map((rule, index) => {
        const prefix = index > 0 ? ` ${rule.logic} ` : ''

        // Construct value based on operator
        let constructedValue = rule.value

        if (rule.operator === 'exact') {
          constructedValue = `"${rule.value}"`
        } else if (rule.operator === 'wildcard') {
          // Prefix Match: Append * at the end if not present
          constructedValue = rule.value
          if (constructedValue.length > 0 && !constructedValue.endsWith('*')) {
            constructedValue = constructedValue + '*'
          }
        } else if (rule.operator === 'fuzzy') {
          if (!rule.value.includes('~') && rule.value.length > 0) {
            constructedValue = `${rule.value}~`
          }
        } else {
          // Custom: use as is, maybe quote if spaces
          if (rule.value.includes(' ')) constructedValue = `"${rule.value}"`
        }

        // Handle empty values gracefully (avoid `field:`)
        if (!constructedValue) return ''

        return `${prefix}${rule.field}:${constructedValue}`
      })
      .filter(Boolean) // Remove empty rules
      .join('')

    onQueryChange(query || '*')
  }, [rules, onQueryChange])

  const addRule = () => {
    setRules([
      ...rules,
      {
        id: Math.random().toString(36).substr(2, 9),
        field: 'kind',
        operator: 'wildcard',
        value: '',
        logic: 'AND',
      },
    ])
  }

  const removeRule = (index: number) => {
    const newRules = [...rules]
    newRules.splice(index, 1)
    setRules(newRules)
  }

  const updateRule = (index: number, key: keyof QueryRule, value: string) => {
    const newRules = [...rules]
    newRules[index] = { ...newRules[index], [key]: value }
    setRules(newRules)
  }

  // Check for leading wildcards
  const hasLeadingWildcard = rules.some((r) => r.value.startsWith('*') && r.value.length > 1)

  return (
    <div className="flex h-full gap-10">
      {/* Left: Builder Canvas */}
      <div className="flex-1 flex flex-col gap-8 min-w-0">
        <div className="flex items-center justify-between shrink-0">
          <div className="flex flex-col gap-1">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <BookOpen size={16} className="text-primary" />
              OSDU Query Construction
            </h4>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
              Build precise Lucene expressions for Metadata
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowHelp(!showHelp)}
              className={cn(
                'h-8 gap-2 text-[10px] font-bold uppercase tracking-widest',
                showHelp ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
              )}
            >
              <HelpCircle size={14} /> Syntax Guide
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={addRule}
              className="h-8 gap-2 border-primary/20 hover:bg-primary/5 text-primary font-bold uppercase text-[10px] tracking-widest"
            >
              <Plus size={14} /> Add Clause
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 -mr-4 pr-4">
          <div className="space-y-0 pb-4 relative">
            {rules.length > 1 && (
              <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-border/40 z-0" />
            )}

            {rules.map((rule, index) => (
              <div key={rule.id} className="relative z-10">
                {/* Logic Connector */}
                {index > 0 && (
                  <div className="flex justify-center items-center py-3 relative">
                    <div className="bg-background relative z-10">
                      <Select
                        value={rule.logic}
                        onValueChange={(val) => updateRule(index, 'logic', val as 'AND' | 'OR')}
                      >
                        <SelectTrigger
                          className={cn(
                            'h-7 w-20 text-[10px] font-black uppercase tracking-widest border shadow-sm rounded-full transition-all focus:ring-offset-0',
                            rule.logic === 'AND'
                              ? 'bg-blue-500/10 border-blue-500/20 text-blue-600 hover:bg-blue-500/20 hover:border-blue-500/30'
                              : 'bg-amber-500/10 border-amber-500/20 text-amber-600 hover:bg-amber-500/20 hover:border-amber-500/30'
                          )}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AND" className="text-xs font-bold text-blue-600">
                            AND
                          </SelectItem>
                          <SelectItem value="OR" className="text-xs font-bold text-amber-600">
                            OR
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Rule Card */}
                <div
                  className={cn(
                    'group flex items-center gap-3 p-4 rounded-2xl border shadow-sm transition-all duration-300',
                    'bg-card border-border/60 hover:border-primary/20 hover:shadow-md'
                  )}
                >
                  {/* Field Selector */}
                  <div className="flex-1 grid grid-cols-12 gap-3">
                    <div className="col-span-4 space-y-1.5">
                      <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 ml-1">
                        Field
                      </Label>
                      <div className="relative">
                        <Select
                          value={
                            COMMON_FIELDS.find((f) => f.value === rule.field)
                              ? rule.field
                              : 'custom'
                          }
                          onValueChange={(val) => {
                            if (val !== 'custom') updateRule(index, 'field', val)
                            else updateRule(index, 'field', '')
                          }}
                        >
                          <SelectTrigger className="h-9 text-xs font-mono bg-muted/30 border-border/40 focus:ring-primary/10 transition-colors hover:bg-muted/50">
                            <SelectValue placeholder="Select Field" />
                          </SelectTrigger>
                          <SelectContent>
                            <div className="px-2 py-1.5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                              Common Properties
                            </div>
                            {COMMON_FIELDS.map((f) => (
                              <SelectItem
                                key={f.value}
                                value={f.value}
                                className="text-xs font-mono"
                              >
                                {f.label}{' '}
                                <span className="text-muted-foreground/40 ml-2">({f.value})</span>
                              </SelectItem>
                            ))}
                            <div className="h-px bg-border/40 my-1" />
                            <SelectItem value="custom" className="text-xs font-bold text-primary">
                              Custom Field Name...
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {(!COMMON_FIELDS.find((f) => f.value === rule.field) ||
                          rule.field === '') && (
                          <Input
                            value={rule.field}
                            onChange={(e) => updateRule(index, 'field', e.target.value)}
                            className="absolute inset-0 h-9 text-xs font-mono bg-background border-primary/30 z-10 pl-3 shadow-sm"
                            placeholder="e.g. data.VirtualProperties.DefaultName"
                            autoFocus
                          />
                        )}
                      </div>
                    </div>

                    {/* Operator */}
                    <div className="col-span-3 space-y-1.5">
                      <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 ml-1">
                        Match Type
                      </Label>
                      <Select
                        value={rule.operator}
                        onValueChange={(val) => updateRule(index, 'operator', val as any)}
                      >
                        <SelectTrigger className="h-9 text-xs bg-muted/30 border-border/40 hover:bg-muted/50 transition-colors">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="exact" className="text-xs">
                            Exact Match (" ")
                          </SelectItem>
                          <SelectItem value="wildcard" className="text-xs">
                            Starts With (*)
                          </SelectItem>
                          <SelectItem value="fuzzy" className="text-xs">
                            Fuzzy (~)
                          </SelectItem>
                          <SelectItem value="custom" className="text-xs">
                            Raw Value
                          </SelectItem>
                        </SelectContent>{' '}
                      </Select>
                    </div>

                    {/* Value */}
                    <div className="col-span-5 space-y-1.5">
                      <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 ml-1">
                        Value
                      </Label>
                      <Input
                        value={rule.value}
                        onChange={(e) => updateRule(index, 'value', e.target.value)}
                        className="h-9 text-xs font-medium bg-muted/30 border-border/40 focus:bg-background focus:border-primary/30 focus:shadow-sm transition-all hover:bg-muted/50"
                        placeholder={rule.operator === 'wildcard' ? 'Prefix...' : 'Value...'}
                      />
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRule(index)}
                    disabled={rules.length === 1 && index === 0}
                    className="mt-6 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Live Preview */}
        <div className="p-4 rounded-xl bg-black/40 border border-border/20 shrink-0">
          <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
            Lucene Preview
          </Label>
          <div className="font-mono text-xs text-primary break-all leading-relaxed">
            {rules.map((r, i) => (
              <span key={r.id}>
                {i > 0 && <span className="text-amber-500 font-bold mx-1">{r.logic}</span>}
                <span className="text-blue-400">{r.field}</span>
                <span className="text-muted-foreground">:</span>
                <span className="text-emerald-400">
                  {r.operator === 'exact'
                    ? `"${r.value}"`
                    : r.operator === 'wildcard'
                      ? `${r.value}*`
                      : r.operator === 'fuzzy'
                        ? `${r.value}~`
                        : r.value}
                </span>
              </span>
            ))}
          </div>
          {hasLeadingWildcard && (
            <div className="mt-3 flex items-center gap-2 text-rose-500 animate-in fade-in slide-in-from-top-1">
              <AlertCircle size={12} />
              <span className="text-[10px] font-bold">
                Warning: Leading wildcards (e.g. *value) are performance-heavy and often blocked by
                search services.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Right: Help Panel */}
      {showHelp && (
        <div className="w-80 border-l border-border/40 pl-8 py-2 flex flex-col gap-8 animate-in slide-in-from-right-4 duration-300">
          <div className="space-y-1">
            <h5 className="text-sm font-bold text-foreground tracking-tight">OSDU Syntax Guide</h5>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
              Reference for Lucene query parser
            </p>
          </div>

          <ScrollArea className="flex-1 -mr-2 pr-4">
            <div className="space-y-6 pb-8">
              {HELP_EXAMPLES.map((ex, i) => (
                <div
                  key={i}
                  className="space-y-2.5 p-4 rounded-xl bg-muted/10 border border-border/20 transition-colors hover:bg-muted/20"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] text-primary">
                      {ex.label}
                    </span>
                  </div>
                  <code className="block text-[10px] font-mono bg-black/30 p-2 rounded-lg text-foreground/90 break-all border border-white/5 shadow-inner">
                    {ex.syntax}
                  </code>
                  <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
                    {ex.desc}
                  </p>
                </div>
              ))}

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                <div className="flex items-center gap-2 text-amber-500">
                  <AlertCircle size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Note</span>
                </div>
                <p className="text-[10px] text-amber-600/80 leading-snug">
                  <b>id</b> is a root field. Do not use <code>data.id</code>. Use wildcard{' '}
                  <code>id: "val*"</code> to match versioned IDs.
                </p>
              </div>
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
