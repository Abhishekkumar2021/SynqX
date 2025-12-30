/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import {
    User, Palette, Bell, ShieldAlert,
    Save, Mail,
    Laptop, Lock, 
    RefreshCw, Trash2, Moon, Sun, Monitor
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useZenMode } from '@/context/ZenContext';
import { PageMeta } from '@/components/common/PageMeta';
import { useTheme } from '@/hooks/useTheme';
import { ApiKeysManager } from '@/components/settings/ApiKeysManager';
import { updateUser, deleteUser, getAlertConfigs, updateAlertConfig } from '@/lib/api';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';

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
    
    // Danger Zone State
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] opacity-30" />
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px] opacity-20" />
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

                            <Card className="border-border/60 bg-card/40 backdrop-blur-md">
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Lock className="h-4 w-4 text-blue-500" /> Active Sessions
                                    </CardTitle>
                                    <CardDescription>Manage devices currently logged into your account.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between p-3 border-b border-border/40 last:border-0">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-green-500/10 text-green-500 rounded-lg border border-green-500/20">
                                                <Laptop className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">Current Browser</p>
                                                <p className="text-xs text-muted-foreground"><span className="text-green-500 font-medium">Active Now</span></p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

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
                        <motion.div 
                            key="notifications"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="space-y-6"
                        >
                            <Card className="border-border/60 bg-card/40 backdrop-blur-md">
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-emerald-500" /> Email Notifications
                                    </CardTitle>
                                    <CardDescription>Choose what updates you want to receive via email.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {loadingAlerts ? (
                                        <div className="space-y-4">
                                            <Skeleton className="h-12 w-full" />
                                            <Skeleton className="h-12 w-full" />
                                        </div>
                                    ) : alerts && alerts.length > 0 ? (
                                        alerts.map((alert) => (
                                            <div key={alert.id} className="flex items-center justify-between space-x-4">
                                                <div className="flex flex-col space-y-1">
                                                    <Label className="text-sm font-medium leading-none">{alert.name}</Label>
                                                    <p className="text-xs text-muted-foreground">{alert.description || alert.alert_type}</p>
                                                </div>
                                                <Switch 
                                                    checked={alert.enabled} 
                                                    onCheckedChange={(enabled) => toggleAlertMutation.mutate({ id: alert.id, enabled })}
                                                />
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center text-muted-foreground text-sm py-4">
                                            No alert configurations found.
                                        </div>
                                    )}
                                    
                                    <Separator className="bg-border/40" />
                                    
                                    <div className="flex items-center justify-between space-x-4 opacity-50 cursor-not-allowed">
                                        <div className="flex flex-col space-y-1">
                                            <Label className="text-sm font-medium leading-none">System Announcements</Label>
                                            <p className="text-xs text-muted-foreground">Major feature releases and maintenance.</p>
                                        </div>
                                        <Switch defaultChecked disabled />
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
};