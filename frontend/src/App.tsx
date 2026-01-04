import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { AlertCircle } from 'lucide-react';
import { ErrorBoundary } from 'react-error-boundary';
import { AnimatePresence, motion, type Variants } from "framer-motion";

// Providers & Layouts
import { Layout } from './components/layout/Layout';
import { ThemeProvider } from './components/providers/ThemeProvider';
import { AuthProvider } from './components/providers/AuthProvider';
import { WorkspaceProvider } from './components/providers/WorkspaceProvider';
import { ZenProvider } from '@/components/providers/ZenProvider';
import { useAuth } from './hooks/useAuth';
import { Toaster } from './components/ui/sonner';
import { useTheme } from './hooks/useTheme';
import { cn } from './lib/utils';

// Lazy Load Pages (Handling Named Exports)
const LandingPage = lazy(() => import('./pages/LandingPage').then(module => ({ default: module.LandingPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(module => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then(module => ({ default: module.RegisterPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(module => ({ default: module.DashboardPage })));
const ConnectionsPage = lazy(() => import('./pages/ConnectionsPage').then(module => ({ default: module.ConnectionsPage })));
const ConnectionDetailsPage = lazy(() => import('./pages/ConnectionDetailsPage').then(module => ({ default: module.ConnectionDetailsPage })));
const PipelinesListPage = lazy(() => import('./pages/PipelinesListPage').then(module => ({ default: module.PipelinesListPage })));
const PipelineEditorPage = lazy(() => import('./pages/PipelineEditorPage').then(module => ({ default: module.PipelineEditorPage })));
const JobsPage = lazy(() => import('./pages/JobsPage').then(module => ({ default: module.JobsPage })));
const DocsPage = lazy(() => import('./pages/DocsPage').then(module => ({ default: module.DocsPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(module => ({ default: module.SettingsPage })));
const WorkspaceTeamPage = lazy(() => import('./pages/WorkspaceTeamPage').then(module => ({ default: module.WorkspaceTeamPage })));
const AlertsPage = lazy(() => import('./pages/AlertsPage').then(module => ({ default: module.AlertsPage })));
const OperatorsPage = lazy(() => import('./pages/OperatorsPage').then(module => ({ default: module.OperatorsPage })));
const ExplorerPage = lazy(() => import('./pages/ExplorerPage').then(module => ({ default: module.ExplorerPage })));
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage').then(module => ({ default: module.AuditLogsPage })));
const QuarantinePage = lazy(() => import('./pages/QuarantinePage').then(module => ({ default: module.QuarantinePage })));
const LineagePage = lazy(() => import('./pages/LineagePage').then(module => ({ default: module.LineagePage })));
const AgentsPage = lazy(() => import('./pages/AgentsPage').then(module => ({ default: module.AgentsPage })));
const InteractiveActivityPage = lazy(() => import('./pages/InteractiveActivityPage').then(module => ({ default: module.InteractiveActivityPage })));

// React Query Configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const FullPageLoader = () => {
  const { theme } = useTheme();
  
  const cubeVariants: Variants = {
    initial: {
      opacity: 0,
      scale: 0,
      rotateY: -90,
      z: -150,
      rotateX: 45
    },
    animate: (i: number) => ({
      opacity: [0, 1, 1, 0],
      scale: [0.5, 1.1, 1, 0.5],
      rotateY: [0, 180, 360],
      rotateX: [45, 0, -45],
      z: [0, 100, 0],
      transition: {
        duration: 4,
        repeat: Infinity,
        delay: i * 0.25,
        ease: "easeInOut",
      },
    }),
  };

  const statusMessages = [
    "Quantizing Neural Grid...",
    "Synchronizing Distributed Nodes...",
    "Orchestrating ETL Pipelines...",
    "Initializing Secure Agent Tunnels...",
    "Materializing Virtual Assets...",
    "Calibrating Stream Buffers...",
    "Validating Integrity Manifests..."
  ];

  const [messageIndex, setMessageIndex] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % statusMessages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [statusMessages.length]);

  return (
    <div className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-background overflow-hidden transition-colors duration-700">
      {/* 1. Ambient Layers */}
      <div className="absolute inset-0 z-0">
        {/* Radial Glow */}
        <div className={cn(
          "absolute inset-0 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent transition-opacity duration-1000",
          theme === 'dark' ? "opacity-40" : "opacity-15"
        )} />
        
        {/* Mesh Grid & Noise */}
        <div className="absolute inset-0 bg-grid-subtle opacity-[0.15] dark:opacity-[0.1]" />
        <div className="absolute inset-0 bg-noise pointer-events-none opacity-20 dark:opacity-40" />
      </div>

      {/* 2. 3D Assembly Area */}
      <div className="relative z-10 perspective-2000">
        <div className="grid grid-cols-2 gap-6 transform rotate-x-12 rotate-z-12 scale-110 md:scale-125">
          {[0, 1, 2, 3].map((index) => (
            <motion.div
              key={index}
              custom={index}
              variants={cubeVariants}
              initial="initial"
              animate="animate"
              className={cn(
                "w-14 h-14 rounded-2xl bg-linear-to-br border-2 shadow-2xl transition-all duration-700 backdrop-blur-md",
                theme === 'dark' ? "border-white/10" : "border-black/5",
                index === 0 && "from-primary/80 via-primary to-blue-600 shadow-primary/30",
                index === 1 && "from-emerald-500/80 via-emerald-400 to-teal-600 shadow-emerald-500/30",
                index === 2 && "from-purple-600/80 via-purple-500 to-indigo-600 shadow-purple-500/30",
                index === 3 && "from-amber-500/80 via-orange-500 to-red-600 shadow-orange-500/30"
              )}
            >
              <div className="absolute inset-0 bg-white/10 dark:bg-black/10 rounded-2xl animate-pulse" />
            </motion.div>
          ))}
        </div>
      </div>

      {/* 3. Interface Elements */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        className="mt-32 flex flex-col items-center gap-12"
      >
        {/* Brand Identity */}
        <div className="relative group">
          <h2 className="text-5xl font-black tracking-[0.8em] uppercase text-foreground flex items-center transition-all duration-500 group-hover:tracking-[1em]">
            Synq<span className="text-primary italic animate-pulse">X</span>
          </h2>
          <motion.div
            className="absolute -bottom-4 left-0 h-1 bg-linear-to-r from-transparent via-primary to-transparent w-full"
            animate={{ 
              scaleX: [0, 1.2, 0], 
              opacity: [0, 1, 0],
              x: ['-10%', '10%', '-10%']
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        {/* Status Console */}
        <div className="flex flex-col items-center gap-6">
          <div className="px-8 py-3.5 rounded-[2rem] border border-border/60 bg-card/40 backdrop-blur-3xl flex items-center gap-6 shadow-2xl ring-1 ring-white/10 dark:ring-white/5 relative overflow-hidden group">
            {/* Inner Shimmer */}
            <motion.div 
              className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent w-1/2 -skew-x-12"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />

            <div className="relative flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-40"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-primary shadow-[0_0_20px_var(--primary)]"></span>
            </div>
            
            <AnimatePresence mode="wait">
              <motion.span 
                key={messageIndex}
                initial={{ opacity: 0, y: 15, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -15, filter: "blur(8px)" }}
                transition={{ duration: 0.5 }}
                className="text-xs font-black font-mono tracking-[0.25em] text-foreground uppercase min-w-[320px] text-center relative z-10"
              >
                {statusMessages[messageIndex]}
              </motion.span>
            </AnimatePresence>
          </div>

          {/* Activity Dots */}
          <div className="flex items-center gap-3">
            {[0, 1, 2, 3, 4].map(i => (
              <motion.div
                key={i}
                animate={{ 
                  scale: [1, 2, 1], 
                  opacity: [0.2, 1, 0.2],
                  backgroundColor: ['var(--color-primary)', 'var(--color-info)', 'var(--color-primary)']
                }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                className="h-2 w-2 rounded-full shadow-lg"
              />
            ))}
          </div>
        </div>
      </motion.div>

      {/* 4. Global Overlay Effects */}
      <motion.div
        animate={{ y: ['-100vh', '100vh'] }}
        transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
        className="absolute top-0 left-0 w-full h-[40vh] bg-linear-to-b from-transparent via-primary/5 to-transparent z-20 pointer-events-none"
      />
      
      {/* Edge Vignette */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_0_200px_rgba(0,0,0,0.3)] z-30" />
    </div>
  );
};

/**
 * Fatal Error Fallback
 * Shown if a page crashes completely.
 */
const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => (
  <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-4">
    <div className="glass-panel p-8 max-w-md text-center space-y-4">
      <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
        <AlertCircle className="h-6 w-6 text-destructive" />
      </div>
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground wrap-break-word">{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
      >
        Try again
      </button>
    </div>
  </div>
);

const ProtectedRoute = () => {
  const { token, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullPageLoader />;
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;

  return (
    <Layout>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Suspense fallback={<FullPageLoader />}>
          <Outlet />
        </Suspense>
      </ErrorBoundary>
    </Layout>
  );
};

const PublicRoute = () => {
  const { token, isLoading } = useAuth();
  if (isLoading) return <FullPageLoader />;
  if (token) return <Navigate to="/dashboard" replace />;

  return (
    <Suspense fallback={<FullPageLoader />}>
      <Outlet />
    </Suspense>
  );
};

const AppRoutes = () => (
  <Routes>
    {/* Public Access */}
    <Route element={<PublicRoute />}>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
    </Route>

    {/* Public Docs (Accessible without login) */}
    <Route element={
      <Layout>
        <Suspense fallback={<FullPageLoader />}>
          <Outlet />
        </Suspense>
      </Layout>
    }>
      <Route path="/docs/*" element={<DocsPage />} />
    </Route>

// Secured Application Area
    <Route element={<ProtectedRoute />}>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/explorer" element={<ExplorerPage />} />

      <Route path="/connections" element={<ConnectionsPage />} />
      <Route path="/connections/:id" element={<ConnectionDetailsPage />} />

      <Route path="/pipelines" element={<PipelinesListPage />} />
      <Route path="/pipelines/:id" element={<PipelineEditorPage />} />

      <Route path="/agents" element={<AgentsPage />} />
      <Route path="/interactive-lab" element={<InteractiveActivityPage />} />
      <Route path="/jobs/:id?" element={<JobsPage />} />
      <Route path="/alerts" element={<AlertsPage />} />
      <Route path="/team" element={<WorkspaceTeamPage />} />
      <Route path="/quarantine" element={<QuarantinePage />} />
      <Route path="/map" element={<LineagePage />} />
      <Route path="/operators" element={<OperatorsPage />} />
      <Route path="/audit-logs" element={<AuditLogsPage />} />
      <Route path="/settings" element={<SettingsPage />} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Route>
  </Routes>
);

function App() {
  return (
    <HelmetProvider>
      <ThemeProvider defaultTheme="dark" storageKey="synqx-theme">
        <ZenProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <WorkspaceProvider>
                <BrowserRouter>
                  <AppRoutes />
                  <Toaster position='top-right' closeButton />
                </BrowserRouter>
              </WorkspaceProvider>
            </AuthProvider>
          </QueryClientProvider>
        </ZenProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;