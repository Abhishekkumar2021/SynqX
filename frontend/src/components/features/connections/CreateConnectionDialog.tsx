/* eslint-disable react-hooks/incompatible-library */

import React, { useState, useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createConnection,
  updateConnection,
  testConnectionAdhoc,
  type ConnectionCreate,
  getConnections,
} from '@/lib/api'
import { truncateText } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  Server,
  ArrowLeft,
  Search,
  Plus,
  Loader2,
  Shield,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { cn } from '@/lib/utils'
import { CodeBlock } from '@/components/ui/docs/CodeBlock'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { CONNECTOR_TYPE_INFO } from '@/lib/connector-definitions'
import { ConnectorType } from '@/lib/enums'
import { ScrollArea } from '@/components/ui/scroll-area'
import { motion } from 'framer-motion'

interface CreateConnectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editConnection?: any
  initialData?: any // Add this to match what's passed from pages
}

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  connector_type: z.nativeEnum(ConnectorType),
  config: z.record(z.string(), z.any()),
  staging_connection_id: z.number().optional().nullable(),
})

export const CreateConnectionDialog: React.FC<CreateConnectionDialogProps> = ({
  open,
  onOpenChange,
  editConnection,
  initialData,
}) => {
  // Merge initialData into editConnection behavior
  const connectionToEdit = editConnection || initialData

  const [step, setStep] = useState<'type' | 'config'>(connectionToEdit ? 'config' : 'type')
  const [selectedType, setSelectedType] = useState<ConnectorType | null>(
    connectionToEdit?.connector_type || null
  )
  const [searchQuery, setSearchQuery] = useState('')
  const queryClient = useQueryClient()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: connectionToEdit?.name || '',
      connector_type: connectionToEdit?.connector_type || ConnectorType.POSTGRESQL,
      config: connectionToEdit?.config || {},
      staging_connection_id: connectionToEdit?.staging_connection_id || null,
    },
  })

  const { data: allConnections } = useQuery({
    queryKey: ['connections'],
    queryFn: getConnections,
    enabled: open && (selectedType === 'snowflake' || selectedType === 'bigquery'),
  })

  const stagingConnections = useMemo(() => {
    if (!allConnections) return []
    // Filter for S3/GCS or other compatible staging connectors
    return allConnections.filter((c) =>
      ['s3', 'gcs', 'azure_blob'].includes(c.connector_type.toLowerCase())
    )
  }, [allConnections])

  useEffect(() => {
    if (open) {
      if (connectionToEdit) {
        setStep('config')
        setSelectedType(connectionToEdit.connector_type)
        form.reset({
          name: connectionToEdit.name,
          connector_type: connectionToEdit.connector_type,
          config: connectionToEdit.config,
          staging_connection_id: connectionToEdit.staging_connection_id,
        })
      } else {
        setStep('type')
        setSelectedType(null)
        form.reset({
          name: '',
          connector_type: ConnectorType.POSTGRESQL,
          config: {},
          staging_connection_id: null,
        })
      }
    }
  }, [open, connectionToEdit, form])

  const mutation = useMutation({
    mutationFn: (data: any) =>
      connectionToEdit ? updateConnection(connectionToEdit.id, data) : createConnection(data),
    onSuccess: () => {
      toast.success(connectionToEdit ? 'Connection Updated' : 'Connection Created')
      queryClient.invalidateQueries({ queryKey: ['connections'] })
      onOpenChange(false)
    },
    onError: (err: any) => {
      toast.error('Operation Failed', {
        description: truncateText(
          err.response?.data?.detail?.message || 'An unexpected error occurred.'
        ),
      })
    },
  })

  const testMutation = useMutation({
    mutationFn: (data: { type: string; config: any }) =>
      testConnectionAdhoc(data.type, data.config),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Connection Successful', {
          description: truncateText(res.message || 'Successfully connected to the data source.'),
        })
      } else {
        toast.error('Connection Failed', {
          description: truncateText(res.message || 'Could not establish connection.'),
        })
      }
    },
    onError: (err: any) => {
      toast.error('Test Failed', {
        description: truncateText(
          err.response?.data?.detail?.message || 'An unexpected error occurred during testing.'
        ),
      })
    },
  })

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    // We explicitly disable auto-validation on save to keep them separate as requested
    const payload = {
      ...values,
      validate_on_create: false,
      validate_on_update: false,
    }
    mutation.mutate(payload)
  }

  const handleTestConnection = () => {
    const values = form.getValues()
    if (!selectedType) return
    testMutation.mutate({
      type: selectedType,
      config: values.config,
    })
  }

  const schema = selectedType ? CONNECTOR_TYPE_INFO[selectedType] : null

  const filteredConnectors = Object.entries(CONNECTOR_TYPE_INFO).filter(
    ([_, info]: [any, any]) =>
      info.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      info.group.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const groupedConnectors = useMemo(() => {
    const groups: Record<string, any[]> = {}
    filteredConnectors.forEach(([type, info]) => {
      if (!groups[info.group]) groups[info.group] = []
      groups[info.group].push({ type, ...info })
    })
    return groups
  }, [filteredConnectors])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-[2.5rem] border border-border shadow-2xl bg-background">
        <DialogHeader className="p-10 pb-6 border-b border-border/40 bg-linear-to-b from-muted/20 to-transparent shrink-0">
          <div className="flex items-center gap-5">
            <div
              className={cn(
                'p-4 rounded-3xl ring-1 ring-border/50 shadow-sm transition-all duration-500',
                step === 'config' && schema?.color ? schema.color : 'bg-primary/10 text-primary'
              )}
            >
              {step === 'config' && schema ? (
                <SafeIcon icon={React.createElement(schema.icon)} className="h-7 w-7" />
              ) : (
                <ShieldCheck className="h-7 w-7" />
              )}
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-3xl font-bold tracking-tight">
                {connectionToEdit
                  ? `Update ${schema?.label || 'Connection'}`
                  : step === 'type'
                    ? 'New Data Connection'
                    : `Configure ${schema?.label}`}
              </DialogTitle>
              <DialogDescription className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                {step === 'type' ? (
                  'Select a connector to begin integration.'
                ) : (
                  <>
                    <Badge
                      variant="outline"
                      className="h-5 px-1.5 text-[8px] font-bold uppercase tracking-widest bg-background/50 border-primary/20 text-primary"
                    >
                      {schema?.group}
                    </Badge>
                    Establishing connection to your {schema?.label} infrastructure.
                  </>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {step === 'type' ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-10 py-6 border-b border-border/20 bg-muted/5 flex items-center justify-between gap-6 shrink-0">
                <div className="relative flex-1 max-w-xl group">
                  <div className="absolute inset-0 bg-primary/5 blur-xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity" />
                  <Search className="z-20 absolute left-5 top-4 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    autoFocus
                    placeholder="Search connectors (e.g. Postgres, S3, OSDU)..."
                    className="relative z-10 pl-14 h-13 rounded-[1.5rem] bg-background/50 border-border/40 focus:border-primary/40 focus:bg-background focus:ring-4 focus:ring-primary/5 transition-all text-base shadow-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <div className="absolute right-5 top-4 flex items-center gap-1.5 opacity-40 group-focus-within:opacity-0 transition-opacity">
                    <Badge variant="outline" className="h-5 px-1 rounded font-mono text-[9px]">
                      ⌘
                    </Badge>
                    <Badge variant="outline" className="h-5 px-1 rounded font-mono text-[9px]">
                      K
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className="h-8 px-3 rounded-lg border-border/40 bg-background/50 font-bold uppercase tracking-widest text-[9px]"
                  >
                    {filteredConnectors.length} Available
                  </Badge>
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-10 space-y-12">
                  {/* Recommended Section */}
                  {!searchQuery && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-4">
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-primary/80 whitespace-nowrap">
                          Recommended
                        </h3>
                        <div className="h-px w-full bg-linear-to-r from-primary/20 via-border/40 to-transparent" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {Object.entries(CONNECTOR_TYPE_INFO)
                          .filter(([_, info]) => info.popular)
                          .map(([type, info]) => (
                            <motion.button
                              key={`rec-${type}`}
                              whileHover={{ y: -4, scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => {
                                setSelectedType(type as ConnectorType)
                                form.setValue('connector_type', type as ConnectorType)
                                setStep('config')
                              }}
                              className="group relative flex items-center gap-4 p-4 rounded-3xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all text-left shadow-xs hover:shadow-lg hover:shadow-primary/10"
                            >
                              <div
                                className={cn(
                                  'p-2.5 rounded-xl border shadow-sm shrink-0',
                                  info.color || 'bg-background border-border/40'
                                )}
                              >
                                <SafeIcon
                                  icon={React.createElement(info.icon)}
                                  className="h-5 w-5"
                                />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-sm text-foreground truncate">
                                  {info.label}
                                </h4>
                                <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">
                                  {info.group}
                                </p>
                              </div>
                            </motion.button>
                          ))}
                      </div>
                    </div>
                  )}

                  {Object.entries(groupedConnectors).map(([groupName, connectors]) => (
                    <div key={groupName} className="space-y-6">
                      <div className="flex items-center gap-4">
                        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/70 whitespace-nowrap">
                          {groupName}
                        </h3>
                        <div className="h-px w-full bg-linear-to-r from-border/40 to-transparent" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {connectors.map((c) => (
                          <motion.button
                            key={c.type}
                            whileHover={{ y: -4, scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              setSelectedType(c.type as ConnectorType)
                              form.setValue('connector_type', c.type as ConnectorType)
                              setStep('config')
                            }}
                            className="group relative flex flex-col items-start p-6 rounded-[2rem] border border-border/40 bg-card/40 hover:bg-muted/10 hover:border-primary/20 transition-all text-left shadow-sm hover:shadow-xl hover:shadow-primary/5"
                          >
                            <div
                              className={cn(
                                'p-3 rounded-2xl border shadow-sm transition-all mb-4',
                                c.color ||
                                  'bg-background border-border/40 group-hover:border-primary/20 group-hover:shadow-primary/5'
                              )}
                            >
                              <SafeIcon icon={React.createElement(c.icon)} className="h-6 w-6" />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-sm text-foreground">{c.label}</h4>
                                {c.popular && (
                                  <Badge className="h-4 px-1.5 text-[7px] font-black uppercase tracking-tighter bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20">
                                    Popular
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
                                Enterprise-grade {c.group.toLowerCase()} integration.
                              </p>
                            </div>
                            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Plus className="h-4 w-4 text-primary" />
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
                <ScrollArea className="flex-1">
                  <div className="p-10 space-y-10">
                    {/* Basic Info */}
                    <div className="space-y-8">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary/10 text-primary text-xs font-black border border-primary/20 shadow-sm">
                          1
                        </div>
                        <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-foreground/70">
                          General Settings
                        </h4>
                        <div className="h-px flex-1 bg-linear-to-r from-border/60 to-transparent" />
                      </div>
                      <div className="grid gap-8 pl-12">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem className="space-y-2">
                              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
                                Connection Name
                              </Label>
                              <FormControl>
                                <Input
                                  autoFocus
                                  placeholder="e.g. Production Analytics Warehouse"
                                  className="h-11 rounded-2xl bg-background border-border/40 shadow-sm focus:ring-primary/20"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="h-px w-full bg-border/20" />

                    {/* Dynamic Config */}
                    <div className="space-y-8">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary/10 text-primary text-xs font-black border border-primary/20 shadow-sm">
                            2
                          </div>
                          <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-foreground/70">
                            Connection parameters
                          </h4>
                          <div className="h-px flex-1 bg-linear-to-r from-border/60 to-transparent" />
                        </div>
                        <Badge
                          variant="secondary"
                          className="rounded-xl px-3 py-1 bg-primary/5 text-primary border border-primary/10 font-mono text-[10px] font-bold shadow-xs"
                        >
                          {selectedType?.toUpperCase()} PROTOCOL
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8 pl-12">
                        {schema?.fields.map((field: any) => {
                          // Check dependency if any
                          if (field.dependency) {
                            const depValue = form.watch(`config.${field.dependency.field}`)
                            if (Array.isArray(field.dependency.value)) {
                              if (!field.dependency.value.includes(depValue)) return null
                            } else if (depValue !== field.dependency.value) return null
                          }

                          return (
                            <FormField
                              key={field.name}
                              control={form.control}
                              name={`config.${field.name}`}
                              render={({ field: f }) => (
                                <FormItem
                                  className={cn(
                                    'space-y-2',
                                    field.type === 'textarea' && 'col-span-full'
                                  )}
                                >
                                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1 flex items-center justify-between">
                                    {field.label}
                                    {field.required && (
                                      <span className="text-[8px] text-primary/60 bg-primary/5 px-1.5 rounded-sm border border-primary/10">
                                        REQUIRED
                                      </span>
                                    )}
                                  </Label>
                                  <FormControl>
                                    {field.type === 'select' ? (
                                      <Select
                                        onValueChange={(val) => {
                                          // Convert back to boolean/number if appropriate
                                          if (val === 'true') f.onChange(true)
                                          else if (val === 'false') f.onChange(false)
                                          else if (!isNaN(Number(val)) && val.trim() !== '')
                                            f.onChange(Number(val))
                                          else f.onChange(val)
                                        }}
                                        value={String(f.value ?? '')}
                                      >
                                        <SelectTrigger className="h-10 rounded-xl bg-background border-border/40 shadow-sm">
                                          <SelectValue placeholder="Select an option" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-border/40 backdrop-blur-xl bg-background/95">
                                          {field.options?.map((o: any) => (
                                            <SelectItem
                                              key={String(o.value)}
                                              value={String(o.value)}
                                              className="rounded-lg text-xs font-medium"
                                            >
                                              {o.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    ) : field.type === 'textarea' ? (
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-end">
                                          <input
                                            type="file"
                                            id={`upload-${field.name}`}
                                            className="hidden"
                                            onChange={async (e) => {
                                              const file = e.target.files?.[0]
                                              if (file) {
                                                const text = await file.text()
                                                f.onChange(text)
                                                toast.success('File Imported', {
                                                  description: `Successfully loaded ${file.name}`,
                                                })
                                              }
                                            }}
                                          />
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-2 text-[9px] font-bold gap-1.5 hover:bg-primary/10 hover:text-primary"
                                            onClick={() =>
                                              document
                                                .getElementById(`upload-${field.name}`)
                                                ?.click()
                                            }
                                          >
                                            <Plus className="h-3 w-3" /> Upload File
                                          </Button>
                                        </div>
                                        <div className="relative group min-h-[150px]">
                                          <CodeBlock
                                            code={typeof f.value === 'string' ? f.value : ''}
                                            language={
                                              field.language ||
                                              (field.name.includes('json') ? 'json' : 'text')
                                            }
                                            onChange={f.onChange}
                                            editable
                                            rounded
                                            maxHeight="300px"
                                            className="text-xs"
                                          />
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="relative">
                                        <Input
                                          {...f}
                                          value={f.value ?? ''}
                                          type={field.type}
                                          min={field.min}
                                          placeholder={field.placeholder}
                                          className={cn(
                                            field.type === 'password' && 'pl-10'
                                          )}
                                        />
                                        {field.type === 'password' && (
                                          <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground opacity-50" />
                                        )}
                                      </div>
                                    )}
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )
                        })}
                        {(!schema?.fields || schema.fields.length === 0) && (
                          <div className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest bg-muted/20 p-8 rounded-2xl border-2 border-dashed border-border/40 text-center">
                            No explicit credentials required
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="h-px w-full bg-border/20" />

                    {/* Staging Section (Warehouses only) */}
                    {(selectedType === 'snowflake' || selectedType === 'bigquery') && (
                      <div className="space-y-8">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 text-xs font-black border border-amber-500/20 shadow-sm">
                            3
                          </div>
                          <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-amber-600/80">
                            High Performance Staging
                          </h4>
                          <div className="h-px flex-1 bg-linear-to-r from-amber-500/20 to-transparent" />
                        </div>
                        <div className="grid gap-6 pl-12">
                          <FormField
                            control={form.control}
                            name="staging_connection_id"
                            render={({ field }) => (
                              <FormItem className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
                                  Staging Area Connection
                                </Label>
                                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 mb-4">
                                  <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium leading-relaxed">
                                    Enable "Stage & Load" for billion-row scale. Data will be
                                    buffered in {selectedType === 'snowflake' ? 'S3' : 'GCS'} before
                                    native ingestion.
                                  </p>
                                </div>
                                <Select
                                  onValueChange={(val) =>
                                    field.onChange(val === 'none' ? null : parseInt(val))
                                  }
                                  value={String(field.value ?? 'none')}
                                >
                                  <FormControl>
                                    <SelectTrigger className="h-11 rounded-2xl bg-background border-border/40 shadow-sm">
                                      <SelectValue placeholder="Select a staging connection" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="rounded-2xl border-border/40 backdrop-blur-xl bg-background/95">
                                    <SelectItem value="none" className="rounded-xl">
                                      No Staging (Direct Load)
                                    </SelectItem>
                                    {stagingConnections?.map((conn: any) => (
                                      <SelectItem
                                        key={conn.id}
                                        value={String(conn.id)}
                                        className="rounded-xl"
                                      >
                                        <div className="flex items-center gap-2">
                                          <Server size={14} className="text-muted-foreground" />
                                          <span>{conn.name}</span>
                                          <Badge variant="outline" className="text-[8px] h-4">
                                            {conn.connector_type}
                                          </Badge>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <DialogFooter className="p-10 border-t border-border/40 bg-muted/10 gap-4 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-2xl h-12 px-8 font-bold text-muted-foreground hover:bg-background"
                    onClick={() => (connectionToEdit ? onOpenChange(false) : setStep('type'))}
                  >
                    {connectionToEdit ? (
                      'Cancel'
                    ) : (
                      <>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Change Connector
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-2xl h-12 px-8 font-bold border-primary/20 hover:bg-primary/5 text-primary"
                    onClick={handleTestConnection}
                    disabled={testMutation.isPending}
                  >
                    {testMutation.isPending ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <Shield className="mr-2 h-5 w-5" />
                    )}
                    Test Connectivity
                  </Button>

                  <Button
                    type="submit"
                    className="rounded-2xl h-12 px-10 font-bold shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    disabled={mutation.isPending}
                  >
                    {mutation.isPending ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                    )}
                    {connectionToEdit ? 'Save Changes' : 'Initialize Connection'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Helper component for safe icons
const SafeIcon = ({ icon, className }: { icon: React.ReactNode; className?: string }) => {
  if (React.isValidElement(icon)) {
    return React.cloneElement(icon as React.ReactElement<any>, { className })
  }
  return <Server className={className} />
}
