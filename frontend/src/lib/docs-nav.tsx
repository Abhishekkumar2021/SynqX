import React from 'react'
import {
  ChevronRight,
  Server,
  Database,
  GitGraph,
  Activity,
  FileJson,
  Laptop,
  Lock,
  Zap,
  Terminal,
  Bell,
  Workflow,
  Book,
} from 'lucide-react'

export interface NavItemDef {
  title: string
  href: string
  icon: React.ReactNode
  end?: boolean
}

export interface NavSection {
  title: string
  items: NavItemDef[]
}

export const DOCS_NAV: NavSection[] = [
  {
    title: 'Getting Started',
    items: [
      { title: 'Introduction', href: '/docs/intro', icon: <Zap /> },
      { title: 'Architecture', href: '/docs/architecture', icon: <Server /> },
    ],
  },
  {
    title: 'Core Concepts',
    items: [
      { title: 'Data Models', href: '/docs/data-models', icon: <Database /> },
      { title: 'Pipelines & DAGs', href: '/docs/pipelines', icon: <GitGraph /> },
      { title: 'Connectors', href: '/docs/connectors', icon: <Zap /> },
      { title: 'dbt Projects', href: '/docs/connectors/dbt', icon: <Workflow /> },
      { title: 'Operator Reference', href: '/docs/operators', icon: <Book /> },
    ],
  },
  {
    title: 'Execution & Monitoring',
    items: [
      { title: 'Runtime engine', href: '/docs/execution', icon: <Activity /> },
      { title: 'Observability', href: '/docs/observability', icon: <FileJson />, end: true },
      { title: 'Notifications', href: '/docs/observability/notifications', icon: <Bell /> },
      { title: 'Live Forensic', href: '/docs/observability/realtime-logs', icon: <Terminal /> },
    ],
  },
  {
    title: 'Guides',
    items: [
      { title: 'Console UI', href: '/docs/frontend-ui', icon: <Laptop /> },
      { title: 'Visual Editor', href: '/docs/pipelines/editor', icon: <Book /> },
      { title: 'Navigation (⌘K)', href: '/docs/guides/navigation', icon: <ChevronRight /> },
      { title: 'Security', href: '/docs/guides/security', icon: <Lock /> },
    ],
  },
  {
    title: 'Developer',
    items: [
      { title: 'API Reference', href: '/docs/api-reference', icon: <Terminal /> },
      { title: 'Custom Operators', href: '/docs/operators/custom', icon: <Workflow /> },
    ],
  },
]
