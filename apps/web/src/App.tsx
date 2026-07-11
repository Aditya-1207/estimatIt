import { useEffect } from "react";
import { Route, Switch } from "wouter";
import { AppLayout } from "./components/layout/AppLayout";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { MeasurementSheet } from "./pages/MeasurementSheet";
import { SSRBrowser } from "./pages/SSRBrowser";
import { NotFound } from "./pages/NotFound";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { auth } from "./lib/auth";
import { useAuthStore } from "./store/auth";

export function App() {
  const { setSession, setInitialized } = useAuthStore();

  useEffect(() => {
    // Check initial session
    auth.getSession()
      .then((session) => {
        setSession(session);
        setInitialized(true);
      })
      .catch((err) => {
        console.error("Failed to get initial session", err);
        setSession(null);
        setInitialized(true);
      });

    // Listen for auth state changes
    const subscription = auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setSession, setInitialized]);

  return (
    <AppLayout>
      <Switch>
        {/* Public Routes */}
        <Route path="/login" component={Login} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />

        {/* Protected Routes */}
        <Route path="/">
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        </Route>
        <Route path="/project/:id">
          <ProtectedRoute>
            <MeasurementSheet />
          </ProtectedRoute>
        </Route>
        <Route path="/ssr">
          <ProtectedRoute>
            <SSRBrowser />
          </ProtectedRoute>
        </Route>

        {/* 404 Not Found */}
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}
