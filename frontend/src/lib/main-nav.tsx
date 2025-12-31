import React from 'react';
import {
    LayoutDashboard, Cable, Workflow, Activity, Settings,
    Search, Sparkles, Users, Logs
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
    { label: "Explorer", to: "/explorer", icon: <Search /> },
    { label: "Operators", to: "/operators", icon: <Sparkles /> },
    { label: "Pipelines", to: "/pipelines", icon: <Workflow /> },
    { label: "Jobs & Runs", to: "/jobs", icon: <Activity /> },
];

export const CONFIG_NAV: NavItemDef[] = [
    { label: "Team", to: "/team", icon: <Users /> },
    { label: "Audit Logs", to: "/audit-logs", icon: <Logs /> },
    { label: "Settings", to: "/settings", icon: <Settings />, end: true },
];
