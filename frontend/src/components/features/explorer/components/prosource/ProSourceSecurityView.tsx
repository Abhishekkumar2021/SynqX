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
        a.SCOPE?.toLowerCase().includes(search.toLowerCase())
    )
  }, [accounts, search])

  return (
    <div className="h-full flex flex-col bg-muted/5">
      <div className="px-8 py-6 border-b border-border/10 bg-card backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-600 border border-cyan-500/20 shadow-inner">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">Access Control Registry</h2>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1">
              SDS_ACCOUNT Domain Management
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group w-80">
            <Search className="z-20 absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 transition-colors group-focus-within:text-cyan-500" />
            <Input
              placeholder="Search accounts or scopes..."
              className="h-10 pl-10 rounded-xl bg-background/50 border-border/40 focus:ring-cyan-500/10 shadow-sm text-xs font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-xl"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw size={18} className={cn(isLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-8 max-w-7xl mx-auto w-full pb-32">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-48 gap-4 opacity-40">
              <RefreshCw className="h-12 w-12 animate-spin text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                Materializing security context...
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAccounts.map((acc: any, i: number) => (
                <div
                  key={i}
                  className="p-6 rounded-[2rem] bg-card border border-border/40 hover:border-cyan-500/30 hover:shadow-xl transition-all group flex flex-col gap-6 relative overflow-hidden shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-12 w-12 rounded-2xl bg-muted/20 flex items-center justify-center text-muted-foreground group-hover:bg-cyan-500/10 group-hover:text-cyan-600 transition-colors">
                      <User size={24} />
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-emerald-500/10 text-emerald-600 border-none text-[9px] font-black uppercase px-2 h-5"
                    >
                      Verified_Active
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-base font-black text-foreground uppercase tracking-tight truncate">
                      {acc.ACCOUNT}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-widest">
                      <Globe size={12} className="opacity-40" /> {acc.SCOPE}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-muted/30 border border-border/10 shadow-inner">
                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] font-black uppercase text-muted-foreground/50">
                        Domain Type
                      </span>
                      <span className="text-[10px] font-bold text-foreground/80">
                        {acc.TYPE || 'STANDARD'}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] font-black uppercase text-muted-foreground/50">
                        Status Code
                      </span>
                      <span className="text-[10px] font-bold text-foreground/80">
                        {acc.STATUS || '00'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-600"
                      >
                        <Key size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:bg-muted"
                      >
                        <Shield size={14} />
                      </Button>
                    </div>
                    <div className="text-[9px] font-black uppercase text-cyan-600 opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                      Manage Domain
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
