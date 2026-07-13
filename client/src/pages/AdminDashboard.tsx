import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link, useParams, useRoute } from "wouter";
import { Loader2, Calendar, Users, Trophy, BarChart3, Settings, LogOut, ChevronLeft } from "lucide-react";
import { startLogin } from "@/const";

export default function AdminDashboard() {
  const { user, loading, isAuthenticated, logout } = useAuth({ redirectOnUnauthenticated: true });
  const [, params] = useRoute<{ tenantId: string }>("/admin/tenants/:tenantId/dashboard");
  const tenantId = params?.tenantId ? parseInt(params.tenantId) : 0;

  const myTenantsQuery = trpc.memberships.myTenants.useQuery(undefined, { enabled: isAuthenticated });
  const tournamentsQuery = trpc.tournaments.list.useQuery({ tenantId }, { enabled: !!tenantId && isAuthenticated });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Button onClick={startLogin}>Entrar</Button>
      </div>
    );
  }

  // Verificar se o usuário é admin do tenant
  const myTenant = myTenantsQuery.data?.find(t => t.id === tenantId);
  const isAdminOfTenant = myTenant?.role === "admin" || user?.role === "admin";

  if (!isAdminOfTenant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-8">
            <p className="text-center text-destructive">
              Você não tem permissão para acessar este painel.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tenant = myTenantsQuery.data?.find(t => t.id === tenantId);
  const stats = {
    tournaments: tournamentsQuery.data?.length ?? 0,
    activeTournaments: tournamentsQuery.data?.filter(t => t.status === "in_progress" || t.status === "registration").length ?? 0,
  };

  return (
    <div className="min-h-screen bg-background" style={{ borderTop: `4px solid ${tenant?.primaryColor || "#1a73e8"}` }}>
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href={`/t/${tenant?.slug || ""}`}>
                <Button variant="ghost" size="sm" className="flex items-center gap-1">
                  <ChevronLeft className="h-4 w-4" />
                  Voltar
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  {tenant?.name || "Tenant"}
                </h1>
                <p className="text-sm text-muted-foreground">Painel Administrativo</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {user?.name || user?.email}
              </span>
              <Badge variant={myTenant?.role === "admin" ? "default" : "secondary"}>
                {myTenant?.role === "admin" ? "Admin" : "Membro"}
              </Badge>
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Torneios</p>
                  <p className="text-3xl font-bold">{stats.tournaments}</p>
                </div>
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Torneios Ativos</p>
                  <p className="text-3xl font-bold">{stats.activeTournaments}</p>
                </div>
                <Trophy className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Role</p>
                  <p className="text-3xl font-bold capitalize">{myTenant?.role}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link href={`/admin/tenants/${tenantId}/tournaments`}>
            <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardContent className="p-6">
                <Calendar className="h-6 w-6 mb-3 text-primary" />
                <h3 className="font-semibold">Torneios</h3>
                <p className="text-sm text-muted-foreground">Criar e gerenciar torneios</p>
              </CardContent>
            </Card>
          </Link>

          <Link href={`/admin/tenants/${tenantId}/members`}>
            <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardContent className="p-6">
                <Users className="h-6 w-6 mb-3 text-primary" />
                <h3 className="font-semibold">Membros</h3>
                <p className="text-sm text-muted-foreground">Gerenciar membros do tenant</p>
              </CardContent>
            </Card>
          </Link>

          {myTenant?.role === "admin" && (
            <Link href={`/admin/tenants/${tenantId}/tournaments/new`}>
              <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardContent className="p-6">
                  <Trophy className="h-6 w-6 mb-3 text-primary" />
                  <h3 className="font-semibold">Novo Torneio</h3>
                  <p className="text-sm text-muted-foreground">Criar um novo torneio</p>
                </CardContent>
              </Card>
            </Link>
          )}

          <Link href={`/admin/tenants/${tenantId}/settings`}>
            <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardContent className="p-6">
                <Settings className="h-6 w-6 mb-3 text-primary" />
                <h3 className="font-semibold">Configurações</h3>
                <p className="text-sm text-muted-foreground">Configurar o tenant</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Torneios Recentes */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Torneios</CardTitle>
          </CardHeader>
          <CardContent>
            {tournamentsQuery.isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : tournamentsQuery.data?.length === 0 ? (
              <p className="text-muted-foreground">Nenhum torneio criado ainda.</p>
            ) : (
              <div className="space-y-3">
                {tournamentsQuery.data?.map((tournament) => (
                  <Link key={tournament.id} href={`/admin/tenants/${tenantId}/tournaments/${tournament.id}`}>
                    <div className="flex items-center justify-between p-4 rounded-lg border bg-card cursor-pointer hover:bg-accent/50 transition-colors">
                      <div>
                        <p className="font-semibold">{tournament.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Max: {tournament.maxPlayers} jogadores
                          {tournament.entryFee > 0 && ` | R$ ${(tournament.entryFee / 100).toFixed(2)}`}
                        </p>
                      </div>
                      <Badge variant={
                        tournament.status === "in_progress" ? "default" :
                        tournament.status === "registration" ? "secondary" : "outline"
                      }>
                        {tournament.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
