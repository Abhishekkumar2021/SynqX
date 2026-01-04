import React from 'react';
import {
    LayoutDashboard, Cable, Workflow, Activity, Settings,
    Search, Sparkles, Users, Logs, ShieldAlert, Share2, Server,
    Zap} from 'lucide-react';

export interface NavItemDef {
    label: string;
    to: string;
    icon: React.ReactNode;
    end?: boolean;
}

export interface NavGroupDef {
    title: string;
    items: NavItemDef[];
}

export const NAV_STRUCTURE: NavGroupDef[] = [
    {
        title: "Overview",
        items: [
            { label: "Dashboard", to: "/dashboard", icon: <LayoutDashboard />, end: true },
            { label: "Execution Logs", to: "/jobs", icon: <Activity /> },
            { label: "Interactive Lab", to: "/interactive-lab", icon: <Zap /> },
        ]
    },
    {
        title: "Architecture",
        items: [
            { label: "Connectivity Hub", to: "/connections", icon: <Cable /> },
            { label: "Pipelines", to: "/pipelines", icon: <Workflow /> },
            { label: "Execution Agents", to: "/agents", icon: <Server /> },
            { label: "Topology Map", to: "/map", icon: <Share2 /> },
        ]
    },
    {
        title: "Tools",
        items: [
            { label: "Data Explorer", to: "/explorer", icon: <Search /> },
            { label: "Standard Library", to: "/operators", icon: <Sparkles /> },
        ]
    },
    {
        title: "Governance",
        items: [
            { label: "Quarantine", to: "/quarantine", icon: <ShieldAlert /> },
            { label: "Audit Trail", to: "/audit-logs", icon: <Logs /> },
            { label: "Workspace Team", to: "/team", icon: <Users /> },
            { label: "Settings", to: "/settings?tab=general", icon: <Settings />, end: true },
        ]
    }
];