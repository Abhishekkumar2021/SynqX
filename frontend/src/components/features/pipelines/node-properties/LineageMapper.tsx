import React from 'react'
import { Plus, Trash2, Share2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface LineageMapperProps {
  watch: any
  setValue: any
}

export const LineageMapper: React.FC<LineageMapperProps> = ({ watch, setValue }) => {
  const mapping = watch('column_mapping_obj') || []

  const addMapping = () => {
    setValue('column_mapping_obj', [...mapping, { source: '', target: '' }])
  }

  const removeMapping = (index: number) => {
    const newMapping = [...mapping]
    newMapping.splice(index, 1)
    setValue('column_mapping_obj', newMapping)
  }

  const updateMapping = (index: number, field: 'source' | 'target', value: string) => {
    const newMapping = [...mapping]
    newMapping[index] = { ...newMapping[index], [field]: value }
    setValue('column_mapping_obj', newMapping)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Column Mappings
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addMapping}
          className="h-7 text-[9px] font-bold uppercase tracking-wider rounded-lg border-primary/20 hover:bg-primary/5"
        >
          <Plus className="h-3 w-3 mr-1" /> Add Mapping
        </Button>
      </div>

      <div className="space-y-3">
        {mapping.map((m: any, index: number) => (
          <div key={index} className="flex items-center gap-2 group/map">
            <Input
              placeholder="Source Column"
              value={m.source}
              onChange={(e) => updateMapping(index, 'source', e.target.value)}
              className="h-8 text-[10px] font-mono bg-muted/20"
            />
            <ArrowRight size={12} className="text-muted-foreground shrink-0" />
            <Input
              placeholder="Target Column"
              value={m.target}
              onChange={(e) => updateMapping(index, 'target', e.target.value)}
              className="h-8 text-[10px] font-mono bg-muted/20"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeMapping(index)}
              className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover/map:opacity-100 transition-opacity"
            >
              <Trash2 size={12} />
            </Button>
          </div>
        ))}

        {mapping.length === 0 && (
          <div className="p-8 text-center border-2 border-dashed border-border/40 rounded-xl bg-muted/5">
            <Share2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              No manual lineage mapping
            </p>
            <p className="text-[9px] text-muted-foreground mt-1 max-w-[240px] mx-auto">
              SynqX will attempt to trace lineage automatically based on operator logic.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
