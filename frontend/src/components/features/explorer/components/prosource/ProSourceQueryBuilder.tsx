import React, { useState, useEffect } from 'react'
import { Plus, Trash2, HelpCircle, Database, Terminal, AlertCircle } from 'lucide-react'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface SQLRule {
  id: string
  column: string
  columnType: string
  operator:
    | 'equals'
    | 'contains'
    | 'starts_with'
    | 'ends_with'
    | 'greater_than'
    | 'less_than'
    | 'greater_equal'
    | 'less_equal'
    | 'is_null'
    | 'is_not_null'
    | 'not_equals'
    | 'in'
  value: string
  logic: 'AND' | 'OR'
}

interface ProSourceQueryBuilderProps {
  assetName: string
  columns: any[] // Should be { name: string, type: string }
  onQueryChange: (sql: string) => void
}

const OPERATORS = [
  { label: 'Equals (=)', value: 'equals' },
  { label: 'Not Equals (!=)', value: 'not_equals' },
  { label: 'Contains (LIKE %..%)', value: 'contains' },
  { label: 'Starts With (LIKE ..%)', value: 'starts_with' },
  { label: 'Ends With (LIKE %..)', value: 'ends_with' },
  { label: 'Greater Than (>)', value: 'greater_than' },
  { label: 'Less Than (<)', value: 'less_than' },
  { label: 'Greater or Equal (>=)', value: 'greater_equal' },
  { label: 'Less or Equal (<=)', value: 'less_equal' },
  { label: 'In List (val1, val2)', value: 'in' },
  { label: 'Is Null', value: 'is_null' },
  { label: 'Is Not Null', value: 'is_not_null' },
]

export const ProSourceQueryBuilder: React.FC<ProSourceQueryBuilderProps> = ({
  assetName,
  columns,
  onQueryChange,
}) => {
  const [rules, setRules] = useState<SQLRule[]>([
    {
      id: '1',
      column: columns[0]?.name || '',
      columnType: columns[0]?.type || 'VARCHAR2',
      operator: 'equals',
      value: '',
      logic: 'AND',
    },
  ])

  useEffect(() => {
    if (rules.length === 0) {
      onQueryChange(`SELECT * FROM ${assetName}`)
      return
    }

    const whereClauses = rules
      .map((rule, index) => {
        if (!rule.column) return ''
        const prefix = index > 0 ? ` ${rule.logic} ` : ''
        let condition = ''

        const type = rule.columnType?.toUpperCase() || ''
        const isNumeric =
          type.includes('NUMBER') ||
          type.includes('FLOAT') ||
          type.includes('INT') ||
          type.includes('DOUBLE') ||
          type.includes('DECIMAL')
        const isDate = type.includes('DATE') || type.includes('TIMESTAMP')

        const formatValue = (val: string) => {
          if (isNumeric) return val
          if (isDate) {
            // Support simple ISO strings or basic Oracle date format
            if (val.match(/^\d{4}-\d{2}-\d{2}$/)) return `DATE '${val}'`
            if (val.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/))
              return `TIMESTAMP '${val.replace('T', ' ')}'`
            return `'${val}'`
          }
          return `'${val}'`
        }

        const formattedValue = formatValue(rule.value)

        switch (rule.operator) {
          case 'equals':
            condition = `${rule.column} = ${formattedValue}`
            break
          case 'not_equals':
            condition = `${rule.column} != ${formattedValue}`
            break
          case 'contains':
            condition = `${rule.column} LIKE '%${rule.value}%'`
            break
          case 'starts_with':
            condition = `${rule.column} LIKE '${rule.value}%'`
            break
          case 'ends_with':
            condition = `${rule.column} LIKE '%${rule.value}'`
            break
          case 'greater_than':
            condition = `${rule.column} > ${formattedValue}`
            break
          case 'less_than':
            condition = `${rule.column} < ${formattedValue}`
            break
          case 'greater_equal':
            condition = `${rule.column} >= ${formattedValue}`
            break
          case 'less_equal':
            condition = `${rule.column} <= ${formattedValue}`
            break
          case 'in': {
            const values = rule.value
              .split(',')
              .map((v) => v.trim())
              .map(formatValue)
              .join(', ')
            condition = `${rule.column} IN (${values})`
            break
          }
          case 'is_null':
            condition = `${rule.column} IS NULL`
            break
          case 'is_not_null':
            condition = `${rule.column} IS NOT NULL`
            break
        }

        return `${prefix}${condition}`
      })
      .filter(Boolean)
      .join('')

    const sql = `SELECT * FROM ${assetName}${whereClauses ? ` WHERE ${whereClauses}` : ''}`
    onQueryChange(sql)
  }, [rules, assetName, onQueryChange])

  const addRule = () => {
    setRules([
      ...rules,
      {
        id: Math.random().toString(36).substr(2, 9),
        column: columns[0]?.name || '',
        columnType: columns[0]?.type || 'VARCHAR2',
        operator: 'equals',
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

  const updateRule = (index: number, key: keyof SQLRule, value: string) => {
    const newRules = [...rules]
    if (key === 'column') {
      const col = columns.find((c) => c.name === value)
      newRules[index] = { ...newRules[index], column: value, columnType: col?.type || 'VARCHAR2' }
    } else {
      newRules[index] = { ...newRules[index], [key]: value }
    }
    setRules(newRules)
  }

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h4 className="text-sm font-bold flex items-center gap-2">
            <Terminal size={16} className="text-primary" />
            Oracle SQL Predicate Builder
          </h4>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
            Construct visual where clauses for {assetName}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={addRule}
          className="h-8 gap-2 border-primary/20 text-primary font-bold uppercase text-[10px] tracking-widest"
        >
          <Plus size={14} /> Add Filter
        </Button>
      </div>

      <ScrollArea className="flex-1 -mr-4 pr-4">
        <div className="space-y-4 pb-4">
          {rules.map((rule, index) => (
            <div key={rule.id} className="space-y-4">
              {index > 0 && (
                <div className="flex justify-center">
                  <Select
                    value={rule.logic}
                    onValueChange={(v) => updateRule(index, 'logic', v as any)}
                  >
                    <SelectTrigger className="h-7 w-20 text-[10px] font-black rounded-full bg-muted/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AND">AND</SelectItem>
                      <SelectItem value="OR">OR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="group flex items-center gap-3 p-4 rounded-2xl bg-card border border-border/60 hover:border-primary/20 transition-all shadow-sm">
                <div className="grid grid-cols-12 gap-3 flex-1">
                  <div className="col-span-4 space-y-1.5">
                    <Label className="text-[9px] font-bold uppercase ml-1 opacity-50">Column</Label>
                    <Select
                      value={rule.column}
                      onValueChange={(v) => updateRule(index, 'column', v)}
                    >
                      <SelectTrigger className="h-9 text-xs font-mono">
                        <SelectValue placeholder="Select Column" />
                      </SelectTrigger>
                      <SelectContent>
                        {columns.map((c) => (
                          <SelectItem key={c.name} value={c.name} className="text-xs font-mono">
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3 space-y-1.5">
                    <Label className="text-[9px] font-bold uppercase ml-1 opacity-50">
                      Operator
                    </Label>
                    <Select
                      value={rule.operator}
                      onValueChange={(v) => updateRule(index, 'operator', v as any)}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OPERATORS.map((op) => (
                          <SelectItem key={op.value} value={op.value} className="text-xs">
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-5 space-y-1.5">
                    <Label className="text-[9px] font-bold uppercase ml-1 opacity-50">Value</Label>
                    <Input
                      value={rule.value}
                      onChange={(e) => updateRule(index, 'value', e.target.value)}
                      disabled={rule.operator === 'is_null' || rule.operator === 'is_not_null'}
                      className="h-9 text-xs font-medium bg-muted/30 focus:bg-background transition-all"
                      placeholder="Enter value..."
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRule(index)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 rounded-xl bg-black/40 border border-border/20">
        <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
          Generated Oracle SQL
        </Label>
        <code className="text-[11px] text-primary font-mono break-all leading-relaxed">
          {rules.length > 0 ? (
            <>
              <span className="opacity-50">SELECT * FROM {assetName} WHERE </span>
              {rules.map((r, i) => {
                const type = r.columnType?.toUpperCase() || ''
                const isNumeric =
                  type.includes('NUMBER') ||
                  type.includes('FLOAT') ||
                  type.includes('INT') ||
                  type.includes('DOUBLE') ||
                  type.includes('DECIMAL')
                const isDate = type.includes('DATE') || type.includes('TIMESTAMP')

                const formatVal = (val: string) => {
                  if (isNumeric) return val
                  if (isDate) {
                    if (val.match(/^\d{4}-\d{2}-\d{2}$/)) return `DATE '${val}'`
                    return `'${val}'`
                  }
                  return `'${val}'`
                }

                return (
                  <span key={r.id}>
                    {i > 0 && <span className="text-amber-500 font-bold mx-1">{r.logic}</span>}
                    <span className="text-blue-400">{r.column}</span>
                    <span className="text-muted-foreground mx-1">
                      {r.operator === 'equals'
                        ? '='
                        : r.operator === 'not_equals'
                          ? '!='
                          : r.operator === 'contains' ||
                              r.operator === 'starts_with' ||
                              r.operator === 'ends_with'
                            ? 'LIKE'
                            : r.operator === 'is_null'
                              ? 'IS NULL'
                              : r.operator === 'is_not_null'
                                ? 'IS NOT NULL'
                                : r.operator === 'greater_than'
                                  ? '>'
                                  : r.operator === 'less_than'
                                    ? '<'
                                    : r.operator === 'greater_equal'
                                      ? '>='
                                      : r.operator === 'less_equal'
                                        ? '<='
                                        : 'IN'}
                    </span>
                    {r.operator !== 'is_null' && r.operator !== 'is_not_null' && (
                      <span className="text-emerald-400">
                        {r.operator === 'contains'
                          ? `'%${r.value}%'`
                          : r.operator === 'starts_with'
                            ? `'${r.value}%'`
                            : r.operator === 'ends_with'
                              ? `'%${r.value}'`
                              : r.operator === 'in'
                                ? `(${r.value
                                    .split(',')
                                    .map((v) => v.trim())
                                    .map(formatVal)
                                    .join(', ')})`
                                : formatVal(r.value)}
                      </span>
                    )}
                  </span>
                )
              })}
            </>
          ) : (
            `SELECT * FROM ${assetName}`
          )}
        </code>
      </div>
    </div>
  )
}
