import { Link } from "wouter";
import { useTenantsList } from "@/hooks/useTenant";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Building2 } from "lucide-react";

export default function TenantSelect() {
  const { tenants, loading, error } = useTenantsList();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-8">
            <p className="text-center text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Escolha seu Espaço</h1>
          <p className="text-muted-foreground mt-2">
            Selecione o tenant para acessar torneios e inscrições.
          </p>
        </div>

        {tenants.length === 0 ? (
          <Card>
            <CardContent className="p-8">
              <p className="text-center text-muted-foreground">
                Nenhum tenant disponível no momento.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {tenants.map((tenant) => (
              <Link key={tenant.id} href={`/t/${tenant.slug}`}>
                <Card
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  style={{ borderLeft: `4px solid ${tenant.primaryColor}` }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      {tenant.logoUrl ? (
                        <img
                          src={tenant.logoUrl}
                          alt={tenant.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                          style={{ backgroundColor: tenant.primaryColor }}
                        >
                          {tenant.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1">
                        <h2 className="text-xl font-semibold text-foreground">{tenant.name}</h2>
                        {tenant.description && (
                          <p className="text-sm text-muted-foreground mt-1">{tenant.description}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
