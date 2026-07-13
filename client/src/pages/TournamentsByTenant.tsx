import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState } from "react";
import { startLogin } from "@/const";
import { Loader2, Plus, Calendar } from "lucide-react";
import { useParams, useRoute, Link } from "wouter";

export default function TournamentsByTenant() {
  const { user, loading, isAuthenticated } = useAuth({ redirectOnUnauthenticated: true });
  const [, params] = useRoute<{ tenantId: string }>("/admin/tenants/:tenantId/tournaments");
  const tenantId = params?.tenantId ? parseInt(params.tenantId) : 0;

  const utils = trpc.useUtils();
  const tournamentsQuery = trpc.tournaments.list.useQuery({ tenantId }, { enabled: !!tenantId && isAuthenticated });
  const myTenantsQuery = trpc.memberships.myTenants.useQuery(undefined, { enabled: isAuthenticated });

  const createTournamentMutation = trpc.tournaments.create.useMutation({
    onSuccess: () => {
      utils.tournaments.list.invalidate({ tenantId });
      toast.success("Torneio criado com sucesso!");
    },
    onError: (err) => toast.error(err.message),
  });

  const [openCreate, setOpenCreate] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formMaxPlayers, setFormMaxPlayers] = useState(64);
  const [formEntryFee, setFormEntryFee] = useState(0);

  const handleCreate = () => {
    createTournamentMutation.mutate({
      tenantId,
      name: formName,
      description: formDescription || undefined,
      maxPlayers: formMaxPlayers,
      entryFee: formEntryFee,
    });
    setOpenCreate(false);
    setFormName("");
    setFormDescription("");
    setFormMaxPlayers(64);
    setFormEntryFee(0);
  };

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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Calendar className="h-8 w-8" />
              Torneios
            </h1>
            <p className="text-muted-foreground mt-1">
              Torneios deste tenant.
            </p>
          </div>

          {isAdminOfTenant && (
            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Torneio
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Torneio</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Nome</Label>
                    <Input
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      placeholder="Nome do torneio"
                    />
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Input
                      value={formDescription}
                      onChange={e => setFormDescription(e.target.value)}
                      placeholder="Descrição (opcional)"
                    />
                  </div>
                  <div>
                    <Label>Max Jogadores</Label>
                    <Input
                      type="number"
                      value={formMaxPlayers}
                      onChange={e => setFormMaxPlayers(parseInt(e.target.value) || 64)}
                    />
                  </div>
                  <div>
                    <Label>Taxa de Inscrição (centavos)</Label>
                    <Input
                      type="number"
                      value={formEntryFee}
                      onChange={e => setFormEntryFee(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <Button
                    onClick={handleCreate}
                    disabled={createTournamentMutation.isPending || !formName}
                    className="w-full"
                  >
                    {createTournamentMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Criar Torneio
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Torneios do Tenant</CardTitle>
          </CardHeader>
          <CardContent>
            {tournamentsQuery.isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : tournamentsQuery.data?.length === 0 ? (
              <p className="text-muted-foreground">Nenhum torneio neste tenant.</p>
            ) : (
              <div className="grid gap-4">
                {tournamentsQuery.data?.map((tournament) => (
                  <Link key={tournament.id} href={`/admin/tenants/${tenantId}/tournaments/${tournament.id}`}>
                    <div className="flex items-center justify-between p-4 rounded-lg border bg-card cursor-pointer hover:bg-accent/50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{tournament.name}</p>
                          <Badge variant={
                            tournament.status === "in_progress" ? "default" :
                            tournament.status === "registration" ? "secondary" :
                            tournament.status === "finished" ? "outline" : "outline"
                          }>
                            {tournament.status === "draft" ? "Rascunho" :
                             tournament.status === "registration" ? "Inscrição Aberta" :
                             tournament.status === "in_progress" ? "Em Andamento" :
                             "Encerrado"}
                          </Badge>
                        </div>
                        {tournament.description && (
                          <p className="text-sm text-muted-foreground mt-1">{tournament.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Max: {tournament.maxPlayers} jogadores
                          {tournament.entryFee > 0 && ` | Taxa: R$ ${(tournament.entryFee / 100).toFixed(2)}`}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
