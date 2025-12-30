/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
    getConnectionEnvironment, 
    installDependency, 
    initializeEnvironment, 
    uninstallDependency 
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
    Terminal, RefreshCw, Plus, FileCode, Cpu, Database, Copy, Download, Trash2 
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { PackageAutocomplete } from '@/components/common/PackageAutocomplete';

const PYTHON_PACKAGES = [
    'pandas', 'numpy', 'scipy', 'scikit-learn', 'requests', 'beautifulsoup4', 'faker', 'sqlalchemy',
    'polars', 'dask', 'pyspark', 'matplotlib', 'seaborn', 'plotly', 'nltk', 'spacy', 'tensorflow',
    'pytorch', 'keras', 'fastapi', 'flask', 'django', 'celery', 'redis', 'pymongo', 'psycopg2-binary',
    'mysql-connector-python', 'snowflake-connector-python', 'boto3', 'google-cloud-storage', 'azure-storage-blob'
];

const NODE_PACKAGES = [
    'lodash', 'moment', 'axios', 'node-fetch', 'date-fns', 'uuid', 'faker', 'chance', 'csv-parser',
    'fast-csv', 'json2csv', 'xml2js', 'xlsx', 'mongodb', 'pg', 'mysql2', 'redis', 'ioredis', 'aws-sdk',
    '@google-cloud/storage', '@azure/storage-blob', 'express', 'fastify', 'socket.io', 'mongoose',
    'sequelize', 'typeorm', 'prisma', 'chalk', 'dotenv', 'fs-extra'
];

interface EnvironmentInfoProps {
    connectionId: number;
}

export const EnvironmentInfo: React.FC<EnvironmentInfoProps> = ({ connectionId }) => {
    const { data: envInfo, isLoading, isError, refetch } = useQuery({
        queryKey: ['connectionEnvironment', connectionId],
        queryFn: () => getConnectionEnvironment(connectionId),
    });

    const [activeTab, setActiveTab] = useState<'general' | 'python' | 'shell' | 'node'>('general');
    const [installing, setInstalling] = useState(false);
    const [uninstalling, setUninstalling] = useState<string | null>(null);
    const [initializing, setInitializing] = useState(false);
    const [pkgName, setPkgName] = useState("");

    const handleInstall = async (language: string) => {
        if (!pkgName) return;
        setInstalling(true);
        try {
            await installDependency(connectionId, language, pkgName);
            toast.success(`Installed ${pkgName}`);
            setPkgName("");
            refetch();
        } catch (e: any) {
            toast.error(e.response?.data?.detail || "Installation failed");
        } finally {
            setInstalling(false);
        }
    };

    const handleUninstall = async (language: string, pkg: string) => {
        setUninstalling(pkg);
        try {
            await uninstallDependency(connectionId, language, pkg);
            toast.success(`Uninstalled ${pkg}`);
            refetch();
        } catch (e: any) {
            toast.error(e.response?.data?.detail || "Uninstallation failed");
        } finally {
            setUninstalling(null);
        }
    };

    const handleInitialize = async (language: string) => {
        setInitializing(true);
        try {
            await initializeEnvironment(connectionId, language);
            toast.success(`${language} environment initialized`);
            refetch();
        } catch (e: any) {
            toast.error(e.response?.data?.detail || "Initialization failed");
        } finally {
            setInitializing(false);
        }
    };

    if (isLoading) return <Skeleton className="h-32 w-full rounded-2xl" />;
    if (isError || !envInfo) return null;

    if (!envInfo.python_version && (!envInfo.available_tools || Object.keys(envInfo.available_tools).length === 0)) {
        return null;
    }

    const installedPackages = envInfo.installed_packages || {};
    const availableTools = envInfo.available_tools || {};
    const npmPackages = envInfo.npm_packages || {};
    const initializedLangs = new Set(envInfo.initialized_languages || []);

    const renderTabContent = (language: string, content: React.ReactNode) => {
        if (!initializedLangs.has(language)) {
            return (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8 bg-muted/5 rounded-xl border border-dashed border-border/40">
                    <div className="p-3 rounded-full bg-primary/10 text-primary">
                        <Terminal className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="font-bold text-foreground">Environment Not Initialized</h4>
                        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                            Initialize the isolated {language} environment to manage dependencies and execute scripts safely.
                        </p>
                    </div>
                    <Button 
                        size="sm" 
                        onClick={() => handleInitialize(language)}
                        disabled={initializing}
                        className="gap-2 font-bold"
                    >
                        {initializing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                        Initialize {language.charAt(0).toUpperCase() + language.slice(1)} Env
                    </Button>
                </div>
            );
        }
        return content;
    };

    return (
        <div className="h-full flex flex-col rounded-3xl border border-border/40 bg-background/40 backdrop-blur-xl shadow-xl overflow-hidden relative">
            <div className="p-4 md:p-5 border-b border-border/40 bg-muted/10 flex flex-col md:flex-row items-center justify-between shrink-0 gap-4 md:gap-6">
                <div className="space-y-0.5 relative z-10">
                    <h3 className="text-base font-bold flex items-center gap-2 text-foreground">
                        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                            <Terminal className="h-3.5 w-3.5" />
                        </div>
                        Isolated Environment
                    </h3>
                    <p className="text-[10px] text-muted-foreground font-bold tracking-tight pl-1">
                        MANAGE RUNTIME DEPENDENCIES • {envInfo.platform || 'LINUX'}
                    </p>
                </div>

                <div className="flex items-center gap-1.5 bg-background/50 border border-border/40 rounded-xl p-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTab('general')}
                        className={cn(
                            "h-8 px-4 text-xs font-bold rounded-lg transition-all",
                            activeTab === 'general' ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:bg-muted"
                        )}
                    >
                        General
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTab('python')}
                        className={cn(
                            "h-8 px-4 text-xs font-bold rounded-lg transition-all",
                            activeTab === 'python' ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:bg-muted"
                        )}
                    >
                        Python
                        {initializedLangs.has('python') && (
                            <Badge variant="secondary" className="ml-2 text-[9px] h-4 px-1">{Object.keys(installedPackages).length}</Badge>
                        )}
                    </Button>
                    {envInfo.node_version && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveTab('node')}
                            className={cn(
                                "h-8 px-4 text-xs font-bold rounded-lg transition-all",
                                activeTab === 'node' ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:bg-muted"
                            )}
                        >
                            Node.js
                            {initializedLangs.has('node') && (
                                <Badge variant="secondary" className="ml-2 text-[9px] h-4 px-1">{Object.keys(npmPackages).length}</Badge>
                            )}
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTab('shell')}
                        className={cn(
                            "h-8 px-4 text-xs font-bold rounded-lg transition-all",
                            activeTab === 'shell' ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:bg-muted"
                        )}
                    >
                        Shell
                    </Button>
                </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-border/50 hover:scrollbar-thumb-border/80 scrollbar-track-transparent">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activeTab === 'general' && (
                            <div className="space-y-8">
                                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                    {envInfo.python_version && (
                                        <div className="p-4 rounded-2xl bg-muted/20 border border-border/30 flex flex-col gap-2">
                                            <div className="flex items-center gap-2 text-primary">
                                                <FileCode className="h-4 w-4" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest">Python Version</span>
                                            </div>
                                            <span className="text-xl font-black">{envInfo.python_version.replace('Python ', '').split(' ')[0]}</span>
                                        </div>
                                    )}
                                    {envInfo.node_version && (
                                        <div className="p-4 rounded-2xl bg-muted/20 border border-border/30 flex flex-col gap-2">
                                            <div className="flex items-center gap-2 text-emerald-500">
                                                <FileCode className="h-4 w-4" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest">Node.js Version</span>
                                            </div>
                                            <span className="text-xl font-black">{envInfo.node_version}</span>
                                        </div>
                                    )}
                                    <div className="p-4 rounded-2xl bg-muted/20 border border-border/30 flex flex-col gap-2">
                                        <div className="flex items-center gap-2 text-amber-500">
                                            <Cpu className="h-4 w-4" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest">Architecture</span>
                                        </div>
                                        <span className="text-xl font-black">{envInfo.platform || 'x86_64'}</span>
                                    </div>
                                </div>

                                {envInfo.base_path && (
                                    <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                                <Database className="h-4 w-4 text-primary" />
                                                Working Directory
                                            </h4>
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-8 gap-2 text-[10px] font-bold"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(envInfo.base_path || '');
                                                    toast.success("Path copied");
                                                }}
                                            >
                                                <Copy className="h-3 w-3" /> Copy Path
                                            </Button>
                                        </div>
                                        <code className="block p-4 rounded-xl bg-background/50 border border-border/40 text-xs font-mono text-primary break-all">
                                            {envInfo.base_path}
                                        </code>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'python' && renderTabContent('python', (
                            <div className="space-y-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/10 p-4 rounded-2xl border border-border/40">
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-bold flex items-center gap-2">
                                            <Plus className="h-4 w-4 text-primary" />
                                            Install New Package
                                        </h4>
                                        <p className="text-[10px] text-muted-foreground font-medium">Add dependencies to your isolated Python environment.</p>
                                    </div>
                                    <div className="flex items-center gap-2 w-full md:w-auto md:min-w-[300px]">
                                        <PackageAutocomplete 
                                            value={pkgName}
                                            onChange={setPkgName}
                                            onSelect={(val) => setPkgName(val)}
                                            options={PYTHON_PACKAGES}
                                            placeholder="e.g. pandas, requests..."
                                            className="h-9"
                                        />
                                        <Button 
                                            className="h-9 px-4 font-bold" 
                                            onClick={() => handleInstall('python')}
                                            disabled={installing || !pkgName}
                                        >
                                            {installing ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                                            Install
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                    {Object.entries(installedPackages).sort((a, b) => a[0].localeCompare(b[0])).map(([pkg, ver]) => (
                                        <div key={pkg} className="group flex items-center justify-between p-3 rounded-xl bg-background border border-border/40 hover:border-primary/40 hover:shadow-md transition-all">
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-xs font-bold truncate group-hover:text-primary transition-colors">{pkg}</span>
                                                <span className="text-[9px] text-muted-foreground font-mono">{String(ver)}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="h-5 text-[9px] bg-muted/50 font-bold border-border/50">
                                                    pypi
                                                </Badge>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-6 w-6 rounded-md opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
                                                    onClick={() => handleUninstall('python', pkg)}
                                                    disabled={!!uninstalling}
                                                >
                                                    {uninstalling === pkg ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {activeTab === 'node' && renderTabContent('node', (
                            <div className="space-y-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/10 p-4 rounded-2xl border border-border/40">
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-bold flex items-center gap-2">
                                            <Plus className="h-4 w-4 text-emerald-500" />
                                            Install NPM Package
                                        </h4>
                                        <p className="text-[10px] text-muted-foreground font-medium">Add dependencies to your isolated Node.js environment.</p>
                                    </div>
                                    <div className="flex items-center gap-2 w-full md:w-auto md:min-w-[300px]">
                                        <PackageAutocomplete 
                                            value={pkgName}
                                            onChange={setPkgName}
                                            onSelect={(val) => setPkgName(val)}
                                            options={NODE_PACKAGES}
                                            placeholder="e.g. lodash, axios..."
                                            className="h-9"
                                        />
                                        <Button 
                                            className="h-9 px-4 font-bold bg-emerald-600 hover:bg-emerald-700" 
                                            onClick={() => handleInstall('node')}
                                            disabled={installing || !pkgName}
                                        >
                                            {installing ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                                            Install
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                    {Object.entries(npmPackages).sort((a, b) => a[0].localeCompare(b[0])).map(([pkg, ver]) => (
                                        <div key={pkg} className="group flex items-center justify-between p-3 rounded-xl bg-background border border-border/40 hover:border-emerald-500/40 hover:shadow-md transition-all">
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-xs font-bold truncate group-hover:text-emerald-600 transition-colors">{pkg}</span>
                                                <span className="text-[9px] text-muted-foreground font-mono">{String(ver)}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="h-5 text-[9px] bg-muted/50 font-bold border-border/50">
                                                    npm
                                                </Badge>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-6 w-6 rounded-md opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
                                                    onClick={() => handleUninstall('node', pkg)}
                                                    disabled={!!uninstalling}
                                                >
                                                    {uninstalling === pkg ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {activeTab === 'shell' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {Object.entries(availableTools).map(([tool, path]) => (
                                        <div key={tool} className="flex flex-col gap-3 p-4 rounded-2xl bg-background border border-border/40 hover:border-amber-500/40 transition-all shadow-sm">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                                                        <Cpu className="h-4 w-4" />
                                                    </div>
                                                    <span className="text-sm font-black uppercase tracking-wider">{tool}</span>
                                                </div>
                                                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold">
                                                    System
                                                </Badge>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">Binary Path</span>
                                                <code className="block p-2 rounded-lg bg-muted/30 text-[10px] font-mono truncate text-muted-foreground" title={String(path)}>
                                                    {String(path)}
                                                </code>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};
