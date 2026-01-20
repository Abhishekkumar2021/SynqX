import React, { useState, useRef, useMemo, useEffect } from 'react'
import Editor, { useMonaco } from '@monaco-editor/react'
import {
  Play,
  Table as TableIcon,
  Loader2,
  Clock,
  AlignLeft,
  X,
  Plus,
  TextSelect,
  SquareTerminal,
} from 'lucide-react'
import { format } from 'sql-formatter'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import { getConnectionSchemaMetadata } from '@/lib/api'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Button } from '@/components/ui/button'
import { SchemaBrowser } from '@/components/features/explorer/SchemaBrowser'
import { ResultsGrid } from '@/components/features/explorer/ResultsGrid'
import { type QueryTab, type ResultItem } from '@/components/features/explorer/types'
import { cn } from '@/lib/utils'
import { executeQuery, getEphemeralJob } from '@/lib/api/ephemeral'
import { useTheme } from '@/hooks/useTheme'
import { useWorkspace } from '@/hooks/useWorkspace'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface SQLExplorerProps {
  connectionId: number
  onHistoryToggle: () => void
  onRefetchHistory: () => void
  schemaMetadata?: any
}

export const SQLExplorer: React.FC<SQLExplorerProps> = ({
  connectionId,
  onHistoryToggle,
  onRefetchHistory,
}) => {
  const { theme } = useTheme()
  useWorkspace()
  const monaco = useMonaco()
  const editorRef = useRef<any>(null)

  const [isExecuting, setIsExecuting] = useState(false)
  const [executionMessage, setExecutionMessage] = useState<string | null>(null)
  const [queryLimit, setQueryLimit] = useState(100)
  const [tabs, setTabs] = useState<QueryTab[]>([
    {
      id: '1',
      title: 'query_main.sql',
      query: 'SELECT * FROM tables LIMIT 10;',
      language: 'sql',
      results: [],
      activeResultId: undefined,
    },
  ])
  const [activeTabId, setActiveTabId] = useState('1')
  const [isMaximized, setIsMaximized] = useState(false)
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())

  // Fetch schema metadata for autocomplete
  const { data: schemaMetadata } = useQuery({
    queryKey: ['schema-metadata', connectionId],
    queryFn: () => getConnectionSchemaMetadata(connectionId!),
    enabled: !!connectionId,
  })

  // Register Autocomplete Provider
  useEffect(() => {
    if (!monaco || !schemaMetadata?.metadata) return

    const completionProvider = monaco.languages.registerCompletionItemProvider('sql', {
      triggerCharacters: ['.', ' '],
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position)
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        }

        const lineContent = model.getLineContent(position.lineNumber)
        const textBeforeCursor = lineContent.substring(0, position.column - 1)
        const tableDotMatch = textBeforeCursor.match(/([a-zA-Z0-9_]+)\.$/)

        if (tableDotMatch) {
          const tableName = tableDotMatch[1]
          const tableColumns = schemaMetadata.metadata[tableName]

          if (tableColumns) {
            return {
              suggestions: tableColumns.map((col: string) => ({
                label: col,
                kind: monaco.languages.CompletionItemKind.Field,
                insertText: col,
                detail: `Column from ${tableName}`,
                range: range,
              })),
            }
          }
        }

        const suggestions: any[] = []

        // Add Tables
        Object.keys(schemaMetadata.metadata).forEach((table) => {
          suggestions.push({
            label: table,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: table,
            detail: 'Table',
            range: range,
          })
        })

        // Add Columns (global list)
        Object.values(schemaMetadata.metadata).forEach((columns: any) => {
          columns.forEach((col: string) => {
            suggestions.push({
              label: col,
              kind: monaco.languages.CompletionItemKind.Field,
              insertText: col,
              detail: 'Column',
              range: range,
            })
          })
        })

        // Filter duplicates
        const uniqueSuggestions = suggestions.filter(
          (v, i, a) => a.findIndex((t) => t.label === v.label && t.detail === v.detail) === i
        )

        return { suggestions: uniqueSuggestions }
      },
    })

    return () => completionProvider.dispose()
  }, [monaco, schemaMetadata, connectionId])

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) || tabs[0],
    [tabs, activeTabId]
  )
  const activeResult = useMemo(() => {
    if (!activeTab.results || activeTab.results.length === 0) return null
    return (
      activeTab.results.find((r) => r.id === activeTab.activeResultId) ||
      activeTab.results[activeTab.results.length - 1]
    )
  }, [activeTab])

  const handlePaginationChange = async (updater: any) => {
    if (!activeResult) return

    const currentPagination = activeResult.pagination || { pageIndex: 0, pageSize: queryLimit }
    const newPagination = typeof updater === 'function' ? updater(currentPagination) : updater

    // Update state with new pagination (optimistic/loading)
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id === activeTabId) {
          return {
            ...t,
            results: t.results.map((r) =>
              r.id === activeResult.id ? { ...r, pagination: newPagination } : r
            ),
          }
        }
        return t
      })
    )

    // Execute fetch
    setIsExecuting(true)
    setExecutionMessage(`Fetching page ${newPagination.pageIndex + 1}...`)

    try {
      const job = await executeQuery(connectionId, {
        query: activeResult.statement,
        limit: newPagination.pageSize,
        offset: newPagination.pageIndex * newPagination.pageSize,
      })

      // Poll if async
      let finalJob = job
      if (job.status === 'queued' || job.status === 'running') {
        finalJob = await pollJob(job.id)
      }

      // Update result data
      setTabs((prev) =>
        prev.map((t) => {
          if (t.id === activeTabId) {
            return {
              ...t,
              results: t.results.map((r) =>
                r.id === activeResult.id
                  ? {
                      ...r,
                      data: {
                        results: finalJob.result_sample?.rows || [],
                        columns: finalJob.result_summary?.columns || [],
                        count: finalJob.result_summary?.count || 0,
                        total_count: finalJob.result_summary?.total_count || r.data.total_count, // Preserve total if not returned
                      },
                      duration: finalJob.execution_time_ms || 0,
                      pagination: newPagination,
                    }
                  : r
              ),
            }
          }
          return t
        })
      )
    } catch (err: any) {
      toast.error('Pagination Failed', { description: err.message })
    } finally {
      setIsExecuting(false)
      setExecutionMessage(null)
    }
  }

  const pollJob = async (jobId: number): Promise<any> => {
    for (let i = 0; i < 60; i++) {
      const job = await getEphemeralJob(jobId)
      if (job.status === 'success') return job
      if (job.status === 'failed') throw new Error(job.error_message || 'Execution failed')

      if (job.status === 'queued') setExecutionMessage(`Queued for Agent...`)
      if (job.status === 'running') setExecutionMessage(`Executing on Agent...`)

      await new Promise((r) => setTimeout(r, 1000))
    }
    throw new Error('Timed out')
  }

  const splitSql = (sql: string): string[] => {
    const statements: string[] = []
    let buffer = ''
    let inSingleQuote = false
    let inDoubleQuote = false
    let inBlockComment = false
    let inLineComment = false

    for (let i = 0; i < sql.length; i++) {
      const char = sql[i]
      const nextChar = sql[i + 1]

      if (inSingleQuote) {
        buffer += char
        if (char === "'" && sql[i - 1] !== '\\') inSingleQuote = false
        continue
      }
      if (inDoubleQuote) {
        buffer += char
        if (char === '"' && sql[i - 1] !== '\\') inDoubleQuote = false
        continue
      }
      if (inBlockComment) {
        buffer += char
        if (char === '*' && nextChar === '/') {
          inBlockComment = false
          buffer += '/'
          i++
        }
        continue
      }
      if (inLineComment) {
        buffer += char
        if (char === '\n') inLineComment = false
        continue
      }
      if (char === "'") {
        inSingleQuote = true
        buffer += char
        continue
      }
      if (char === '"') {
        inDoubleQuote = true
        buffer += char
        continue
      }
      if (char === '/' && nextChar === '*') {
        inBlockComment = true
        buffer += '/*'
        i++
        continue
      }
      if (char === '/' && nextChar === '/') {
        inLineComment = true
        buffer += '//'
        i++
        continue
      }
      if (char === '-' && nextChar === '-') {
        inLineComment = true
        buffer += '--'
        i++
        continue
      }
      if (char === ';') {
        if (buffer.trim()) {
          statements.push(buffer.trim())
        }
        buffer = ''
        continue
      }
      buffer += char
    }
    if (buffer.trim()) {
      statements.push(buffer.trim())
    }
    return statements
  }

  const getStatementAtCursor = () => {
    if (!editorRef.current) return ''
    const model = editorRef.current.getModel()
    const position = editorRef.current.getPosition()
    const text = model.getValue()
    const offset = model.getOffsetAt(position)

    const before = text.lastIndexOf(';', offset - 1)
    const after = text.indexOf(';', offset)
    const start = before === -1 ? 0 : before + 1
    const end = after === -1 ? text.length : after

    return text.substring(start, end).trim()
  }

  const runQuery = async (mode: 'all' | 'selection' | 'cursor' = 'all', queryOverride?: string) => {
    if (isExecuting || !editorRef.current) return

    let sqlToRun = ''
    const selection = editorRef.current.getSelection()
    const model = editorRef.current.getModel()

    if (queryOverride) {
      sqlToRun = queryOverride
    } else if (mode === 'selection' && selection) {
      sqlToRun = model.getValueInRange(selection)
    } else if (mode === 'cursor') {
      sqlToRun = getStatementAtCursor()
    } else {
      sqlToRun = activeTab.query
    }

    if (!sqlToRun.trim()) {
      toast.warning('No query to execute')
      return
    }

    const statements = splitSql(sqlToRun)
    if (statements.length === 0) return

    setIsExecuting(true)
    setExecutionMessage('Initializing...')

    for (const stmt of statements) {
      try {
        let job = await executeQuery(connectionId, { query: stmt, limit: queryLimit })
        if (job.status === 'queued' || job.status === 'running') {
          job = await pollJob(job.id)
        }

        const resultId = Math.random().toString(36).substr(2, 9)
        const newResult: ResultItem = {
          id: resultId,
          timestamp: Date.now(),
          statement: stmt,
          data: {
            results: job.result_sample?.rows || [],
            columns: job.result_summary?.columns || [],
            count: job.result_summary?.count || 0,
            total_count: job.result_summary?.total_count,
          },
          duration: job.execution_time_ms || 0,
          pagination: { pageIndex: 0, pageSize: queryLimit },
        }

        setTabs((prev) =>
          prev.map((t) => {
            if (t.id === activeTabId) {
              return {
                ...t,
                results: [...t.results, newResult],
                activeResultId: resultId,
              }
            }
            return t
          })
        )
        onRefetchHistory()
      } catch (err: any) {
        toast.error('Execution Failed', { description: err.message })
        break // Stop on error
      }
    }

    setIsExecuting(false)
    setExecutionMessage(null)
  }

  const formatSql = () => {
    try {
      const formatted = format(activeTab.query, { language: 'postgresql' })
      setTabs((prev) => prev.map((t) => (t.id === activeTabId ? { ...t, query: formatted } : t)))
    } catch (e) {
      console.error(e)
    }
  }

  // Keyboard Shortcuts
  const runQueryRef = useRef(runQuery)
  useEffect(() => {
    runQueryRef.current = runQuery
  }, [runQuery])

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      const sel = editor.getSelection()
      if (sel && !sel.isEmpty()) runQueryRef.current('selection')
      else runQueryRef.current('cursor')
    })
  }

  return (
    <TooltipProvider>
      <ResizablePanelGroup direction="horizontal" className="h-full">
        <ResizablePanel
          defaultSize={20}
          minSize={15}
          className="bg-muted/5 border-r border-border/40"
        >
          <SchemaBrowser
            connectionId={connectionId}
            onAction={(type, sql) => {
              if (type === 'insert' && editorRef.current) {
                const editor = editorRef.current
                const position = editor.getPosition()
                editor.executeEdits('schema', [
                  {
                    range: new monaco!.Range(
                      position.lineNumber,
                      position.column,
                      position.lineNumber,
                      position.column
                    ),
                    text: sql,
                    forceMoveMarkers: true,
                  },
                ])
              } else if (type === 'run') {
                runQueryRef.current('all', sql)
              }
            }}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={80}>
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel
              defaultSize={50}
              minSize={20}
              className="flex flex-col relative overflow-hidden bg-background"
            >
              <div className="h-10 flex items-center gap-1 px-2 border-b border-border/40 bg-muted/10 shrink-0 overflow-x-auto">
                {tabs.map((tab) => (
                  <div
                    key={tab.id}
                    onClick={() => setActiveTabId(tab.id)}
                    className={cn(
                      'group flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all shrink-0 whitespace-nowrap',
                      activeTabId === tab.id
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted/40'
                    )}
                  >
                    <TableIcon size={12} /> {tab.title}
                    {tabs.length > 1 && (
                      <X
                        size={10}
                        className="opacity-0 group-hover:opacity-50 hover:text-destructive transition-all"
                        onClick={(e) => {
                          e.stopPropagation()
                          setTabs((prev) => prev.filter((t) => t.id !== tab.id))
                          if (activeTabId === tab.id) setActiveTabId(tabs[0].id)
                        }}
                      />
                    )}
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg shrink-0"
                  onClick={() => {
                    const id = Math.random().toString(36).substr(2, 9)
                    setTabs((p) => [
                      ...p,
                      {
                        id,
                        title: `query_${p.length}.sql`,
                        query: '',
                        language: 'sql',
                        results: [],
                      },
                    ])
                    setActiveTabId(id)
                  }}
                >
                  <Plus size={14} />
                </Button>
              </div>
              <div className="flex-1">
                <Editor
                  onMount={handleEditorDidMount}
                  height="100%"
                  language="sql"
                  value={activeTab.query}
                  theme={theme === 'dark' ? 'vs-dark' : 'light'}
                  onChange={(v) =>
                    setTabs((prev) =>
                      prev.map((t) => (t.id === activeTabId ? { ...t, query: v || '' } : t))
                    )
                  }
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    automaticLayout: true,
                    fontFamily: '"Geist Mono Variable", Menlo, monospace',
                  }}
                />
              </div>
              <div className="h-12 border-t border-border/40 flex items-center justify-between px-4 bg-muted/5 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-background/50 rounded-xl p-0.5 border border-border/40 shadow-sm mr-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => runQuery('all')}
                          disabled={isExecuting}
                          className="h-7 px-3 gap-2 font-bold text-[10px] uppercase tracking-wider rounded-lg"
                        >
                          {isExecuting ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Play size={12} fill="currentColor" />
                          )}{' '}
                          Run
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Run All (Cmd+Enter)</TooltipContent>
                    </Tooltip>
                    <div className="w-px h-4 bg-border/40 mx-1" />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => runQuery('selection')}
                          disabled={isExecuting}
                          className="h-7 w-7 rounded-lg"
                        >
                          <TextSelect size={14} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Run Selection</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => runQuery('cursor')}
                          disabled={isExecuting}
                          className="h-7 w-7 rounded-lg"
                        >
                          <SquareTerminal size={14} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Run Statement at Cursor</TooltipContent>
                    </Tooltip>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-tighter text-muted-foreground/60">
                      Limit
                    </span>
                    <Select
                      value={String(queryLimit)}
                      onValueChange={(v) => setQueryLimit(Number(v))}
                    >
                      <SelectTrigger className="h-7 w-20 text-[10px] font-bold rounded-lg bg-background/50 border-border/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[100, 500, 1000, 5000].map((l) => (
                          <SelectItem key={l} value={String(l)} className="text-[10px] font-bold">
                            {l}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={formatSql}
                        className="h-8 w-8 rounded-xl"
                      >
                        <AlignLeft size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Format SQL</TooltipContent>
                  </Tooltip>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onHistoryToggle}
                      className="h-8 w-8 rounded-xl"
                    >
                      <Clock size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Execution History</TooltipContent>
                </Tooltip>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel
              defaultSize={50}
              minSize={10}
              className="flex flex-col overflow-hidden bg-card/5"
            >
              <div className="flex-1 relative flex flex-col min-h-0 overflow-hidden">
                <ResultsGrid
                  data={activeResult ? activeResult.data : null}
                  isLoading={isExecuting}
                  isMaximized={isMaximized}
                  onToggleMaximize={() => setIsMaximized(!isMaximized)}
                  variant="embedded"
                  noBorder
                  noBackground
                  selectedRows={selectedRows}
                  onSelectRows={setSelectedRows}
                  manualPagination
                  pageCount={
                    activeResult?.data.total_count
                      ? Math.ceil(
                          activeResult.data.total_count /
                            (activeResult.pagination?.pageSize || queryLimit)
                        )
                      : -1
                  }
                  pagination={activeResult?.pagination || { pageIndex: 0, pageSize: queryLimit }}
                  onPaginationChange={handlePaginationChange}
                  title={null}
                  tabs={
                    <>
                      {activeTab.results.map((res, idx) => (
                        <div
                          key={res.id}
                          onClick={() =>
                            setTabs((prev) =>
                              prev.map((t) =>
                                t.id === activeTabId ? { ...t, activeResultId: res.id } : t
                              )
                            )
                          }
                          className={cn(
                            'group flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-bold cursor-pointer transition-all whitespace-nowrap border shrink-0',
                            activeTab.activeResultId === res.id
                              ? 'bg-primary/10 text-primary border-primary/20 shadow-sm'
                              : 'text-muted-foreground hover:bg-muted/40 border-transparent'
                          )}
                        >
                          Result #{idx + 1}
                          <X
                            size={10}
                            className="opacity-0 group-hover:opacity-50 hover:text-destructive transition-all"
                            onClick={(e) => {
                              e.stopPropagation()
                              setTabs((prev) =>
                                prev.map((t) => {
                                  if (t.id === activeTabId) {
                                    const newResults = t.results.filter((r) => r.id !== res.id)
                                    return {
                                      ...t,
                                      results: newResults,
                                      activeResultId: newResults[newResults.length - 1]?.id,
                                    }
                                  }
                                  return t
                                })
                              )
                            }}
                          />
                        </div>
                      ))}
                      {activeTab.results.length === 0 && !isExecuting && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-40 px-2">
                          No Results
                        </span>
                      )}
                    </>
                  }
                  description={isExecuting ? executionMessage || 'Running...' : undefined}
                />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </TooltipProvider>
  )
}
