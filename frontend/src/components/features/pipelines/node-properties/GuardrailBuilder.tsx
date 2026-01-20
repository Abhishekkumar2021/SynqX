import React from 'react'
import { Plus, Trash2, Zap } from 'lucide-react'
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

const GUARDRAIL_METRICS = [
  { label: 'Null Percentage', value: 'null_percentage' },
  { label: 'Minimum Value', value: 'min' },
  { label: 'Maximum Value', value: 'max' },
  { label: 'Mean Average', value: 'mean' },
]

const GUARDRAIL_OPERATORS = [
  { label: 'Greater Than', value: 'greater_than' },
  { label: 'Less Than', value: 'less_than' },
  { label: 'Equal To', value: 'equal' },
]

interface GuardrailBuilderProps {
  watch: any
  setValue: any
}

export const GuardrailBuilder: React.FC<GuardrailBuilderProps> = ({ watch, setValue }) => {
  const guardrails = watch('guardrails_list') || []

  const addGuardrail = () => {
    setValue('guardrails_list', [
      ...guardrails,
      { column: '', metric: 'null_percentage', operator: 'greater_than', threshold: 0 },
    ])
  }

  const removeGuardrail = (index: number) => {
    const newGuardrails = [...guardrails]
    newGuardrails.splice(index, 1)
    setValue('guardrails_list', newGuardrails)
  }

  const updateGuardrail = (index: number, field: string, value: any) => {
    const newGuardrails = [...guardrails]
    newGuardrails[index] = { ...newGuardrails[index], [field]: value }
    setValue('guardrails_list', newGuardrails)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-1">
        <div className="flex flex-col">
          <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/70">
            Circuit Rules
          </Label>
          <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-widest">
            Statistical enforcement thresholds
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addGuardrail}
          className="h-8 text-[9px] font-bold uppercase tracking-widest rounded-xl border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-500 transition-all gap-2"
        >
          <Plus className="h-3.5 w-3.5" /> Arm Breaker
        </Button>
      </div>

      <div className="space-y-4">
        {guardrails.map((gr: any, index: number) => (
          <div
            key={index}
            className="group p-5 rounded-3xl border border-border/40 bg-muted/5 hover:border-amber-500/30 hover:bg-amber-500/[0.02] transition-all duration-300 relative"
          >
            <div className="absolute -left-1.5 top-6 bottom-6 w-1 rounded-full bg-amber-500/20 group-hover:bg-amber-500/40 transition-colors" />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeGuardrail(index)}
              className="absolute top-4 right-4 h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100 transition-all text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 size={14} />
            </Button>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                  Monitored Column
                </Label>
                <Input
                  placeholder="e.g. order_id"
                  value={gr.column}
                  onChange={(e) => updateGuardrail(index, 'column', e.target.value)}
                  className="h-9 text-xs font-mono bg-background/50 rounded-xl border-border/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    Telemetry Metric
                  </Label>
                  <Select
                    value={gr.metric}
                    onValueChange={(val) => updateGuardrail(index, 'metric', val)}
                  >
                    <SelectTrigger className="h-9 text-xs bg-background/50 rounded-xl border-border/40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/40">
                      {GUARDRAIL_METRICS.map((m) => (
                        <SelectItem key={m.value} value={m.value} className="text-xs font-medium">
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    Condition
                  </Label>
                  <Select
                    value={gr.operator}
                    onValueChange={(val) => updateGuardrail(index, 'operator', val)}
                  >
                    <SelectTrigger className="h-9 text-xs bg-background/50 rounded-xl border-border/40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/40">
                      {GUARDRAIL_OPERATORS.map((o) => (
                        <SelectItem key={o.value} value={o.value} className="text-xs font-medium">
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                  Termination Threshold
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={gr.threshold}
                    onChange={(e) => updateGuardrail(index, 'threshold', Number(e.target.value))}
                    className="h-9 text-xs font-mono bg-background/50 rounded-xl border-border/40 pr-12"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-muted-foreground/40 uppercase">
                    {gr.metric === 'null_percentage' ? '%' : 'Val'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {guardrails.length === 0 && (
          <div className="p-12 text-center border-2 border-dashed border-border/40 rounded-[2.5rem] bg-muted/5 group hover:bg-muted/10 transition-colors duration-500">
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 bg-amber-500/10 blur-2xl rounded-full group-hover:bg-amber-500/20 transition-all" />
              <div className="relative h-16 w-16 rounded-3xl bg-card flex items-center justify-center border-border/40 shadow-xl mx-auto">
                <Zap className="h-8 w-8 text-amber-500/40 group-hover:text-amber-500 transition-colors" />
              </div>
            </div>
            <p className="text-[11px] font-bold text-foreground uppercase tracking-widest">
              No Active Circuit Breakers
            </p>
            <p className="text-[9px] text-muted-foreground mt-2 max-w-[240px] mx-auto leading-relaxed">
              Establish threshold rules that will automatically terminate execution if data quality
              deviates from standards.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
