/* eslint-disable react-hooks/incompatible-library */

import React, { useEffect, useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { Sliders, Shield, Zap, Share2, Workflow } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { type Node } from '@xyflow/react'
import { toast } from 'sonner'

import { getConnections, getConnection, getConnectionAssets, getPipelines } from '@/lib/api'
import { getNodeIcon, getOperatorDefinition, type OperatorField } from '@/lib/pipeline-definitions'
import { useWorkspace } from '@/hooks/useWorkspace'
import { truncateText } from '@/lib/utils'
import { type PipelineNodeData } from '@/types/pipeline'

// Sub-components
import { NodePropertiesHeader } from './node-properties/NodePropertiesHeader'
import { NodePropertiesFooter } from './node-properties/NodePropertiesFooter'
import { NodeSettingsTab } from './node-properties/NodeSettingsTab'
import { NodeContractTab } from './node-properties/NodeContractTab'
import { NodeSafetyTab } from './node-properties/NodeSafetyTab'
import { NodeLineageTab } from './node-properties/NodeLineageTab'
import { NodeAdvancedTab } from './node-properties/NodeAdvancedTab'
import { NodeDiffTab } from './node-properties/NodeDiffTab'

interface NodePropertiesProps {
  node: Node<PipelineNodeData> | null
  onClose: () => void
  onUpdate: (id: string, data: Partial<PipelineNodeData>) => void
  onDelete: (id: string) => void
  onDuplicate: (nodeId: string) => void
}

export const NodeProperties: React.FC<NodePropertiesProps> = ({
  node,
  onClose,
  onUpdate,
  onDelete,
  onDuplicate,
}) => {
  const { register, handleSubmit, watch, reset, control, setValue } = useForm<any>()
  const [activeTab, setActiveTab] = useState('settings')
  const [schemaMode, setSchemaMode] = useState<'visual' | 'manual'>('visual')
  const { isEditor, isAdmin } = useWorkspace()

  // Watchers
  const nodeType = (watch('operator_type') || '').toLowerCase()
  const operatorClass = watch('operator_class')
  const selectedConnectionId = watch('connection_id')

  // Get Definition
  const opDef = useMemo(() => getOperatorDefinition(operatorClass), [operatorClass])

  // Fetch Connections
  const { data: connections } = useQuery({
    queryKey: ['connections'],
    queryFn: getConnections,
  })

  // Fetch detailed connection for OSDU defaults
  const { data: connectionDetail } = useQuery({
    queryKey: ['connection-detail', selectedConnectionId],
    queryFn: () => getConnection(parseInt(selectedConnectionId)),
    enabled: !!selectedConnectionId && !isNaN(parseInt(selectedConnectionId)),
  })

  // Auto-fill OSDU defaults from connection
  useEffect(() => {
    if (connectionDetail?.connector_type === 'osdu' && connectionDetail.config) {
      const currentAcl = watch('osdu_acl')
      const currentLegal = watch('osdu_legal')

      // Only pre-fill if empty or default-placeholder
      if (!currentAcl || currentAcl === '{\n  "viewers": [],\n  "owners": []\n}') {
        const defaultAcl = connectionDetail.config.default_acl || connectionDetail.config.acl
        if (defaultAcl) setValue('osdu_acl', JSON.stringify(defaultAcl, null, 2))
      }

      if (
        !currentLegal ||
        currentLegal === '{\n  "legaltags": [],\n  "otherRelevantDataCountries": ["US"]\n}'
      ) {
        const defaultLegal = connectionDetail.config.default_legal || connectionDetail.config.legal
        if (defaultLegal) setValue('osdu_legal', JSON.stringify(defaultLegal, null, 2))
      }
    }
  }, [connectionDetail, setValue, watch])

  // Fetch Assets
  const { data: assets, isLoading: isLoadingAssets } = useQuery({
    queryKey: ['assets', selectedConnectionId],
    queryFn: () => getConnectionAssets(parseInt(selectedConnectionId)),
    enabled: !!selectedConnectionId && !isNaN(parseInt(selectedConnectionId)),
  })

  // Fetch Pipelines for Sub-pipeline selection
  const { data: pipelines, isLoading: isLoadingPipelines } = useQuery({
    queryKey: ['pipelines-list'],
    queryFn: getPipelines,
  })

  const filteredAssets = useMemo(() => {
    if (!assets) return []
    return assets.filter((a: any) => {
      if (nodeType === 'source') return a.is_source !== false
      if (nodeType === 'sink') return a.is_destination !== false
      return true
    })
  }, [assets, nodeType])

  useEffect(() => {
    if (node) {
      const config = node.data.config || {}
      const currentType = (node.data.type || node.data.operator_type || 'transform').toLowerCase()
      const currentOpClass = node.data.operator_class || 'pandas_transform'

      const mapping = node.data.column_mapping || {}
      const mappingArray = Object.entries(mapping).map(([target, source]) => ({
        source: String(source),
        target: String(target),
      }))

      const formValues: any = {
        label: node.data.label || '',
        description: node.data.description || '',
        operator_type: currentType,
        operator_class: currentOpClass,
        config: JSON.stringify(config, null, 2),
        column_mapping_obj: mappingArray,
        connection_id: node.data.connection_id ? String(node.data.connection_id) : '',
        asset_id:
          node.data.asset_id || node.data.source_asset_id || node.data.destination_asset_id
            ? String(
                node.data.asset_id || node.data.source_asset_id || node.data.destination_asset_id
              )
            : '',
        write_strategy: node.data.write_strategy || 'append',
        schema_evolution_policy: node.data.schema_evolution_policy || 'strict',
        sync_mode: node.data.sync_mode || 'full_load',
        cdc_slot_name: node.data.cdc_config?.slot_name || '',
        cdc_publication_name: node.data.cdc_config?.publication_name || 'synqx_pub',
        cdc_server_id: node.data.cdc_config?.server_id || 999,
        incremental: !!node.data.sync_mode && node.data.sync_mode === 'incremental',
        watermark_column: node.data.watermark_column || '',
        max_retries: node.data.max_retries ?? 3,
        retry_strategy: node.data.retry_strategy || 'fixed',
        retry_delay_seconds: node.data.retry_delay_seconds ?? 60,
        timeout_seconds: node.data.timeout_seconds ?? 3600,
        data_contract_json: node.data.data_contract
          ? JSON.stringify(node.data.data_contract, null, 2)
          : '',
        contract_rules: node.data.data_contract?.columns || [],
        quarantine_connection_id: node.data.quarantine_connection_id
          ? String(node.data.quarantine_connection_id)
          : '',
        quarantine_asset_id: node.data.quarantine_asset_id
          ? String(node.data.quarantine_asset_id)
          : '',
        schema_rules: config.schema || [],
        schema_json_manual: JSON.stringify(config.schema || [], null, 2),
        guardrails_list: node.data.guardrails || [],
        is_dynamic: !!node.data.is_dynamic,
        mapping_expr: node.data.mapping_expr || '',
        sub_pipeline_id: node.data.sub_pipeline_id ? String(node.data.sub_pipeline_id) : '',
        worker_tag: node.data.worker_tag || '',
        auto_create_schema: config.auto_create_schema === true,
        osdu_inference_strategy: config.osdu_inference_strategy || 'data_driven',
        osdu_acl: config.acl ? JSON.stringify(config.acl, null, 2) : '',
        osdu_legal: config.legal ? JSON.stringify(config.legal, null, 2) : '',
      }

      if (opDef?.fields) {
        opDef.fields.forEach((field) => {
          const val = config[field.configKey]
          if (field.type === 'json') {
            formValues[field.name] = val ? JSON.stringify(val, null, 2) : ''
          } else if (field.type === 'boolean') {
            formValues[field.name] = val === true
          } else if (Array.isArray(val)) {
            formValues[field.name] = val.join(', ')
          } else {
            formValues[field.name] = val !== undefined ? String(val) : ''
          }
        })
      }

      reset(formValues)
    }
  }, [node, reset, opDef])

  if (!node) return null

  const Icon = getNodeIcon(nodeType || 'transform')

  const onSubmit = (data: any) => {
    try {
      const baseConfig = data.config ? JSON.parse(data.config) : {}
      const dynamicConfig: any = {}

      if (opDef?.fields) {
        opDef.fields.forEach((field) => {
          const val = data[field.name]
          if (field.type === 'json') {
            try {
              if (typeof val === 'string' && val.trim())
                dynamicConfig[field.configKey] = JSON.parse(val)
              else if (typeof val === 'object') dynamicConfig[field.configKey] = val
            } catch (e) {
              console.error(e)
            }
          } else if (field.description?.toLowerCase().includes('comma separated')) {
            dynamicConfig[field.configKey] = val
              .split(',')
              .map((s: string) => s.trim())
              .filter(Boolean)
          } else if (field.type === 'number') {
            dynamicConfig[field.configKey] =
              val === '' || val === undefined ? undefined : Number(val)
          } else if (field.type === 'boolean') {
            dynamicConfig[field.configKey] = Boolean(val)
          } else {
            dynamicConfig[field.configKey] = val
          }
        })
      }

      const colMapping: any = {}
      if (data.column_mapping_obj) {
        data.column_mapping_obj.forEach((m: any) => {
          if (m.source && m.target) colMapping[m.target] = m.source
        })
      }

      const payload: Partial<PipelineNodeData> = {
        label: data.label,
        description: data.description,
        type: data.operator_type,
        operator_class: data.operator_class,
        config: {
          ...baseConfig,
          ...dynamicConfig,
          auto_create_schema: data.auto_create_schema,
          osdu_inference_strategy: data.osdu_inference_strategy,
          acl: data.osdu_acl ? JSON.parse(data.osdu_acl) : undefined,
          legal: data.osdu_legal ? JSON.parse(data.osdu_legal) : undefined,
        },
        connection_id: data.connection_id ? parseInt(data.connection_id) : undefined,
        asset_id: data.asset_id ? parseInt(data.asset_id) : undefined,
        write_strategy: data.write_strategy,
        schema_evolution_policy: data.schema_evolution_policy,
        sync_mode: data.sync_mode,
        column_mapping: colMapping,
        is_dynamic: data.is_dynamic,
        mapping_expr: data.mapping_expr,
        sub_pipeline_id: data.sub_pipeline_id ? parseInt(data.sub_pipeline_id) : undefined,
        worker_tag: data.worker_tag,
        max_retries: data.max_retries,
        retry_strategy: data.retry_strategy,
        retry_delay_seconds: data.retry_delay_seconds,
        timeout_seconds: data.timeout_seconds,
      }

      if (data.operator_type === 'source') payload.source_asset_id = payload.asset_id
      if (data.operator_type === 'sink') payload.destination_asset_id = payload.asset_id

      onUpdate(node.id, payload)
      toast.success('Configuration saved')
    } catch (e: any) {
      toast.error('Invalid configuration schema', {
        description: truncateText(e.message || 'Please check your JSON syntax.'),
      })
    }
  }

  return (
    <div className="h-full flex flex-col bg-background/40 backdrop-blur-xl border-l border-border/40 animate-in slide-in-from-right duration-300">
      <NodePropertiesHeader nodeId={node.id} nodeType={nodeType} icon={Icon} onClose={onClose} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="px-6 pt-4 shrink-0">
          <TabsList className="w-full grid grid-cols-5 h-10 p-1 bg-muted/30 rounded-xl">
            <TabsTrigger
              value="settings"
              className="gap-1.5 text-[9px] font-bold uppercase tracking-tighter transition-all px-0"
            >
              <Sliders size={11} /> Config
            </TabsTrigger>
            <TabsTrigger
              value="contract"
              className="gap-1.5 text-[9px] font-bold uppercase tracking-tighter transition-all px-0"
            >
              <Shield size={11} /> Contract
            </TabsTrigger>
            <TabsTrigger
              value="guardrails"
              className="gap-1.5 text-[9px] font-bold uppercase tracking-tighter transition-all px-0 data-[state=active]:text-amber-500"
            >
              <Zap size={11} /> Safety
            </TabsTrigger>
            <TabsTrigger
              value="lineage"
              className="gap-1.5 text-[9px] font-bold uppercase tracking-tighter transition-all px-0"
            >
              <Share2 size={11} /> Lineage
            </TabsTrigger>
            <TabsTrigger
              value="advanced"
              className="gap-1.5 text-[9px] font-bold uppercase tracking-tighter transition-all px-0"
            >
              <Workflow size={11} /> Advanced
            </TabsTrigger>
          </TabsList>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1">
            <TabsContent value="settings" className="m-0 focus-visible:outline-none p-6">
              <NodeSettingsTab
                register={register}
                control={control}
                watch={watch}
                setValue={setValue}
                isEditor={isEditor}
                nodeType={nodeType}
                operatorClass={operatorClass}
                connections={connections || []}
                assets={assets || []}
                isLoadingAssets={isLoadingAssets}
                filteredAssets={filteredAssets}
                selectedConnectionId={selectedConnectionId}
                opDef={opDef}
                renderField={() => null} // Handled via opDef loop if needed, or inline
              />
            </TabsContent>

            <TabsContent value="contract" className="m-0 focus-visible:outline-none">
              <NodeContractTab
                watch={watch}
                setValue={setValue}
                isEditor={isEditor}
                schemaMode={schemaMode}
                setSchemaMode={setSchemaMode}
                connections={connections || []}
                filteredAssets={filteredAssets}
                control={control}
              />
            </TabsContent>

            <TabsContent value="guardrails" className="m-0 focus-visible:outline-none">
              <NodeSafetyTab watch={watch} setValue={setValue} />
            </TabsContent>

            <TabsContent value="lineage" className="m-0 focus-visible:outline-none">
              <NodeLineageTab
                nodeType={nodeType}
                assetId={watch('asset_id')}
                watch={watch}
                setValue={setValue}
              />
            </TabsContent>

            <TabsContent value="advanced" className="m-0 focus-visible:outline-none">
              <NodeAdvancedTab
                watch={watch}
                setValue={setValue}
                register={register}
                isEditor={isEditor}
                isLoadingPipelines={isLoadingPipelines}
                pipelines={pipelines || []}
                control={control}
              />
            </TabsContent>
          </ScrollArea>

          <NodePropertiesFooter
            isEditor={isEditor}
            isAdmin={isAdmin}
            onDuplicate={() => onDuplicate(node.id)}
            onDelete={() => onDelete(node.id)}
            onClose={onClose}
          />
        </form>
      </Tabs>
    </div>
  )
}
