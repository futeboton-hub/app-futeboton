import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Trophy, Plus, Edit, Calendar, Users, DollarSign } from "lucide-react";
import { toast } from "sonner";

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: "Rascunho", color: "bg-gray-100 text-gray-700" },
  registration: { label: "Inscrições Abertas", color: "bg-blue-100 text-blue-700" },
  in_progress: { label: "Em Andamento", color: "bg-emerald-100 text-emerald-700" },
  finished: { label: "Encerrado", color: "bg-amber-100 text-amber-700" },
};

export default function Tournaments() {
  const { data: tournaments, isLoading } = trpc.tournaments.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.tournaments.create.useMutation({
    onSuccess: () => {
      utils.tournaments.list.invalidate();
      toast.success("Torneio criado com sucesso!");
      setDialogOpen(false);
      resetForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.tournaments.update.useMutation({
    onSuccess: () => {
      utils.tournaments.list.invalidate();
      toast.success("Torneio atualizado!");
      setEditDialogOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState<any>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("64");
  const [entryFee, setEntryFee] = useState("0");
  const [pixKey, setPixKey] = useState("");
  const [pixHolderName, setPixHolderName] = useState("");
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [refundDeadline, setRefundDeadline] = useState("");
  const [noRefundDeadline, setNoRefundDeadline] = useState("");
  const [eventDate, setEventDate] = useState("");

  function resetForm() {
    setName("");
    setDescription("");
    setMaxPlayers("64");
    setEntryFee("0");
    setPixKey("");
    setPixHolderName("");
    setRegistrationDeadline("");
    setRefundDeadline("");
    setNoRefundDeadline("");
    setEventDate("");
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      name,
      description: description || undefined,
      maxPlayers: parseInt(maxPlayers) || 64,
      entryFee: Math.round(parseFloat(entryFee) * 100) || 0,
      pixKey: pixKey || undefined,
      pixHolderName: pixHolderName || undefined,
      registrationDeadline: registrationDeadline || undefined,
      refundDeadline: refundDeadline || undefined,
      noRefundDeadline: noRefundDeadline || undefined,
      eventDate: eventDate || undefined,
    });
  }

  function openEdit(t: any) {
    setEditingTournament(t);
    setEditDialogOpen(true);
  }

  function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTournament) return;
    const formData = new FormData(e.target as HTMLFormElement);
    const data: any = { id: editingTournament.id };

    const nameVal = formData.get("name") as string;
    if (nameVal) data.name = nameVal;

    const descVal = formData.get("description") as string;
    data.description = descVal || undefined;

    const maxVal = formData.get("maxPlayers") as string;
    if (maxVal) data.maxPlayers = parseInt(maxVal);

    const feeVal = formData.get("entryFee") as string;
    if (feeVal) data.entryFee = Math.round(parseFloat(feeVal) * 100);

    const pixVal = formData.get("pixKey") as string;
    data.pixKey = pixVal || undefined;

    const pixHolderVal = formData.get("pixHolderName") as string;
    data.pixHolderName = pixHolderVal || undefined;

    const regDeadline = formData.get("registrationDeadline") as string;
    data.registrationDeadline = regDeadline || undefined;

    const refDeadline = formData.get("refundDeadline") as string;
    data.refundDeadline = refDeadline || undefined;

    const noRefDeadline = formData.get("noRefundDeadline") as string;
    data.noRefundDeadline = noRefDeadline || undefined;

    const evDate = formData.get("eventDate") as string;
    data.eventDate = evDate || undefined;

    const statusVal = formData.get("status") as string;
    if (statusVal) data.status = statusVal;

    updateMutation.mutate(data);
  }

  function formatCurrency(cents: number) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
  }

  const activeTournaments = tournaments?.filter((t: any) => t.status !== "finished") || [];
  const finishedTournaments = tournaments?.filter((t: any) => t.status === "finished") || [];

  return (
    <AppLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Torneios</h1>
          <p className="text-muted-foreground mt-1">Gerencie os campeonatos da Liga Futeboton</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Novo Torneio
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Novo Torneio</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="t-name">Nome do Torneio *</Label>
                <Input id="t-name" value={name} onChange={e => setName(e.target.value)} placeholder="Copa 64T 2026" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="t-desc">Descrição</Label>
                <Textarea id="t-desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Campeonato Mogiano de Futebol de Botão..." rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="t-max">Máx. Jogadores</Label>
                  <Input id="t-max" type="number" value={maxPlayers} onChange={e => setMaxPlayers(e.target.value)} min={2} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="t-fee">Taxa de Inscrição (R$)</Label>
                  <Input id="t-fee" type="number" step="0.01" value={entryFee} onChange={e => setEntryFee(e.target.value)} min={0} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="t-pix">Chave PIX</Label>
                <Input id="t-pix" value={pixKey} onChange={e => setPixKey(e.target.value)} placeholder="CPF, e-mail ou telefone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="t-pixholder">Titular do PIX</Label>
                <Input id="t-pixholder" value={pixHolderName} onChange={e => setPixHolderName(e.target.value)} placeholder="Nome do titular" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="t-eventdate">Data do Evento</Label>
                  <Input id="t-eventdate" type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="t-regdeadline">Prazo de Inscrição</Label>
                  <Input id="t-regdeadline" type="date" value={registrationDeadline} onChange={e => setRegistrationDeadline(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="t-refund">Prazo p/ Devolução</Label>
                  <Input id="t-refund" type="date" value={refundDeadline} onChange={e => setRefundDeadline(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="t-norefund">Prazo s/ Devolução</Label>
                  <Input id="t-norefund" type="date" value={noRefundDeadline} onChange={e => setNoRefundDeadline(e.target.value)} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Criando..." : "Criar Torneio"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map(i => <div key={i} className="h-32 bg-muted/50 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active Tournaments */}
          {activeTournaments.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" /> Torneios Ativos
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeTournaments.map((t: any) => (
                  <Card key={t.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{t.name}</CardTitle>
                          {t.description && <CardDescription className="mt-1">{t.description}</CardDescription>}
                        </div>
                        <Badge className={statusLabels[t.status]?.color || "bg-gray-100"}>
                          {statusLabels[t.status]?.label || t.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-3 text-sm mb-4">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Users className="w-3.5 h-3.5" />
                          <span>{t.maxPlayers} vagas</span>
                        </div>
                        {t.entryFee > 0 && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>{formatCurrency(t.entryFee)}</span>
                          </div>
                        )}
                        {t.eventDate && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{new Date(t.eventDate).toLocaleDateString("pt-BR")}</span>
                          </div>
                        )}
                      </div>
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openEdit(t)}>
                        <Edit className="w-3.5 h-3.5" /> Editar
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Finished Tournaments */}
          {finishedTournaments.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 text-muted-foreground">Histórico de Campeonatos</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {finishedTournaments.map((t: any) => (
                  <Card key={t.id} className="border-0 shadow-sm opacity-80">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{t.name}</CardTitle>
                        <Badge className="bg-amber-100 text-amber-700">Encerrado</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>{t.maxPlayers} jogadores</div>
                        {t.eventDate && <div>Realizado em {new Date(t.eventDate).toLocaleDateString("pt-BR")}</div>}
                      </div>
                      <Button variant="ghost" size="sm" className="mt-2 gap-1.5" onClick={() => openEdit(t)}>
                        <Edit className="w-3.5 h-3.5" /> Ver detalhes
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {tournaments?.length === 0 && (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-16 text-center">
                <Trophy className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum torneio criado</h3>
                <p className="text-muted-foreground mb-4">Crie o primeiro campeonato para começar.</p>
                <Button onClick={() => setDialogOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" /> Criar Torneio
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Torneio</DialogTitle>
          </DialogHeader>
          {editingTournament && (
            <form onSubmit={handleUpdate} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input name="name" defaultValue={editingTournament.name} required />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea name="description" defaultValue={editingTournament.description || ""} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select name="status" defaultValue={editingTournament.status}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="registration">Inscrições Abertas</SelectItem>
                    <SelectItem value="in_progress">Em Andamento</SelectItem>
                    <SelectItem value="finished">Encerrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Máx. Jogadores</Label>
                  <Input name="maxPlayers" type="number" defaultValue={editingTournament.maxPlayers} min={2} />
                </div>
                <div className="space-y-2">
                  <Label>Taxa (R$)</Label>
                  <Input name="entryFee" type="number" step="0.01" defaultValue={(editingTournament.entryFee / 100).toFixed(2)} min={0} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Chave PIX</Label>
                <Input name="pixKey" defaultValue={editingTournament.pixKey || ""} />
              </div>
              <div className="space-y-2">
                <Label>Titular do PIX</Label>
                <Input name="pixHolderName" defaultValue={editingTournament.pixHolderName || ""} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data do Evento</Label>
                  <Input name="eventDate" type="date" defaultValue={editingTournament.eventDate?.split("T")[0] || ""} />
                </div>
                <div className="space-y-2">
                  <Label>Prazo de Inscrição</Label>
                  <Input name="registrationDeadline" type="date" defaultValue={editingTournament.registrationDeadline?.split("T")[0] || ""} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prazo c/ Devolução</Label>
                  <Input name="refundDeadline" type="date" defaultValue={editingTournament.refundDeadline?.split("T")[0] || ""} />
                </div>
                <div className="space-y-2">
                  <Label>Prazo s/ Devolução</Label>
                  <Input name="noRefundDeadline" type="date" defaultValue={editingTournament.noRefundDeadline?.split("T")[0] || ""} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
