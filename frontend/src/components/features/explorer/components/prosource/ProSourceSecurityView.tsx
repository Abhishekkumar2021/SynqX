import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getConnectionMetadata } from '@/lib/api'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ShieldCheck, User, Globe, Search, RefreshCw, Key, Shield, Download, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface ProSourceSecurityViewProps {
  connectionId: number
}

export const ProSourceSecurityView: React.FC<ProSourceSecurityViewProps> = ({ connectionId }) => {
  const [search, setSearch] = useState('')
  const [selectedAccounts, setSelectedIds] = useState<Set<string>>(new Set())

  const {
    data: accounts,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['prosource', 'accounts', connectionId],
    queryFn: () => getConnectionMetadata(connectionId, 'list_accounts', { limit: 100 }),
  })

  const filteredAccounts = useMemo(() => {
    const list = accounts?.results || accounts || []
    return list.filter(
      (a: any) =>
        (a.ACCOUNT || a.account || '').toLowerCase().includes(search.toLowerCase()) ||
        (a.SCOPE || a.scope || '').toLowerCase().includes(search.toLowerCase()) ||
        (a.TYPE || a.type || '').toLowerCase().includes(search.toLowerCase())
    )
  }, [accounts, search])

  const handleDownload = (items: any[]) => {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `prosource_security_export_${Date.now()}.json`
    a.click()
    toast.success(`${items.length} identities exported`)
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selectedAccounts)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  return (
    <div className="h-full flex flex-col bg-muted/5 relative overflow-hidden">
      <div className="px-8 py-6 border-b border-border/10 bg-card backdrop-blur-md flex items-center justify-between shrink-0 relative z-30">
        <div className="flex items-center gap-5">
          <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-600 border border-cyan-500/20 shadow-inner group">
            <ShieldCheck size={24} className="group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
              Identity Registry
              <Badge
                variant="secondary"
                className="h-5 px-2 bg-cyan-500/10 text-cyan-600 border-none text-[9px] font-black uppercase"
              >
                {filteredAccounts.length} Verified
              </Badge>
            </h2>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1 opacity-60">
              SDS_ACCOUNT Domain & Privilege Management
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <AnimatePresence>
            {selectedAccounts.size > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center gap-3 bg-cyan-500/5 border border-cyan-500/20 rounded-xl px-4 py-1.5 shadow-lg shadow-cyan-500/5"
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-600">
                  {selectedAccounts.size} Selected
                </span>
                <div className="h-4 w-px bg-cyan-500/20 mx-1" />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-3 rounded-lg gap-2 font-black uppercase text-[9px] tracking-widest text-cyan-600 hover:bg-cyan-500/10"
                  onClick={() =>
                    handleDownload(
                      filteredAccounts.filter((acc: any) =>
                        selectedAccounts.has(acc.ACCOUNT || acc.account)
                      )
                    )
                  }
                >
                  <Download size={14} /> Bulk_Export
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 rounded-lg text-cyan-600 hover:bg-cyan-500/10 p-0 flex items-center justify-center"
                  onClick={() => setSelectedIds(new Set())}
                >
                  <X size={14} />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative group w-80">
            <Search className="z-20 absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 transition-all group-focus-within:text-cyan-500" />
            <Input
              placeholder="Filter accounts, scopes, types..."
              className="h-10 pl-10 rounded-xl bg-background/50 border-border/40 focus:ring-cyan-500/10 shadow-sm text-[11px] font-bold placeholder:uppercase placeholder:opacity-30"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-xl hover:bg-muted active:scale-95 transition-all shadow-sm bg-background border-border/40"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw size={18} className={cn(isLoading && 'animate-spin text-cyan-500')} />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 relative z-10">
        <div className="w-full pb-32">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-48 gap-6 opacity-40">
              <div className="relative">
                <div className="absolute inset-0 bg-cyan-500/20 blur-3xl animate-pulse rounded-full" />
                <RefreshCw className="h-12 w-12 animate-spin text-cyan-600 relative z-10" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-600 animate-pulse">
                Materializing security context...
              </span>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-48 opacity-20 grayscale gap-6">
              <Shield size={80} strokeWidth={1} />
              <p className="mt-6 font-black uppercase text-[10px] tracking-[0.3em]">
                No security identities found
              </p>
            </div>
          ) : (
            <div className="p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8 max-w-[1800px] mx-auto">
              {filteredAccounts.map((acc: any, i: number) => {
                const id = acc.ACCOUNT || acc.account
                const isSelected = selectedAccounts.has(id)
                return (
                  <div
                    key={i}
                    onClick={() => toggleSelect(id)}
                    className={cn(
                      'p-6 rounded-[2.5rem] bg-card border transition-all duration-500 group flex flex-col gap-6 relative overflow-hidden shadow-sm cursor-pointer hover:shadow-2xl hover:-translate-y-1',
                      isSelected
                        ? 'border-cyan-500/40 bg-cyan-500/[0.02] shadow-xl shadow-cyan-500/5'
                        : 'border-border/40 hover:border-cyan-500/20'
                    )}
                  >
                    <div className="flex items-center justify-between relative z-10">
                      <div
                        className={cn(
                          'h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-inner',
                          isSelected
                            ? 'bg-cyan-500/20 text-cyan-600 rotate-12 scale-110'
                            : 'bg-muted/20 text-muted-foreground group-hover:bg-cyan-500/10 group-hover:text-cyan-600'
                        )}
                      >
                        <User size={24} />
                      </div>
                      <div className="flex flex-col items-end gap-3">
                        <div className="flex items-center gap-2">
                          {(acc.STATUS === '00' ||
                            acc.STATUS === 'Active' ||
                            acc.status === 'Active') && (
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                          )}
                          <Badge
                            variant="secondary"
                            className={cn(
                              'border-none text-[9px] font-black uppercase px-2 h-5 transition-colors',
                              isSelected ? 'bg-cyan-500 text-white' : 'bg-emerald-500/10 text-emerald-600'
                            )}
                          >
                            Verified_Active
                          </Badge>
                        </div>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(id)}
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            'h-5 w-5 rounded-lg border-2 transition-all',
                            isSelected
                              ? 'bg-cyan-500 border-cyan-500'
                              : 'border-border/40 group-hover:border-cyan-500/40'
                          )}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 relative z-10 flex-1">
                      <h4
                        className={cn(
                          'text-base font-black uppercase tracking-tight truncate transition-colors',
                          isSelected ? 'text-cyan-600' : 'text-foreground group-hover:text-cyan-600'
                        )}
                      >
                        {id}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">
                        <Globe size={12} className="opacity-40 shrink-0" />
                        <span className="truncate">{acc.SCOPE || acc.scope || 'GLOBAL'}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-muted/20 border border-border/10 shadow-inner relative z-10">
                      <div className="flex flex-col gap-1">
                        <span className="text-[7px] font-black uppercase text-muted-foreground/40 tracking-widest">
                          Domain Class
                        </span>
                        <span className="text-[10px] font-bold text-foreground/80 truncate">
                          {acc.TYPE || acc.type || 'STANDARD'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 text-right">
                        <span className="text-[7px] font-black uppercase text-muted-foreground/40 tracking-widest">
                          Auth_Code
                        </span>
                        <span className="text-[10px] font-mono font-bold text-foreground/80 tabular-nums">
                          {acc.STATUS || acc.status || '00'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/5 relative z-10">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-xl hover:bg-cyan-500/10 hover:text-cyan-600 transition-all active:scale-90 border border-transparent hover:border-cyan-500/20 shadow-sm"
                        >
                          <Key size={16} />
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownload([acc])
                          }}
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-xl hover:bg-muted active:scale-90 shadow-sm transition-all"
                        >
                          <Download size={16} />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        className="h-9 px-4 rounded-xl text-[9px] font-black uppercase tracking-[0.1em] text-cyan-600 opacity-0 group-hover:opacity-100 transition-all bg-cyan-500/5 hover:bg-cyan-500/10 border border-cyan-500/10"
                      >
                        Privilege_Edit
                      </Button>
                    </div>

                    {/* Decorative gradient */}
                    <div className="absolute -right-8 -bottom-8 h-32 w-32 bg-cyan-500/[0.03] blur-3xl rounded-full group-hover:bg-cyan-500/10 transition-all duration-700 pointer-events-none" />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}