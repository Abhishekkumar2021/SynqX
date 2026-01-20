 
import React, { useState, useEffect, useRef } from 'react'
import {
  BrainCircuit,
  X,
  Send,
  Zap,
  Play,
  Trash2,
  Terminal,
  Bot,
  Command,
  Eraser,
  Search,
  Binary,
  Filter,
  Database,
  Layout,
  ShieldCheck,
  User,
  RefreshCw,
  Sparkle,
  ArrowUpRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CodeBlock } from '@/components/ui/docs/CodeBlock'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { convertPrompt } from '@/lib/api'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface OSDUAICommandCenterProps {
  isOpen: boolean
  onClose: () => void
  onApplyQuery: (lucene: string) => void
}

const TEMPLATES = [
  {
    label: 'Active Wells',
    prompt: 'Find all active wells in the US',
    icon: Database,
    color: 'text-primary',
  },
  {
    label: 'Deep Wellbores',
    prompt: 'Find wellbores deeper than 5000 meters',
    icon: Zap,
    color: 'text-warning',
  },
  {
    label: 'Recent Seismic',
    prompt: 'Show seismic data registered in the last 30 days',
    icon: Layout,
    color: 'text-success',
  },
  {
    label: 'Asset Security',
    prompt: 'List all data with public viewers ACL',
    icon: ShieldCheck,
    color: 'text-info',
  },
]

const HELP_EXAMPLES = [
  {
    category: 'Basic Discovery',
    icon: Search,
    items: [
      {
        label: 'Exact String Match',
        code: 'data.WellName: "Well-01"',
        desc: 'Finds exact field matches.',
      },
      {
        label: 'Prefix Wildcard',
        code: 'data.WellName: Well*',
        desc: 'Matches Well-01, Well-02, etc.',
      },
      {
        label: 'Fuzzy Search',
        code: 'data.Status: Actvie~',
        desc: 'Corrects small typos in your query.',
      },
    ],
  },
  {
    category: 'Logical Operators',
    icon: Filter,
    items: [
      {
        label: 'Required (AND)',
        code: 'kind: "*Well:*" AND data.Status: "Active"',
        desc: 'Filters for records matching both criteria.',
      },
      {
        label: 'Optional (OR)',
        code: 'data.Type: "Seismic" OR data.Type: "Well"',
        desc: 'Returns results matching either type.',
      },
    ],
  },
]

export const OSDUAICommandCenter: React.FC<OSDUAICommandCenterProps> = ({
  isOpen,
  onClose,
  onApplyQuery,
}) => {
  const [prompt, setPrompt] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [activeTab, setActiveTab] = useState('chat')
  const [messages, setMessages] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem('synqx_ai_history')
    if (saved) setHistory(JSON.parse(saved))
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }
  }, [messages, isProcessing, activeTab])

  const saveToHistory = (item: any) => {
    const newHistory = [item, ...history.filter((h) => h.prompt !== item.prompt)].slice(0, 20)
    setHistory(newHistory)
    localStorage.setItem('synqx_ai_history', JSON.stringify(newHistory))
  }

  const handleConvert = async (customPrompt?: string) => {
    const targetPrompt = customPrompt || prompt
    if (!targetPrompt) return

    const userMsg = { role: 'user', content: targetPrompt, timestamp: new Date().toISOString() }
    setMessages((prev) => [...prev, userMsg])
    setPrompt('')
    setIsProcessing(true)
    setActiveTab('chat')

    try {
      const result = await convertPrompt(targetPrompt)
      const aiMsg = {
        role: 'assistant',
        lucene: result.result,
        explanation: result.explanation,
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, aiMsg])
      saveToHistory({ prompt: targetPrompt, ...aiMsg })
    } catch (err: any) {
      toast.error('Synthesis failed', { description: err.message })
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          error: true,
          content: 'Technical fault during synthesis. Please retry.',
          timestamp: new Date().toISOString(),
        },
      ])
    } finally {
      setIsProcessing(false)
    }
  }

  const clearChat = () => {
    setMessages([])
    toast.info('Session cleared')
  }

  const purgeHistory = () => {
    setHistory([])
    localStorage.removeItem('synqx_ai_history')
    toast.info('History purged')
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 z-[100] bg-background/95 backdrop-blur-3xl flex flex-col overflow-hidden"
        >
          {/* --- MINIMAL NAVIGATION HEADER --- */}
          <header className="h-16 px-8 border-b border-border/40 flex items-center justify-between shrink-0 z-20">
            <div className="flex items-center gap-4">
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <BrainCircuit size={18} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/60">
                Neural_Mesh
              </span>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
              <TabsList className="bg-muted/50 h-9 p-1 rounded-xl border border-border/40">
                <TabsTrigger
                  value="chat"
                  className="text-[10px] font-black uppercase px-6 h-7 rounded-lg data-[state=active]:bg-background shadow-none"
                >
                  Conversation
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="text-[10px] font-black uppercase px-6 h-7 rounded-lg data-[state=active]:bg-background shadow-none"
                >
                  Buffer
                </TabsTrigger>
                <TabsTrigger
                  value="help"
                  className="text-[10px] font-black uppercase px-6 h-7 rounded-lg data-[state=active]:bg-background shadow-none"
                >
                  Atlas
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-10 w-10 rounded-xl hover:bg-muted"
            >
              <X size={20} />
            </Button>
          </header>

          {/* --- VIEWPORT ARCHITECTURE --- */}
          <main className="flex-1 min-h-0 relative flex flex-col overflow-hidden">
            <Tabs value={activeTab} className="flex-1 flex flex-col min-h-0">
              {/* TAB: CHAT */}
              <TabsContent
                value="chat"
                className="flex-1 flex flex-col min-h-0 m-0 border-0 focus-visible:ring-0 relative"
              >
                <div
                  className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth"
                  ref={scrollRef}
                >
                  <div className="max-w-4xl mx-auto w-full px-6 pt-12 pb-32 space-y-10 min-h-full flex flex-col">
                    <AnimatePresence initial={false}>
                      {messages.length === 0 && !isProcessing && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex-1 flex flex-col justify-center space-y-12 text-center py-12"
                        >
                          <div className="space-y-4">
                            <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-foreground">
                              How can I help you discover data today?
                            </h1>
                            <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest max-w-sm mx-auto">
                              Synqx Neural Engine v2.5.0
                            </p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto w-full">
                            {TEMPLATES.map((t) => (
                              <button
                                key={t.label}
                                onClick={() => handleConvert(t.prompt)}
                                className="flex flex-col gap-3 p-5 rounded-3xl bg-muted/30 border border-border/40 hover:border-primary/40 hover:bg-background transition-all text-left group shadow-sm"
                              >
                                <t.icon size={20} className={cn(t.color)} />
                                <p className="text-[13px] font-bold text-foreground/80 leading-snug">
                                  {t.prompt}
                                </p>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}

                      <div className="space-y-10">
                        {messages.map((msg, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                              'flex w-full',
                              msg.role === 'user' ? 'justify-end' : 'justify-start'
                            )}
                          >
                            <div
                              className={cn(
                                'flex gap-4',
                                msg.role === 'user'
                                  ? 'flex-row-reverse max-w-[85%]'
                                  : 'flex-row w-full max-w-[70%]'
                              )}
                            >
                              {/* Avatar */}
                              <div
                                className={cn(
                                  'h-9 w-9 rounded-2xl shrink-0 flex items-center justify-center border shadow-sm',
                                  msg.role === 'user'
                                    ? 'bg-muted border-border'
                                    : 'bg-primary/10 border-primary/20 text-primary'
                                )}
                              >
                                {msg.role === 'user' ? <User size={16} /> : <Bot size={18} />}
                              </div>

                              {/* Bubble Content */}
                              <div
                                className={cn(
                                  'flex flex-col gap-2 min-w-[280px]',
                                  msg.role === 'user' ? 'items-end' : 'items-start flex-1'
                                )}
                              >
                                <div className="flex items-center gap-2.5 px-1 opacity-40">
                                  <span className="text-[9px] font-black uppercase tracking-widest leading-none">
                                    {msg.role === 'user' ? 'USER' : 'MESH_AGENT'}
                                  </span>
                                  <span className="text-[8px] font-bold tracking-widest">
                                    {new Date(msg.timestamp).toLocaleTimeString()}
                                  </span>
                                </div>

                                {msg.role === 'user' ? (
                                  <div className="p-4 px-6 rounded-[2rem] rounded-tr-none bg-primary text-primary-foreground text-[15px] font-medium leading-relaxed shadow-lg shadow-primary/10">
                                    {msg.content}
                                  </div>
                                ) : msg.error ? (
                                  <div className="p-4 px-6 rounded-[2rem] rounded-tl-none bg-destructive/10 border border-destructive/20 text-destructive text-[14px] font-bold">
                                    {msg.content}
                                  </div>
                                ) : (
                                  <div className="space-y-4 w-full">
                                    {/* Description Bubble */}
                                    <div className="p-5 px-7 rounded-[2rem] rounded-tl-none bg-card border border-border text-[15px] font-medium text-foreground/80 leading-relaxed italic shadow-sm">
                                      "{msg.explanation}"
                                    </div>

                                    {/* Manifest Logic Card */}
                                    <div className="rounded-[2rem] bg-muted/20 border border-border overflow-hidden relative group flex flex-col transition-all hover:border-primary/30 w-full">
                                      <div className="px-6 py-3 border-b border-border/40 bg-muted/20 flex items-center justify-between shrink-0">
                                        <div className="flex items-center gap-3">
                                          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                            <Terminal size={14} />
                                          </div>
                                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/80">
                                            Lucene Manifest
                                          </span>
                                        </div>
                                        <Button
                                          size="sm"
                                          className="h-7 px-4 rounded-full bg-primary hover:bg-primary/90 text-white text-[9px] font-black uppercase tracking-widest shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                                          onClick={() => onApplyQuery(msg.lucene)}
                                        >
                                          <Play size={10} fill="currentColor" className="mr-2" />{' '}
                                          Apply
                                        </Button>
                                      </div>
                                      <div className="p-0">
                                        <div className="overflow-hidden bg-background w-full">
                                          <CodeBlock
                                            code={msg.lucene}
                                            language="text"
                                            rounded={false}
                                            className="border-0 !bg-transparent !shadow-none p-4"
                                            wrap={true}
                                            maxHeight="200px"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {isProcessing && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex gap-5 items-center"
                        >
                          <div className="h-9 w-9 rounded-2xl bg-primary/10 flex items-center justify-center text-primary animate-pulse border border-primary/20 shadow-sm">
                            <RefreshCw size={18} className="animate-spin" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">
                            Synthesis in progress...
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* --- REFINED COMPACT INPUT HUB --- */}
                <div className="shrink-0 p-6 md:p-8 bg-background border-t border-border/40 relative z-50">
                  <div className="max-w-3xl mx-auto">
                    <div className="relative group bg-muted/20 border border-border rounded-full flex items-center p-1.5 focus-within:bg-background focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/5 transition-all duration-300 shadow-lg">
                      <div className="flex-1 flex items-center px-4">
                        <Input
                          placeholder="Message Neural Mesh..."
                          className="flex-1 !bg-transparent !border-0 !shadow-none !ring-0 !outline-none h-10 text-[15px] font-medium placeholder:text-muted-foreground/40"
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleConvert()
                            }
                          }}
                        />
                      </div>

                      <Button
                        variant="default"
                        size="icon"
                        disabled={!prompt || isProcessing}
                        onClick={() => handleConvert()}
                        className={cn(
                          'h-9 w-9 rounded-full shrink-0 shadow-lg transition-all duration-300',
                          prompt
                            ? 'bg-primary text-primary-foreground opacity-100 scale-100'
                            : 'bg-muted text-muted-foreground opacity-20 scale-95'
                        )}
                      >
                        {isProcessing ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    <div className="mt-3 flex items-center justify-between px-6 opacity-30">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <Command size={10} />
                          <span className="text-[8px] font-black uppercase tracking-widest">
                            Enter to send
                          </span>
                        </div>
                        <div className="h-1 w-1 rounded-full bg-border" />
                        <div className="flex items-center gap-1.5 text-primary">
                          <Sparkle size={10} className="text-primary" />
                          <span className="text-[8px] font-black uppercase tracking-widest">
                            Gemini PRO
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={clearChat}
                        className="text-[9px] font-black uppercase tracking-widest hover:text-destructive transition-colors"
                      >
                        <Eraser size={10} className="inline mr-1" /> Reset
                      </button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* TAB: BUFFER */}
              <TabsContent
                value="history"
                className="flex-1 flex flex-col min-h-0 m-0 border-0 focus-visible:ring-0"
              >
                <ScrollArea className="flex-1">
                  <div className="max-w-4xl mx-auto w-full px-6 py-12 space-y-8">
                    <div className="flex items-center justify-between border-b border-border/40 pb-6 px-2">
                      <h2 className="text-2xl font-black tracking-tight text-foreground uppercase">
                        Cognitive Buffer
                      </h2>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={purgeHistory}
                        disabled={history.length === 0}
                        className="rounded-full px-6 font-black uppercase text-[10px] tracking-widest border-destructive/20 text-destructive hover:bg-destructive/5"
                      >
                        <Trash2 size={12} className="mr-2" /> Purge
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 gap-4 pb-20">
                      {history.map((item, idx) => (
                        <motion.div
                          key={idx}
                          className="p-6 rounded-[2rem] bg-muted/20 border border-border/40 hover:border-primary/40 hover:shadow-xl transition-all space-y-6"
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <p className="text-[13px] font-black text-foreground/80 uppercase truncate max-w-xl">
                                {item.prompt}
                              </p>
                              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                                {new Date(item.timestamp).toLocaleString()}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => onApplyQuery(item.lucene)}
                              className="rounded-full bg-foreground text-background hover:bg-foreground/90 text-[9px] font-black uppercase tracking-widest px-4 h-8 shadow-sm"
                            >
                              Apply
                            </Button>
                          </div>
                          <CodeBlock
                            code={item.lucene}
                            language="text"
                            rounded={false}
                            maxHeight="120px"
                            className="border-border/40 !bg-background/50 !shadow-none"
                          />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* TAB: ATLAS */}
              <TabsContent
                value="help"
                className="flex-1 flex flex-col min-h-0 m-0 border-0 focus-visible:ring-0"
              >
                <ScrollArea className="flex-1">
                  <div className="max-w-4xl mx-auto w-full px-6 py-16 space-y-16">
                    <div className="text-center space-y-4">
                      <h2 className="text-4xl font-black tracking-tighter text-foreground uppercase italic">
                        Syntax Atlas
                      </h2>
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.3em]">
                        Partition Discovery Reference
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {HELP_EXAMPLES.map((group) => (
                        <div key={group.category} className="space-y-6">
                          <div className="flex items-center gap-3 border-b border-border/40 pb-3 px-2">
                            <group.icon size={18} className="text-primary" />
                            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground">
                              {group.category}
                            </span>
                          </div>
                          <div className="space-y-4">
                            {group.items.map((ex) => (
                              <div
                                key={ex.label}
                                onClick={() => {
                                  setPrompt(ex.code)
                                  setActiveTab('chat')
                                }}
                                className="p-6 rounded-[2.5rem] bg-background border border-border/40 hover:border-primary/40 hover:shadow-xl transition-all cursor-pointer space-y-4"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-black text-muted-foreground uppercase">
                                    {ex.label}
                                  </span>
                                  <ArrowUpRight size={14} className="text-primary" />
                                </div>
                                <code className="block text-[12px] font-mono text-primary font-bold">
                                  {ex.code}
                                </code>
                                <p className="text-[11px] font-medium text-muted-foreground leading-relaxed">
                                  {ex.desc}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </main>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
