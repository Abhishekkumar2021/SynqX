import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { Loader2, AlertCircle } from 'lucide-react';
import { ErrorBoundary } from 'react-error-boundary';

// Providers & Layouts
import { Layout } from './components/layout/Layout';
import { ThemeProvider } from './components/providers/ThemeProvider';
import { AuthProvider } from './components/providers/AuthProvider';
import { ZenProvider } from './context/ZenContext';
import { useAuth } from './hooks/useAuth';
import { Toaster } from './components/ui/sonner';

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
const AlertsPage = lazy(() => import('./pages/AlertsPage').then(module => ({ default: module.AlertsPage })));
const OperatorsPage = lazy(() => import('./pages/OperatorsPage').then(module => ({ default: module.OperatorsPage })));
const ExplorerPage = lazy(() => import('./pages/ExplorerPage').then(module => ({ default: module.ExplorerPage })));

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

/**
 * Premium Loading State
 * Uses 'glass-panel' utility for depth and 'animate-pulse' for life.
 */
const FullPageLoader = () => (
  <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground animate-in fade-in duration-300">
    <div className="relative flex items-center justify-center">
      {/* Ambient Glow */}
      <div className="absolute inset-0 rounded-full blur-2xl bg-primary/20 animate-pulse-slow" />

      {/* Glass Card */}
      <div className="p-6 glass-panel rounded-2xl relative flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <span className="text-sm font-medium text-muted-foreground animate-pulse">
          Loading SynqX...
        </span>
      </div>
    </div>
  </div>
);

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

    {/* Secured Application Area */}
    <Route element={<ProtectedRoute />}>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/explorer" element={<ExplorerPage />} />

      <Route path="/connections" element={<ConnectionsPage />} />
      <Route path="/connections/:id" element={<ConnectionDetailsPage />} />

      <Route path="/pipelines" element={<PipelinesListPage />} />
      <Route path="/pipelines/:id" element={<PipelineEditorPage />} />

      <Route path="/jobs/:id?" element={<JobsPage />} />
      <Route path="/alerts" element={<AlertsPage />} />
      <Route path="/operators" element={<OperatorsPage />} />
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
              <BrowserRouter>
                <AppRoutes />
                <Toaster position='top-right' closeButton />
              </BrowserRouter>
            </AuthProvider>
          </QueryClientProvider>
        </ZenProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;