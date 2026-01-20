import React from 'react'
import { Controller } from 'react-hook-form'
import { Zap, Workflow } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CodeBlock } from '@/components/ui/docs/CodeBlock'

interface NodeAdvancedTabProps {
  watch: any
  setValue: any
  register: any
  isEditor: boolean
  isLoadingPipelines: boolean
  pipelines: any[]
  control: any
}

export const NodeAdvancedTab: React.FC<NodeAdvancedTabProps> = ({
  watch,
  setValue,
  register,
  isEditor,
  isLoadingPipelines,
  pipelines,
  control,
}) => {
  return (
    <div className="p-6 space-y-8 pb-32 focus-visible:outline-none">
      <div className="space-y-6">
        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-bold uppercase tracking-widest">Dynamic Fan-out</span>
          </div>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_dynamic"
                checked={watch('is_dynamic')}
                onCheckedChange={(v) => setValue('is_dynamic', !!v)}
              />
              <label
                htmlFor="is_dynamic"
                className="text-[10px] font-bold uppercase tracking-widest cursor-pointer"
              >
                Enable Dynamic Mapping
              </label>
            </div>
            {watch('is_dynamic') && (
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                <Label className="text-[9px] font-bold text-muted-foreground uppercase">
                  Mapping Expression
                </Label>
                <Input
                  {...register('mapping_expr')}
                  placeholder="e.g. inputs['node_id'].rows"
                  className="h-8 text-[10px] font-mono bg-background/50 border-border/40"
                />
                <p className="text-[8px] text-muted-foreground italic">
                  Spawns parallel instances for each item in the list.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
          <div className="flex items-center gap-2 mb-4">
            <Workflow className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-widest">
              Modular Orchestration
            </span>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[9px] font-bold text-muted-foreground uppercase">
                Target Sub-pipeline
              </Label>
              <Controller
                control={control}
                name="sub_pipeline_id"
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ? String(field.value) : undefined}
                    disabled={!isEditor || isLoadingPipelines}
                  >
                    <SelectTrigger className="h-8 text-[10px] font-medium bg-background/50 border-border/40">
                      <SelectValue
                        placeholder={isLoadingPipelines ? 'Loading...' : 'Select pipeline...'}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {pipelines?.map((p: any) => (
                        <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                          <span className="font-bold">{p.name}</span>{' '}
                          <span className="text-muted-foreground ml-2">#{p.id}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-[8px] text-muted-foreground italic">
                Executes the specified pipeline as a logical child node.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Expert JSON Configuration
          </Label>
          <div className="p-0 border-0 bg-muted/10 rounded-2xl overflow-hidden shadow-2xl">
            <CodeBlock
              code={watch('config') || '{}'}
              language="json"
              editable={isEditor}
              onChange={(val) => setValue('config', val)}
              maxHeight="384px"
              rounded={false}
              className="border-none bg-[#050505]"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
