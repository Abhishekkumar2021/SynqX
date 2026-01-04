/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    User, Bell, ShieldAlert,
    RefreshCw, Trash2, Moon, Sun, Monitor,
    Search, List as ListIcon, LayoutGrid,
    Building2,
    Laptop,
    Activity,
    Settings2} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useZenMode } from '@/hooks/useZenMode';
import { PageMeta } from '@/components/common/PageMeta';
import { useTheme } from '@/hooks/useTheme';
import { ApiKeysManager } from '@/components/settings/ApiKeysManager';
import { AlertConfigDialog } from '@/components/settings/AlertConfigDialog';
import { updateUser, deleteUser, getAlertConfigs, updateAlertConfig, deleteAlertConfig } from '@/lib/api';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { WorkspaceSettingsForm } from '@/components/features/workspace/WorkspaceSettingsForm';
import { useWorkspace } from '@/hooks/useWorkspace';

type SettingsTab = 'general' | 'workspace' | 'security' | 'notifications';

export const SettingsPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAuth();
    const { activeWorkspace, isAdmin: isWsAdmin } = useWorkspace();
    const { theme, setTheme } = useTheme();
    const { isZenMode } = useZenMode();
    const queryClient = useQueryClient();
    
    const activeTab = (searchParams.get('tab') as SettingsTab) || 'general';
    const setActiveTab = (tab: SettingsTab) => {
        setSearchParams({ tab });
    };

    // Profile State
    const [displayName, setDisplayName] = useState(user?.full_name || '');
    const [email, setEmail] = useState(user?.email || '');

    React.useEffect(() => {
        if (user) {
            setDisplayName(user.full_name || '');
            setEmail(user.email || '');
        }
    }, [user]);

    // Danger Zone State
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const [notificationSearchQuery, setNotificationSearchQuery] = useState('');
    const [notificationViewMode, setNotificationViewMode] = useState<'list' | 'grid'>('list');

    // Profile Mutation
    const profileMutation = useMutation({
        mutationFn: updateUser,
        onSuccess: () => {
            toast.success("Profile Synchronized");
            queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
        },
        onError: (err: any) => {
            toast.error("Update Failed", {
                description: err.response?.data?.detail || "There was an error updating your profile."
            });
        }
    });

    const handleSaveProfile = () => {
        profileMutation.mutate({ full_name: displayName, email: email !== user?.email ? email : undefined });
    };

    // Account Deletion Mutation
    const deleteAccountMutation = useMutation({
        mutationFn: deleteUser,
        onSuccess: () => {
            toast.success("Account Terminated");
            window.location.href = '/login';
        },
        onError: () => toast.error("Deletion Failed")
    });

    // Alerts Query
    const { data: alerts, isLoading: loadingAlerts } = useQuery({
        queryKey: ['alerts'],
        queryFn: getAlertConfigs,
        enabled: activeTab === 'notifications'
    });

    // Alert Toggle Mutation
    const toggleAlertMutation = useMutation({
        mutationFn: ({ id, enabled }: { id: number, enabled: boolean }) =>
            updateAlertConfig(id, { enabled }),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['alerts'] });
            toast.success(variables.enabled ? "Surveillance Active" : "Surveillance Paused");
        },
        onError: () => toast.error("Failed to update alert preferences")
    });

    const deleteAlertMutation = useMutation({
        mutationFn: deleteAlertConfig,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['alerts'] });
            toast.success("Alert rule decommissioned");
        },
        onError: () => toast.error("Failed to delete alert rule")
    });

    const filteredAlerts = React.useMemo(() => {
        if (!alerts) return [];
        return (alerts as any[]).filter(alert =>
            alert.name.toLowerCase().includes(notificationSearchQuery.toLowerCase()) ||
            alert.alert_type.toLowerCase().includes(notificationSearchQuery.toLowerCase()) ||
            alert.delivery_method.toLowerCase().includes(notificationSearchQuery.toLowerCase())
        );
    }, [alerts, notificationSearchQuery]);


    const tabs = [
        { id: 'general', label: 'My Account', icon: User, description: 'Identity & Theme' },
        { id: 'workspace', label: 'Workspace', icon: Building2, description: 'Routing & Governance' },
        { id: 'security', label: 'Security', icon: ShieldAlert, description: 'API Keys & Access' },
        { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Rules & Alerts' },
    ];

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "flex flex-col gap-6 md:gap-8",
                isZenMode ? "h-[calc(100vh-3rem)]" : "h-full"
            )}
        >
            <PageMeta title="Settings" description="Manage your workspace preferences and security configurations." />

            {/* --- Registry Header --- */}
            <div className="flex flex-col md:flex-row md:items-center justify-between shrink-0 gap-4 px-1">
                <div className="space-y-1.5">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tighter text-foreground flex items-center gap-3 uppercase">
                        <div className="p-2 bg-primary/10 rounded-2xl ring-1 ring-border/50 backdrop-blur-md shadow-sm">
                            <Settings2 className="h-6 w-6 text-primary" />
                        </div>
                        Global Control
                    </h2>
                    <p className="text-sm md:text-base text-muted-foreground font-medium pl-1">
                        Manage identity, workspace governance and security protocols.
                    </p>
                </div>
            </div>

            {/* --- Main Registry Container --- */}
            <div className="flex-1 min-h-0 flex flex-col md:flex-row rounded-3xl border border-border/40 bg-background/40 backdrop-blur-xl shadow-xl relative overflow-hidden">
                
                {/* --- Integrated Navigation Sidebar --- */}
                <aside className="w-full md:w-72 border-b md:border-b-0 md:border-r border-border/40 bg-muted/10 shrink-0 flex flex-col overflow-hidden">
                    <div className="p-6 border-b border-border/40 bg-background/20">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 leading-none">Management Console</p>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as SettingsTab)}
                                className={cn(
                                    "w-full flex flex-col items-start gap-0.5 px-4 py-3.5 rounded-2xl text-sm transition-all duration-300 relative group overflow-hidden",
                                    activeTab === tab.id
                                        ? "bg-background border-border/60 text-primary shadow-lg ring-1 ring-white/10 dark:ring-white/5"
                                        : "text-muted-foreground hover:bg-muted/40 hover:border-border/40 border-transparent border"
                                )}
                            >
                                <div className="flex items-center gap-3 w-full relative z-10">
                                    <div className={cn(
                                        "p-1.5 rounded-lg transition-colors duration-300",
                                        activeTab === tab.id ? "bg-primary/10 text-primary" : "bg-muted/50 group-hover:bg-muted text-muted-foreground"
                                    )}>
                                        <tab.icon className="h-4 w-4" />
                                    </div>
                                    <span className={cn(
                                        "font-black uppercase tracking-tighter transition-colors duration-300 text-xs",
                                        activeTab === tab.id ? "text-foreground" : "text-muted-foreground group-hover:text-foreground/80"
                                    )}>{tab.label}</span>
                                    {activeTab === tab.id && (
                                        <motion.div layoutId="active-pill" className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
                                    )}
                                </div>
                                <span className={cn(
                                    "text-[9px] font-bold mt-1 transition-all duration-300 pl-9",
                                    activeTab === tab.id ? "text-muted-foreground/80" : "text-muted-foreground/40 group-hover:text-muted-foreground/60"
                                )}>{tab.description}</span>
                            </button>
                        ))}
                    </div>

                    <div className="p-6 border-t border-border/20 bg-background/20 mt-auto">
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/10">
                            <Activity size={12} className="text-primary animate-pulse" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-primary/60">Node Status: Operational</span>
                        </div>
                    </div>
                </aside>

                {/* --- Content Area --- */}
                <main className="flex-1 overflow-y-auto custom-scrollbar relative">
                    <div className="p-8 md:p-12 max-w-4xl mx-auto w-full">
                        <AnimatePresence mode="wait">
                            {activeTab === 'general' && (
                                <motion.div
                                    key="general"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-10"
                                >
                                    {/* Identity Manifest */}
                                    <div className="relative group">
                                        <div className="absolute -inset-1 bg-linear-to-r from-primary/20 via-blue-500/20 to-primary/20 rounded-[3rem] blur opacity-25" />
                                        <Card className="relative overflow-hidden border-border/40 bg-card/40 backdrop-blur-xl rounded-[2.5rem] shadow-2xl">
                                            <div className="h-32 bg-linear-to-br from-primary/10 via-background to-background border-b border-border/20 flex items-end justify-end p-6" />
                                            
                                            <CardHeader className="relative pb-0 -mt-16 px-8">
                                                <div className="flex flex-col md:flex-row md:items-end gap-6">
                                                    <div className="relative">
                                                        <Avatar className="h-32 w-32 rounded-[2rem] border-4 border-background shadow-2xl relative z-10">
                                                            <AvatarImage src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user?.email || 'synqx'}`} />
                                                            <AvatarFallback className="bg-primary/10 text-primary text-4xl font-black">
                                                                {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                    </div>
                                                    <div className="flex-1 space-y-1 mb-2">
                                                        <h3 className="text-3xl font-black tracking-tight text-foreground leading-none">{user?.full_name || 'User Identity'}</h3>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="secondary" className="rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-widest bg-primary/5 text-primary border-primary/10">
                                                                ROOT ACCOUNT
                                                            </Badge>
                                                            <span className="text-[11px] text-muted-foreground font-bold opacity-60 italic">{user?.email}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardHeader>

                                            <CardContent className="p-8 pt-10 space-y-8">
                                                <div className="grid gap-8 md:grid-cols-2">
                                                    <div className="space-y-3">
                                                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Display Name</Label>
                                                        <Input
                                                            value={displayName}
                                                            onChange={(e) => setDisplayName(e.target.value)}
                                                            className="h-14 rounded-2xl bg-muted/20 border-border/40 focus:bg-background transition-all px-6 font-bold text-base shadow-inner border-2"
                                                        />
                                                    </div>
                                                    <div className="space-y-3">
                                                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Account Email</Label>
                                                        <Input
                                                            id="email"
                                                            value={email}
                                                            onChange={(e) => setEmail(e.target.value)}
                                                            className="h-14 rounded-2xl bg-muted/20 border-border/40 focus:bg-background transition-all px-6 font-bold text-base shadow-inner border-2"
                                                        />
                                                    </div>
                                                </div>
                                            </CardContent>

                                            <div className="px-8 py-5 bg-muted/10 border-t border-border/20 flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <RefreshCw className={cn("h-3.5 w-3.5", profileMutation.isPending && "animate-spin")} />
                                                    <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Persistence Layer Ready</span>
                                                </div>
                                                <Button 
                                                    onClick={handleSaveProfile} 
                                                    disabled={profileMutation.isPending || (displayName === user?.full_name && email === user?.email)} 
                                                    className="rounded-xl h-11 px-8 font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-primary/20 bg-primary text-primary-foreground hover:scale-[1.02] active:scale-95 transition-all"
                                                >
                                                    Confirm Manifest
                                                </Button>
                                            </div>
                                        </Card>
                                    </div>

                                    {/* Appearance Selector */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-3 px-1">
                                            <div className="h-1.5 w-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_var(--color-purple-500)]" />
                                            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 leading-none">Interface Preference</h4>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {[
                                                { id: 'light', label: 'Daylight', icon: Sun, color: 'text-amber-500' },
                                                { id: 'dark', label: 'Midnight', icon: Moon, color: 'text-blue-400' },
                                                { id: 'system', label: 'Adaptive', icon: Monitor, color: 'text-primary' },
                                            ].map((t) => (
                                                <motion.button
                                                    key={t.id}
                                                    whileHover={{ y: -4, scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => setTheme(t.id as any)}
                                                    className={cn(
                                                        "group relative flex flex-col items-center gap-4 p-6 rounded-[2.5rem] border-2 transition-all duration-500 outline-none",
                                                        theme === t.id 
                                                            ? "border-primary bg-primary/5 shadow-2xl shadow-primary/10" 
                                                            : "border-border/40 bg-muted/5 hover:border-primary/20"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "p-4 rounded-2xl transition-all duration-500 group-hover:scale-110",
                                                        theme === t.id ? "bg-primary text-primary-foreground shadow-xl" : "bg-muted/50 text-muted-foreground"
                                                    )}>
                                                        <t.icon className="h-6 w-6" />
                                                    </div>
                                                    <span className="text-xs font-black uppercase tracking-widest">{t.label}</span>
                                                </motion.button>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'workspace' && (
                                <motion.div
                                    key="workspace"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-8"
                                >
                                    <div className="p-8 rounded-[2.5rem] bg-emerald-500/5 border border-emerald-500/20 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
                                        <div className="flex items-center gap-5">
                                            <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 shadow-inner">
                                                <Building2 className="h-7 w-7" />
                                            </div>
                                            <div>
                                                <h3 className="font-black text-xl leading-none text-foreground uppercase tracking-tight">Workspace Governance</h3>
                                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-2 opacity-60">Identity, routing and shared protocols.</p>
                                            </div>
                                        </div>
                                        {activeWorkspace?.default_agent_group && activeWorkspace.default_agent_group !== 'internal' && (
                                            <Badge variant="outline" className="rounded-xl px-4 py-2 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-black uppercase text-[10px] gap-2 shadow-xl backdrop-blur-md">
                                                <Laptop size={14} /> Agent Mode: {activeWorkspace.default_agent_group}
                                            </Badge>
                                        )}
                                    </div>

                                    <WorkspaceSettingsForm 
                                        activeWorkspace={activeWorkspace} 
                                        isAdmin={isWsAdmin} 
                                        queryClient={queryClient} 
                                    />
                                </motion.div>
                            )}

                            {activeTab === 'security' && (
                                <motion.div
                                    key="security"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-10"
                                >
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-3 px-1">
                                            <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_var(--color-blue-500)]" />
                                            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 leading-none">Security Architecture</h4>
                                        </div>
                                        <ApiKeysManager />
                                    </div>

                                    <Card className="border-destructive/30 bg-destructive/5 backdrop-blur-xl rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-10 opacity-[0.02] group-hover:opacity-10 transition-opacity pointer-events-none">
                                            <ShieldAlert size={140} className="text-destructive" />
                                        </div>
                                        <CardHeader className="p-8">
                                            <CardTitle className="text-destructive text-xl font-black uppercase flex items-center gap-3">
                                                <ShieldAlert className="h-6 w-6" /> Irreversible Protocols
                                            </CardTitle>
                                            <CardDescription className="font-bold text-xs uppercase opacity-60">Permanently terminate your SynqX deployment and associated data.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-8 pt-0 flex flex-col md:flex-row md:items-center justify-between gap-8">
                                            <div className="space-y-2">
                                                <p className="text-sm font-black uppercase tracking-tight text-foreground">Account Decommission</p>
                                                <p className="text-xs text-muted-foreground font-medium max-w-sm italic leading-relaxed">
                                                    Initiating this protocol will purge all pipelines, history, and metadata. This action is atomic and terminal.
                                                </p>
                                            </div>
                                            <Button
                                                variant="destructive"
                                                className="h-12 px-8 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-destructive/20 hover:scale-[1.02] active:scale-95 transition-all gap-2"
                                                onClick={() => setIsDeleteDialogOpen(true)}
                                            >
                                                <Trash2 className="h-4 w-4" /> Purge Account
                                            </Button>
                                        </CardContent>

                                        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                                            <AlertDialogContent className="rounded-[2.5rem] border-destructive/20 bg-background/95 backdrop-blur-3xl shadow-2xl">
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle className="text-2xl font-black uppercase tracking-tighter">Confirm Termination</AlertDialogTitle>
                                                    <AlertDialogDescription className="text-muted-foreground font-medium italic">
                                                        This will permanently destroy your SynqX identity and all associated virtual assets. This procedure cannot be aborted once confirmed.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter className="mt-6 gap-3">
                                                    <AlertDialogCancel className="rounded-xl font-black uppercase text-[10px] tracking-widest">Abort</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => deleteAccountMutation.mutate()}
                                                        className={cn(buttonVariants({ variant: "destructive" }), "rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-destructive/20")}
                                                    >
                                                        {deleteAccountMutation.isPending ? "Purging..." : "Confirm Termination"}
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </Card>
                                </motion.div>
                            )}

                            {activeTab === 'notifications' && (
                                <motion.div
                                    key="notifications"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex flex-col h-full min-h-150 rounded-[2.5rem] border border-border/40 bg-background/40 backdrop-blur-xl shadow-2xl overflow-hidden relative"
                                >
                                    <div className="p-8 border-b border-border/40 bg-muted/10 flex flex-col lg:flex-row items-center justify-between shrink-0 gap-6">
                                        <div className="space-y-1 relative z-10">
                                            <h3 className="text-xl font-black flex items-center gap-3 text-foreground uppercase tracking-tight">
                                                <div className="p-2.5 rounded-xl bg-primary/10 text-primary shadow-inner">
                                                    <Bell className="h-5 w-5" />
                                                </div>
                                                Notification Registry
                                            </h3>
                                            <p className="text-[9px] text-muted-foreground font-black tracking-[0.2em] uppercase opacity-60 pl-1">
                                                <span className="text-foreground">{alerts?.length || 0}</span> ACTIVE RULES • SYSTEM-WIDE MONITORING
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-3 w-full lg:w-auto">
                                            <div className="relative flex-1 lg:w-64 group">
                                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors z-20" />
                                                <Input
                                                    placeholder="Search registry..."
                                                    className="pl-10 h-10 rounded-2xl bg-background/50 border-border/40 focus:bg-background focus:ring-4 focus:ring-primary/5 transition-all text-xs font-bold shadow-none"
                                                    value={notificationSearchQuery}
                                                    onChange={(e) => setNotificationSearchQuery(e.target.value)}
                                                />
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center bg-background/50 border border-border/40 rounded-2xl p-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className={cn(
                                                            "h-8 w-8 rounded-xl transition-all",
                                                            notificationViewMode === 'list' ? "bg-primary/10 text-primary shadow-sm" : "text-muted-foreground hover:bg-muted"
                                                        )}
                                                        onClick={() => setNotificationViewMode('list')}
                                                    >
                                                        <ListIcon size={16} />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className={cn(
                                                            "h-8 w-8 rounded-xl transition-all",
                                                            notificationViewMode === 'grid' ? "bg-primary/10 text-primary shadow-sm" : "text-muted-foreground hover:bg-muted"
                                                        )}
                                                        onClick={() => setNotificationViewMode('grid')}
                                                    >
                                                        <LayoutGrid size={16} />
                                                    </Button>
                                                </div>
                                                <AlertConfigDialog />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-border/50 hover:scrollbar-thumb-border/80 scrollbar-track-transparent">
                                        {loadingAlerts && !alerts ? (
                                            <div className="p-8 space-y-6">
                                                {[1, 2, 3].map(i => (
                                                    <div key={i} className="flex justify-between items-center py-6 border-b border-border/10">
                                                        <div className="flex items-center gap-6">
                                                            <Skeleton className="h-12 w-12 rounded-xl" />
                                                            <div className="space-y-3">
                                                                <Skeleton className="h-4 w-48 bg-muted/20" />
                                                                <Skeleton className="h-3 w-24 bg-muted/10" />
                                                            </div>
                                                        </div>
                                                        <Skeleton className="h-9 w-32 rounded-xl" />
                                                    </div>
                                                ))}
                                            </div>
                                        ) : filteredAlerts.length > 0 ? (
                                            <AnimatePresence mode="popLayout">
                                                {notificationViewMode === 'list' ? (
                                                    <Table className="rounded-none border-none shadow-none">
                                                        <TableHeader className="bg-muted/20 border-b border-border/20">
                                                            <TableRow className="hover:bg-transparent border-none">
                                                                <TableHead className="pl-8 font-black text-[9px] uppercase tracking-[0.2em] text-muted-foreground/50 py-4">Rule Configuration</TableHead>
                                                                <TableHead className="font-black text-[9px] uppercase tracking-[0.2em] text-muted-foreground/50 py-4">Trigger</TableHead>
                                                                <TableHead className="font-black text-[9px] uppercase tracking-[0.2em] text-muted-foreground/50 py-4 text-center">State</TableHead>
                                                                <TableHead className="text-right pr-8 font-black text-[9px] uppercase tracking-[0.2em] text-muted-foreground/50 py-4">Control</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody className="divide-y divide-border/10">
                                                            {filteredAlerts.map((alert: any) => (
                                                                <TableRow key={alert.id} className="group hover:bg-primary/2 transition-colors border-b border-border/5">
                                                                    <TableCell className="pl-8 py-5">
                                                                        <div className="flex items-center gap-4">
                                                                            <div className="h-10 w-10 rounded-xl bg-emerald-500/5 flex items-center justify-center border border-emerald-500/10 group-hover:scale-110 transition-transform text-emerald-500/60 shadow-sm">
                                                                                <Bell size={18} />
                                                                            </div>
                                                                            <div className="flex flex-col gap-0.5">
                                                                                <span className="font-black text-sm tracking-tight text-foreground">{alert.name}</span>
                                                                                <span className="text-[9px] text-muted-foreground font-bold tracking-tight opacity-60 italic">{alert.delivery_method} • {alert.recipient || 'INTERNAL'}</span>
                                                                            </div>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest bg-muted/30 border-border/40 px-2 py-0.5 rounded-md">
                                                                            {alert.alert_type}
                                                                        </Badge>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <div className="flex justify-center">
                                                                            <Switch
                                                                                checked={alert.enabled}
                                                                                onCheckedChange={(enabled) => toggleAlertMutation.mutate({ id: alert.id, enabled })}
                                                                                className="scale-75 data-[state=checked]:bg-emerald-500 shadow-sm"
                                                                            />
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="text-right pr-8">
                                                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
                                                                                onClick={() => deleteAlertMutation.mutate(alert.id)}
                                                                            >
                                                                                <Trash2 size={14} />
                                                                            </Button>
                                                                        </div>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                ) : (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8">
                                                        {filteredAlerts.map((alert: any) => (
                                                            <motion.div
                                                                layout
                                                                initial={{ opacity: 0, scale: 0.95 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                key={alert.id}
                                                                className="group relative flex flex-col p-6 rounded-[2.5rem] border border-border/40 bg-card/40 hover:bg-card/60 hover:border-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-500/5 transition-all duration-500"
                                                            >
                                                                <div className="flex items-start justify-between mb-6">
                                                                    <div className="h-12 w-12 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 text-emerald-500/60 shadow-sm">
                                                                        <Bell size={22} />
                                                                    </div>
                                                                    <div className="flex items-center gap-2 bg-background/50 p-1.5 rounded-2xl border border-border/40">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8 rounded-xl text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 group-hover:opacity-100 opacity-0 transition-all duration-300"
                                                                            onClick={() => deleteAlertMutation.mutate(alert.id)}
                                                                        >
                                                                            <Trash2 size={14} />
                                                                        </Button>
                                                                        <Switch
                                                                            checked={alert.enabled}
                                                                            onCheckedChange={(enabled) => toggleAlertMutation.mutate({ id: alert.id, enabled })}
                                                                            className="scale-75 data-[state=checked]:bg-emerald-500 shadow-sm"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <h4 className="font-black text-base tracking-tight text-foreground uppercase truncate">{alert.name}</h4>
                                                                    <p className="text-[10px] font-bold text-muted-foreground/60 line-clamp-2 italic leading-relaxed uppercase tracking-tighter">{alert.alert_type} Protocol</p>
                                                                </div>
                                                                <div className="mt-6 pt-4 border-t border-border/20 flex items-center justify-between">
                                                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-foreground/40">{alert.delivery_method}</span>
                                                                    <span className="text-[9px] font-bold text-emerald-500/60 font-mono italic">{alert.recipient || 'INTERNAL'}</span>
                                                                </div>
                                                            </motion.div>
                                                        ))}
                                                    </div>
                                                )}
                                            </AnimatePresence>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-32 px-10 text-center">
                                                <motion.div
                                                    initial={{ scale: 0.9, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    className="relative mb-8"
                                                >
                                                    <div className="absolute inset-0 bg-emerald-500/10 blur-[100px] rounded-full animate-pulse" />
                                                    <div className="relative h-24 w-24 glass-panel rounded-3xl border-border/40 flex items-center justify-center shadow-xl ring-1 ring-white/10">
                                                        {notificationSearchQuery ? (
                                                            <Search className="h-10 w-10 text-muted-foreground/20 animate-in zoom-in-95" />
                                                        ) : (
                                                            <Bell className="h-10 w-10 text-muted-foreground/20" />
                                                        )}
                                                    </div>
                                                </motion.div>
                                                <h3 className="font-black text-xl text-foreground uppercase tracking-tight">
                                                    {notificationSearchQuery ? "No Matching Rules" : "Registry Empty"}
                                                </h3>
                                                <p className="text-xs mt-3 max-w-sm leading-relaxed text-muted-foreground font-bold italic opacity-60">
                                                    {notificationSearchQuery
                                                        ? `We couldn't find any rules matching "${notificationSearchQuery}".`
                                                        : "You haven't configured any notification rules yet. Create one to establish surveillance."}
                                                </p>
                                                {!notificationSearchQuery && (
                                                    <div className="mt-8">
                                                        <AlertConfigDialog />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-5 bg-muted/10 border-t border-border/40 flex items-center justify-between shrink-0">
                                        <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-background/50 border border-border/20 opacity-60">
                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none">Real-time surveillance active</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">Global Announcements</span>
                                            <Switch defaultChecked disabled className="scale-75 opacity-40 shadow-none" />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </main>
            </div>
        </motion.div>
    );
};