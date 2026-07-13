import { Link } from "wouter";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Calendar, LogOut, User, Shield } from "lucide-react";
import { startLogin } from "@/const";

export default function TenantLanding() {
  const { tenant, loading, error } = useTenant();
  const { user, isAuthenticated, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-8">
            <p className="text-center text-destructive">{error || "Tenant não encontrado."}</p>
            <Link href="/">
              <Button variant="link" className="mt-2">Voltar para seleção</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" style={{ borderTop: `4px solid ${tenant.primaryColor}` }}>
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {tenant.logoUrl ? (
              <img src={tenant.logoUrl} alt={tenant.name} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: tenant.primaryColor }}
              >
                {tenant.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-foreground">{tenant.name}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  Olá, {user?.name || user?.email}
                </span>
                <Button variant="outline" size="sm" onClick={logout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button onClick={startLogin} size="sm">
                Entrar
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Card de Torneios */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="h-6 w-6" style={{ color: tenant.primaryColor }} />
                <h2 className="text-xl font-semibold">Torneios</h2>
              </div>
              <p className="text-muted-foreground mb-4">
                Veja os torneios ativos e futuras competições deste espaço.
              </p>
              <Link href={`/t/${tenant.slug}/tournaments`}>
                <Button style={{ backgroundColor: tenant.primaryColor }}>
                  Ver Torneios
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Card de Inscrição */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <User className="h-6 w-6" style={{ color: tenant.primaryColor }} />
                <h2 className="text-xl font-semibold">Inscrição</h2>
              </div>
              <p className="text-muted-foreground mb-4">
                Faça sua inscrição para o torneio ativo ou cadastre-se como jogador.
              </p>
              <Link href={`/t/${tenant.slug}/register`}>
                <Button variant="outline">
                  Inscrever-se
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Card de Admin (se autenticado e admin/membro) */}
          {isAuthenticated && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="h-6 w-6" style={{ color: tenant.primaryColor }} />
                  <h2 className="text-xl font-semibold">Painel Admin</h2>
                </div>
                <p className="text-muted-foreground mb-4">
                  Acesse o painel administrativo para gerenciar torneios e inscrições.
                </p>
                <Link href={`/admin/tenants/${tenant.id}/dashboard`}>
                  <Button variant="outline">
                    Acessar Admin
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 py-4">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          {tenant.description || tenant.name}
        </div>
      </footer>
    </div>
  );
}
