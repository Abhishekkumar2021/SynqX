import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Controller } from 'react-hook-form'
import { Zap, Lock, Globe, Shield, Info, FileCode, Plus } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CodeBlock } from '@/components/ui/docs/CodeBlock'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { RuleBuilder } from './RuleBuilder'
import { truncateText } from '@/lib/utils'
import { toast } from 'sonner'

interface NodeSettingsTabProps {
  register: any
  control: any
  watch: any
  setValue: any
  isEditor: boolean
  nodeType: string
  operatorClass: string
  connections: any[]
  assets: any[]
  isLoadingAssets: boolean
  filteredAssets: any[]
  selectedConnectionId: string
  opDef: any
}

const HelpIcon = ({ content }: { content?: string }) => {
  if (!content) return null
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-3 w-3 text-muted-foreground/50 hover:text-primary cursor-help transition-colors ml-1.5" />
        </TooltipTrigger>
        <TooltipContent className="max-w-55 text-[10px] leading-relaxed p-3 rounded-xl border-border/40 bg-background/95 backdrop-blur-md shadow-2xl">
          <div className="space-y-1.5">
            <p className="text-foreground/90 font-medium">{content}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export const NodeSettingsTab: React.FC<NodeSettingsTabProps> = ({
  register,
  control,
  watch,
  setValue,
  isEditor,
  nodeType,
  operatorClass,
  connections,
  assets,
  isLoadingAssets,
  filteredAssets,
  selectedConnectionId,
  opDef,
}) => {
  const navigate = useNavigate()
  const selectedConnection = connections?.find((c: any) => String(c.id) === selectedConnectionId)
  const isOSDU = selectedConnection?.connector_type === 'osdu'
  const [schemaMode, setSchemaMode] = useState<'visual' | 'manual'>('visual')
  const initialConnectionId = React.useRef(selectedConnectionId)

  // Reset asset_id when connection changes manually
  React.useEffect(() => {
    if (
      selectedConnectionId &&
      initialConnectionId.current !== undefined &&
      initialConnectionId.current !== selectedConnectionId
    ) {
      setValue('asset_id', '')
    }
    initialConnectionId.current = selectedConnectionId
  }, [selectedConnectionId, setValue, isOSDU])

  const renderField = (field: any) => {
    if (field.name === 'schema' && operatorClass === 'validate') {
      return (
        <div key={field.name} className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Label className="text-[10px] font-bold">{field.label}</Label>
              <HelpIcon content={field.tooltip} />
            </div>
            <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-lg border border-border/40">
              <Button
                type="button"
                variant={schemaMode === 'visual' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-6 px-2 text-[9px] font-bold rounded-md"
                onClick={() => setSchemaMode('visual')}
              >
                Visual
              </Button>
              <Button
                type="button"
                variant={schemaMode === 'manual' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-6 px-2 text-[9px] font-bold rounded-md"
                onClick={() => setSchemaMode('manual')}
              >
                JSON
              </Button>
            </div>
          </div>
          {schemaMode === 'visual' ? (
            <RuleBuilder watch={watch} setValue={setValue} />
          ) : (
            <div className="space-y-2">
              <CodeBlock
                code={watch('schema_json_manual') || ''}
                language="json"
                editable={isEditor}
                onChange={(val) => setValue('schema_json_manual', val)}
                maxHeight="256px"
                rounded
                className="border-border/40 bg-background/50 text-[10px]"
              />
              <p className="text-[9px] text-muted-foreground">
                Manual JSON override. Use with caution.
              </p>
            </div>
          )}
        </div>
      )
    }
    switch (field.type) {
      case 'select':
        return (
          <Controller
            key={field.name}
            control={control}
            name={field.name}
            render={({ field: selectField }) => (
              <div className="space-y-2">
                <div className="flex items-center">
                  <Label className="text-[10px] font-bold">{field.label}</Label>
                  <HelpIcon content={field.tooltip} />
                </div>
                <Select
                  onValueChange={selectField.onChange}
                  value={selectField.value}
                  disabled={!isEditor}
                >
                  <SelectTrigger className="h-9 rounded-lg bg-background/50 border-border/40">
                    <SelectValue placeholder={`Select ${field.label}`} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/40">
                    {field.options?.map((opt: any) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          />
        )
      case 'json':
      case 'textarea':
        return (
          <div key={field.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Label className="text-[10px] font-bold">{field.label}</Label>
                <HelpIcon content={field.tooltip} />
              </div>
              {(field.name === 'code' || field.name === 'script') && (
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    id={`upload-${field.name}`}
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const text = await file.text()
                        setValue(field.name, text)
                        toast.success('Script Imported', {
                          description: `Successfully loaded ${truncateText(file.name, 30)}`,
                        })
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[9px] font-bold gap-1.5 hover:bg-primary/10 hover:text-primary"
                    onClick={() => document.getElementById(`upload-${field.name}`)?.click()}
                  >
                    <FileCode size={10} /> Import File
                  </Button>
                </div>
              )}
            </div>
            <CodeBlock
              code={watch(field.name) || ''}
              language={
                field.name === 'code' || field.name === 'script'
                  ? 'python'
                  : field.type === 'json'
                    ? 'json'
                    : 'text'
              }
              editable={isEditor}
              onChange={(val) => setValue(field.name, val)}
              maxHeight="256px"
              rounded
              className="border-border/40 bg-background/50"
            />
            {field.description && (
              <p className="text-[9px] text-muted-foreground">{field.description}</p>
            )}
          </div>
        )
      case 'boolean':
        return (
          <Controller
            key={field.name}
            control={control}
            name={field.name}
            render={({ field: checkboxField }) => (
              <div className="flex items-center space-x-2 py-1">
                <Checkbox
                  id={field.name}
                  checked={checkboxField.value}
                  onCheckedChange={checkboxField.onChange}
                  disabled={!isEditor}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor={field.name}
                    className="text-[10px] font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center"
                  >
                    {field.label}
                    <HelpIcon content={field.tooltip} />
                  </label>
                </div>
              </div>
            )}
          />
        )
      default:
        return (
          <div key={field.name} className="space-y-2">
            <div className="flex items-center">
              <Label className="text-[10px] font-bold">{field.label}</Label>
              <HelpIcon content={field.tooltip} />
            </div>
            <Input
              {...register(field.name)}
              type={field.type}
              placeholder={field.placeholder}
              readOnly={!isEditor}
              className="h-9 bg-background/50 rounded-lg border-border/40"
            />
            {field.description && (
              <p className="text-[9px] text-muted-foreground">{field.description}</p>
            )}
          </div>
        )
    }
  }

  return (
    <div className="m-0 space-y-8 focus-visible:outline-none">
      {/* Section: Basic Identity */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <div className="h-1 w-4 rounded-full bg-primary/40" />
          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/60">
            Identity & Purpose
          </Label>
        </div>
        <div className="p-5 rounded-[2rem] border border-border/40 bg-muted/5 space-y-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">
              Display Label
            </Label>
            <Input
              {...register('label', { required: true })}
              placeholder="Descriptive name..."
              readOnly={!isEditor}
              className="h-10 rounded-2xl bg-background/50 border-border/40 focus:ring-primary/20"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">
              Logic Description
            </Label>
            <Textarea
              {...register('description')}
              placeholder="What does this node achieve?"
              readOnly={!isEditor}
              className="min-h-[80px] rounded-2xl bg-background/50 border-border/40 resize-none text-xs leading-relaxed"
            />
          </div>
        </div>
      </div>

      {/* Section: IO Mapping */}
      {(nodeType === 'source' || nodeType === 'sink') && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <div className="h-1 w-4 rounded-full bg-primary/40" />
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/60">
              IO Mapping
            </Label>
          </div>
          <div className="p-5 rounded-[2rem] border border-primary/20 bg-primary/[0.02] space-y-5">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold">Connection</Label>
              {!connections || connections.length === 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-10 border-dashed border-primary/30 text-primary hover:bg-primary/5 text-xs gap-2"
                  onClick={() => navigate('/connections')}
                >
                  <Plus size={14} /> Create Connection
                </Button>
              ) : (
                <Controller
                  control={control}
                  name="connection_id"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value} disabled={!isEditor}>
                      <SelectTrigger className="h-10 rounded-xl bg-background border-primary/10 hover:border-primary/30 transition-all">
                        <SelectValue placeholder="Select connection" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-border/40">
                        {connections?.map((c: any) => (
                          <SelectItem
                            key={c.id}
                            value={String(c.id)}
                            className="text-xs font-medium"
                          >
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold">Target Asset</Label>
              {selectedConnectionId &&
              (!filteredAssets || filteredAssets.length === 0) &&
              !isLoadingAssets ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-10 border-dashed border-muted-foreground/30 text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5 text-xs gap-2"
                  onClick={() => navigate(`/connections/${selectedConnectionId}`)}
                >
                  <Plus size={14} /> Register Asset
                </Button>
              ) : (
                <Controller
                  control={control}
                  name="asset_id"
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!selectedConnectionId || !isEditor || isLoadingAssets}
                    >
                      <SelectTrigger className="h-10 rounded-xl bg-background border-primary/10 hover:border-primary/30 transition-all">
                        <SelectValue
                          placeholder={
                            isLoadingAssets
                              ? 'Loading assets...'
                              : !selectedConnectionId
                                ? 'Connect first'
                                : 'Select asset'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-border/40">
                        {filteredAssets?.map((a: any) => (
                          <SelectItem
                            key={a.id}
                            value={String(a.id)}
                            className="text-xs font-medium"
                          >
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
            </div>

            {nodeType === 'source' && (
              <div className="space-y-4 pt-4 border-t border-primary/10 mt-2">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold flex items-center">
                    Extraction Mode{' '}
                    <HelpIcon content="Determines how data is read from the source." />
                  </Label>
                  <Controller
                    control={control}
                    name="sync_mode"
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!isEditor}
                      >
                        <SelectTrigger className="h-10 rounded-xl bg-background border-primary/10">
                          <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border/40">
                          <SelectItem value="full_load" className="text-xs font-bold">
                            Full Load (Overwrite)
                          </SelectItem>
                          <SelectItem value="incremental" className="text-xs font-bold">
                            Incremental (Watermark)
                          </SelectItem>
                          <SelectItem value="cdc" className="text-xs font-bold">
                            Real-time CDC (Log Tailing)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {watch('sync_mode') === 'incremental' && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <Label className="text-[10px] font-bold">Watermark Column</Label>
                    <Input
                      {...register('watermark_column')}
                      placeholder="e.g. updated_at"
                      readOnly={!isEditor}
                      className="h-9 text-[10px] font-mono bg-background border-primary/10 rounded-lg"
                    />
                  </div>
                )}

                {watch('sync_mode') === 'cdc' && (
                  <div className="space-y-4 p-4 rounded-2xl bg-primary/5 border border-primary/10 animate-in zoom-in-95 duration-300">
                    <div className="flex items-center gap-2">
                      <Zap className="h-3 w-3 text-primary animate-pulse" />
                      <span className="text-[9px] font-bold uppercase tracking-widest text-primary">
                        Zero-Infra Streaming
                      </span>
                    </div>
                    <div className="space-y-3">
                      {selectedConnection?.connector_type === 'mysql' ? (
                        <div className="space-y-1.5">
                          <Label className="text-[9px] font-bold text-muted-foreground uppercase">
                            Replica Server ID
                          </Label>
                          <Input
                            type="number"
                            {...register('cdc_server_id', { valueAsNumber: true })}
                            className="h-8 text-[10px] font-mono rounded-lg border-primary/10"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="space-y-1.5">
                            <Label className="text-[9px] font-bold text-muted-foreground uppercase">
                              Replication Slot
                            </Label>
                            <Input
                              {...register('cdc_slot_name')}
                              placeholder="synqx_slot_1"
                              className="h-8 text-[10px] font-mono rounded-lg border-primary/10"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[9px] font-bold text-muted-foreground uppercase">
                              Publication Name
                            </Label>
                            <Input
                              {...register('cdc_publication_name')}
                              placeholder="synqx_pub"
                              className="h-8 text-[10px] font-mono rounded-lg border-primary/10"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {nodeType === 'sink' && (
              <div className="space-y-4 pt-4 border-t border-primary/10 mt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-primary/[0.03] border border-primary/10 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label className="text-[10px] font-bold">Auto-Provision</Label>
                        <HelpIcon content="Automatically create the target table or Kind if it does not exist." />
                      </div>
                      <Controller
                        control={control}
                        name="auto_create_schema"
                        render={({ field }) => (
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={!isEditor}
                            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                        )}
                      />
                    </div>
                    <p className="text-[8px] text-muted-foreground/60 leading-tight">
                      Ensures destination is ready before ingestion.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold flex items-center">
                      Write Strategy{' '}
                      <HelpIcon content="Determines how data is committed to the target asset." />
                    </Label>
                    <Controller
                      control={control}
                      name="write_strategy"
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={!isEditor}
                        >
                          <SelectTrigger className="h-9 rounded-xl bg-background border-primary/10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-border/40">
                            <SelectItem value="append" className="text-xs">
                              Append
                            </SelectItem>
                            <SelectItem value="overwrite" className="text-xs">
                              Overwrite
                            </SelectItem>
                            <SelectItem value="upsert" className="text-xs">
                              Upsert
                            </SelectItem>
                            <SelectItem value="scd2" className="text-xs">
                              SCD Type 2
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold flex items-center">
                    Evolution Policy{' '}
                    <HelpIcon content="Defines behavior when incoming data schema differs from target." />
                  </Label>
                  <Controller
                    control={control}
                    name="schema_evolution_policy"
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!isEditor}
                      >
                        <SelectTrigger className="h-9 rounded-xl bg-background border-primary/10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border/40">
                          <SelectItem value="strict" className="text-xs">
                            Strict
                          </SelectItem>
                          <SelectItem value="evolve" className="text-xs">
                            Evolve
                          </SelectItem>
                          <SelectItem value="ignore" className="text-xs">
                            Ignore
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section: OSDU Specific Governance */}
      {isOSDU && (
        <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-2 px-1">
            <div className="h-1 w-4 rounded-full bg-primary" />
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
              OSDU Technical Context
            </Label>
          </div>
          <div className="p-6 rounded-[2.5rem] border border-primary/20 bg-primary/[0.03] space-y-6 relative overflow-hidden">
            <div className="absolute -right-12 -top-12 h-40 w-40 bg-primary/5 blur-3xl rounded-full" />

            <div className="space-y-4 relative z-10">
              {nodeType === 'sink' && watch('auto_create_schema') && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-background border border-primary/10 flex flex-col gap-3">
                    <Label className="text-[10px] font-bold">Inference Strategy</Label>
                    <Controller
                      control={control}
                      name="osdu_inference_strategy"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value || 'data_driven'}>
                          <SelectTrigger className="h-8 text-[10px] bg-background border-primary/10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-border/40">
                            <SelectItem value="data_driven" className="text-[10px]">
                              Data-driven
                            </SelectItem>
                            <SelectItem value="canonical" className="text-[10px]">
                              Contract-driven
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex flex-col items-center justify-center text-center gap-1.5">
                    <Shield size={16} className="text-primary opacity-60" />
                    <span className="text-[9px] font-black uppercase text-primary tracking-tighter">
                      Governance Active
                    </span>
                    <span className="text-[8px] text-muted-foreground font-medium">
                      Policy-based ingestion
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <Lock size={10} className="text-primary" />
                    <Label className="text-[9px] font-bold uppercase tracking-widest text-foreground/70">
                      Access Control List (ACL)
                    </Label>
                  </div>
                  <CodeBlock
                    code={watch('osdu_acl') || '{\n  "viewers": [],\n  "owners": []\n}'}
                    language="json"
                    editable={isEditor}
                    onChange={(val: string) => setValue('osdu_acl', val)}
                    maxHeight="120px"
                    rounded={false}
                    className="border-none bg-black/40 text-primary shadow-inner"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <Globe size={10} className="text-primary" />
                    <Label className="text-[9px] font-bold uppercase tracking-widest text-foreground/70">
                      Legal Metadata
                    </Label>
                  </div>
                  <CodeBlock
                    code={
                      watch('osdu_legal') ||
                      '{\n  "legaltags": [],\n  "otherRelevantDataCountries": ["US"]\n}'
                    }
                    language="json"
                    editable={isEditor}
                    onChange={(val: string) => setValue('osdu_legal', val)}
                    maxHeight="120px"
                    rounded={false}
                    className="border-none bg-black/40 text-primary shadow-inner"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section: Operator specific fields */}
      {opDef?.fields && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <div className="h-1 w-4 rounded-full bg-primary/40" />
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/60">
              Functional Parameters
            </Label>
          </div>
          <div className="p-6 rounded-[2rem] border border-border/40 bg-muted/5 space-y-5">
            {opDef.fields.map(renderField)}
          </div>
        </div>
      )}

      {/* Section: Reliability */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <div className="h-1 w-4 rounded-full bg-warning/40" />
          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/60">
            Fault Recovery
          </Label>
        </div>
        <div className="p-6 rounded-[2rem] border border-warning/20 bg-warning/[0.02] space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold">Retry Logic</Label>
              <Controller
                control={control}
                name="retry_strategy"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value} disabled={!isEditor}>
                    <SelectTrigger className="h-9 rounded-xl bg-background border-warning/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/40">
                      <SelectItem value="none" className="text-xs">
                        Disabled
                      </SelectItem>
                      <SelectItem value="fixed" className="text-xs">
                        Fixed
                      </SelectItem>
                      <SelectItem value="linear_backoff" className="text-xs">
                        Linear
                      </SelectItem>
                      <SelectItem value="exponential_backoff" className="text-xs">
                        Exponential
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            {watch('retry_strategy') !== 'none' && (
              <div className="space-y-2">
                <Label className="text-[10px] font-bold">Max Retries</Label>
                <Input
                  type="number"
                  {...register('max_retries', { valueAsNumber: true })}
                  readOnly={!isEditor}
                  className="h-9 bg-background border-warning/10 rounded-xl"
                />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold">Retry Delay (s)</Label>
              <Input
                type="number"
                {...register('retry_delay_seconds', { valueAsNumber: true })}
                readOnly={!isEditor}
                className="h-9 bg-background border-warning/10 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold">Timeout (s)</Label>
              <Input
                type="number"
                {...register('timeout_seconds', { valueAsNumber: true })}
                placeholder="3600"
                readOnly={!isEditor}
                className="h-9 bg-background border-warning/10 rounded-xl"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
