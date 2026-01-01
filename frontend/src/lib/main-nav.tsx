import React from 'react';
import {
    LayoutDashboard, Cable, Workflow, Activity, Settings,
    Search, Sparkles, Users, Logs, ShieldAlert, Share2
} from 'lucide-react';

export interface NavItemDef {
    label: string;
    to: string;
    icon: React.ReactNode;
    end?: boolean;
}

export const MAIN_NAV: NavItemDef[] = [
    { label: "Dashboard", to: "/dashboard", icon: <LayoutDashboard />, end: true },
    { label: "Connections", to: "/connections", icon: <Cable /> },
    { label: "Pipelines", to: "/pipelines", icon: <Workflow /> },
    { label: "Data Map", to: "/map", icon: <Share2 /> },
    { label: "Jobs & Runs", to: "/jobs", icon: <Activity /> },
    { label: "Explorer", to: "/explorer", icon: <Search /> },
    { label: "Operators", to: "/operators", icon: <Sparkles /> },
];
export const CONFIG_NAV: NavItemDef[] = [
    { label: "Team", to: "/team", icon: <Users /> },
    { label: "Quarantine", to: "/quarantine", icon: <ShieldAlert /> },
    { label: "Audit Logs", to: "/audit-logs", icon: <Logs /> },
    { label: "Settings", to: "/settings", icon: <Settings />, end: true },
];
