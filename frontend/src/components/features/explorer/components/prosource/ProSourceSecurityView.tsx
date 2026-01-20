import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getConnectionMetadata } from '@/lib/api'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ShieldCheck, User, Globe, Search, RefreshCw, Key, Shield } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ProSourceSecurityViewProps {
  connectionId: number
}

export const ProSourceSecurityView: React.FC<ProSourceSecurityViewProps> = ({ connectionId }) => {
  const [search, setSearch] = useState('')

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
        a.ACCOUNT?.toLowerCase().includes(search.toLowerCase()) ||
        a.SCOPE?.toLowerCase().includes(search.toLowerCase()) ||
        a.TYPE?.toLowerCase().includes(search.toLowerCase())
    )
  }, [accounts, search])

  return (
    <div className="h-full flex flex-col bg-muted/5">
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
            className="h-10 w-10 rounded-xl hover:bg-muted active:scale-95 transition-all"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw size={18} className={cn(isLoading && 'animate-spin text-cyan-500')} />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
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
            <div className="flex flex-col items-center justify-center py-48 opacity-20 grayscale">
              <Shield size={80} strokeWidth={1} />

              <p className="mt-6 font-black uppercase text-[10px] tracking-[0.3em]">
                No security identities found
              </p>
            </div>
          ) : (
            <div className="p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8 max-w-[1800px] mx-auto">
              {filteredAccounts.map((acc: any, i: number) => (
                <div
                  key={i}
                  className="p-6 rounded-[2.5rem] bg-card border border-border/40 hover:border-cyan-500/30 hover:shadow-2xl transition-all group flex flex-col gap-6 relative overflow-hidden shadow-sm"
                >
                  <div className="flex items-center justify-between relative z-10">
                    <div className="h-12 w-12 rounded-2xl bg-muted/20 flex items-center justify-center text-muted-foreground group-hover:bg-cyan-500/10 group-hover:text-cyan-600 transition-colors shadow-inner">
                      <User size={24} />
                    </div>

                    <div className="flex items-center gap-2">
                      {acc.STATUS === '00' && (
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                      )}

                      <Badge
                        variant="secondary"
                        className="bg-emerald-500/10 text-emerald-600 border-none text-[9px] font-black uppercase px-2 h-5"
                      >
                        Verified_Active
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-1 relative z-10">
                    <h4 className="text-base font-black text-foreground uppercase tracking-tight truncate group-hover:text-cyan-600 transition-colors">
                      {acc.ACCOUNT}
                    </h4>

                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">
                      <Globe size={12} className="opacity-40 shrink-0" />

                      <span className="truncate">{acc.SCOPE}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-muted/20 border border-border/10 shadow-inner relative z-10">
                    <div className="flex flex-col gap-1">
                      <span className="text-[7px] font-black uppercase text-muted-foreground/40">
                        Domain Class
                      </span>

                      <span className="text-[10px] font-bold text-foreground/80">
                        {acc.TYPE || 'STANDARD'}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 text-right">
                      <span className="text-[7px] font-black uppercase text-muted-foreground/40">
                        Auth_Code
                      </span>

                      <span className="text-[10px] font-mono font-bold text-foreground/80 tabular-nums">
                        {acc.STATUS || '00'}
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
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl hover:bg-muted active:scale-90 shadow-sm transition-all"
                      >
                        <Shield size={16} />
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      className="h-9 px-4 rounded-xl text-[9px] font-black uppercase tracking-[0.1em] text-cyan-600 opacity-0 group-hover:opacity-100 transition-all bg-cyan-500/5 hover:bg-cyan-500/10 border border-cyan-500/10"
                    >
                      Edit Privilege
                    </Button>
                  </div>

                  {/* Decorative gradient */}

                  <div className="absolute -right-8 -bottom-8 h-32 w-32 bg-cyan-500/[0.03] blur-3xl rounded-full group-hover:bg-cyan-500/10 transition-all duration-700" />
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
