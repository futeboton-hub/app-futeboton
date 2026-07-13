import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { TournamentProvider } from "./contexts/TournamentContext";

// Pages
import Home from "./pages/Home";
import Players from "./pages/Players";
import Matches from "./pages/Matches";
import Standings from "./pages/Standings";
import Knockout from "./pages/Knockout";
import History from "./pages/History";
import Registration from "./pages/Registration";
import AdminRegistrations from "./pages/AdminRegistrations";
import Tournaments from "./pages/Tournaments";

// Multi-tenant Pages
import TenantSelect from "./pages/TenantSelect";
import TenantLanding from "./pages/TenantLanding";
import TournamentsByTenant from "./pages/TournamentsByTenant";
import TenantMembers from "./pages/TenantMembers";
import AdminDashboard from "./pages/AdminDashboard";
import Tenants from "./pages/Tenants";

function Router() {
  return (
    <Switch>
      {/* ====== PUBLIC ROUTES (sem tenant) ====== */}
      <Route path={"/"} component={TenantSelect} />
      <Route path={"/404"} component={NotFound} />

      {/* ====== SUPER ADMIN ROUTES ====== */}
      <Route path={"/admin/tenants"} component={Tenants} />

      {/* ====== TENANT-SPECIFIC PUBLIC ROUTES ====== */}
      {/* Landing page do tenant */}
      <Route path={"/t/:slug"} component={TenantLanding} />
      {/* Torneios do tenant (público) */}
      <Route path={"/t/:slug/tournaments"} component={Home} />

      {/* ====== TENANT ADMIN ROUTES ====== */}
      {/* Dashboard admin do tenant */}
      <Route path={"/admin/tenants/:tenantId/dashboard"} component={AdminDashboard} />
      {/* Torneios do tenant (admin) */}
      <Route path={"/admin/tenants/:tenantId/tournaments"} component={TournamentsByTenant} />
      {/* Membros do tenant (admin) */}
      <Route path={"/admin/tenants/:tenantId/members"} component={TenantMembers} />

      {/* ====== LEGACY ROUTES (mantidas para compatibilidade) ====== */}
      <Route path={"/legacy/home"} component={Home} />
      <Route path={"/legacy/players"} component={Players} />
      <Route path={"/legacy/matches"} component={Matches} />
      <Route path={"/legacy/standings"} component={Standings} />
      <Route path={"/legacy/knockout"} component={Knockout} />
      <Route path={"/legacy/history"} component={History} />
      <Route path={"/legacy/inscricao"} component={Registration} />
      <Route path={"/legacy/admin/inscricoes"} component={AdminRegistrations} />
      <Route path={"/legacy/tournaments"} component={Tournaments} />

      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TournamentProvider>
          <TooltipProvider>
            <Toaster richColors position="top-right" />
            <Router />
          </TooltipProvider>
        </TournamentProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
