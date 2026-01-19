import React from 'react';
import { 
    LayoutDashboard, Search, Database, HardDrive, 
    ShieldCheck, Users, Grid3X3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export type OSDUService = 'dashboard' | 'mesh' | 'registry' | 'storage' | 'identity' | 'compliance';

interface OSDUHubNavProps {
    activeService: OSDUService;
    onServiceChange: (service: OSDUService) => void;
}

const SERVICES: { id: OSDUService, label: string, icon: any, color: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-blue-500' },
    { id: 'mesh', label: 'Data Mesh', icon: Search, color: 'text-indigo-500' },
    { id: 'registry', label: 'Kind Registry', icon: Grid3X3, color: 'text-emerald-500' },
    { id: 'storage', label: 'Storage', icon: HardDrive, color: 'text-amber-500' },
    { id: 'identity', label: 'Identity', icon: Users, color: 'text-purple-500' },
    { id: 'compliance', label: 'Compliance', icon: ShieldCheck, color: 'text-rose-500' },
];

export const OSDUHubNav: React.FC<OSDUHubNavProps> = ({ activeService, onServiceChange }) => {
    return (
        <div className="flex items-center gap-0.5 bg-muted/10 p-0.5 rounded-xl border border-border/20 shadow-inner">
            {SERVICES.map((s) => {
                const Icon = s.icon;
                const isActive = activeService === s.id;
                return (
                    <Button
                        key={s.id}
                        variant="ghost"
                        size="sm"
                        onClick={() => onServiceChange(s.id)}
                        className={cn(
                            "h-7 px-3 rounded-lg gap-2 transition-all duration-200 font-bold uppercase text-[9px] tracking-widest",
                            isActive 
                                ? "bg-background text-foreground shadow-sm ring-1 ring-border/40" 
                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        )}
                    >
                        <Icon size={12} className={cn(isActive ? s.color : "opacity-40")} />
                        <span className={cn(isActive ? "opacity-100" : "opacity-60")}>{s.label}</span>
                    </Button>
                );
            })}
        </div>
    );
};