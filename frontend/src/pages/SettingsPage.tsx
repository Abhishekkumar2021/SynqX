/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import {
    User, Palette, Bell, ShieldAlert,
    Save,
    RefreshCw, Trash2, Moon, Sun, Monitor,
    Search, List as ListIcon, LayoutGrid,
    Table
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

type SettingsTab = 'general' | 'security' | 'notifications';

export const SettingsPage: React.FC = () => {
    const { user } = useAuth();
    const { theme, setTheme } = useTheme();
    const { isZenMode } = useZenMode();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');

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
            toast.success("Profile Updated", {
                description: "Your personal information has been successfully saved."
            });
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
            toast.success("Account Deleted", {
                description: "Your account and all associated data have been permanently removed."
            });
            window.location.href = '/login';
        },
        onError: () => toast.error("Deletion Failed", {
            description: "We couldn't delete your account at this time. Please contact support."
        })
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
            toast.success(variables.enabled ? "Alerts Enabled" : "Alerts Disabled", {
                description: `Notification preferences updated successfully.`
            });
        },
        onError: () => toast.error("Failed to update alert preferences")
    });

    const deleteAlertMutation = useMutation({
        mutationFn: deleteAlertConfig,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['alerts'] });
            toast.success("Alert rule deleted");
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
        { id: 'general', label: 'General', icon: User, description: 'Profile & Appearance' },
        { id: 'security', label: 'Security', icon: ShieldAlert, description: 'API Keys & Access' },
        { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Email & Alerts' },
    ];

    return (
        <motion.div
            className={cn(
                "relative flex flex-col gap-8 pb-10",
                isZenMode ? "min-h-[calc(100vh-4rem)]" : "min-h-[80vh]"
            )}
        >
            <PageMeta title="Settings" description="Manage workspace preferences and security." />

            {/* --- Ambient Background Effects (Subtle) --- */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-125 h-125 bg-primary/5 rounded-full blur-[100px] opacity-30" />
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-100 h-100 bg-blue-500/5 rounded-full blur-[100px] opacity-20" />
            </div>

            {/* --- Page Header --- */}
            <div className="flex flex-col gap-2 border-b border-border/50 pb-6 relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tighter text-foreground flex items-center gap-3">
                    Settings
                </h2>
                <p className="text-sm md:text-base text-muted-foreground font-medium pl-1">
                    Manage your workspace preferences, API access, and security configurations.
                </p>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 relative z-10">

                {/* --- Sidebar Navigation --- */}
                <aside className="lg:w-64 shrink-0 space-y-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as SettingsTab)}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 border border-transparent outline-none focus:ring-2 focus:ring-primary/20",
                                activeTab === tab.id
                                    ? "bg-card border-border/50 text-primary shadow-sm"
                                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            )}
                        >
                            <tab.icon className={cn("h-4 w-4", activeTab === tab.id ? "text-primary" : "text-muted-foreground")} />
                            <div className="flex flex-col items-start">
                                <span>{tab.label}</span>
                            </div>
                            {activeTab === tab.id && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
                            )}
                        </button>
                    ))}
                </aside>

                {/* --- Main Content Area --- */}
                <div className="flex-1 space-y-8 max-w-3xl">
                    <AnimatePresence mode="wait">
                        {activeTab === 'general' && (
                            <motion.div
                                key="general"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="space-y-6"
                            >
                                {/* Profile Card */}
                                <Card className="overflow-hidden shadow-sm border-border/60 bg-card/40 backdrop-blur-md">
                                    {/* Banner Background */}
                                    <div className="h-24 bg-linear-to-r from-blue-600/20 via-purple-600/20 to-primary/20 border-b border-border/20" />

                                    <CardHeader className="relative pt-0">
                                        <div className="absolute -top-12 left-6">
                                            <Avatar className="h-24 w-24 border-4 border-background shadow-xl ring-1 ring-border/20">
                                                <AvatarImage src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user?.email || 'synqx'}`} />
                                                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                                                    {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                                                </AvatarFallback>
                                            </Avatar>
                                        </div>
                                        <div className="ml-32 pt-4">
                                            <CardTitle className="text-xl">{user?.full_name || 'User'}</CardTitle>
                                            <CardDescription>{user?.email || 'guest@synqx.dev'}</CardDescription>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-6 mt-4">
                                        <div className="grid gap-6 md:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="display-name">Display Name</Label>
                                                <Input
                                                    id="display-name"
                                                    value={displayName}
                                                    onChange={(e) => setDisplayName(e.target.value)}
                                                    className="bg-background/50"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="email">Email</Label>
                                                <Input
                                                    id="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    className="bg-background/50"
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="bg-muted/30 border-t border-border/40 py-4 flex justify-end">
                                        <Button onClick={handleSaveProfile} disabled={profileMutation.isPending} className="shadow-lg shadow-primary/20">
                                            {profileMutation.isPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                            Save Changes
                                        </Button>
                                    </CardFooter>
                                </Card>

                                {/* Appearance - Theme Cards */}
                                <Card className="border-border/60 bg-card/40 backdrop-blur-md shadow-sm">
                                    <CardHeader>
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Palette className="h-4 w-4 text-purple-500" /> Interface Theme
                                        </CardTitle>
                                        <CardDescription>Select your preferred color mode for the dashboard.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-3 gap-4">
                                            <button
                                                onClick={() => setTheme('light')}
                                                className={cn(
                                                    "flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all hover:bg-muted/50 outline-none focus:ring-2 focus:ring-primary/20",
                                                    theme === 'light' ? "border-primary bg-primary/5" : "border-transparent bg-muted/20 hover:border-border/50"
                                                )}
                                            >
                                                <div className="p-3 bg-white rounded-full shadow-sm border border-slate-200">
                                                    <Sun className="h-5 w-5 text-amber-500" />
                                                </div>
                                                <span className="text-sm font-medium">Light</span>
                                            </button>

                                            <button
                                                onClick={() => setTheme('dark')}
                                                className={cn(
                                                    "flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all hover:bg-muted/50 outline-none focus:ring-2 focus:ring-primary/20",
                                                    theme === 'dark' ? "border-primary bg-primary/5" : "border-transparent bg-muted/20 hover:border-border/50"
                                                )}
                                            >
                                                <div className="p-3 bg-zinc-900 rounded-full shadow-sm border border-zinc-700">
                                                    <Moon className="h-5 w-5 text-blue-400" />
                                                </div>
                                                <span className="text-sm font-medium">Dark</span>
                                            </button>

                                            <button
                                                onClick={() => setTheme('system')}
                                                className={cn(
                                                    "flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all hover:bg-muted/50 outline-none focus:ring-2 focus:ring-primary/20",
                                                    theme === 'system' ? "border-primary bg-primary/5" : "border-transparent bg-muted/20 hover:border-border/50"
                                                )}
                                            >
                                                <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-full shadow-sm border border-border">
                                                    <Monitor className="h-5 w-5 text-foreground" />
                                                </div>
                                                <span className="text-sm font-medium">System</span>
                                            </button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}

                        {activeTab === 'security' && (
                            <motion.div
                                key="security"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="space-y-6"
                            >
                                <ApiKeysManager />

                                <Card className="border-destructive/30 bg-destructive/5 backdrop-blur-sm">
                                    <CardHeader>
                                        <CardTitle className="text-destructive text-base flex items-center gap-2">
                                            <ShieldAlert className="h-4 w-4" /> Danger Zone
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-foreground">Delete Account</p>
                                            <p className="text-xs text-muted-foreground max-w-sm">
                                                Permanently delete your account and all associated data. This action cannot be undone.
                                            </p>
                                        </div>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => setIsDeleteDialogOpen(true)}
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" /> Delete Account
                                        </Button>
                                    </CardContent>

                                    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will permanently delete your account, all connections, pipelines, and history.
                                                    You cannot recover this account.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => deleteAccountMutation.mutate()}
                                                    className={buttonVariants({ variant: "destructive" })}
                                                >
                                                    {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account"}
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </Card>
                            </motion.div>
                        )}

                        {activeTab === 'notifications' && (
                            <div className="flex flex-col h-full min-h-125 rounded-3xl border border-border/40 bg-background/40 backdrop-blur-xl shadow-xl overflow-hidden relative">
                                <div className="p-4 md:p-5 border-b border-border/40 bg-muted/10 flex flex-col md:flex-row items-center justify-between shrink-0 gap-4 md:gap-6">
                                    <div className="space-y-0.5 relative z-10">
                                        <h3 className="text-base font-bold flex items-center gap-2 text-foreground">
                                            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                                                <Bell className="h-3.5 w-3.5" />
                                            </div>
                                            Notification Registry
                                        </h3>
                                        <p className="text-[10px] text-muted-foreground font-bold tracking-tight pl-1">
                                            <span className="text-foreground">{alerts?.length || 0}</span> CONFIGURED RULES <span className="mx-2 opacity-30">•</span> <span className="text-emerald-500 font-black">ACTIVE</span> MONITORING
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 w-full md:w-auto">
                                        <div className="relative w-full md:w-56 group">
                                            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors z-20" />
                                            <Input
                                                placeholder="Filter rules..."
                                                className="pl-8 h-9 rounded-xl bg-background/50 border-border/40 focus:bg-background focus:border-primary/30 focus:ring-2 focus:ring-primary/5 transition-all shadow-none text-xs"
                                                value={notificationSearchQuery}
                                                onChange={(e) => setNotificationSearchQuery(e.target.value)}
                                            />
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            <div className="flex items-center bg-background/50 border border-border/40 rounded-xl p-0.5 mr-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className={cn(
                                                        "h-8 w-8 rounded-lg transition-all",
                                                        notificationViewMode === 'list' ? "bg-primary/10 text-primary shadow-sm" : "text-muted-foreground hover:bg-muted"
                                                    )}
                                                    onClick={() => setNotificationViewMode('list')}
                                                    title="List View"
                                                >
                                                    <ListIcon className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className={cn(
                                                        "h-8 w-8 rounded-lg transition-all",
                                                        notificationViewMode === 'grid' ? "bg-primary/10 text-primary shadow-sm" : "text-muted-foreground hover:bg-muted"
                                                    )}
                                                    onClick={() => setNotificationViewMode('grid')}
                                                    title="Grid View"
                                                >
                                                    <LayoutGrid className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <AlertConfigDialog />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-border/50 hover:scrollbar-thumb-border/80 scrollbar-track-transparent">
                                    {loadingAlerts && !alerts ? (
                                        <div className="divide-y divide-border/20 p-6">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="flex justify-between items-center py-4">
                                                    <div className="flex items-center gap-4">
                                                        <Skeleton className="h-10 w-10 rounded-xl" />
                                                        <div className="space-y-2">
                                                            <Skeleton className="h-4 w-48" />
                                                            <Skeleton className="h-3 w-24" />
                                                        </div>
                                                    </div>
                                                    <Skeleton className="h-8 w-24 rounded-lg" />
                                                </div>
                                            ))}
                                        </div>
                                    ) : filteredAlerts.length > 0 ? (
                                        <AnimatePresence mode="popLayout">
                                            {notificationViewMode === 'list' ? (
                                                <Table className="rounded-none border-none shadow-none">
                                                    <TableHeader className="bg-muted/20 border-b border-border/20">
                                                        <TableRow className="hover:bg-transparent border-none">
                                                            <TableHead className="pl-6 font-bold text-[10px] uppercase tracking-wider text-muted-foreground/70">Rule Configuration</TableHead>
                                                            <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground/70">Trigger Type</TableHead>
                                                            <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground/70">Delivery Path</TableHead>
                                                            <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground/70 text-center">Status</TableHead>
                                                            <TableHead className="text-right pr-6 font-bold text-[10px] uppercase tracking-wider text-muted-foreground/70">Control</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody className="divide-y divide-border/30">
                                                        {filteredAlerts.map((alert: any) => (
                                                            <TableRow key={alert.id} className="group hover:bg-muted/5 transition-colors border-b border-border/10">
                                                                <TableCell className="pl-6 py-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="h-9 w-9 rounded-xl bg-emerald-500/5 flex items-center justify-center border border-emerald-500/10 group-hover:scale-110 transition-transform text-emerald-500/60">
                                                                            <Bell className="h-4 w-4" />
                                                                        </div>
                                                                        <div className="flex flex-col">
                                                                            <span className="font-bold text-sm tracking-tight">{alert.name}</span>
                                                                            <span className="text-[10px] text-muted-foreground/60 font-bold truncate max-w-50">{alert.description || 'No description provided'}</span>
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-muted/30 border-border/40 px-2 py-0.5 rounded-md">
                                                                        {alert.alert_type}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[11px] font-black text-foreground/80 uppercase tracking-widest leading-none mb-1">{alert.delivery_method}</span>
                                                                        <span className="text-[9px] text-muted-foreground font-bold truncate max-w-30 opacity-60">{alert.recipient || 'In-App Channel'}</span>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="flex justify-center">
                                                                        <Switch
                                                                            checked={alert.enabled}
                                                                            onCheckedChange={(enabled) => toggleAlertMutation.mutate({ id: alert.id, enabled })}
                                                                            className="scale-75 data-[state=checked]:bg-emerald-500"
                                                                        />
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-right pr-6">
                                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
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
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                                                    {filteredAlerts.map((alert: any) => (
                                                        <motion.div
                                                            layout
                                                            initial={{ opacity: 0, scale: 0.9 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            key={alert.id}
                                                            className="group relative flex flex-col p-5 rounded-[2rem] border border-border/40 bg-card/40 hover:bg-card/60 hover:border-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-500/5 transition-all duration-500"
                                                        >
                                                            <div className="flex items-start justify-between mb-4">
                                                                <div className="h-12 w-12 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 text-emerald-500/60">
                                                                    <Bell className="h-6 w-6" />
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 rounded-xl text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 group-hover:opacity-100 opacity-0 transition-all duration-300"
                                                                        onClick={() => deleteAlertMutation.mutate(alert.id)}
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                    <Switch
                                                                        checked={alert.enabled}
                                                                        onCheckedChange={(enabled) => toggleAlertMutation.mutate({ id: alert.id, enabled })}
                                                                        className="scale-90 data-[state=checked]:bg-emerald-500"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            )}
                                        </AnimatePresence>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                                            <motion.div
                                                initial={{ scale: 0.9, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                className="relative mb-6"
                                            >
                                                <div className="absolute inset-0 bg-emerald-500/10 blur-3xl rounded-full" />
                                                <div className="relative h-20 w-20 glass-card rounded-3xl border-border/40 flex items-center justify-center shadow-xl">
                                                    {notificationSearchQuery ? (
                                                        <Search className="h-10 w-10 text-muted-foreground/30" />
                                                    ) : (
                                                        <Bell className="h-10 w-10 text-muted-foreground/30" />
                                                    )}
                                                </div>
                                            </motion.div>
                                            <h3 className="font-bold text-xl text-foreground">
                                                {notificationSearchQuery ? "No matching rules found" : "No notification rules yet"}
                                            </h3>
                                            <p className="text-sm mt-2 max-w-sm leading-relaxed text-muted-foreground font-medium">
                                                {notificationSearchQuery
                                                    ? `We couldn't find any alert rules matching "${notificationSearchQuery}". Try a different term.`
                                                    : "You haven't configured any notification rules yet. Create one to stay updated on your pipeline status."}
                                            </p>
                                            {!notificationSearchQuery && (
                                                <div className="mt-8">
                                                    <AlertConfigDialog />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 bg-muted/5 border-t border-border/40 flex items-center justify-between">
                                    <div className="flex items-center gap-2 px-2 py-1 opacity-50 cursor-not-allowed">
                                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Critical System Announcements</span>
                                    </div>
                                    <Switch defaultChecked disabled className="scale-75 opacity-50" />
                                </div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
};