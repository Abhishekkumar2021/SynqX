import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import {
    Loader2, Mail, Lock, Eye, EyeOff,
    ArrowRight, Sparkles, Shield, AlertCircle,
    Zap,
    Workflow
} from 'lucide-react';
import { PageMeta } from '@/components/common/PageMeta';
import { cn } from '@/lib/utils';
import { AxiosError } from 'axios';

export const LoginPage: React.FC = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Performance: Use ref for mouse tracking to avoid re-renders
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const { clientX, clientY } = e;
            const { innerWidth, innerHeight } = window;

            const x = (clientX / innerWidth) * 100;
            const y = (clientY / innerHeight) * 100;

            containerRef.current.style.setProperty('--mouse-x', `${x}%`);
            containerRef.current.style.setProperty('--mouse-y', `${y}%`);
            containerRef.current.style.setProperty('--cursor-x', `${clientX}px`);
            containerRef.current.style.setProperty('--cursor-y', `${clientY}px`);
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const data = await loginUser({ username: email, password });
            login(data.access_token);
            toast.success('Welcome back, Commander.');
            navigate('/dashboard');
        } catch (err: unknown) {
            const error = err as AxiosError;
            if (error.response?.status === 401) {
                toast.error('Invalid credentials', {
                    description: "Please check your email and password.",
                    icon: <AlertCircle className="h-4 w-4 text-destructive" />
                });
            } else {
                toast.error('Login failed', {
                    description: "Something went wrong. Please try again later."
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div ref={containerRef} className="relative min-h-screen grid lg:grid-cols-2 overflow-hidden bg-background font-sans selection:bg-primary/20">
            <PageMeta title="Login" description="Sign in to your SynqX account." />

            {/* --- RIGHT PANEL: Brand Visuals (Locked Dark Mode) --- */}
            <div className="relative hidden h-full flex-col bg-[#020204] p-12 text-white lg:flex border-r border-white/10 overflow-hidden justify-between select-none">

                {/* 1. Dynamic Background Layers */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-soft-light pointer-events-none"></div>
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[40px_40px] opacity-[0.15]"></div>

                    {/* Mouse Follow Spotlight */}
                    <div
                        className="absolute inset-0 opacity-40 transition-opacity duration-500 will-change-transform"
                        style={{
                            background: `radial-gradient(800px circle at var(--cursor-x) var(--cursor-y), rgba(59, 130, 246, 0.15), transparent 80%)`
                        }}
                    ></div>

                    {/* Ambient Orbs */}
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] opacity-40 animate-pulse-slow"></div>
                    <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] opacity-30 animate-pulse-slow delay-1000"></div>
                </div>

                {/* 2. Top Brand */}
                <div className="relative z-20 flex items-center gap-3 animate-in fade-in slide-in-from-top-8 duration-1000">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-primary to-indigo-600 shadow-lg shadow-primary/20 ring-1 ring-white/10">
                        <Zap className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-white">SynqX</span>
                </div>

                {/* 3. Feature Highlights (Middle) */}
                <div className="relative z-20 space-y-10 max-w-lg animate-in fade-in slide-in-from-left-8 duration-1000 delay-200">
                    <h2 className="text-4xl md:text-5xl font-bold leading-[1.1] tracking-tight text-transparent bg-clip-text bg-linear-to-b from-white to-white/50">
                        Orchestrate data,<br /> control the future.
                    </h2>

                    <div className="space-y-4">
                        {[
                            { icon: Shield, title: "Enterprise Grade", desc: "SOC2 Compliant security architecture" },
                            { icon: Zap, title: "Zero Latency", desc: "Real-time stream processing engine" },
                            { icon: Sparkles, title: "AI Optimized", desc: "Self-healing pipeline capabilities" }
                        ].map((feature, idx) => (
                            <div key={idx} className="group flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 hover:translate-x-1">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5 text-indigo-300 ring-1 ring-white/10 group-hover:bg-primary/20 group-hover:text-white transition-colors">
                                    <feature.icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white text-sm">{feature.title}</h3>
                                    <p className="text-xs text-zinc-400 mt-0.5">{feature.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 4. Footer/Testimonial */}
                <div className="relative z-20 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
                    <div className="p-6 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-linear-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <blockquote className="space-y-4 relative z-10">
                            <p className="text-base font-medium leading-relaxed text-zinc-200 italic">
                                &ldquo;The real-time forensic logging capabilities alone have saved us hundreds of engineering hours.&rdquo;
                            </p>
                            <footer className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-linear-to-br from-blue-400 to-primary p-0.5">
                                    <div className="h-full w-full rounded-full bg-black flex items-center justify-center text-xs font-bold text-white">
                                        SD
                                    </div>
                                </div>
                                <div>
                                    <div className="text-sm font-semibold text-white">Sofia Davis</div>
                                    <div className="text-xs text-zinc-400">Lead Data Architect</div>
                                </div>
                            </footer>
                        </blockquote>
                    </div>
                </div>
            </div>

            {/* --- LEFT PANEL: Login Form (Adaptive Theme) --- */}
            <div className="relative flex h-full items-center justify-center p-8 bg-background">
                {/* Mobile Background Spotlights */}
                <div className="absolute inset-0 pointer-events-none lg:hidden bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-primary/20 via-background to-background"></div>

                <div className="w-full max-w-[420px] z-10 mx-auto">
                    <div className={cn(
                        "rounded-[2rem] border border-border/50 p-8 shadow-2xl shadow-black/5",
                        "bg-card/50 backdrop-blur-2xl" // Glass effect
                    )}>

                        {/* Header */}
                        <div className="flex flex-col space-y-2 text-center mb-8">
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                                <Workflow className="h-6 w-6" />
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                Welcome back
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Sign in to access your command center
                            </p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <div className="relative group">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/70 group-focus-within:text-primary transition-colors z-20" />
                                    <Input
                                        id="email"
                                        placeholder="name@example.com"
                                        type="email"
                                        autoCapitalize="none"
                                        autoComplete="email"
                                        autoCorrect="off"
                                        disabled={isLoading}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-10 bg-background/50"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password">Password</Label>
                                    <Link
                                        to="/forgot-password"
                                        className="text-[10px] uppercase font-bold tracking-wide text-primary hover:text-primary/80 hover:underline"
                                    >
                                        Forgot password?
                                    </Link>
                                </div>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/70 group-focus-within:text-primary transition-colors z-20" />
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        disabled={isLoading}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-10 pr-10 bg-background/50"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-2.5 text-muted-foreground/70 hover:text-foreground transition-colors"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-11 mt-4 text-base shadow-lg shadow-primary/20"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Authenticating...
                                    </>
                                ) : (
                                    <>
                                        Sign In
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </form>

                        <div className="flex items-center gap-4 my-6">
                            <Separator className="flex-1" />
                            <span className="text-xs uppercase text-muted-foreground font-medium">
                                Or continue with
                            </span>
                            <Separator className="flex-1" />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Button variant="outline" className="h-11 bg-background/50" type="button">
                                <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                </svg>
                                GitHub
                            </Button>
                            <Button variant="outline" className="h-11 bg-background/50" type="button">
                                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Google
                            </Button>
                        </div>

                        <div className="mt-8 text-center text-sm">
                            <span className="text-muted-foreground">Don't have an account? </span>
                            <Link
                                to="/register"
                                className="font-semibold text-primary hover:text-primary/80 hover:underline underline-offset-4 transition-all"
                            >
                                Sign up
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};