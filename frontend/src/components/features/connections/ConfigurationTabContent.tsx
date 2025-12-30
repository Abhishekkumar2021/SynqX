/* eslint-disable @typescript-eslint/no-explicit-any */
import { format } from 'date-fns';
import { Database, Settings2, Activity, Wifi, Globe, Shield, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfigField } from './ConfigField';

export const ConfigurationTabContent = ({ 
    connection, 
    impactData, 
    loadingImpact,
    usageStats,
    loadingUsageStats
}: { 
    connection: any;
    impactData: any;
    loadingImpact: boolean;
    usageStats: any;
    loadingUsageStats: boolean;
}) => {
    const config = connection.config || {};
    
    // Grouping logic
    const connectivityFields = ['host', 'port', 'url', 'account', 'region'];
    const storageFields = ['database', 'database_path', 'warehouse', 'schema', 'role', 'bucket'];
    const sensitiveKeys = ['password', 'secret', 'token', 'key', 'api_key', 'access_key', 'private_key'];
    
    const otherEntries = Object.entries(config).filter(
        ([key]) => !connectivityFields.includes(key.toLowerCase()) && 
                  !storageFields.includes(key.toLowerCase()) && 
                  !sensitiveKeys.some(sk => key.toLowerCase().includes(sk))
    );

    return (
        <div className="h-full flex flex-col rounded-3xl border border-border/40 bg-background/40 backdrop-blur-xl shadow-xl overflow-hidden relative">
            {/* Header */}
            <div className="p-5 md:p-6 border-b border-border/40 bg-muted/10 flex flex-col md:flex-row items-center justify-between shrink-0 gap-4">
                <div className="space-y-1 relative z-10">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                            <Settings2 className="h-4 w-4" />
                        </div>
                        Connectivity & Parameters
                    </h3>
                    <p className="text-[10px] text-muted-foreground font-bold tracking-widest pl-1 uppercase opacity-70">
                        TECHNICAL SPECIFICATIONS • CONFIG ID: {connection.id}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 tracking-widest px-3 py-1 font-black rounded-lg text-[9px]">
                        {connection.connector_type.toUpperCase()} ENGINE
                    </Badge>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-border/50 hover:scrollbar-thumb-border/80 scrollbar-track-transparent">
                <div className="p-6 md:p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        {/* Main Configuration Details */}
                        <div className="lg:col-span-3 space-y-10">
                            {/* Connectivity Group */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="h-px flex-1 bg-linear-to-r from-transparent via-border/40 to-transparent" />
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/80 flex items-center gap-2 whitespace-nowrap">
                                        <Wifi className="h-3 w-3" /> Connectivity
                                    </h4>
                                    <div className="h-px flex-1 bg-linear-to-r from-transparent via-border/40 to-transparent" />
                                </div>
                                <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                                    <ConfigField label="Display Name" value={connection.name} copyable />
                                    {config.host && <ConfigField label="Hostname" value={config.host} copyable />}
                                    {config.port && <ConfigField label="Port" value={String(config.port)} />}
                                    {config.url && <ConfigField label="Endpoint URL" value={config.url} copyable />}
                                    {config.account && <ConfigField label="Account ID" value={config.account} copyable />}
                                    {config.region && <ConfigField label="Cloud Region" value={config.region} />}
                                </div>
                            </div>

                            {/* Storage/Database Group */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="h-px flex-1 bg-linear-to-r from-transparent via-border/40 to-transparent" />
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500/80 flex items-center gap-2 whitespace-nowrap">
                                        <Database className="h-3 w-3" /> Storage & Workspace
                                    </h4>
                                    <div className="h-px flex-1 bg-linear-to-r from-transparent via-border/40 to-transparent" />
                                </div>
                                <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                                    {config.database && <ConfigField label="Database" value={config.database} copyable />}
                                    {config.database_path && <ConfigField label="File System Path" value={config.database_path} copyable />}
                                    {config.warehouse && <ConfigField label="Warehouse" value={config.warehouse} />}
                                    {config.schema && <ConfigField label="Default Schema" value={config.schema} />}
                                    {config.role && <ConfigField label="Assigned Role" value={config.role} />}
                                    {config.bucket && <ConfigField label="S3/GCS Bucket" value={config.bucket} copyable />}
                                </div>
                            </div>

                            {/* Security Section */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="h-px flex-1 bg-linear-to-r from-transparent via-border/40 to-transparent" />
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2 whitespace-nowrap">
                                        <Shield className="h-3 w-3" /> Security & Identity
                                    </h4>
                                    <div className="h-px flex-1 bg-linear-to-r from-transparent via-border/40 to-transparent" />
                                </div>
                                <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/60 px-1">Access Credentials</label>
                                        <div className="h-11 flex items-center justify-between px-4 rounded-xl border border-border/40 bg-muted/5 backdrop-blur-sm">
                                            <div className="font-mono text-xs tracking-[0.4em] text-foreground/20">••••••••</div>
                                            <Badge variant="outline" className="text-[8px] bg-emerald-500/5 text-emerald-600 dark:text-emerald-500 border-emerald-500/20 font-black px-1.5 py-0 uppercase">
                                                Encrypted
                                            </Badge>
                                        </div>
                                    </div>
                                    {config.username && <ConfigField label="Identity" value={config.username} copyable />}
                                    <ConfigField label="Storage Status" value="Vault Protected" className="opacity-80" />
                                </div>
                            </div>

                            {otherEntries.length > 0 && (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="h-px flex-1 bg-linear-to-r from-transparent via-border/40 to-transparent" />
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500/80 flex items-center gap-2 whitespace-nowrap">
                                            <Globe className="h-3 w-3" /> Extended Properties
                                        </h4>
                                        <div className="h-px flex-1 bg-linear-to-r from-transparent via-border/40 to-transparent" />
                                    </div>
                                    <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                                        {otherEntries.map(([key, value]) => (
                                            <ConfigField 
                                                key={key} 
                                                label={key.replace(/_/g, ' ')} 
                                                value={typeof value === 'object' ? JSON.stringify(value) : String(value)} 
                                                copyable 
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Metadata Section */}
                            <div className="space-y-6 pt-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-px flex-1 bg-linear-to-r from-transparent via-border/40 to-transparent" />
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 flex items-center gap-2 whitespace-nowrap">
                                        Metadata
                                    </h4>
                                    <div className="h-px flex-1 bg-linear-to-r from-transparent via-border/40 to-transparent" />
                                </div>
                                <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                                    <ConfigField label="Created On" value={format(new Date(connection.created_at || ''), 'PPP')} />
                                    <ConfigField label="Last Updated" value={format(new Date(connection.updated_at || ''), 'PPP')} />
                                    {connection.description && (
                                        <ConfigField label="Administrative Note" value={connection.description} className="lg:col-span-1" />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Side Panel Info */}
                        <div className="space-y-6 lg:border-l lg:border-border/20 lg:pl-8">
                            <div className="space-y-2 mb-4">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 px-1">Health & Activity</h4>
                            </div>
                            {/* Usage Stats Section */}
                            <div className="rounded-2xl border border-border/40 bg-background/40 backdrop-blur-xl shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-border/40 bg-muted/10 flex items-center gap-2 text-primary">
                                    <Activity className="h-3.5 w-3.5" />
                                    <h4 className="text-[10px] font-black uppercase tracking-widest">
                                        Usage Statistics
                                    </h4>
                                </div>
                                <div className="p-5 space-y-5">
                                    {loadingUsageStats ? (
                                        <div className="space-y-3">
                                            <Skeleton className="h-12 w-full rounded-xl" />
                                            <Skeleton className="h-12 w-full rounded-xl" />
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="p-3 rounded-xl bg-muted/20 border border-border/30 text-center">
                                                <div className="text-xl font-black text-primary">
                                                    {usageStats?.last_24h_runs || 0}
                                                </div>
                                                <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5 opacity-60">
                                                    24h Runs
                                                </div>
                                            </div>
                                            <div className="p-3 rounded-xl bg-muted/20 border border-border/30 text-center">
                                                <div className="text-xl font-black text-emerald-500">
                                                    {usageStats?.sync_success_rate ? `${usageStats.sync_success_rate.toFixed(0)}%` : '100%'}
                                                </div>
                                                <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5 opacity-60">
                                                    Success
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="space-y-3 pt-1">
                                        <div className="flex justify-between items-center text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">
                                            <span>Weekly Volume</span>
                                            <span className="text-foreground">{usageStats?.last_7d_runs || 0} runs</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-muted/30 rounded-full overflow-hidden border border-border/20">
                                            <div 
                                                className="h-full bg-primary rounded-full transition-all duration-700" 
                                                style={{ width: `${usageStats?.sync_success_rate || 100}%` }} 
                                            />
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] font-bold px-1">
                                            <span className="text-muted-foreground/60 uppercase tracking-widest">Avg Latency</span>
                                            <span className="text-foreground font-mono">{usageStats?.average_latency_ms ? `${usageStats.average_latency_ms.toFixed(0)}ms` : 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 backdrop-blur-sm shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-amber-500/20 bg-amber-500/10 flex items-center gap-2 text-amber-600">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    <h4 className="text-[10px] font-black uppercase tracking-widest">
                                        Impact Analysis
                                    </h4>
                                </div>
                                <div className="p-5">
                                    <div className="text-[11px] text-amber-900/70 dark:text-amber-200/70 leading-relaxed font-bold">
                                        {loadingImpact ? (
                                            <div className="space-y-3">
                                                <Skeleton className="h-3 w-full bg-amber-500/10" />
                                                <Skeleton className="h-3 w-[85%] bg-amber-500/10" />
                                            </div>
                                        ) : (
                                            <>
                                                This connection is actively utilized by{' '}
                                                <span className="text-amber-700 dark:text-amber-500 font-black underline decoration-amber-500/30 underline-offset-4">
                                                    {impactData?.pipeline_count || 0} pipelines
                                                </span>.
                                                <br /><br />
                                                Any parameter changes will immediately disrupt scheduled synchronizations.
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};