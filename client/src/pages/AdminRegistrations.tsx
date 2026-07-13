import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, Phone, Users, Clock, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { useTournament } from "@/contexts/TournamentContext";

const statusLabels: Record<string, { label: string; color: string }> = {
  pending_payment: { label: "Aguardando Pagamento", color: "bg-amber-100 text-amber-800" },
  confirmed: { label: "Confirmado", color: "bg-emerald-100 text-emerald-800" },
  waitlist: { label: "Lista de Espera", color: "bg-blue-100 text-blue-800" },
  called_from_waitlist: { label: "Chamado (Aguardando)", color: "bg-purple-100 text-purple-800" },
  withdrawn_refund: { label: "Desistiu (c/ devolução)", color: "bg-gray-100 text-gray-600" },
  withdrawn_no_refund: { label: "Desistiu (s/ devolução)", color: "bg-gray-100 text-gray-600" },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-800" },
};

export default function AdminRegistrations() {
  const { isAuthenticated } = useAuth();
  const { selectedTournamentId } = useTournament();
  const utils = trpc.useUtils();

  const { data: registrations, isLoading } = trpc.registrations.list.useQuery({ tournamentId: selectedTournamentId });

  const confirmMutation = trpc.registrations.confirmPayment.useMutation({
    onSuccess: () => {
      utils.registrations.list.invalidate();
      toast.success("Pagamento confirmado!");
    },
    onError: (err) => toast.error(err.message),
  });

  const cancelMutation = trpc.registrations.cancelRegistration.useMutation({
    onSuccess: () => {
      utils.registrations.list.invalidate();
      toast.success("Inscrição cancelada.");
    },
    onError: (err) => toast.error(err.message),
  });

  const callMutation = trpc.registrations.callFromWaitlist.useMutation({
    onSuccess: () => {
      utils.registrations.list.invalidate();
      toast.success("Jogador chamado da lista de espera!");
    },
    onError: (err) => toast.error(err.message),
  });

  const confirmed = registrations?.filter((r: any) => r.status === "confirmed").length || 0;
  const pending = registrations?.filter((r: any) => r.status === "pending_payment" || r.status === "called_from_waitlist").length || 0;
  const waitlist = registrations?.filter((r: any) => r.status === "waitlist").length || 0;

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Gestão de Inscrições</h1>
        <p className="text-muted-foreground mt-1">
          Painel do organizador — confirme pagamentos e gerencie a lista de espera
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{confirmed}</p>
                <p className="text-xs text-muted-foreground">Confirmados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pending}</p>
                <p className="text-xs text-muted-foreground">Aguardando Pgto</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{waitlist}</p>
                <p className="text-xs text-muted-foreground">Lista de Espera</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{registrations?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Total Inscritos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : !registrations || registrations.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma inscrição recebida ainda.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Compartilhe o link <code className="bg-muted px-2 py-0.5 rounded">/inscricao</code> com os jogadores.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Inscrições Recebidas</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Jogador</TableHead>
                  <TableHead>Clube</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Posição</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrations.map((reg: any, idx: number) => {
                  const statusInfo = statusLabels[reg.status] || { label: reg.status, color: "bg-gray-100" };
                  return (
                    <TableRow key={reg.id}>
                      <TableCell className="font-medium">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="font-medium">{reg.playerSportName || reg.playerName}</div>
                        <div className="text-xs text-muted-foreground">{reg.playerEmail}</div>
                      </TableCell>
                      <TableCell>{reg.club}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusInfo.color}>
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {reg.waitlistPosition ? `#${reg.waitlistPosition}` : "—"}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        {reg.status === "pending_payment" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 gap-1"
                            onClick={() => confirmMutation.mutate({ id: reg.id })}
                            disabled={confirmMutation.isPending}
                          >
                            <CheckCircle2 className="w-3 h-3" /> Confirmar
                          </Button>
                        )}
                        {reg.status === "waitlist" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 gap-1"
                            onClick={() => callMutation.mutate({ id: reg.id, paymentDeadlineHours: 48 })}
                            disabled={callMutation.isPending}
                          >
                            <Phone className="w-3 h-3" /> Chamar
                          </Button>
                        )}
                        {(reg.status === "pending_payment" || reg.status === "confirmed" || reg.status === "called_from_waitlist") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-7 gap-1 text-red-600 hover:text-red-700"
                            onClick={() => cancelMutation.mutate({ id: reg.id, refund: reg.status === "pending_payment" })}
                            disabled={cancelMutation.isPending}
                          >
                            <XCircle className="w-3 h-3" /> Cancelar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
}
