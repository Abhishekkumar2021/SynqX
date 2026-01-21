import React from 'react'
import { Scale, FileCode, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent } from '@/components/ui/card'
import { OSDUPageHeader } from './shared/OSDUPageHeader'

interface OSDUPolicyViewProps {
  policies: any[]
}

export const OSDUPolicyView: React.FC<OSDUPolicyViewProps> = ({ policies }) => {
  return (
    <div className="h-full flex flex-col bg-muted/2 animate-in fade-in duration-500">
      <OSDUPageHeader
        icon={Scale}
        title="Policy Engine"
        subtitle="OPA based Access Control"
        iconColor="text-cyan-500"
        search={''}
        onSearchChange={() => {}}
        searchPlaceholder="Find policies..."
        onRefresh={() => {}}
        totalCount={policies.length}
        countLabel="Policies"
      />

      <div className="flex-1 min-h-0 relative overflow-hidden bg-muted/2">
        <ScrollArea className="h-full">
          <div className="w-full transition-all duration-500">
            {policies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-50">
                <Scale size={48} className="text-muted-foreground mb-4" />
                <h3 className="text-lg font-bold uppercase tracking-widest text-foreground">
                  No Policies Found
                </h3>
                <p className="text-xs text-muted-foreground mt-2 font-medium">
                  The OPA Policy Service returned 0 active definitions.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/5">
                {policies.map((policy: any, idx) => {
                  const policyName =
                    typeof policy === 'string'
                      ? policy
                      : policy.name || policy.id || JSON.stringify(policy)

                  return (
                    <Card
                      key={`${policyName}-${idx}`}
                      className="bg-background/40 backdrop-blur-md border-0 border-b border-border/10 hover:bg-muted/10 transition-all duration-300 group rounded-none shadow-none"
                    >
                      <CardContent className="p-6 px-10 flex items-center justify-between">
                        <div className="flex items-center gap-6 min-w-0">
                          <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-600 border border-cyan-500/10">
                            <FileCode size={18} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-sm text-foreground uppercase tracking-tight truncate">
                              {policyName}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge
                                variant="outline"
                                className="text-[8px] font-black uppercase h-4 px-1.5 border-cyan-500/20 text-cyan-600 bg-cyan-500/5"
                              >
                                OPA_REGO
                              </Badge>
                              <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">
                                system.active
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 px-4 rounded-xl font-black uppercase text-[9px] tracking-widest gap-2 opacity-60 hover:opacity-100 hover:bg-cyan-500/10 hover:text-cyan-600 transition-all"
                          >
                            Test Evaluation
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 rounded-xl border-border/40 hover:bg-muted group-hover:translate-x-1 transition-transform"
                          >
                            <ChevronRight size={16} />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
