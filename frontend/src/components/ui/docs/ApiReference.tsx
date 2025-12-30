/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search, Globe, Terminal,
  ChevronDown, ShieldCheck, Braces,
  Settings2, ArrowRight, Maximize2, Minimize2,
  CheckCheck, Database, Cpu, X,
  AlertCircle, FileJson, Zap, Download,
  Code2, Send
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CodeBlock } from "@/components/ui/docs/CodeBlock";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import openapiSpec from '@/docs/openapi.json';


// Types
interface Parameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required?: boolean;
  schema?: { type: string; format?: string; default?: any; enum?: string[] };
  description?: string;
}

interface Operation {
  id: string;
  path: string;
  method: string;
  summary?: string;
  description?: string;
  tags?: string[];
  operationId: string;
  parameters?: Parameter[];
  requestBody?: any;
  responses?: any;
}

// Utilities
const resolveSchema = (schema: any, spec: any = openapiSpec): any => {
  if (!schema) return {};
  if (schema.$ref) {
    const refPath = schema.$ref.replace('#/', '').split('/');
    let resolved = spec;
    for (const part of refPath) resolved = resolved[part];
    return resolveSchema(resolved, spec);
  }
  if (schema.type === 'array' && schema.items) {
    return { ...schema, items: resolveSchema(schema.items, spec) };
  }
  if (schema.properties) {
    const resolvedProps: any = {};
    Object.entries(schema.properties).forEach(([key, value]) => {
      resolvedProps[key] = resolveSchema(value, spec);
    });
    return { ...schema, properties: resolvedProps };
  }
  return schema;
};

const generateCodeSnippet = (method: string, baseUrl: string, path: string, lang: string, params: any, parameters: Parameter[] | undefined, body: string, apiKey: string) => {
  let finalPath = path;
  const queryParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([k, v]) => {
    if (!v) return;
    const paramDef = parameters?.find(p => p.name === k);
    if (paramDef?.in === 'path') {
      finalPath = finalPath.replace(`{${k}}`, encodeURIComponent(String(v)));
    } else {
      queryParams.append(k, String(v));
    }
  });

  const queryString = queryParams.toString();
  const fullUrl = `${baseUrl}${finalPath}${queryString ? `?${queryString}` : ''}`;
  const token = apiKey || "YOUR_API_KEY";

  const snippets: Record<string, string> = {
    curl: `curl -X ${method} "${fullUrl}" \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json"${body ? ` \\
  -d '${body}'` : ''}`,

    python: `import requests

url = "${fullUrl}"
headers = {
    "Authorization": "Bearer ${token}",
    "Content-Type": "application/json"
}
${body ? `data = ${body}\n` : ''}response = requests.${method.toLowerCase()}(url, headers=headers${body ? ', json=data' : ''})
print(response.json())`,

    javascript: `fetch("${fullUrl}", {
  method: "${method}",
  headers: {
    "Authorization": "Bearer ${token}",
    "Content-Type": "application/json"
  }${body ? `,
  body: JSON.stringify(${body})` : ''}
})
  .then(res => res.json())
  .then(data => console.log(data));`,

    go: `package main

import (
    "fmt"
    "net/http"
    "io"
)

func main() {
    req, _ := http.NewRequest("${method}", "${fullUrl}", nil)
    req.Header.Add("Authorization", "Bearer ${token}")
    
    client := &http.Client{}
    resp, _ := client.Do(req)
    body, _ := io.ReadAll(resp.Body)
    fmt.Println(string(body))
}`
  };

  return snippets[lang] || snippets.curl;
};

// Components
const MethodBadge = ({ method, active }: { method: string; active?: boolean }) => {
  const variants: Record<string, "success" | "info" | "warning" | "destructive" | "default"> = {
    GET: "success",
    POST: "info",
    PUT: "warning",
    DELETE: "destructive",
    PATCH: "default",
  };

  return (
    <Badge
      variant={variants[method] || "outline"}
      className={cn(
        "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider min-w-[55px] justify-center transition-all backdrop-blur-sm",
        active && "ring-2 ring-primary/20 scale-105 shadow-lg"
      )}
    >
      {method}
    </Badge>
  );
};

const SchemaNode = ({ name, schema, required, level = 0 }: {
  name: string;
  schema: any;
  required?: boolean;
  level?: number;
}) => {
  const resolved = resolveSchema(schema);
  const [isExpanded, setIsExpanded] = useState(level < 2);
  const hasChildren = resolved.properties || (resolved.type === 'array' && resolved.items?.properties);

  return (
    <div className="py-2 border-b border-border/5 last:border-0">
      <div className="flex items-center gap-2 mb-1">
        {hasChildren && (
          <Button
            onClick={() => setIsExpanded(!isExpanded)}
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-muted/30"
          >
            <ChevronDown size={12} className={cn("transition-transform", !isExpanded && "-rotate-90")} />
          </Button>
        )}
        <span className="font-mono text-xs font-bold text-foreground">{name}</span>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted/30 text-muted-foreground uppercase font-bold">
          {resolved.type}
        </span>
        {resolved.format && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase font-bold">
            {resolved.format}
          </span>
        )}
        {required && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive uppercase font-bold">
            Required
          </span>
        )}
      </div>

      {resolved.description && (
        <p className="text-[10px] text-muted-foreground ml-6 mb-2 leading-relaxed">{resolved.description}</p>
      )}

      {resolved.enum && (
        <div className="ml-6 flex flex-wrap gap-1 mb-2">
          {resolved.enum.map((val: any) => (
            <code key={val} className="text-[9px] px-2 py-0.5 rounded bg-muted/30 text-foreground/70 font-mono">
              {String(val)}
            </code>
          ))}
        </div>
      )}

      {isExpanded && resolved.properties && (
        <div className="ml-6 pl-4 border-l-2 border-border/20 space-y-2 mt-2">
          {Object.entries(resolved.properties).map(([key, val]: [string, any]) => (
            <SchemaNode
              key={key}
              name={key}
              schema={val}
              required={resolved.required?.includes(key)}
              level={level + 1}
            />
          ))}
        </div>
      )}

      {isExpanded && resolved.type === 'array' && resolved.items?.properties && (
        <div className="ml-6 pl-4 border-l-2 border-border/20 space-y-2 mt-2">
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold">Array Items:</span>
          {Object.entries(resolved.items.properties).map(([key, val]: [string, any]) => (
            <SchemaNode
              key={key}
              name={key}
              schema={val}
              required={resolved.items.required?.includes(key)}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Main Component
export function ApiReference() {
  const [search, setSearch] = useState('');
  const [activeOp, setActiveOp] = useState<Operation | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeSchemaTab, setActiveSchemaTab] = useState<'request' | 'response'>('request');
  const [activeCodeLang, setActiveCodeLang] = useState('curl');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [apiKey, setApiKey] = useState('');

  const servers = useMemo(() => openapiSpec.servers, []);
  const [baseUrl, setBaseUrl] = useState(servers[0]?.url);
  const [paramValues, setParamValues] = useState<Record<string, any>>({});
  const [requestBody, setRequestBody] = useState('');
  const [requestState, setRequestState] = useState<{
    loading: boolean;
    response: any;
    status: number | null;
    error: string | null;
  }>({ loading: false, response: null, status: null, error: null });

  const operations = useMemo(() => {
    const ops: Operation[] = [];
    Object.entries(openapiSpec.paths).forEach(([path, pathItem]: [string, any]) => {
      Object.entries(pathItem).forEach(([method, operation]: [string, any]) => {
        if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
          ops.push({ path, method: method.toUpperCase(), ...operation, id: `${method}-${path}` });
        }
      });
    });
    return ops;
  }, []);

  useEffect(() => {
    if (!activeOp && operations.length > 0) setActiveOp(operations[0]);
  }, [operations, activeOp]);

  // Auto-generate example body when operation changes
  useEffect(() => {
    if (activeOp?.requestBody) {
      const schema = resolveSchema(activeOp.requestBody.content?.['application/json']?.schema);
      const example: any = {};

      if (schema.properties) {
        Object.entries(schema.properties).forEach(([key, prop]: [string, any]) => {
          const resolved = resolveSchema(prop);
          if (resolved.type === 'string') {
            if (resolved.format === 'email') example[key] = 'user@example.com';
            else if (resolved.format === 'password') example[key] = 'SecurePass123!';
            else if (resolved.enum) example[key] = resolved.enum[0];
            else example[key] = `example_${key}`;
          } else if (resolved.type === 'number' || resolved.type === 'integer') {
            example[key] = 0;
          } else if (resolved.type === 'boolean') {
            example[key] = false;
          } else if (resolved.type === 'array') {
            example[key] = [];
          } else if (resolved.type === 'object') {
            example[key] = {};
          }
        });
        setRequestBody(JSON.stringify(example, null, 2));
      }
    } else {
      setRequestBody('');
    }
  }, [activeOp]);

  const groupedOps = useMemo(() => {
    const filtered = operations.filter(op => {
      const matchesSearch =
        op.path.toLowerCase().includes(search.toLowerCase()) ||
        op.summary?.toLowerCase().includes(search.toLowerCase()) ||
        op.operationId?.toLowerCase().includes(search.toLowerCase());
      const matchesMethod = methodFilter === 'ALL' || op.method === methodFilter;
      return matchesSearch && matchesMethod;
    });
    const groups: Record<string, Operation[]> = {};
    filtered.forEach(op => {
      const tag = op.tags?.[0] || 'General';
      if (!groups[tag]) groups[tag] = [];
      groups[tag].push(op);
    });
    return groups;
  }, [operations, search, methodFilter]);

  const handleTryItOut = async () => {
    if (!activeOp) return;

    setRequestState({ loading: true, response: null, status: null, error: null });

    try {
      // Validate required params
      const missingParams = activeOp.parameters?.filter(p => p.required && !paramValues[p.name]);
      if (missingParams && missingParams.length > 0) {
        throw new Error(`Missing required parameters: ${missingParams.map(p => p.name).join(', ')}`);
      }

      // Validate request body
      let bodyData = null;
      if (['POST', 'PUT', 'PATCH'].includes(activeOp.method) && activeOp.requestBody?.required) {
        if (!requestBody) throw new Error('Request body is required');
        try {
          bodyData = JSON.parse(requestBody);
        } catch { throw new Error('Invalid JSON in request body'); }
      } else if (requestBody) {
         try {
          bodyData = JSON.parse(requestBody);
        } catch { /* ignore if not required */ }
      }

      // Build URL with params
      let finalPath = activeOp.path;
      const queryParams = new URLSearchParams();

      Object.entries(paramValues).forEach(([k, v]) => {
        if (!v) return;
        const paramDef = activeOp.parameters?.find(p => p.name === k);
        if (paramDef?.in === 'path') {
          finalPath = finalPath.replace(`{${k}}`, encodeURIComponent(String(v)));
        } else {
          queryParams.append(k, String(v));
        }
      });

      const queryString = queryParams.toString();
      const url = `${baseUrl}${finalPath}${queryString ? `?${queryString}` : ''}`;

      // Prepare headers
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      // Execute Request
      const response = await fetch(url, {
        method: activeOp.method,
        headers,
        body: bodyData ? JSON.stringify(bodyData) : undefined,
      });

      const status = response.status;
      let responseData;
      try {
        responseData = await response.json();
      } catch {
        responseData = await response.text();
      }

      setRequestState({
        loading: false,
        response: responseData,
        status: status,
        error: response.ok ? null : `Request failed with status ${status}`
      });

    } catch (err: any) {
      setRequestState({
        loading: false,
        response: null,
        status: 0,
        error: err.message
      });
    }
  };

  const generateExampleBody = useCallback(() => {
    if (!activeOp?.requestBody) return;
    const schema = resolveSchema(activeOp.requestBody.content?.['application/json']?.schema);
    const example: any = {};

    if (schema.properties) {
      Object.entries(schema.properties).forEach(([key, prop]: [string, any]) => {
        const resolved = resolveSchema(prop);
        if (resolved.type === 'string') {
          if (resolved.format === 'email') example[key] = 'user@example.com';
          else if (resolved.format === 'password') example[key] = 'SecurePass123!';
          else if (resolved.enum) example[key] = resolved.enum[0];
          else example[key] = `example_${key}`;
        } else if (resolved.type === 'number' || resolved.type === 'integer') {
          example[key] = 0;
        } else if (resolved.type === 'boolean') {
          example[key] = false;
        } else if (resolved.type === 'array') {
          example[key] = [];
        } else if (resolved.type === 'object') {
          example[key] = {};
        }
      });
    }

    setRequestBody(JSON.stringify(example, null, 2));
  }, [activeOp]);

  const downloadSpec = () => {
    const blob = new Blob([JSON.stringify(openapiSpec, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'openapi-spec.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className={cn(
        "flex flex-col lg:flex-row border border-white/10 overflow-hidden shadow-2xl transition-all duration-500 glass backdrop-blur-3xl bg-white/5 dark:bg-black/5",
        isFullscreen ? "fixed inset-0 z-50 h-screen rounded-none" : "relative h-auto lg:h-[900px] max-w-[1600px] mx-auto rounded-3xl"
      )}>
        {/* Sidebar */}
        <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col sidebar-glass bg-white/5 dark:bg-black/20 shrink-0 h-[300px] lg:h-auto">
          {/* Header */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-linear-to-br from-primary via-primary/80 to-primary/60 flex items-center justify-center shadow-md shadow-primary/20">
                  <Database size={16} className="text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xs font-black uppercase tracking-tight">API Docs</h1>
                  <p className="text-[9px] text-muted-foreground">{operations.length} endpoints</p>
                </div>
              </div>
              <div className="flex gap-0.5">
                <Button
                  onClick={downloadSpec}
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                  title="Download OpenAPI Spec"
                >
                  <Download size={13} />
                </Button>
                <Button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                  title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                >
                  {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                </Button>
              </div>
            </div>

            {/* Search & Filter */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <Input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-8 glass-input"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <Button
                    onClick={() => setSearch('')}
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-foreground"
                  >
                    <X size={14} />
                  </Button>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="glass-input px-0 w-10">
                    <Settings2 size={14} className="text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 glass-card">
                  {['ALL', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(method => (
                    <DropdownMenuItem
                      key={method}
                      onClick={() => setMethodFilter(method)}
                      className="text-xs font-bold"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{method}</span>
                        {methodFilter === method && <CheckCheck size={14} className="text-primary" />}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Operations list */}
          <ScrollArea className="flex-1">
            <div className="px-2 py-3 space-y-4">
              {Object.entries(groupedOps).map(([tag, ops]) => (
                <div key={tag}>
                  <div className="px-2 mb-1.5 flex items-center gap-1.5 sticky top-0 bg-white/5 dark:bg-black/40 backdrop-blur-md py-1.5 z-10 rounded-md">
                    <div className="h-1 w-1 rounded-full bg-primary shadow-[0_0_6px_var(--primary)]" />
                    <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">{tag}</h3>
                  </div>
                  <div className="space-y-0.5">
                    {ops.map(op => (
                      <Button
                        key={op.id}
                        onClick={() => {
                          setActiveOp(op);
                          setRequestState({ loading: false, response: null, status: null, error: null });
                          setRequestBody('');
                          setParamValues({});
                        }}
                        variant="ghost"
                        className={cn(
                          "w-full h-auto flex flex-col items-start gap-1 px-2 py-1.5 rounded-lg transition-all text-left group hover:bg-white/5 dark:hover:bg-white/5 whitespace-normal relative border-l-2 border-transparent",
                          activeOp?.id === op.id
                            ? "bg-primary/5 border-primary shadow-xs rounded-l-none"
                            : "hover:border-primary/20"
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          <MethodBadge method={op.method} active={activeOp?.id === op.id} />
                        </div>
                        <span className={cn(
                          "text-[10px] font-mono font-bold transition-colors w-full break-all",
                          activeOp?.id === op.id ? "text-primary" : "text-foreground/80"
                        )}>
                          {op.path}
                        </span>
                        {op.summary && (
                          <span className={cn(
                            "text-[9px] line-clamp-2 leading-tight normal-case transition-colors",
                            activeOp?.id === op.id ? "text-foreground" : "text-muted-foreground"
                          )}>
                            {op.summary}
                          </span>
                        )}
                      </Button>))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 h-full">
          {/* Server selector */}
          <div className="h-14 border-b border-white/5 flex items-center px-6 gap-4 glass backdrop-blur-xl">

            <Globe size={14} className="text-muted-foreground" />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Environment</span>
            <Select value={baseUrl} onValueChange={setBaseUrl}>
              <SelectTrigger className="flex-1 bg-transparent border-0 text-xs font-bold text-primary shadow-none h-auto p-0 focus:ring-0 hover:bg-transparent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-card">
                {servers.map((s: any) => (
                  <SelectItem key={s.url} value={s.url}>
                    {s.description}
                  </SelectItem>
                ))}
              </SelectContent>
                            </Select>
                          </div>
            
                          {/* Auth Input */}
                          <div className="px-6 py-2 border-b border-white/5 flex items-center gap-4 bg-white/5 dark:bg-black/10 backdrop-blur-md">
                            <ShieldCheck size={14} className="text-muted-foreground" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Authorization</span>
                            <Input
                              type="password"
                              placeholder="Bearer Token"
                              value={apiKey}
                              onChange={(e) => setApiKey(e.target.value)}
                              className="flex-1 h-8 text-xs glass-input"
                            />
                          </div>
            
                          {!activeOp ? (            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground/30">
              <Cpu size={80} strokeWidth={1} />
              <h2 className="text-2xl font-black uppercase tracking-[0.3em]">Select Endpoint</h2>
              <p className="text-sm">Choose an endpoint from the sidebar to view details</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col lg:flex-row min-h-0 h-full overflow-hidden lg:overflow-visible">
              {/* Left: Documentation */}
              <div className="flex-1 border-b lg:border-b-0 lg:border-r border-white/5 glass-panel rounded-none border-y-0 border-l-0 bg-transparent h-full min-w-0 lg:min-w-[500px] overflow-hidden flex flex-col">
                <ScrollArea className="flex-1">
                  <div className="p-6 lg:p-8 space-y-8">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <MethodBadge method={activeOp.method} />
                        <h2 className="text-2xl font-black tracking-tight">{activeOp.summary}</h2>
                      </div>
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 font-mono text-xs font-bold text-primary backdrop-blur-md">
                        <Terminal size={12} />
                        {activeOp.path}
                      </div>
                                                              {activeOp.description && (
                                                                <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">{activeOp.description}</p>
                                                              )}
                                                            </div>
                                          
                                                            {/* Parameters */}                    {activeOp.parameters && activeOp.parameters.length > 0 && (
                      <section className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Settings2 size={16} className="text-primary" />
                          <h3 className="text-[10px] font-black uppercase tracking-widest">Parameters</h3>
                          <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-bold">{activeOp.parameters.length}</span>
                        </div>
                        <div className="space-y-2">
                          {activeOp.parameters.map(p => (
                            <div key={p.name} className="p-3 rounded-lg border border-white/5 space-y-1.5 glass-card bg-white/5 dark:bg-black/5 hover:bg-white/10 dark:hover:bg-black/10 transition-colors">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                    <span className="font-mono text-xs font-bold">{p.name}</span>
                                    <span className="px-1.5 py-0.5 rounded bg-muted/50 text-[9px] font-bold uppercase">{p.in}</span>
                                    {p.required && (
                                      <span className="px-1.5 py-0.5 rounded bg-destructive/10 text-destructive text-[9px] font-bold uppercase">Required</span>
                                    )}
                                  </div>
                                  {p.description && (
                                    <p className="text-[10px] text-muted-foreground leading-relaxed">{p.description}</p>
                                  )}
                                  {p.schema?.enum && (
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                      {p.schema.enum.map((val: string) => (
                                        <code key={val} className="text-[9px] px-1.5 py-0.5 rounded bg-muted/30 font-mono">{val}</code>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <Input
                                  type="text"
                                  placeholder={p.schema?.default ? String(p.schema.default) : `Enter ${p.name}`}
                                  value={paramValues[p.name] || ''}
                                  onChange={(e) => setParamValues({ ...paramValues, [p.name]: e.target.value })}
                                  className="w-32 h-7 px-2 rounded-md glass-input text-xs"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                    {/* Schemas */}
                    <section className="space-y-4">
                      <div className="flex items-center gap-2">
                        <FileJson size={18} className="text-primary" />
                        <h3 className="text-xs font-black uppercase tracking-widest">Schemas</h3>
                      </div>

                      {/* Schema Tabs */}
                      <Tabs value={activeSchemaTab} onValueChange={(v) => setActiveSchemaTab(v as any)} className="border border-white/5 rounded-sm overflow-hidden glass-card shadow-xl">
                        <div className="p-1.5 border-b border-white/5 bg-slate-100/50 dark:bg-black/20 backdrop-blur-md">
                          <TabsList className="w-full justify-start bg-transparent h-auto p-0 gap-1.5">
                            <TabsTrigger
                              value="request"
                              className="flex-1 rounded-md border-none data-[state=active]:bg-white data-[state=active]:text-primary dark:data-[state=active]:bg-primary/20 dark:data-[state=active]:text-primary data-[state=active]:shadow-sm px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all h-auto text-muted-foreground hover:text-foreground"
                            >
                              Request Body
                            </TabsTrigger>
                            <TabsTrigger
                              value="response"
                              className="flex-1 rounded-md border-none data-[state=active]:bg-white data-[state=active]:text-primary dark:data-[state=active]:bg-primary/20 dark:data-[state=active]:text-primary data-[state=active]:shadow-sm px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all h-auto text-muted-foreground hover:text-foreground"
                            >
                              Responses
                            </TabsTrigger>
                          </TabsList>
                        </div>

                        <div className="p-6">
                          <TabsContent value="request" className="mt-0">
                            {activeOp.requestBody ? (
                              <SchemaNode
                                name="body"
                                schema={activeOp.requestBody.content?.['application/json']?.schema}
                              />
                            ) : (
                              <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-xl bg-white/5">
                                <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
                                  No request body required
                                </p>
                              </div>)}
                          </TabsContent>
                          <TabsContent value="response" className="mt-0">
                            <div className="space-y-6">
                              {Object.entries(activeOp.responses || {}).map(([code, res]: [string, any]) => (
                                <div key={code} className="space-y-3">
                                  <div className="flex items-center gap-3">
                                    <span className={cn(
                                      "px-3 py-1 rounded-lg text-[10px] font-black border",
                                      code.startsWith('2')
                                        ? "status-success"
                                        : code.startsWith('4')
                                          ? "status-warning"
                                          : "status-error"
                                    )}>
                                      {code}
                                    </span>
                                    <span className="text-[10px] font-medium text-muted-foreground">{res.description}</span>
                                  </div>
                                  {res.content?.['application/json']?.schema && (
                                    <div className="ml-4 pl-4 border-l-2 border-white/5">
                                      <SchemaNode name="response" schema={res.content['application/json'].schema} />
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </TabsContent>
                        </div>
                      </Tabs>
                    </section>
                  </div>
                </ScrollArea>
              </div>

              {/* Right: Playground */}
              <div className="w-full lg:w-[450px] glass-panel rounded-none border-none bg-muted/5 dark:bg-black/10 backdrop-blur-2xl h-full border-t lg:border-t-0 lg:border-l border-border/40 overflow-hidden flex flex-col">
                <ScrollArea className="flex-1">
                  <div className="p-6 lg:p-8 space-y-6">
                    {/* Code Examples */}
                    <section className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Code2 size={16} className="text-primary" />
                        <h3 className="text-[10px] font-black uppercase tracking-widest">Code Examples</h3>
                      </div>

                      <Tabs value={activeCodeLang} onValueChange={setActiveCodeLang} className="rounded-sm border border-white/5 overflow-hidden glass-card shadow-lg">
                        {/* Language Tabs */}
                        <div className="p-1.5 border-b border-white/5 bg-slate-100/50 dark:bg-white/10 backdrop-blur-md">
                          <TabsList className="w-full justify-start bg-transparent h-auto p-0 gap-1.5">
                            {['curl', 'python', 'javascript', 'go'].map(lang => (
                              <TabsTrigger
                                key={lang}
                                value={lang}
                                className="flex-1 py-1 px-2 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all h-auto data-[state=active]:bg-white data-[state=active]:text-primary dark:data-[state=active]:bg-white/20 dark:data-[state=active]:text-white data-[state=active]:shadow-sm text-muted-foreground dark:text-white/40 hover:text-foreground dark:hover:text-white"
                              >
                                {lang}
                              </TabsTrigger>
                            ))}
                          </TabsList>
                        </div>

                                                {/* Code Block */}
                                                {['curl', 'python', 'javascript', 'go'].map(lang => (
                                                  <TabsContent key={lang} value={lang} className="mt-0 relative group">
                                                                                <CodeBlock
                                                                                  code={generateCodeSnippet(
                                                                                    activeOp.method,
                                                                                    baseUrl,
                                                                                    activeOp.path,
                                                                                    lang,
                                                                                    paramValues,
                                                                                    activeOp.parameters,
                                                                                    requestBody,
                                                                                    apiKey
                                                                                  )}
                                                                                  language={lang === 'curl' ? 'bash' : lang}
                                                                                  className="max-h-[300px]"
                                                                                  wrap={true}
                                                                                  usePortal={true}
                                                                                />                                                  </TabsContent>
                                                ))}                        </Tabs>
                      </section>

                                            {/* Try It Out */}
                                            <section className="space-y-3">
                                              <div className="flex items-center gap-2">
                                                <Send size={16} className="text-primary" />
                                                <h3 className="text-[10px] font-black uppercase tracking-widest">Try It Out</h3>
                                              </div>
                      
                                              {/* Request Body Editor */}
                                              {['POST', 'PUT', 'PATCH'].includes(activeOp.method) && (
                                                <div className="space-y-2">
                                                  <div className="flex items-center justify-between">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                                      <Braces size={12} /> Request Body
                                                    </label>
                                                    <div className="flex gap-1.5">
                                                      {activeOp.requestBody && (
                                                        <Button
                                                          onClick={generateExampleBody}
                                                          variant="soft"
                                                          size="xs"
                                                          className="h-auto py-0.5 text-[9px] gap-1 px-2"
                                                        >
                                                          <Zap size={10} />
                                                          Generate
                                                        </Button>
                                                      )}
                                                      {requestBody && (
                                                        <Button
                                                          onClick={() => setRequestBody('')}
                                                          variant="ghost"
                                                          size="xs"
                                                          className="h-auto py-0.5 bg-muted/20 text-muted-foreground text-[9px] hover:bg-muted/30 px-2"
                                                        >
                                                          Clear
                                                        </Button>
                                                      )}
                                                    </div>
                                                  </div>
                                                  <CodeBlock
                                                    code={requestBody}
                                                    language="json"
                                                    editable
                                                    onChange={(value) => setRequestBody(value)}
                                                    placeholder='{ "key": "value" }'
                                                    className="min-h-[120px]"
                                                    wrap={true}
                                                    usePortal={true}
                                                  />
                                                </div>
                                              )}
                      
                                              <div className="rounded-sm border border-border/40 p-4 space-y-4 bg-card/30 dark:bg-black/5 backdrop-blur-xl shadow-sm">
                                                {/* Send Button */}
                                                <Button                          onClick={handleTryItOut}
                          isLoading={requestState.loading}
                          loadingText="Sending..."
                          className="w-full py-4 rounded-lg font-black text-[10px] tracking-[0.2em] uppercase shadow-lg bg-linear-to-r from-primary to-primary/80 hover:scale-[1.01] transition-transform h-auto"
                        >
                          <Send size={12} className="mr-1.5" />
                          Send Request
                          <ArrowRight size={12} className="ml-1.5" />
                        </Button>

                        {/* Response Display */}
                        {(requestState.status || requestState.error) && (
                          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="flex items-center justify-between pb-2 border-b border-border/40">
                              <div className="flex items-center gap-1.5">
                                <div className={cn(
                                  "h-2 w-2 rounded-full animate-pulse",
                                  requestState.status && requestState.status < 300
                                    ? "bg-success shadow-[0_0_6px_rgba(16,185,129,0.6)]"
                                    : "bg-destructive shadow-[0_0_6px_rgba(239,68,68,0.6)]"
                                )} />
                                <span className="text-[10px] font-black tracking-wider">
                                  Status: {requestState.status}
                                </span>
                              </div>
                              <Button
                                onClick={() => setRequestState({ loading: false, response: null, status: null, error: null })}
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 text-muted-foreground hover:text-foreground"
                              >
                                <X size={12} />
                              </Button>
                            </div>

                            {requestState.error ? (
                              <div className="p-3 rounded-lg space-y-1.5 glass-card border-destructive/20 bg-destructive/10 backdrop-blur-md">
                                <div className="flex items-start gap-2">
                                  <AlertCircle size={14} className="text-destructive shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-[10px] font-bold text-destructive mb-0.5">Error</p>
                                    <p className="text-[10px] text-destructive/80 leading-relaxed">{requestState.error}</p>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <CodeBlock
                                code={JSON.stringify(requestState.response, null, 2)}
                                language="json"
                                className="max-h-[300px]"
                                wrap={true}
                                usePortal={true}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </section>

                    {/* Security Notice */}
                    <div className="flex items-center justify-center gap-3 text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.3em] pt-4">
                      <ShieldCheck size={16} />
                      Secure Connection
                    </div>
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}