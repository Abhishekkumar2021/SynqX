import React from 'react'
import { Plus, Trash2, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const VALIDATION_CHECKS = [
  { label: 'Not Null', value: 'not_null' },
  { label: 'Unique', value: 'unique' },
  { label: 'Regex Match', value: 'regex' },
  { label: 'Min Value', value: 'min_value' },
  { label: 'Max Value', value: 'max_value' },
  { label: 'In List', value: 'in_list' },
  { label: 'Data Type', value: 'data_type' },
]

const DATA_TYPES = [
  { label: 'String', value: 'string' },
  { label: 'Integer', value: 'int' },
  { label: 'Float', value: 'float' },
  { label: 'Boolean', value: 'bool' },
  { label: 'Date/Time', value: 'date' },
]

interface RuleBuilderProps {
  watch: any
  setValue: any
  rulesKey?: string
}

export const RuleBuilder: React.FC<RuleBuilderProps> = ({
  watch,
  setValue,
  rulesKey = 'schema_rules',
}) => {
  const rules = watch(rulesKey) || []

  const addRule = () => {
    setValue(rulesKey, [...rules, { column: '', check: 'not_null' }])
  }

  const removeRule = (index: number) => {
    const newRules = [...rules]
    newRules.splice(index, 1)
    setValue(rulesKey, newRules)
  }

  const updateRule = (index: number, field: string, value: any) => {
    const newRules = [...rules]
    newRules[index] = { ...newRules[index], [field]: value }
    setValue(rulesKey, newRules)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-1">
        <div className="flex flex-col">
          <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/70">
            Governance Rules
          </Label>
          <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-widest">
            Logic validation sequence
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRule}
          className="h-8 text-[9px] font-bold uppercase tracking-widest rounded-xl border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all gap-2"
        >
          <Plus className="h-3.5 w-3.5" /> New Clause
        </Button>
      </div>

      <div className="space-y-4">
        {rules.map((rule: any, index: number) => (
          <div
            key={index}
            className="group p-5 rounded-3xl border border-border/40 bg-muted/5 hover:border-primary/30 hover:bg-primary/[0.02] transition-all duration-300 relative"
          >
            <div className="absolute -left-1.5 top-6 bottom-6 w-1 rounded-full bg-primary/20 group-hover:bg-primary/40 transition-colors" />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeRule(index)}
              className="absolute top-4 right-4 h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100 transition-all text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 size={14} />
            </Button>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                  Field Identifier
                </Label>
                <Input
                  placeholder="e.g. email_address"
                  value={rule.column}
                  onChange={(e) => updateRule(index, 'column', e.target.value)}
                  className="h-9 text-xs font-mono bg-background/50 rounded-xl border-border/40 focus:ring-primary/10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                  Constraint Type
                </Label>
                <Select value={rule.check} onValueChange={(val) => updateRule(index, 'check', val)}>
                  <SelectTrigger className="h-9 text-xs bg-background/50 rounded-xl border-border/40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/40">
                    {VALIDATION_CHECKS.map((c) => (
                      <SelectItem key={c.value} value={c.value} className="text-xs font-medium">
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              {rule.check === 'regex' && (
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    Pattern Match (Regex)
                  </Label>
                  <Input
                    placeholder="^[a-z]+$"
                    value={rule.pattern || ''}
                    onChange={(e) => updateRule(index, 'pattern', e.target.value)}
                    className="h-9 text-xs font-mono bg-black/20 text-primary border-white/5 rounded-xl"
                  />
                </div>
              )}
              {(rule.check === 'min_value' || rule.check === 'max_value') && (
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    Threshold Bound
                  </Label>
                  <Input
                    type="number"
                    value={rule.value || 0}
                    onChange={(e) => updateRule(index, 'value', Number(e.target.value))}
                    className="h-9 text-xs font-mono bg-background/50 rounded-xl"
                  />
                </div>
              )}
              {rule.check === 'data_type' && (
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    Enforced Primitive
                  </Label>
                  <Select
                    value={rule.type || 'string'}
                    onValueChange={(val) => updateRule(index, 'type', val)}
                  >
                    <SelectTrigger className="h-9 text-xs bg-background/50 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/40">
                      {DATA_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value} className="text-xs font-medium">
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {rule.check === 'in_list' && (
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    Allowed Values
                  </Label>
                  <Input
                    placeholder="e.g. active, pending, deleted"
                    value={
                      rule.values
                        ? Array.isArray(rule.values)
                          ? rule.values.join(', ')
                          : rule.values
                        : ''
                    }
                    onChange={(e) =>
                      updateRule(
                        index,
                        'values',
                        e.target.value.split(',').map((s) => s.trim())
                      )
                    }
                    className="h-9 text-xs font-mono bg-background/50 rounded-xl border-border/40"
                  />
                </div>
              )}
            </div>
          </div>
        ))}

        {rules.length === 0 && (
          <div className="p-12 text-center border-2 border-dashed border-border/40 rounded-[2.5rem] bg-muted/5 group hover:bg-muted/10 transition-colors duration-500">
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full group-hover:bg-primary/20 transition-all" />
              <div className="relative h-16 w-16 rounded-3xl flex items-center justify-center border-border/40 bg-card shadow-xl mx-auto">
                <Shield className="h-8 w-8 text-primary/40 group-hover:text-primary transition-colors" />
              </div>
            </div>
            <p className="text-[11px] font-bold text-foreground uppercase tracking-widest">
              No Active Contract Clauses
            </p>
            <p className="text-[9px] text-muted-foreground mt-2 max-w-[240px] mx-auto leading-relaxed">
              Secure your data stream by adding validation rules. Violations will be diverted to
              quarantine automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
