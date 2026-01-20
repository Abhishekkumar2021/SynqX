import React from 'react'
import {
  LayoutDashboard,
  Database,
  Workflow,
  Activity,
  Settings2,
  Search,
  Component,
  Users,
  FileText,
  ShieldAlert,
  GitMerge,
  Cpu,
  FlaskConical,
  Bell,
} from 'lucide-react'

export interface NavItemDef {
  label: string
  to: string
  icon: React.ReactNode
  end?: boolean
}

export interface NavGroupDef {
  title: string
  items: NavItemDef[]
}

export const NAV_STRUCTURE: NavGroupDef[] = [
  {
    title: 'Orchestration',
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: <LayoutDashboard />, end: true },
      { label: 'Connections', to: '/connections', icon: <Database /> },
      { label: 'Pipelines', to: '/pipelines', icon: <Workflow /> },
      { label: 'Runs', to: '/jobs', icon: <Activity /> },
      { label: 'Alerts', to: '/alerts', icon: <Bell /> },
    ],
  },
  {
    title: 'Data Fabric',
    items: [
      { label: 'Explorer', to: '/explorer', icon: <Search /> },
      { label: 'Lineage', to: '/map', icon: <GitMerge /> },
      { label: 'Quarantine', to: '/quarantine', icon: <ShieldAlert /> },
    ],
  },
  {
    title: 'Infrastructure',
    items: [
      { label: 'Agents', to: '/agents', icon: <Cpu /> },
      { label: 'Operators', to: '/operators', icon: <Component /> },
      { label: 'Workbench', to: '/interactive-lab', icon: <FlaskConical /> },
    ],
  },
  {
    title: 'Governance',
    items: [
      { label: 'Audit Logs', to: '/audit-logs', icon: <FileText /> },
      { label: 'Team', to: '/team', icon: <Users /> },
      { label: 'Settings', to: '/settings?tab=general', icon: <Settings2 />, end: true },
    ],
  },
]
