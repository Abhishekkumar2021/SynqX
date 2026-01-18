import React, { useMemo } from 'react';
import { 
    Database, Search, Layers, HardDrive, 
    Globe, Code, Cloud, Link2, 
    Server, Cpu
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { type Connection } from '@/lib/api/types';

interface ExplorerSidebarProps {
    connections?: Connection[];
    isLoading: boolean;
    selectedId: string | null;
    searchQuery: string;
    onSearchChange: (val: string) => void;
    onSelect: (id: string) => void;
}

export const ExplorerSidebar: React.FC<ExplorerSidebarProps> = ({
    connections,
    isLoading,
    selectedId,
    searchQuery,
    onSearchChange,
    onSelect,
}) => {
    // Sync URL param to selection on load
    React.useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const connId = urlParams.get('connectionId');
        if (connId && connId !== selectedId) {
            onSelect(connId);
        }
    }, [onSelect, selectedId]);

    const categorized = useMemo(() => {
        if (!connections) return {};
        const filtered = connections.filter(c => 
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.connector_type.toLowerCase().includes(searchQuery.toLowerCase())
        );

        const domain = ['osdu', 'prosource'];
        const files = ['local_file', 's3', 'gcs', 'azure_blob', 'sftp', 'ftp'];
        const warehouses = ['snowflake', 'bigquery', 'redshift', 'databricks', 'duckdb'];
        const utilities = ['custom_script', 'singer_tap', 'dbt'];
        const apis = ['rest_api', 'graphql', 'google_sheets', 'airtable', 'salesforce', 'hubspot', 'stripe'];

        return {
            'Domain Services': filtered.filter(c => domain.includes(c.connector_type.toLowerCase())),
            'Warehouses': filtered.filter(c => warehouses.includes(c.connector_type.toLowerCase())),
            'Databases': filtered.filter(c => 
                !domain.includes(c.connector_type.toLowerCase()) && 
                !files.includes(c.connector_type.toLowerCase()) &&
                !warehouses.includes(c.connector_type.toLowerCase()) &&
                !utilities.includes(c.connector_type.toLowerCase()) &&
                !apis.includes(c.connector_type.toLowerCase())
            ),
            'Object Storage': filtered.filter(c => files.includes(c.connector_type.toLowerCase())),
            'APIs & SaaS': filtered.filter(c => apis.includes(c.connector_type.toLowerCase())),
            'Utilities': filtered.filter(c => utilities.includes(c.connector_type.toLowerCase()))
        };
    }, [connections, searchQuery]);

    return (
        <aside className="h-full flex flex-col bg-muted/10 shrink-0 min-w-0 overflow-hidden">
            <div className="p-5 border-b border-border/20 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
                        <Globe className="h-3 w-3 text-primary" /> Source Mesh
                    </h3>
                </div>
                <div className="relative group">
                    <Search className="z-20 absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                    <Input 
                        placeholder="Search partition..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-9 h-9 rounded-xl bg-background border-border/40 text-xs shadow-none focus:ring-primary/20 transition-all"
                    />
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-3 pb-10 space-y-8">
                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
                        </div>
                    ) : (
                        Object.entries(categorized).map(([category, items]) => {
                            if (items.length === 0) return null;
                            return (
                                <div key={category} className="space-y-2.5">
                                    <h4 className="px-3 pb-1 text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest flex items-center gap-2">
                                        {category === 'Domain Services' && <Layers className="h-3 w-3" />}
                                        {category === 'Warehouses' && <Cloud className="h-3 w-3" />}
                                        {category === 'Databases' && <Database className="h-3 w-3" />}
                                        {category === 'Object Storage' && <HardDrive className="h-3 w-3" />}
                                        {category === 'Utilities' && <Cpu className="h-3 w-3" />}
                                        {category === 'APIs & SaaS' && <Link2 className="h-3 w-3" />}
                                        {category}
                                    </h4>
                                    <div className="space-y-1">
                                        {items.map((c: Connection) => (
                                            <ConnectionItem 
                                                key={c.id} 
                                                connection={c} 
                                                isSelected={selectedId === c.id.toString()}
                                                onClick={() => onSelect(c.id.toString())}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </ScrollArea>
        </aside>
    );
};

const ConnectionItem = ({ connection, isSelected, onClick }: { connection: Connection, isSelected: boolean, onClick: () => void }) => {
    const isDomain = ['osdu', 'prosource'].includes(connection.connector_type.toLowerCase());
    
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group relative border border-transparent text-left",
                isSelected 
                    ? "bg-background text-primary shadow-xl shadow-primary/5 border-primary/20" 
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground hover:border-border/40"
            )}
        >
            <div className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-all border",
                isSelected 
                    ? (isDomain ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-600" : "bg-primary/10 border-primary/30 text-primary")
                    : "bg-muted/50 border-border/40 group-hover:bg-background group-hover:border-primary/20"
            )}>
                <SourceIcon type={connection.connector_type} />
            </div>

            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <span className={cn(
                    "truncate font-bold tracking-tight transition-colors",
                    isSelected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                )}>
                    {connection.name}
                </span>
                <span className="text-[9px] opacity-40 font-bold uppercase tracking-tighter truncate">
                    {connection.connector_type}
                </span>
            </div>

            <div className={cn(
                "h-1.5 w-1.5 rounded-full shrink-0 transition-all",
                connection.health_status === 'healthy' 
                    ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" 
                    : "bg-amber-500"
            )} />

            {isSelected && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-primary rounded-l-full" />
            )}
        </button>
    );
};

const SourceIcon = ({ type }: { type: string }) => {
    const t = type.toLowerCase();
    if (['osdu', 'prosource'].includes(t)) return <Layers className="h-4 w-4" />;
    if (['postgresql', 'mysql', 'oracle', 'sqlite', 'mssql'].includes(t)) return <Database className="h-4 w-4" />;
    if (['snowflake', 'bigquery', 'redshift', 'databricks'].includes(t)) return <Cloud className="h-4 w-4" />;
    if (['local_file', 's3', 'gcs', 'azure_blob'].includes(t)) return <HardDrive className="h-4 w-4" />;
    if (['custom_script', 'dbt'].includes(t)) return <Code className="h-4 w-4" />;
    return <Server className="h-4 w-4" />;
};