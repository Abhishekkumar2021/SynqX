/* eslint-disable react-hooks/incompatible-library */

import React, { useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { type AssetBulkCreate, bulkCreateAssets } from '@/lib/api'
import { AssetType, ConnectorType } from '@/lib/enums'
import { ASSET_META } from '@/lib/asset-definitions'
import { toast } from 'sonner'
import {
  Plus,
  X,
  Sparkles,
  Loader2,
  Code,
  Database,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldAlert,
} from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { motion, AnimatePresence } from 'framer-motion'
import { CodeBlock } from '@/components/ui/docs/CodeBlock'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

interface CreateAssetsDialogProps {
  connectionId: number
  connectorType: ConnectorType
  open: boolean
  onOpenChange: (open: boolean) => void
}

type FormValues = {
  assets: {
    name: string
    fully_qualified_name?: string
    asset_type: string
    query?: string
    sd_mode: string[] // Changed to array for multi-selection
    raw_schema?: string
  }[]
}

const CONNECTOR_ASSET_TYPES: Partial<Record<ConnectorType, AssetType[]>> = {
  [ConnectorType.POSTGRESQL]: [AssetType.TABLE, AssetType.VIEW, AssetType.SQL_QUERY],
  [ConnectorType.MYSQL]: [AssetType.TABLE, AssetType.VIEW, AssetType.SQL_QUERY],
  [ConnectorType.MARIADB]: [AssetType.TABLE, AssetType.VIEW, AssetType.SQL_QUERY],
  [ConnectorType.MSSQL]: [AssetType.TABLE, AssetType.VIEW, AssetType.SQL_QUERY],
  [ConnectorType.ORACLE]: [AssetType.TABLE, AssetType.VIEW, AssetType.SQL_QUERY],
  [ConnectorType.SQLITE]: [AssetType.TABLE, AssetType.VIEW, AssetType.SQL_QUERY],
  [ConnectorType.DUCKDB]: [AssetType.TABLE, AssetType.VIEW, AssetType.SQL_QUERY],
  [ConnectorType.SNOWFLAKE]: [AssetType.TABLE, AssetType.VIEW, AssetType.SQL_QUERY],
  [ConnectorType.BIGQUERY]: [AssetType.TABLE, AssetType.VIEW, AssetType.SQL_QUERY],
  [ConnectorType.REDSHIFT]: [AssetType.TABLE, AssetType.VIEW, AssetType.SQL_QUERY],
  [ConnectorType.DATABRICKS]: [AssetType.TABLE, AssetType.VIEW, AssetType.SQL_QUERY],
  [ConnectorType.MONGODB]: [AssetType.COLLECTION, AssetType.NOSQL_QUERY],
  [ConnectorType.REDIS]: [AssetType.KEY_PATTERN],
  [ConnectorType.ELASTICSEARCH]: [AssetType.COLLECTION, AssetType.NOSQL_QUERY],
  [ConnectorType.CASSANDRA]: [AssetType.TABLE, AssetType.NOSQL_QUERY],
  [ConnectorType.DYNAMODB]: [AssetType.TABLE, AssetType.NOSQL_QUERY],
  [ConnectorType.LOCAL_FILE]: [AssetType.FILE],
  [ConnectorType.S3]: [AssetType.FILE],
  [ConnectorType.GCS]: [AssetType.FILE],
  [ConnectorType.AZURE_BLOB]: [AssetType.FILE],
  [ConnectorType.FTP]: [AssetType.FILE],
  [ConnectorType.SFTP]: [AssetType.FILE],
  [ConnectorType.REST_API]: [AssetType.API_ENDPOINT],
  [ConnectorType.GRAPHQL]: [AssetType.API_ENDPOINT],
  [ConnectorType.GOOGLE_SHEETS]: [AssetType.TABLE],
  [ConnectorType.AIRTABLE]: [AssetType.TABLE],
  [ConnectorType.SALESFORCE]: [AssetType.TABLE],
  [ConnectorType.HUBSPOT]: [AssetType.TABLE],
  [ConnectorType.STRIPE]: [AssetType.TABLE],
  [ConnectorType.KAFKA]: [AssetType.STREAM],
  [ConnectorType.RABBITMQ]: [AssetType.STREAM],
  [ConnectorType.CUSTOM_SCRIPT]: [
    AssetType.PYTHON_SCRIPT,
    AssetType.SHELL_SCRIPT,
    AssetType.JAVASCRIPT_SCRIPT,
  ],
  [ConnectorType.SINGER_TAP]: [AssetType.TABLE],
  [ConnectorType.OSDU]: [AssetType.OSDU_KIND],
  [ConnectorType.PROSOURCE]: [AssetType.DOMAIN_ENTITY],
}

const DEFAULT_ASSET_TYPES = [AssetType.TABLE, AssetType.FILE]

const QUERY_SCRIPT_TYPES = [
  AssetType.SQL_QUERY,
  AssetType.NOSQL_QUERY,
  AssetType.PYTHON_SCRIPT,
  AssetType.SHELL_SCRIPT,
  AssetType.JAVASCRIPT_SCRIPT,
]

export const CreateAssetsDialog: React.FC<CreateAssetsDialogProps> = ({
  connectionId,
  connectorType,
  open,
  onOpenChange,
}) => {
  const queryClient = useQueryClient()
  const availableAssetTypes = CONNECTOR_ASSET_TYPES[connectorType] || DEFAULT_ASSET_TYPES
  const defaultAssetType = availableAssetTypes[0]

  const { register, control, handleSubmit, reset, watch } = useForm<FormValues>({
    defaultValues: {
      assets: [
        {
          name: '',
          asset_type: defaultAssetType,
          query: '',
          sd_mode: ['source', 'destination'],
          raw_schema: '',
        },
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'assets' })
  const watchedAssets = watch('assets')

  useEffect(() => {
    if (open) {
      reset({
        assets: [
          {
            name: '',
            asset_type: defaultAssetType,
            query: '',
            sd_mode: ['source', 'destination'],
            raw_schema: '',
          },
        ],
      })
    }
  }, [open, reset, defaultAssetType])

  const mutation = useMutation({
    mutationFn: (payload: AssetBulkCreate) => bulkCreateAssets(connectionId, payload),
    onSuccess: (data) => {
      if (data.successful_creates === data.total_requested) {
        toast.success('Registration Successful', {
          description: `All ${data.successful_creates} assets have been registered.`,
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
        })
      } else if (data.successful_creates > 0) {
        toast.warning('Partial Registration', {
          description: `${data.successful_creates} assets registered, ${data.failed_creates} failed. Check for duplicates.`,
          icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
        })
      } else {
        toast.error('Registration Failed', {
          description: `None of the ${data.total_requested} assets could be registered.`,
          icon: <XCircle className="h-4 w-4 text-destructive" />,
        })
      }

      if (data.successful_creates > 0) {
        queryClient.invalidateQueries({ queryKey: ['assets', connectionId] })
        onOpenChange(false)
      }
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail
      let msg = 'An error occurred during creation.'
      if (typeof detail === 'string') msg = detail
      else if (detail?.message) msg = detail.message
      toast.error('Operation Failed', {
        description: msg,
        icon: <ShieldAlert className="h-4 w-4 text-destructive" />,
      })
    },
  })

  const onSubmit = (data: FormValues) => {
    const payload: AssetBulkCreate = {
      assets: data.assets
        .filter((a) => a.name.trim() !== '')
        .map((asset) => {
          const config: Record<string, any> = {}

          let finalName = asset.name.trim()
          if (connectorType === ConnectorType.REST_API && !finalName.startsWith('/')) {
            finalName = '/' + finalName
          }

          if (
            ([AssetType.SQL_QUERY, AssetType.NOSQL_QUERY] as string[]).includes(asset.asset_type)
          ) {
            config.query = asset.query
          } else if ((QUERY_SCRIPT_TYPES as string[]).includes(asset.asset_type)) {
            config.code = asset.query
            config.language = asset.asset_type
          }

          let schemaMetadata: Record<string, any> = {}
          if (
            (connectorType === ConnectorType.PROSOURCE || connectorType === ConnectorType.OSDU) &&
            asset.raw_schema
          ) {
            try {
              schemaMetadata = JSON.parse(asset.raw_schema)
            } catch (e) {
              toast.error('Schema Error', {
                description: `Invalid JSON schema for asset ${asset.name}.`,
              })
              return null
            }
          }

          return {
            name: finalName,
            fully_qualified_name: asset.fully_qualified_name?.trim() || finalName,
            asset_type: asset.asset_type,
            is_source: asset.sd_mode.includes('source'),
            is_destination: asset.sd_mode.includes('destination'),
            config: config,
            schema_metadata: schemaMetadata,
            connection_id: connectionId,
          }
        })
        .filter((a): a is any => a !== null),
    }
    if (payload.assets.length === 0) {
      toast.error('Validation Error', {
        description: 'Please provide at least one asset with valid configuration.',
      })
      return
    }
    mutation.mutate(payload)
  }

  const getQueryHelp = (type: string) => {
    if (type === AssetType.SQL_QUERY) return 'Enter a valid SQL query.'
    if (
      (
        [AssetType.PYTHON_SCRIPT, AssetType.JAVASCRIPT_SCRIPT, AssetType.SHELL_SCRIPT] as string[]
      ).includes(type)
    )
      return 'Enter script code. Standard output must be valid JSON.'
    return 'Enter a JSON object query.'
  }

  const getCodeLanguage = (type: string) => {
    if (type === AssetType.SQL_QUERY) return 'sql'
    if (type === AssetType.PYTHON_SCRIPT) return 'python'
    if (type === AssetType.JAVASCRIPT_SCRIPT) return 'javascript'
    if (type === AssetType.SHELL_SCRIPT) return 'bash'
    return 'json'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-[2.5rem] border-border/60 glass-panel shadow-2xl backdrop-blur-3xl">
        <DialogHeader className="p-10 pb-6 border-b border-border/40 bg-linear-to-b from-muted/20 to-transparent shrink-0">
          <div className="flex items-center gap-5">
            <div className="p-4 rounded-3xl bg-primary/10 text-primary ring-1 ring-border/50 shadow-sm">
              <Sparkles className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-3xl font-bold tracking-tight">
                Manual Asset Registration
              </DialogTitle>
              <DialogDescription className="text-sm font-medium text-muted-foreground">
                Define multiple data entities or script-based assets for your connection.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1">
            <div className="p-10 pt-6 space-y-4">
              <div className="grid grid-cols-12 gap-4 px-4 mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
                <div className="col-span-3">Display Name</div>
                <div className="col-span-3">Technical Identifier (FQN)</div>
                <div className="col-span-3">Object Type</div>
                <div className="col-span-2">SD Mode</div>
                <div className="col-span-1"></div>
              </div>

              <AnimatePresence initial={false}>
                {fields.map((field, index) => {
                  const assetType = watchedAssets?.[index]?.asset_type
                  const isQuery = (QUERY_SCRIPT_TYPES as string[]).includes(assetType)

                  return (
                    <motion.div
                      key={field.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="group flex flex-col bg-muted/5 hover:bg-muted/10 rounded-3xl border border-border/30 hover:border-primary/20 transition-all p-1"
                    >
                      <div className="grid grid-cols-12 gap-3 items-center p-3">
                        {/* Name */}
                        <div className="col-span-3">
                          <Input
                            {...register(`assets.${index}.name`, { required: true })}
                            placeholder="e.g. Users Feed"
                            className="h-10 rounded-2xl bg-background/50 border-border/40 focus:bg-background transition-all text-xs font-semibold"
                          />
                        </div>

                        {/* FQN */}
                        <div className="col-span-3">
                          <Input
                            {...register(`assets.${index}.fully_qualified_name`)}
                            placeholder="e.g. public.users"
                            className="h-10 rounded-2xl bg-background/30 border-border/30 font-mono text-[10px] focus:bg-background transition-all"
                          />
                        </div>

                        {/* Type */}
                        <div className="col-span-3">
                          <Controller
                            control={control}
                            name={`assets.${index}.asset_type`}
                            render={({ field: f }) => (
                              <Select
                                onValueChange={(val) => {
                                  f.onChange(val)
                                }}
                                defaultValue={f.value}
                              >
                                <SelectTrigger className="h-10 rounded-2xl bg-background/50 border-border/40 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl shadow-2xl">
                                  {availableAssetTypes.map((type) => (
                                    <SelectItem key={type} value={type} className="rounded-xl">
                                      <div className="flex items-center gap-2">
                                        {React.createElement(ASSET_META[type].icon, {
                                          className: 'h-3.5 w-3.5 opacity-70',
                                        })}
                                        {ASSET_META[type].name}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>

                        {/* SD Mode */}
                        <div className="col-span-2">
                          <Controller
                            control={control}
                            name={`assets.${index}.sd_mode`}
                            render={({ field: f }) => (
                              <ToggleGroup
                                type="multiple"
                                variant="outline"
                                className="justify-start gap-1"
                                value={f.value}
                                onValueChange={(val) => {
                                  if (val.length > 0) f.onChange(val)
                                }}
                              >
                                <ToggleGroupItem
                                  value="source"
                                  className="h-8 px-2 text-[9px] font-black uppercase tracking-tighter data-[state=on]:bg-primary/10 data-[state=on]:text-primary data-[state=on]:border-primary/20 rounded-lg"
                                  title="Register as Source"
                                >
                                  SRC
                                </ToggleGroupItem>
                                <ToggleGroupItem
                                  value="destination"
                                  className="h-8 px-2 text-[9px] font-black uppercase tracking-tighter data-[state=on]:bg-emerald-500/10 data-[state=on]:text-emerald-600 data-[state=on]:border-emerald-500/20 rounded-lg"
                                  title="Register as Destination"
                                >
                                  DST
                                </ToggleGroupItem>
                              </ToggleGroup>
                            )}
                          />
                        </div>

                        {/* Remove */}
                        <div className="col-span-1 flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            onClick={() => remove(index)}
                            disabled={fields.length <= 1}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Advanced Config Section (Query / Script) */}
                      <AnimatePresence>
                        {isQuery && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden border-t border-border/20 bg-muted/5"
                          >
                            <div className="p-4">
                              <div className="bg-primary/5 border border-primary/10 rounded-[1.5rem] p-5 space-y-5 shadow-inner">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between px-1">
                                    <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                      <Code className="h-3 w-3 text-primary" /> Logic Definition
                                    </Label>
                                    <span className="text-[9px] font-bold text-primary/60 bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10">
                                      {getQueryHelp(assetType)}
                                    </span>
                                  </div>
                                  <div className="relative group min-h-[200px]">
                                    <Controller
                                      control={control}
                                      name={`assets.${index}.query`}
                                      rules={{ required: isQuery }}
                                      render={({ field: f }) => (
                                        <CodeBlock
                                          code={f.value || ''}
                                          language={getCodeLanguage(assetType)}
                                          onChange={f.onChange}
                                          editable
                                          rounded
                                          maxHeight="400px"
                                          className="text-xs"
                                        />
                                      )}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                        {/* ProSource Raw Schema Section */}
                        {connectorType === ConnectorType.PROSOURCE &&
                          (assetType === AssetType.OSDU_KIND ||
                            assetType === AssetType.DOMAIN_ENTITY) && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden border-t border-border/20 bg-muted/5"
                            >
                              <div className="p-4">
                                <div className="bg-primary/5 border border-primary/10 rounded-[1.5rem] p-5 space-y-5 shadow-inner">
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between px-1">
                                      <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                        <Database className="h-3 w-3 text-primary" /> Raw Schema
                                        (JSON)
                                      </Label>
                                      <span className="text-[9px] font-bold text-primary/60 bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10">
                                        Enter a valid JSON schema for the Prosource asset.
                                      </span>
                                    </div>
                                    <div className="relative group min-h-[200px]">
                                      <Controller
                                        control={control}
                                        name={`assets.${index}.raw_schema`}
                                        render={({ field: f }) => (
                                          <CodeBlock
                                            code={f.value || ''}
                                            language="json"
                                            onChange={f.onChange}
                                            editable
                                            rounded
                                            maxHeight="400px"
                                            className="text-xs"
                                          />
                                        )}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                      </AnimatePresence>
                    </motion.div>
                  )
                })}
              </AnimatePresence>

              <Button
                type="button"
                variant="outline"
                className="w-full h-14 rounded-3xl border-dashed border-border/60 bg-background/20 hover:bg-primary/5 hover:border-primary/30 transition-all font-bold uppercase tracking-widest text-muted-foreground hover:text-primary gap-3 mt-4 text-[10px]"
                onClick={() =>
                  append({
                    name: '',
                    asset_type: defaultAssetType,
                    query: '',
                    sd_mode: ['source', 'destination'],
                    raw_schema: '',
                  })
                }
              >
                <Plus className="h-4 w-4" /> Add Another Asset
              </Button>
            </div>
          </ScrollArea>

          <DialogFooter className="p-10 border-t border-border/40 bg-muted/10 gap-4 shrink-0">
            <Button
              type="button"
              variant="ghost"
              className="rounded-2xl h-12 px-8 font-bold text-muted-foreground hover:bg-background"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-2xl h-12 px-10 font-bold shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] gap-3"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
              Register {fields.length} Asset{fields.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
