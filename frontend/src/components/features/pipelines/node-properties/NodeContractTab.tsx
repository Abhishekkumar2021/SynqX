import React from 'react'
import { Controller } from 'react-hook-form'
import { Shield, Trash2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CodeBlock } from '@/components/ui/docs/CodeBlock'
import { RuleBuilder } from './RuleBuilder'
import { cn } from '@/lib/utils'

interface NodeContractTabProps {
  watch: any
  setValue: any
  isEditor: boolean
  schemaMode: 'visual' | 'manual'
  setSchemaMode: (mode: 'visual' | 'manual') => void
  connections: any[]
  filteredAssets: any[]
  control: any
}

export const NodeContractTab: React.FC<NodeContractTabProps> = ({
  watch,
  setValue,
  isEditor,
  schemaMode,
  setSchemaMode,
  connections,
  filteredAssets,
  control,
}) => {
  return (
    <div className="p-6 space-y-8 pb-32 focus-visible:outline-none">
      <div className="space-y-6">
        <div className="relative group overflow-hidden p-6 rounded-[2rem] bg-primary/5 border border-primary/10 transition-all duration-500 hover:bg-primary/10">
          <div className="absolute -right-10 -top-10 h-32 w-32 bg-primary/10 blur-3xl rounded-full" />
          <div className="relative z-10 flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/20">
              <Shield size={24} />
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-foreground">
                  Trust Governance
                </h4>
                <div className="flex items-center gap-1 bg-background/40 backdrop-blur-md p-1 rounded-xl border border-white/5 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setSchemaMode('visual')}
                    className={cn(
                      'px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all',
                      schemaMode === 'visual'
                        ? 'bg-primary text-primary-foreground shadow-lg'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Visual
                  </button>
                  <button
                    type="button"
                    onClick={() => setSchemaMode('manual')}
                    className={cn(
                      'px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all',
                      schemaMode === 'manual'
                        ? 'bg-primary text-primary-foreground shadow-lg'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    JSON
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground/70 leading-relaxed font-medium">
                Define the structural integrity of your data stream. Violations are automatically
                diverted to isolation while keeping the pipeline active.
              </p>
            </div>
          </div>
        </div>

        {schemaMode === 'visual' ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <RuleBuilder watch={watch} setValue={setValue} rulesKey="contract_rules" />
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between px-1">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/70">
                Source Blueprint (JSON)
              </Label>
              <Badge
                variant="outline"
                className="text-[8px] font-mono opacity-60 bg-background/50 border-0 h-5 px-2"
              >
                STRICT_VALIDATION: OFF
              </Badge>
            </div>
            <div className="relative group">
              <div className="absolute inset-0 bg-primary/5 blur-xl rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
              <CodeBlock
                code={watch('data_contract_json') || ''}
                language="json"
                editable={isEditor}
                onChange={(val) => setValue('data_contract_json', val)}
                maxHeight="350px"
                rounded
                className="border-none bg-[#0a0a0a] text-primary/90 shadow-2xl relative z-10"
              />
            </div>
          </div>
        )}
      </div>

      <Separator className="opacity-50" />

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Trash2 className="h-3 w-3 text-destructive" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Quarantine Buffer
          </span>
        </div>

        <div className="space-y-4 p-4 rounded-xl border border-destructive/20 bg-destructive/5">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold">Sink Connection</Label>
            <Controller
              control={control}
              name="quarantine_connection_id"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value} disabled={!isEditor}>
                  <SelectTrigger className="h-9 rounded-lg bg-background/50 border-destructive/10">
                    <SelectValue placeholder="Select connection..." />
                  </SelectTrigger>
                  <SelectContent>
                    {connections?.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-bold">Quarantine Asset</Label>
            <Controller
              control={control}
              name="quarantine_asset_id"
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={!watch('quarantine_connection_id') || !isEditor}
                >
                  <SelectTrigger className="h-9 rounded-lg bg-background/50 border-destructive/10">
                    <SelectValue placeholder="Select asset..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredAssets?.map((a: any) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <p className="text-[9px] text-muted-foreground">
            Invalid rows will be written to this asset with a{' '}
            <code>__synqx_quarantine_reason__</code> column.
          </p>
        </div>
      </div>
    </div>
  )
}
