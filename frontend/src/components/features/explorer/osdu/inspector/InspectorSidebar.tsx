import React from 'react'
import { Activity, Cpu, Globe, Database, History, Save, Trash2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'

interface InspectorSidebarProps {
  record: any
}

export const InspectorSidebar: React.FC<InspectorSidebarProps> = ({ record }) => {
  if (!record) return null

  return (
    <aside className="w-80 bg-muted/5 flex flex-col overflow-hidden shrink-0 border-l border-border/40">
      <div className="p-6 px-8 border-b border-border/40 bg-muted/10 shrink-0 uppercase tracking-[0.2em] font-black text-[10px] text-muted-foreground/60 flex items-center gap-3">
        <Activity size={14} /> Registry Profile
      </div>
      <ScrollArea className="flex-1">
        <div className="p-8 space-y-10">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground/60 px-1 uppercase text-[10px] font-black tracking-widest">
              <Cpu size={14} /> System Properties
            </div>
            <div className="space-y-3">
              {[
                {
                  label: 'Authority',
                  val: record.details.authority || 'OSDU',
                  icon: Globe,
                },
                {
                  label: 'Schema Source',
                  val: record.details.kind?.split(':')[1],
                  icon: Database,
                },
                { label: 'Version', val: record.details.version, icon: History },
              ].map((item) => (
                <div
                  key={item.label}
                  className="p-4 rounded-2xl bg-card border border-border/40 flex items-center justify-between shadow-sm hover:border-primary/20 transition-all"
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest mb-1">
                      {item.label}
                    </span>
                    <span className="text-[11px] font-bold text-foreground/80 uppercase truncate tracking-tight">
                      {item.val}
                    </span>
                  </div>
                  <item.icon size={14} className="text-muted-foreground/20 shrink-0" />
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-[2rem] bg-indigo-600/5 border border-indigo-600/20 space-y-4 shadow-inner">
            <div className="flex items-center gap-2 text-indigo-600/60 uppercase text-[9px] font-black tracking-widest">
              <Activity size={12} /> Health Status
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-foreground/60 tracking-widest">
                Metadata Verified
              </span>
              <div className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse shadow-[0_0_8px_rgba(79,70,229,0.6)]" />
            </div>
          </div>
        </div>
      </ScrollArea>

      <div className="p-8 border-t border-border/40 bg-muted/10 flex flex-col gap-3 shrink-0">
        <Button className="w-full h-11 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all">
          <Save size={16} className="mr-2" /> Push Updates
        </Button>
        <Button
          variant="ghost"
          className="h-10 rounded-2xl font-black uppercase text-[10px] tracking-widest text-destructive hover:bg-destructive/5 transition-all"
        >
          <Trash2 size={16} className="mr-2" /> Expunge Record
        </Button>
      </div>
    </aside>
  )
}
