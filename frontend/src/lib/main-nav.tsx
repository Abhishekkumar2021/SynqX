import React from 'react';
import {
    LayoutDashboard, Database, Workflow, Activity, Settings2,
    Search, Component, Users, FileText, ShieldAlert, GitMerge, Cpu,
    FlaskConical} from 'lucide-react';

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
        title: "Monitor",
        items: [
            { label: "Dashboard", to: "/dashboard", icon: <LayoutDashboard />, end: true },
            { label: "Activity", to: "/jobs", icon: <Activity /> },
            { label: "Lineage", to: "/map", icon: <GitMerge /> },
        ]
    },
    {
        title: "Build",
        items: [
            { label: "Pipelines", to: "/pipelines", icon: <Workflow /> },
            { label: "Connections", to: "/connections", icon: <Database /> },
            { label: "Explorer", to: "/explorer", icon: <Search /> },
            { label: "Lab", to: "/interactive-lab", icon: <FlaskConical /> },
        ]
    },
    {
        title: "Manage",
        items: [
            { label: "Agents", to: "/agents", icon: <Cpu /> },
            { label: "Operators", to: "/operators", icon: <Component /> },
            { label: "Quarantine", to: "/quarantine", icon: <ShieldAlert /> },
        ]
    },
    {
        title: "System",
        items: [
            { label: "Audit", to: "/audit-logs", icon: <FileText /> },
            { label: "Team", to: "/team", icon: <Users /> },
            { label: "Settings", to: "/settings?tab=general", icon: <Settings2 />, end: true },
        ]
    }
];