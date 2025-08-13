import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GlobalErrorBoundary } from "./components/global-error-boundary";
import AuthProvider from "./components/auth-provider";
import { ProtectedRoute } from "./components/protected-route";
import { createI18nProvider } from "./lib/i18n";
import { LoginForm } from "./components/login-form";
import { useAuth } from "./lib/auth";
import NotFound from "./pages/not-found";
import Header from "./components/header";
import Navigation from "./components/navigation";
import MobileBottomNav from "./components/mobile-bottom-nav";
import { VisibilityIndicator } from "./components/visibility-indicator";
import { toast } from "@/hooks/use-toast";
import GlobalTopProgress from "./components/global-top-progress";
import { lazy, Suspense } from "react";

// Lazy load page components
const Dashboard = lazy(() => import("./pages/dashboard"));
const CheckIn = lazy(() => import("./pages/check-in"));
const CheckOut = lazy(() => import("./pages/check-out"));
const History = lazy(() => import("./pages/history"));
const Cleaning = lazy(() => import("./pages/cleaning"));
const Settings = lazy(() => import("./pages/settings"));
const GuestCheckin = lazy(() => import("./pages/guest-checkin"));
const GuestEdit = lazy(() => import("./pages/guest-edit"));

// Loading component for lazy-loaded routes
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
  </div>
);

function Router() {
  return (
    <div className="min-h-screen bg-hostel-background">
      <GlobalTopProgress />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-24 md:pb-4 animate-fade-in">
        <Navigation />
        <Switch>
          <Route path="/">
            <Suspense fallback={<PageLoader />}>
              <Dashboard />
            </Suspense>
          </Route>
          <Route path="/dashboard">
            <Suspense fallback={<PageLoader />}>
              <Dashboard />
            </Suspense>
          </Route>
          <Route path="/check-in">
            <ProtectedRoute requireAuth={true}>
              <Suspense fallback={<PageLoader />}>
                <CheckIn />
              </Suspense>
            </ProtectedRoute>
          </Route>
          <Route path="/check-out">
            <ProtectedRoute requireAuth={true}>
              <Suspense fallback={<PageLoader />}>
                <CheckOut />
              </Suspense>
            </ProtectedRoute>
          </Route>
          <Route path="/cleaning">
            <ProtectedRoute requireAuth={true}>
              <Suspense fallback={<PageLoader />}>
                <Cleaning />
              </Suspense>
            </ProtectedRoute>
          </Route>
          <Route path="/history">
            <Suspense fallback={<PageLoader />}>
              <History />
            </Suspense>
          </Route>
          <Route path="/guest-checkin">
            <Suspense fallback={<PageLoader />}>
              <GuestCheckin />
            </Suspense>
          </Route>
          <Route path="/guest-edit">
            <Suspense fallback={<PageLoader />}>
              <GuestEdit />
            </Suspense>
          </Route>
          <Route path="/settings">
            <ProtectedRoute requireAuth={true}>
              <Suspense fallback={<PageLoader />}>
                <Settings />
              </Suspense>
            </ProtectedRoute>
          </Route>
          <Route path="/login" component={LoginForm} />
          <Route component={NotFound} />
        </Switch>
      </div>
      <MobileBottomNav />
    </div>
  );
}

// Create I18n provider instance
const I18nProvider = createI18nProvider();

function App() {
  const handleGlobalError = (error: Error) => {
    console.error('Global error caught:', error);
    
    // Show user-friendly error toast
    toast({
      title: "Something went wrong",
      description: "An unexpected error occurred. Please try refreshing the page.",
      variant: "destructive",
    });
  };

  return (
    <GlobalErrorBoundary onError={handleGlobalError}>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <AuthProvider>
            <TooltipProvider>
              <Router />
              <Toaster />
              <VisibilityIndicator />
            </TooltipProvider>
          </AuthProvider>
        </I18nProvider>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
}

export default App;
