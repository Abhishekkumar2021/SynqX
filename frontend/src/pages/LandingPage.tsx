import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/layout/ModeToggle';
import { motion } from 'framer-motion';
import {
    Workflow, Zap, Shield, Globe, ArrowRight,
    Database, Cable, BarChart3,
    Lock, Clock, CheckCircle2,
    Code2, Sparkles, Server, Cpu
} from 'lucide-react';
import { FeatureCard } from '@/components/features/landing/FeatureCard';
import { StatItem } from '@/components/features/landing/StatItem';
import { IntegrationItem, IntegrationCard } from '@/components/features/landing/IntegrationComponents';
import { MockNode } from '@/components/features/landing/MockNode';
import { PageMeta } from '@/components/common/PageMeta';

export function LandingPage() {
    return (
        <div className="flex flex-col min-h-screen font-sans bg-background text-foreground overflow-x-hidden">
            <PageMeta title="Home" description="The Universal ETL Engine for modern data stacks." />

            {/* --- Header: Glassmorphic Navigation --- */}
            <header className="fixed top-0 w-full z-50 px-6 h-16 flex items-center justify-between border-b border-border/40 bg-background/60 backdrop-blur-xl supports-backdrop-filter:bg-background/60 transition-all duration-300">
                <div className="flex items-center gap-2.5 font-bold text-xl tracking-tight">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
                        <Zap className="w-5 h-5 fill-current" />
                    </div>
                    <span>SynqX</span>
                </div>

                <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground/80">
                    {['Features', 'Integrations', 'Pricing'].map((item) => (
                        <a key={item} href={`#${item.toLowerCase()}`} className="hover:text-primary transition-colors duration-200">
                            {item}
                        </a>
                    ))}
                    <Link to="/docs" className="hover:text-primary transition-colors">Docs</Link>
                </nav>

                <div className="flex items-center gap-4">
                    <ModeToggle />
                    <Link to="/login" className="hidden sm:block">
                        <Button variant="ghost" size="sm" className="font-medium hover:bg-primary/10 hover:text-primary rounded-full px-4">
                            Sign In
                        </Button>
                    </Link>
                    <Link to="/dashboard">
                        <Button size="sm" className="rounded-full px-5 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all font-semibold">
                            Console
                            <ArrowRight className="ml-2 h-3.5 w-3.5" />
                        </Button>
                    </Link>
                </div>
            </header>

            <main className="flex-1 pt-16">

                {/* --- Hero Section --- */}
                <section className="relative py-24 lg:py-32 overflow-hidden flex flex-col items-center justify-center">
                    {/* Background Textures */}
                    <div className="absolute inset-0 -z-10 h-full w-full bg-grid-subtle opacity-[0.6]"></div>
                    <div className="absolute inset-0 bg-linear-to-b from-background via-transparent to-background z-0 pointer-events-none"></div>

                    {/* Ambient Glows */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/10 blur-[120px] -z-10 rounded-full mix-blend-screen pointer-events-none" />
                    <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-indigo-500/10 blur-[100px] -z-10 rounded-full pointer-events-none" />

                    <div className="container px-4 md:px-6 mx-auto text-center space-y-10 relative z-10">
                        {/* Release Badge */}
                        <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-700">
                            <Sparkles className="mr-2 h-3.5 w-3.5 fill-current" />
                            <span>v2.0 is live — The Universal ETL Engine</span>
                        </div>

                        {/* Headlines */}
                        <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
                            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1]">
                                <span className="block text-foreground">Orchestrate Data</span>
                                <span className="text-gradient font-extrabold">
                                    At Light Speed
                                </span>
                            </h1>
                            <p className="mx-auto max-w-2xl text-muted-foreground md:text-xl leading-relaxed">
                                Build, debug, and scale your data pipelines with a visual canvas.
                                <span className="text-foreground font-medium"> Zero config overhead.</span>
                                <span className="text-foreground font-medium"> Instant observability.</span>
                            </p>
                        </div>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                            <Link to="/dashboard">
                                <Button size="lg" className="h-14 px-8 text-base rounded-full shadow-xl shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300">
                                    Start Building Now
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                            <Link to="/docs">
                                <Button variant="outline" size="lg" className="h-14 px-8 text-base rounded-full glass-card hover:bg-secondary/50 transition-all border-border/50">
                                    <Code2 className="mr-2 h-4 w-4" />
                                    Read Documentation
                                </Button>
                            </Link>
                        </div>

                        {/* Interactive Hero Graphic: Glass Window */}
                        <div className="mt-24 relative group max-w-6xl mx-auto perspective-[2000px] animate-in fade-in zoom-in-95 duration-1000 delay-500">
                            {/* Window Glow */}
                            <div className="absolute -inset-1 bg-linear-to-r from-primary/20 via-indigo-500/20 to-blue-600/20 rounded-[2rem] blur-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-500"></div>

                            <div className="relative rounded-[2rem] glass-panel border-white/10 dark:border-white/5 shadow-2xl overflow-hidden transform transition-transform duration-700 hover:scale-[1.005]">
                                {/* Window Toolbar */}
                                <div className="border-b border-border/40 bg-muted/20 px-4 py-3 flex items-center justify-between backdrop-blur-md">
                                    <div className="flex gap-2">
                                        <div className="w-3 h-3 rounded-full bg-destructive/80 border border-destructive/20"></div>
                                        <div className="w-3 h-3 rounded-full bg-warning/80 border border-warning/20"></div>
                                        <div className="w-3 h-3 rounded-full bg-success/80 border border-success/20"></div>
                                    </div>
                                    <div className="px-3 py-1 rounded-full bg-background/50 border border-border/40 text-[10px] text-muted-foreground font-mono flex items-center gap-2 shadow-sm">
                                        <Lock className="h-2.5 w-2.5" />
                                        synqx.app/pipelines/production-v1
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="h-2 w-12 rounded-full bg-muted-foreground/10" />
                                    </div>
                                </div>

                                {/* Canvas Area */}
                                <div className="h-[450px] md:h-[550px] relative w-full overflow-hidden flex items-center justify-center bg-background/30">
                                    <div className="absolute inset-0 bg-grid-subtle opacity-40 mask-[radial-gradient(ellipse_at_center,black_40%,transparent_100%)]"></div>

                                    <svg
                                        className="absolute inset-0 w-full h-full pointer-events-none drop-shadow-sm"
                                        viewBox="0 0 100 100"
                                        preserveAspectRatio="none"
                                    >
                                        <defs>
                                            {/* 1. Elegant Gradient for the static lines */}
                                            <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.1" />
                                                <stop offset="50%" stopColor="var(--color-primary)" stopOpacity="0.4" />
                                                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.1" />
                                            </linearGradient>

                                            {/* 2. Plasma Glow Filter for the Dots */}
                                            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                                                <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                                                <feMerge>
                                                    <feMergeNode in="coloredBlur" />
                                                    <feMergeNode in="SourceGraphic" />
                                                </feMerge>
                                            </filter>
                                        </defs>

                                        <g style={{ vectorEffect: 'non-scaling-stroke' }}>
                                            {/* Re-usable Path Component 
                                                Combines a static background trace with a live drawing animation 
                                            */}
                                            {[
                                                "M 28 50 C 35 50, 35 30, 42 30", // Source -> Top
                                                "M 28 50 C 35 50, 35 70, 42 70", // Source -> Bottom
                                                "M 58 30 C 65 30, 65 50, 72 50", // Top -> Sink
                                                "M 58 70 C 65 70, 65 50, 72 50"  // Bottom -> Sink
                                            ].map((d, i) => (
                                                <g key={i}>
                                                    {/* Background Trace (Depth) */}
                                                    <path
                                                        d={d}
                                                        stroke="var(--color-border)"
                                                        strokeWidth="3"
                                                        fill="none"
                                                        className="opacity-20"
                                                    />

                                                    {/* Active Wire (Draws on load) */}
                                                    <motion.path
                                                        d={d}
                                                        stroke="url(#edge-gradient)"
                                                        strokeWidth="0.5"
                                                        fill="none"
                                                        initial={{ pathLength: 0, opacity: 0 }}
                                                        animate={{ pathLength: 1, opacity: 1 }}
                                                        transition={{
                                                            duration: 1.5,
                                                            ease: "easeInOut",
                                                            delay: 0.2 + (i * 0.1) // Staggered draw
                                                        }}
                                                    />

                                                    {/* Glowing Data Packet (Infinite Loop) */}
                                                    <circle r="0.5" fill="var(--color-primary)" filter="url(#glow)">
                                                        <animateMotion
                                                            dur={`${3 + i}s`} // Varied speeds for organic feel
                                                            repeatCount="indefinite"
                                                            path={d}
                                                            calcMode="linear"
                                                            keyTimes="0;1"
                                                            keyPoints="0;1"
                                                        />
                                                    </circle>
                                                </g>
                                            ))}
                                        </g>
                                    </svg>

                                    {/* Mock Nodes Positions */}

                                    {/* Source: Left 10% */}
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.5, delay: 0.2 }}
                                        className="absolute left-[10%] w-[18%] min-w-40 top-1/2 -translate-y-1/2 z-10"
                                    >
                                        <div className="animate-float-slow">
                                            <MockNode icon={<Database className="text-chart-1" />} title="Postgres DB" sub="Read Replica" type="source" />
                                        </div>
                                    </motion.div>

                                    {/* Transform Top: Left 42% */}
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.5, delay: 0.4 }}
                                        className="absolute left-[42%] w-[16%] min-w-[150px] top-[30%] -translate-y-1/2 z-10"
                                    >
                                        <div className="animate-float-medium">
                                            <MockNode icon={<Code2 className="text-chart-3" />} title="Transform Py" sub="Python 3.9" type="transform" status="running" active />
                                        </div>
                                    </motion.div>

                                    {/* Transform Bottom: Left 42% */}
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.5, delay: 0.5 }}
                                        className="absolute left-[42%] w-[16%] min-w-[150px] top-[70%] -translate-y-1/2 z-10"
                                    >
                                        <div className="animate-float-fast">
                                            <MockNode icon={<Shield className="text-chart-5" />} title="PII Redact" sub="Security Policy" type="transform" />
                                        </div>
                                    </motion.div>

                                    {/* Sink: Right 10% */}
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.5, delay: 0.6 }}
                                        className="absolute right-[10%] w-[18%] min-w-40 top-1/2 -translate-y-1/2 z-10"
                                    >
                                        <div className="animate-float-slow">
                                            <MockNode icon={<Globe className="text-chart-2" />} title="Snowflake" sub="Analytics DB" type="sink" />
                                        </div>
                                    </motion.div>

                                    {/* Status Pill */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 1 }}
                                        className="absolute bottom-6 right-6 glass-card rounded-full px-4 py-2 text-xs font-mono text-success flex items-center gap-2 z-20"
                                    >
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                                        </span>
                                        System Operational
                                    </motion.div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* --- Stats Section --- */}
                <section className="py-20 border-y border-border/40 bg-muted/10 relative">
                    <div className="container px-4 md:px-6 mx-auto">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center divide-x divide-border/20">
                            <StatItem number="50+" label="Native Connectors" />
                            <StatItem number="1.2B" label="Rows / Day" />
                            <StatItem number="99.99%" label="Uptime SLA" />
                            <StatItem number="<50ms" label="Engine Latency" />
                        </div>
                    </div>
                </section>

                {/* --- Features Grid --- */}
                <section id="features" className="py-32 relative bg-background">
                    <div className="container px-4 md:px-6 mx-auto">
                        <div className="text-center mb-20 space-y-4">
                            <div className="text-primary font-semibold tracking-wider text-xs uppercase bg-primary/10 w-fit mx-auto px-3 py-1 rounded-full">
                                Power & Flexibility
                            </div>
                            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
                                Everything you need to move data
                            </h2>
                            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                                From simple replications to complex DAGs, SynqX handles the heavy lifting.
                            </p>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[
                                { icon: Workflow, title: "Visual Builder", desc: "Drag and drop nodes to create complex data flows." },
                                { icon: Zap, title: "Real-time Observability", desc: "Watch logs stream in real-time via WebSockets." },
                                { icon: Shield, title: "Enterprise Security", desc: "RBAC, encrypted credentials, and VPC peering support." },
                                { icon: Cpu, title: "Smart Scaling", desc: "Auto-scale workers based on pipeline load." },
                                { icon: Lock, title: "Data Governance", desc: "PII detection and compliance-ready audit logs." },
                                { icon: Clock, title: "Flexible Scheduling", desc: "Cron expressions, event triggers, or API-driven runs." }
                            ].map((feature, i) => (
                                <FeatureCard
                                    key={i}
                                    icon={<feature.icon className="h-6 w-6 text-primary" />}
                                    title={feature.title}
                                    description={feature.desc}
                                />
                            ))}
                        </div>
                    </div>
                </section>

                {/* --- Integrations Showcase --- */}
                <section id="integrations" className="py-32 bg-muted/20 border-t border-border/40 overflow-hidden relative">
                    <div className="absolute top-0 right-0 -mr-40 -mt-40 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

                    <div className="container px-4 md:px-6 mx-auto">
                        <div className="grid lg:grid-cols-2 gap-20 items-center">
                            <div className="space-y-8 relative z-10">
                                <div className="space-y-4">
                                    <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
                                        Ecosystem
                                    </div>
                                    <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Connect to anything</h2>
                                    <p className="text-muted-foreground text-lg leading-relaxed">
                                        SynqX supports 50+ native connectors including major databases, data warehouses, and SaaS APIs.
                                    </p>
                                </div>

                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <IntegrationItem icon={<Database className="h-4 w-4 text-chart-1" />} text="PostgreSQL, MySQL" />
                                    <IntegrationItem icon={<Globe className="h-4 w-4 text-chart-2" />} text="Snowflake, BigQuery" />
                                    <IntegrationItem icon={<Cable className="h-4 w-4 text-chart-3" />} text="Salesforce, HubSpot" />
                                    <IntegrationItem icon={<BarChart3 className="h-4 w-4 text-chart-4" />} text="AWS S3, Azure Blob" />
                                </ul>

                                <Link to="/connections">
                                    <Button variant="outline" className="group h-12 px-6 glass-card hover:bg-primary/5 transition-all rounded-full border-border/60">
                                        View All Connectors
                                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform text-primary" />
                                    </Button>
                                </Link>
                            </div>

                            <div className="relative h-[500px] w-full flex items-center justify-center perspective-[1000px]">
                                {/* Central Hub */}
                                <div className="z-20 h-32 w-32 glass-panel rounded-3xl flex items-center justify-center relative">
                                    <div className="absolute inset-0 rounded-3xl bg-primary/5 animate-pulse" />
                                    <Workflow className="h-14 w-14 text-primary relative z-10" />
                                </div>

                                {/* Orbiting Cards */}
                                <IntegrationCard name="Snowflake" icon={<Globe />} color="text-chart-2" position="absolute top-10 left-10 animate-float-slow" />
                                <IntegrationCard name="Postgres" icon={<Database />} color="text-chart-1" position="absolute bottom-20 left-0 animate-float-medium" />
                                <IntegrationCard name="S3 Bucket" icon={<Server />} color="text-chart-3" position="absolute top-0 right-20 animate-float-fast" />
                                <IntegrationCard name="dbt Core" icon={<Code2 />} color="text-chart-4" position="absolute bottom-10 right-10 animate-float-slow" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* --- Final CTA --- */}
                <section className="py-32 border-t border-border/40 relative overflow-hidden">
                    <div className="absolute inset-0 bg-grid-subtle opacity-30 pointer-events-none" />

                    <div className="container px-4 md:px-6 mx-auto text-center space-y-10 relative z-10">
                        <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
                            Ready to modernize your stack?
                        </h2>
                        <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
                            Join thousands of data teams building reliable, scalable pipelines with SynqX.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                            <Link to="/dashboard">
                                <Button size="lg" className="h-14 px-10 text-lg rounded-full shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all hover:-translate-y-1 bg-primary text-primary-foreground">
                                    Start Free Trial
                                </Button>
                            </Link>
                            <a href="#" className="h-14 px-10 text-lg rounded-full glass-card hover:bg-muted/50 transition-all flex items-center justify-center border-border/60">
                                Schedule Demo
                            </a>
                        </div>
                        <div className="flex items-center justify-center gap-8 pt-8 text-muted-foreground text-sm">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-success" /> No credit card required
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-success" /> 14-day free trial
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* --- Footer --- */}
            <footer className="py-16 border-t border-border/40 bg-muted/5 relative text-sm">
                <div className="container px-4 md:px-6 mx-auto relative z-10">
                    <div className="grid md:grid-cols-4 gap-12 mb-12">
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 font-bold text-xl text-foreground">
                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Workflow className="h-5 w-5 text-primary" />
                                </div>
                                <span>SynqX</span>
                            </div>
                            <p className="text-muted-foreground leading-relaxed">
                                The universal ETL engine designed for the modern data stack.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-6 text-foreground">Product</h4>
                            <ul className="space-y-3 text-muted-foreground">
                                <li><a href="#" className="hover:text-primary transition-colors">Features</a></li>
                                <li><a href="#" className="hover:text-primary transition-colors">Integrations</a></li>
                                <li><a href="#" className="hover:text-primary transition-colors">Pricing</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-6 text-foreground">Resources</h4>
                            <ul className="space-y-3 text-muted-foreground">
                                <li><a href="#" className="hover:text-primary transition-colors">Documentation</a></li>
                                <li><a href="#" className="hover:text-primary transition-colors">API Reference</a></li>
                                <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-6 text-foreground">Legal</h4>
                            <ul className="space-y-3 text-muted-foreground">
                                <li><a href="#" className="hover:text-primary transition-colors">Privacy</a></li>
                                <li><a href="#" className="hover:text-primary transition-colors">Terms</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-8 border-t border-border/40 text-center text-muted-foreground flex flex-col md:flex-row justify-between items-center gap-4">
                        <p>© 2025 SynqX Inc. All rights reserved.</p>
                        <div className="flex gap-6">
                            <a href="#" className="hover:text-foreground transition-colors">Twitter</a>
                            <a href="#" className="hover:text-foreground transition-colors">GitHub</a>
                            <a href="#" className="hover:text-foreground transition-colors">Discord</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}