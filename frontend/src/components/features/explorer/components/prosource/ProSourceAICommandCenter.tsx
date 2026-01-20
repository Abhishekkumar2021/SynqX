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
  Database,
  RefreshCw,
  Sparkle,
  ArrowUpRight,
  Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { CodeBlock } from '@/components/ui/docs/CodeBlock'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { User } from 'lucide-react'
import { convertPrompt } from '@/lib/api'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ProSourceAICommandCenterProps {
  isOpen: boolean
  onClose: () => void
  onApplyQuery: (sql: string) => void
  schema?: any
}

// ... (existing templates)

export const ProSourceAICommandCenter: React.FC<ProSourceAICommandCenterProps> = ({
  isOpen,
  onClose,
  onApplyQuery,
  schema,
}) => {
  const [prompt, setPrompt] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [activeTab, setActiveTab] = useState('chat')
  const [messages, setMessages] = useState<any[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [messages, isProcessing])

  const handleConvert = async (customPrompt?: string) => {
    const targetPrompt = customPrompt || prompt
    if (!targetPrompt) return

    setMessages((prev) => [
      ...prev,
      { role: 'user', content: targetPrompt, timestamp: new Date().toISOString() },
    ])
    setPrompt('')
    setIsProcessing(true)
    setActiveTab('chat')

    try {
      const result = await convertPrompt(
        targetPrompt,
        `Oracle SQL ProSource - Entity: ${schema?.asset || 'Unknown'}`,
        schema?.columns
      )
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          sql: result.result,
          explanation: result.explanation,
          timestamp: new Date().toISOString(),
        },
      ])
    } catch (err: any) {
      toast.error('Synthesis failed', { description: err.message })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 z-[100] bg-background/95 backdrop-blur-3xl flex flex-col overflow-hidden shadow-2xl"
        >
          <header className="h-16 px-8 border-b border-border/40 flex items-center justify-between shrink-0 z-20">
            <div className="flex items-center gap-4">
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <BrainCircuit size={18} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/60">
                Neural_Seabed_Engine
              </span>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
              <TabsList className="bg-muted/50 h-9 p-1 rounded-xl border border-border/40">
                <TabsTrigger
                  value="chat"
                  className="text-[10px] font-black uppercase px-6 h-7 rounded-lg data-[state=active]:bg-background shadow-none"
                >
                  Discovery
                </TabsTrigger>
                <TabsTrigger
                  value="help"
                  className="text-[10px] font-black uppercase px-6 h-7 rounded-lg data-[state=active]:bg-background shadow-none"
                >
                  Syntax
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

          <main className="flex-1 min-h-0 relative flex flex-col overflow-hidden">
            <Tabs value={activeTab} className="flex-1 flex flex-col min-h-0">
              <TabsContent
                value="chat"
                className="flex-1 flex flex-col min-h-0 m-0 border-0 relative"
              >
                <ScrollArea className="flex-1" ref={scrollRef}>
                  <div className="max-w-4xl mx-auto w-full px-6 pt-12 pb-32 space-y-10 min-h-full flex flex-col">
                    <AnimatePresence initial={false}>
                      {messages.length === 0 && !isProcessing && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex-1 flex flex-col justify-center space-y-12 text-center py-12"
                        >
                          <div className="space-y-4">
                            <h1 className="text-4xl font-black tracking-tighter text-foreground">
                              What would you like to find in Seabed?
                            </h1>
                            <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest max-w-sm mx-auto">
                              Neural Logic Synthesis v2.1.0
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
                                  : 'flex-row w-full max-w-[75%]'
                              )}
                            >
                              <div
                                className={cn(
                                  'h-9 w-9 rounded-2xl shrink-0 flex items-center justify-center border',
                                  msg.role === 'user'
                                    ? 'bg-muted border-border'
                                    : 'bg-primary/10 border-primary/20 text-primary'
                                )}
                              >
                                {msg.role === 'user' ? <User size={16} /> : <Bot size={18} />}
                              </div>
                              <div
                                className={cn(
                                  'flex flex-col gap-2 min-w-[280px]',
                                  msg.role === 'user' ? 'items-end' : 'items-start flex-1'
                                )}
                              >
                                <div className="flex items-center gap-2.5 px-1 opacity-40 uppercase text-[9px] font-black tracking-widest">
                                  <span>{msg.role === 'user' ? 'Operator' : 'Seabed_Agent'}</span>
                                  <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                                </div>
                                {msg.role === 'user' ? (
                                  <div className="p-4 px-6 rounded-[2rem] rounded-tr-none bg-primary text-primary-foreground text-[15px] font-medium shadow-lg">
                                    {msg.content}
                                  </div>
                                ) : (
                                  <div className="space-y-4 w-full">
                                    <div className="p-5 px-7 rounded-[2rem] rounded-tl-none bg-card border border-border text-[15px] font-medium text-foreground/80 leading-relaxed italic shadow-sm">
                                      "{msg.explanation}"
                                    </div>
                                    <div className="rounded-[2rem] bg-muted/20 border border-border overflow-hidden relative group flex flex-col transition-all hover:border-primary/30 w-full">
                                      <div className="px-6 py-3 border-b border-border/40 bg-muted/20 flex items-center justify-between shrink-0">
                                        <div className="flex items-center gap-3">
                                          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                            <Terminal size={14} />
                                          </div>
                                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/80">
                                            Oracle SQL Manifest
                                          </span>
                                        </div>
                                        <Button
                                          size="sm"
                                          className="h-7 px-4 rounded-full bg-primary hover:bg-primary/90 text-white text-[9px] font-black uppercase shadow-lg transition-all active:scale-95"
                                          onClick={() => onApplyQuery(msg.sql)}
                                        >
                                          Apply Filter
                                        </Button>
                                      </div>
                                      <CodeBlock
                                        code={msg.sql}
                                        language="sql"
                                        rounded={false}
                                        className="border-0 !bg-transparent p-4"
                                        wrap={true}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {isProcessing && (
                        <div className="flex gap-5 items-center">
                          <div className="h-9 w-9 rounded-2xl bg-primary/10 flex items-center justify-center text-primary animate-pulse border border-primary/20 shadow-sm">
                            <RefreshCw size={18} className="animate-spin" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">
                            Synthesizing Oracle Logic...
                          </span>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </ScrollArea>

                <div className="shrink-0 p-8 bg-background border-t border-border/40 relative z-50">
                  <div className="max-w-3xl mx-auto">
                    <div className="relative group bg-muted/20 border border-border rounded-full flex items-center p-1.5 focus-within:bg-background focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/5 transition-all duration-300 shadow-lg">
                      <Input
                        placeholder="Message Neural Seabed..."
                        className="flex-1 !bg-transparent !border-0 !shadow-none !ring-0 !outline-none h-10 px-6 text-[15px] font-medium placeholder:text-muted-foreground/40"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleConvert()}
                      />
                      <Button
                        variant="default"
                        size="icon"
                        disabled={!prompt || isProcessing}
                        onClick={() => handleConvert()}
                        className={cn(
                          'h-9 w-9 rounded-full shrink-0 shadow-lg transition-all',
                          prompt
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground opacity-20'
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
                          <Sparkle size={10} />
                          <span className="text-[8px] font-black uppercase tracking-widest">
                            Gemini 2.0 FLASH
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setMessages([])}
                        className="text-[9px] font-black uppercase tracking-widest hover:text-destructive transition-colors"
                      >
                        <Eraser size={10} className="inline mr-1" /> Reset
                      </button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="help" className="flex-1 flex flex-col min-h-0 m-0 border-0">
                <ScrollArea className="flex-1">
                  <div className="max-w-4xl mx-auto w-full px-6 py-16 space-y-16">
                    <div className="text-center space-y-4">
                      <h2 className="text-4xl font-black tracking-tighter text-foreground uppercase italic">
                        Syntax Atlas
                      </h2>
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.3em]">
                        Oracle Seabed Discovery Reference
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
