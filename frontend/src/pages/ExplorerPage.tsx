/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getConnections, executeRawQuery, getConnectionSchemaMetadata, getHistory, clearHistory } from '@/lib/api';
import { PageMeta } from '@/components/common/PageMeta';
import { Button } from '@/components/ui/button';
import {
    Play, AlertTriangle,
    Table as TableIcon, Loader2, Maximize2, Minimize2,
    Clock, Plus, X, AlignLeft, TextSelect, SquareTerminal,
    Trash2,
    Database
} from 'lucide-react';
import { toast } from 'sonner';
import Editor, { useMonaco } from '@monaco-editor/react';
import { AnimatePresence, motion } from 'framer-motion';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { format } from 'sql-formatter';

// Feature Components
import { SchemaBrowser } from '@/components/features/explorer/SchemaBrowser';
import { ResultsGrid } from '@/components/features/explorer/ResultsGrid';
import { ExecutionHistory } from '@/components/features/explorer/ExecutionHistory';
import { type QueryTab, type HistoryItem, type ResultItem, SUPPORTED_EXPLORER_TYPES } from '@/components/features/explorer/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

const MaximizePortal = ({ children }: { children: React.ReactNode }) => {
    return createPortal(
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-9999 bg-background flex flex-col isolate"
        >
            <div className="flex-1 overflow-hidden relative rounded-none border-0 shadow-none bg-background flex flex-col">
                {children}
            </div>
        </motion.div>,
        document.body
    );
};

export const ExplorerPage: React.FC = () => {
    const { theme } = useTheme();
    const monaco = useMonaco();
    const editorRef = useRef<any>(null);

    // --- State ---
    const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('synqx-explorer-last-connection');
        }
        return null;
    });
    const [maximizedView, setMaximizedView] = useState<'none' | 'editor' | 'results'>('none');
    const [showHistory, setShowHistory] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);

    // History Persistence (Backend)
    const { data: historyData, refetch: refetchHistory } = useQuery({
        queryKey: ['execution-history'],
        queryFn: () => getHistory(100),
        refetchOnWindowFocus: false
    });

    const clearHistoryMutation = useMutation({
        mutationFn: clearHistory,
        onSuccess: () => {
            toast.success("History Cleared");
            refetchHistory();
        }
    });

    const history: HistoryItem[] = useMemo(() => {
        if (!historyData) return [];
        return historyData.map(h => ({
            id: h.id,
            query: h.query,
            timestamp: h.created_at,
            connectionName: h.connection_name,
            duration: h.execution_time_ms,
            rowCount: h.row_count || 0,
            status: h.status
        }));
    }, [historyData]);

    const [tabs, setTabs] = useState<QueryTab[]>([{
        id: '1',
        title: 'query_main.sql',
        query: '-- SQL Command Center\nSELECT * FROM tables LIMIT 10;',
        language: 'sql',
        results: [],
        activeResultId: undefined
    }]);
    const [activeTabId, setActiveTabId] = useState('1');
    const activeTab = useMemo(() => tabs.find(t => t.id === activeTabId) || tabs[0], [tabs, activeTabId]);

    const activeResult = useMemo(() => {
        if (!activeTab.results || activeTab.results.length === 0) return null;
        return activeTab.results.find(r => r.id === activeTab.activeResultId) || activeTab.results[0];
    }, [activeTab]);

    // --- Data Fetching ---
    const { data: connections } = useQuery({ queryKey: ['connections'], queryFn: getConnections });

    const currentConnection = useMemo(() =>
        connections?.find(c => c.id.toString() === selectedConnectionId),
        [connections, selectedConnectionId]);

    const isSupported = useMemo(() => {
        if (!currentConnection) return true;
        return SUPPORTED_EXPLORER_TYPES.includes(currentConnection.connector_type.toLowerCase());
    }, [currentConnection]);

    const { data: schemaMetadata } = useQuery({
        queryKey: ['schema-metadata', selectedConnectionId],
        queryFn: () => getConnectionSchemaMetadata(parseInt(selectedConnectionId!)),
        enabled: !!selectedConnectionId && isSupported
    });

    // --- Handlers ---
    const addTab = () => {
        const newId = Math.random().toString(36).substring(7);
        setTabs(prev => [...prev, {
            id: newId,
            title: `query_${prev.length + 1}.sql`,
            query: '',
            language: 'sql',
            results: [],
            activeResultId: undefined
        }]);
        setActiveTabId(newId);
    };

    const closeTab = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (tabs.length === 1) return;
        const newTabs = tabs.filter(t => t.id !== id);
        setTabs(newTabs);
        if (activeTabId === id) setActiveTabId(newTabs[0].id);
    };

    // Helper: Split SQL
    const splitSql = (sql: string): string[] => {
        const statements: string[] = [];
        let buffer = '';
        let inSingleQuote = false;
        let inDoubleQuote = false;
        let inBlockComment = false;
        let inLineComment = false;

        for (let i = 0; i < sql.length; i++) {
            const char = sql[i];
            const nextChar = sql[i + 1];

            if (inSingleQuote) {
                buffer += char;
                if (char === "'" && sql[i - 1] !== '\\') inSingleQuote = false;
                continue;
            }
            if (inDoubleQuote) {
                buffer += char;
                if (char === '"' && sql[i - 1] !== '\\') inDoubleQuote = false;
                continue;
            }
            if (inBlockComment) {
                buffer += char;
                if (char === '*' && nextChar === '/') {
                    inBlockComment = false;
                    buffer += '/';
                    i++;
                }
                continue;
            }
            if (inLineComment) {
                buffer += char;
                if (char === '\n') inLineComment = false;
                continue;
            }
            if (char === "'") {
                inSingleQuote = true;
                buffer += char;
                continue;
            }
            if (char === '"') {
                inDoubleQuote = true;
                buffer += char;
                continue;
            }
            if (char === '/' && nextChar === '*') {
                inBlockComment = true;
                buffer += '/*';
                i++;
                continue;
            }
            if (char === '-' && nextChar === '-') {
                inLineComment = true;
                buffer += '--';
                i++;
                continue;
            }
            if (char === ';') {
                if (buffer.trim()) {
                    statements.push(buffer.trim());
                }
                buffer = '';
                continue;
            }
            buffer += char;
        }
        if (buffer.trim()) {
            statements.push(buffer.trim());
        }
        return statements;
    };

    const getStatementAtCursor = () => {
        if (!editorRef.current) return '';
        const model = editorRef.current.getModel();
        const position = editorRef.current.getPosition();
        const text = model.getValue();
        const offset = model.getOffsetAt(position);

        const before = text.lastIndexOf(';', offset - 1);
        const after = text.indexOf(';', offset);
        const start = before === -1 ? 0 : before + 1;
        const end = after === -1 ? text.length : after;

        return text.substring(start, end).trim();
    };

    const runQuery = async (mode: 'all' | 'selection' | 'cursor') => {
        if (!selectedConnectionId) {
            toast.error("Please select a data source first");
            return;
        }
        if (!editorRef.current) return;
        if (isExecuting) return;

        let sqlToRun = '';
        const selection = editorRef.current.getSelection();
        const model = editorRef.current.getModel();

        if (mode === 'selection') {
            sqlToRun = model.getValueInRange(selection);
            if (!sqlToRun.trim()) {
                toast.warning("No text selected");
                return;
            }
        } else if (mode === 'cursor') {
            sqlToRun = getStatementAtCursor();
            if (!sqlToRun) {
                toast.warning("No statement found at cursor");
                return;
            }
        } else {
            sqlToRun = activeTab.query;
        }

        const statements = splitSql(sqlToRun);
        if (statements.length === 0) return;

        setIsExecuting(true);

        for (const stmt of statements) {
            try {
                const start = performance.now();
                const data = await executeRawQuery(parseInt(selectedConnectionId), stmt);
                const duration = Math.round(performance.now() - start);

                const resultId = Math.random().toString(36).substr(2, 9);
                const newResult: ResultItem = {
                    id: resultId,
                    timestamp: Date.now(),
                    statement: stmt,
                    data,
                    duration
                };

                setTabs(prev => prev.map(t => {
                    if (t.id === activeTabId) {
                        return {
                            ...t,
                            results: [...t.results, newResult],
                            activeResultId: resultId
                        };
                    }
                    return t;
                }));
                refetchHistory();
            } catch (err: any) {
                toast.error("Query Failed", { description: `Statement: ${stmt.substring(0, 30)}...\nError: ${err.message}` });
                break;
            }
        }
        setIsExecuting(false);
        toast.success("Execution Batch Complete");
    };

    const handleSchemaAction = (type: 'run' | 'insert', sql: string) => {
        if (!editorRef.current) return;

        if (type === 'insert') {
            const editor = editorRef.current;
            const position = editor.getPosition();
            editor.executeEdits('schema-browser', [{
                range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                text: sql,
                forceMoveMarkers: true
            }]);
            editor.focus();
        } else if (type === 'run') {
            setIsExecuting(true);
            executeRawQuery(parseInt(selectedConnectionId!), sql)
                .then(data => {
                    const resultId = Math.random().toString(36).substr(2, 9);
                    const newResult: ResultItem = {
                        id: resultId,
                        timestamp: Date.now(),
                        statement: sql,
                        data,
                        duration: 0
                    };
                    setTabs(prev => prev.map(t => t.id === activeTabId ? {
                        ...t, results: [...t.results, newResult], activeResultId: resultId
                    } : t));
                    toast.success("Quick Query Executed");
                })
                .catch(err => toast.error("Quick Query Failed", { description: err.message }))
                .finally(() => setIsExecuting(false));
        }
    };

    const formatSql = () => {
        try {
            const formatted = format(activeTab.query, { language: 'postgresql', keywordCase: 'upper' });
            setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, query: formatted } : t));
            toast.success("SQL Formatted");
        } catch (e) {
            toast.error("Formatting failed", { description: "Ensure your SQL syntax is correct." });
        }
    };

    const runQueryRef = useRef(runQuery);
    useEffect(() => {
        runQueryRef.current = runQuery;
    });

    const handleEditorDidMount = (editor: any, monaco: any) => {
        editorRef.current = editor;
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            const sel = editor.getSelection();
            if (sel && !sel.isEmpty()) runQueryRef.current('selection');
            else runQueryRef.current('cursor');
        });
        editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF, () => {
            formatSql();
        });
    };

    useEffect(() => {
        if (!monaco || !schemaMetadata || !isSupported) return;
        const provider = monaco.languages.registerCompletionItemProvider('sql', {
            provideCompletionItems: (model: any, position: any) => {
                const word = model.getWordUntilPosition(position);
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn,
                };
                const suggestions: any[] = [];
                Object.keys(schemaMetadata.metadata).forEach((table) => {
                    suggestions.push({
                        label: table,
                        kind: monaco.languages.CompletionItemKind.Class,
                        insertText: table,
                        detail: 'Table',
                        range,
                    });
                    schemaMetadata.metadata[table].forEach((column: string) => {
                        suggestions.push({
                            label: column,
                            kind: monaco.languages.CompletionItemKind.Field,
                            insertText: column,
                            detail: `Column (${table})`,
                            range,
                        });
                    });
                });
                return { suggestions };
            },
        });
        return () => provider.dispose();
    }, [monaco, schemaMetadata, isSupported]);


    const renderEditor = () => (
        <div className="h-full flex flex-col bg-background relative isolate">
            <div className="h-10 flex items-center gap-1 px-2 bg-muted/20 border-b border-border/40 overflow-x-auto no-scrollbar shrink-0">
                {tabs.map(tab => (
                    <Tooltip key={tab.id}>
                        <TooltipTrigger asChild>
                            <div
                                onClick={() => setActiveTabId(tab.id)}
                                className={cn(
                                    "group flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap shrink-0 cursor-pointer",
                                    activeTabId === tab.id
                                        ? "bg-primary/10 text-primary shadow-sm"
                                        : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                                )}
                            >
                                <TableIcon size={12} className={activeTabId === tab.id ? "text-primary" : "opacity-40"} />
                                <span className="truncate max-w-[120px]">{tab.title}</span>
                                <button
                                    onClick={(e) => closeTab(tab.id, e)}
                                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-destructive/10 hover:text-destructive rounded-md transition-all ml-1"
                                >
                                    <X size={10} />
                                </button>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>File: {tab.title}</TooltipContent>
                    </Tooltip>
                ))}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg shrink-0" onClick={addTab}>
                            <Plus size={14} />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>New Query File</TooltipContent>
                </Tooltip>
            </div>

            <div className="h-12 border-b border-border/40 flex items-center justify-between px-4 bg-muted/5 shrink-0 gap-4">
                <div className="flex items-center gap-2">
                    <Select value={selectedConnectionId || ''} onValueChange={(val) => { setSelectedConnectionId(val); localStorage.setItem('synqx-explorer-last-connection', val); }}>
                        <SelectTrigger className="w-56 h-8 glass-input rounded-xl text-xs font-bold transition-all shadow-none">
                            <div className="flex items-center gap-2 truncate">
                                <Database className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                                <SelectValue placeholder="Initialize Data Source" />
                            </div>
                        </SelectTrigger>
                        <SelectContent className="glass border-border/40 rounded-2xl">
                            {connections?.map(c => {
                                const supported = SUPPORTED_EXPLORER_TYPES.includes(c.connector_type.toLowerCase());
                                return (
                                    <SelectItem key={c.id} value={c.id.toString()} className={cn("rounded-lg", !supported && "opacity-50 italic")}>
                                        <div className="flex items-center gap-2">
                                            {c.name}
                                            {!supported && <span className="text-[8px] uppercase font-black opacity-40">(Unsupported)</span>}
                                        </div>
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>

                    <div className="h-6 w-px bg-border/40 mx-2" />

                    <div className="flex items-center bg-background/50 rounded-xl p-0.5 border border-border/40 shadow-sm">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => runQuery('all')}
                                    disabled={isExecuting || !selectedConnectionId || !isSupported}
                                    className="h-7 px-3 rounded-lg font-bold text-[10px] uppercase tracking-wider gap-2 hover:bg-primary/10 hover:text-primary transition-all"
                                >
                                    {isExecuting ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} fill="currentColor" />}
                                    Run
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Run All (or Active Script)</TooltipContent>
                        </Tooltip>
                        <div className="w-px h-4 bg-border/40 mx-1" />
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => runQuery('selection')}
                                    disabled={isExecuting || !selectedConnectionId || !isSupported}
                                    className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary transition-all"
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
                                    disabled={isExecuting || !selectedConnectionId || !isSupported}
                                    className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary transition-all"
                                >
                                    <SquareTerminal size={14} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Run Current Statement</TooltipContent>
                        </Tooltip>
                    </div>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-xl ml-2"
                                onClick={formatSql}
                            >
                                <AlignLeft size={16} />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Beautify SQL (Shift+Alt+F)</TooltipContent>
                    </Tooltip>
                </div>
                <div className="flex items-center gap-1">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn("h-8 w-8 rounded-xl transition-colors", showHistory && "bg-primary/10 text-primary")}
                                onClick={() => setShowHistory(!showHistory)}
                            >
                                <Clock size={16} />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Execution History</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-xl"
                                onClick={() => setMaximizedView(maximizedView === 'editor' ? 'none' : 'editor')}
                            >
                                {maximizedView === 'editor' ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Toggle Maximize</TooltipContent>
                    </Tooltip>
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative group">
                {!isSupported && selectedConnectionId && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md p-12 text-center animate-in fade-in duration-300">
                        <div className="p-4 rounded-[2rem] bg-destructive/10 border border-destructive/20 text-destructive mb-6">
                            <AlertTriangle size={48} strokeWidth={1.5} />
                        </div>
                        <h2 className="text-xl font-black italic uppercase tracking-tighter text-foreground mb-2">
                            Unsupported Protocol
                        </h2>
                        <p className="text-sm text-muted-foreground font-medium max-w-sm leading-relaxed mb-8">
                            Interactive Explorer does not support <span className="text-foreground font-black italic">{currentConnection?.connector_type}</span> sources yet.
                        </p>
                        <Button variant="outline" className="rounded-2xl font-black uppercase text-[10px]" onClick={() => setSelectedConnectionId(null)}>
                            Return to Registry
                        </Button>
                    </div>
                )}
                <Editor
                    onMount={handleEditorDidMount}
                    height="100%"
                    language="sql"
                    value={activeTab.query}
                    theme={theme === 'dark' ? 'vs-dark' : 'light'}
                    onChange={(v) => setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, query: v || '' } : t))}
                    options={{
                        minimap: { enabled: false },
                        fontSize: 13,
                        padding: { top: 20 },
                        automaticLayout: true,
                        suggestOnTriggerCharacters: true,
                        quickSuggestions: true,
                        readOnly: !isSupported,
                        scrollBeyondLastLine: false,
                        fontFamily: '"Geist Mono Variable", Menlo, monospace'
                    }}
                />
            </div>
        </div>
    );

    const closeResultTab = (resultId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setTabs(prev => prev.map(t => {
            if (t.id !== activeTabId) return t;
            const newResults = t.results.filter(r => r.id !== resultId);
            let newActiveId = t.activeResultId;
            if (t.activeResultId === resultId) {
                newActiveId = newResults.length > 0 ? newResults[0].id : undefined;
            }
            return {
                ...t,
                results: newResults,
                activeResultId: newActiveId
            };
        }));
    };

    const renderResults = () => (
        <div className="h-full flex flex-col bg-card/10 relative overflow-hidden">
            <div className="h-10 border-b border-border/40 bg-muted/10 flex items-center justify-between px-2 shrink-0 overflow-hidden">
                <div className="flex-1 overflow-x-auto custom-scrollbar flex items-center h-10 gap-1 px-2">
                    {activeTab.results.length === 0 ? (
                        <div className="flex items-center gap-2 px-2 text-muted-foreground/50">
                            <TableIcon size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest italic">No Results</span>
                        </div>
                    ) : (
                        activeTab.results.map((res, idx) => (
                            <Tooltip key={res.id}>
                                <TooltipTrigger asChild>
                                    <div
                                        onClick={() => setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, activeResultId: res.id } : t))}
                                        className={cn(
                                            "group flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap shrink-0 cursor-pointer pr-1",
                                            activeTab.activeResultId === res.id
                                                ? "bg-primary/10 text-primary shadow-sm"
                                                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                                        )}
                                    >
                                        <span className="opacity-50">#{idx + 1}</span>
                                        <span className="truncate max-w-[100px]">{res.statement.substring(0, 15)}...</span>
                                        {activeTab.activeResultId === res.id && (
                                            <span className="ml-1 text-[8px] bg-primary/20 px-1 rounded text-primary/80">{res.data.results.length}</span>
                                        )}
                                        <button
                                            onClick={(e) => closeResultTab(res.id, e)}
                                            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-destructive/10 hover:text-destructive rounded-md transition-all ml-1"
                                        >
                                            <X size={10} />
                                        </button>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs break-all font-mono text-[10px]">
                                    {res.statement}
                                </TooltipContent>
                            </Tooltip>
                        ))
                    )}
                    {activeTab.results.length > 0 && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 ml-2 text-muted-foreground/40 hover:text-destructive shrink-0"
                                    onClick={() => setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, results: [], activeResultId: undefined } : t))}
                                >
                                    <Trash2 size={12} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Clear All Results</TooltipContent>
                        </Tooltip>
                    )}
                </div>

                <div className="flex items-center gap-1 pl-2 border-l border-border/40 shrink-0 bg-muted/10">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg"
                                onClick={() => setMaximizedView(maximizedView === 'results' ? 'none' : 'results')}
                            >
                                {maximizedView === 'results' ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Toggle Maximize</TooltipContent>
                    </Tooltip>
                </div>
            </div>

            <div className="flex-1 min-h-0 w-full relative">
                <ResultsGrid 
                    data={activeResult ? activeResult.data : null} 
                    isLoading={isExecuting} 
                    title={activeResult ? `Result #${tabs.find(t => t.id === activeTabId)?.results.indexOf(activeResult)! + 1}` : undefined}
                    description={activeResult ? activeResult.statement.substring(0, 60) + '...' : undefined}
                />
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col gap-6 md:gap-8 animate-in fade-in duration-700">
            <PageMeta title="Explorer" />

            {/* --- Standardized Page Header --- */}
            <div className="flex flex-col md:flex-row md:items-center justify-between shrink-0 gap-4 md:gap-0 px-1">
                <div className="space-y-1.5">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tighter text-foreground flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-2xl ring-1 ring-border/50 backdrop-blur-md shadow-sm">
                            <SquareTerminal className="h-6 w-6 text-primary" />
                        </div>
                        Data Explorer
                    </h2>
                    <p className="text-sm md:text-base text-muted-foreground font-medium pl-1">
                        Interact with your datasets using high-performance raw queries.
                    </p>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden bg-background rounded-3xl border border-border/40 shadow-2xl">
                <AnimatePresence>
                {maximizedView === 'editor' && <MaximizePortal>{renderEditor()}</MaximizePortal>}
                {maximizedView === 'results' && <MaximizePortal >{renderResults()}</MaximizePortal>}
                {showHistory && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowHistory(false)}
                            className="absolute inset-0 bg-background/20 backdrop-blur-sm z-80"
                        />
                        <ExecutionHistory
                            history={history}
                            onClose={() => setShowHistory(false)}
                            onRestore={(q) => {
                                setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, query: q } : t));
                                setShowHistory(false);
                            }}
                            onClear={() => clearHistoryMutation.mutate()}
                        />
                    </>
                )}
            </AnimatePresence>

            <ResizablePanelGroup direction="horizontal">
                <ResizablePanel defaultSize={20} minSize={15} className="bg-muted/5 border-r border-border/40">
                    <SchemaBrowser
                        connectionId={selectedConnectionId ? parseInt(selectedConnectionId) : null}
                        onAction={handleSchemaAction}
                    />
                </ResizablePanel>

                <ResizableHandle withHandle className="bg-transparent" />

                <ResizablePanel defaultSize={80}>
                    <ResizablePanelGroup direction="vertical">
                        <ResizablePanel defaultSize={50} minSize={20} className="relative overflow-hidden isolate flex flex-col">
                            {renderEditor()}
                        </ResizablePanel>
                        <ResizableHandle withHandle className="bg-transparent" />
                        <ResizablePanel defaultSize={50} minSize={10} className="overflow-hidden">
                            {renderResults()}
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
        </div>
    );
};

export default ExplorerPage;