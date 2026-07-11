import { Route, Switch } from "wouter";
import { AppLayout } from "./components/layout/AppLayout";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { MeasurementSheet } from "./pages/MeasurementSheet";
import { SSRBrowser } from "./pages/SSRBrowser";
import { NotFound } from "./pages/NotFound";

export function App() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/login" component={Login} />
        <Route path="/project/:id" component={MeasurementSheet} />
        <Route path="/ssr" component={SSRBrowser} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}
