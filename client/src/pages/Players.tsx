import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Trash2, Edit, Upload } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTournament } from "@/contexts/TournamentContext";

const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

export default function Players() {
  const { isAuthenticated } = useAuth();
  const { selectedTournamentId } = useTournament();
  const utils = trpc.useUtils();
  const { data: players, isLoading } = trpc.players.list.useQuery({ tournamentId: selectedTournamentId });
  
  const createMutation = trpc.players.create.useMutation({
    onSuccess: () => {
      utils.players.list.invalidate();
      toast.success("Jogador cadastrado com sucesso!");
      setDialogOpen(false);
      resetForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.players.update.useMutation({
    onSuccess: () => {
      utils.players.list.invalidate();
      toast.success("Jogador atualizado com sucesso!");
      setDialogOpen(false);
      resetForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.players.delete.useMutation({
    onSuccess: () => {
      utils.players.list.invalidate();
      toast.success("Jogador removido.");
    },
    onError: (err) => toast.error(err.message),
  });

  const bulkCreateMutation = trpc.players.bulkCreate.useMutation({
    onSuccess: (data) => {
      utils.players.list.invalidate();
      toast.success(`${data.count} jogadores importados com sucesso!`);
      setBulkDialogOpen(false);
      setBulkText("");
    },
    onError: (err) => toast.error(err.message),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  
  const [editingPlayerId, setEditingPlayerId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [club, setClub] = useState("");
  const [groupLetter, setGroupLetter] = useState<string>("");
  const [seed, setSeed] = useState<string>("");
  const [filterGroup, setFilterGroup] = useState<string>("all");

  function resetForm() {
    setEditingPlayerId(null);
    setName("");
    setMunicipality("");
    setClub("");
    setGroupLetter("");
    setSeed("");
  }

  function handleSave() {
    if (!name || !municipality || !club || !groupLetter || !seed) {
      toast.error("Preencha todos os campos.");
      return;
    }

    const playerData = {
      name,
      municipality,
      club,
      groupLetter: groupLetter as any,
      seed: parseInt(seed),
    };

    if (editingPlayerId) {
      updateMutation.mutate({
        id: editingPlayerId,
        ...playerData,
      });
    } else {
      createMutation.mutate({
        ...playerData,
        tournamentId: selectedTournamentId,
      });
    }
  }

  function handleEdit(player: any) {
    setEditingPlayerId(player.id);
    setName(player.name);
    setMunicipality(player.municipality);
    setClub(player.club);
    setGroupLetter(player.groupLetter);
    setSeed(String(player.seed));
    setDialogOpen(true);
  }

  function handleBulkImport() {
    // Formato: Nome;Município;Clube;Grupo;Seed (uma linha por jogador)
    const lines = bulkText.trim().split("\n").filter(l => l.trim());
    if (lines.length === 0) {
      toast.error("Nenhum dado para importar.");
      return;
    }
    const playersData = lines.map((line) => {
      const parts = line.split(";").map(s => s.trim());
      return {
        name: parts[0] || "",
        municipality: parts[1] || "",
        club: parts[2] || "",
        groupLetter: (parts[3] || "A") as any,
        seed: parseInt(parts[4] || "1"),
      };
    });
    bulkCreateMutation.mutate({ players: playersData, tournamentId: selectedTournamentId });
  }

  const filteredPlayers = players?.filter(p =>
    filterGroup === "all" ? true : p.groupLetter === filterGroup
  ) || [];

  const groupColors: Record<string, string> = {
    A: "bg-red-100 text-red-700",
    B: "bg-blue-100 text-blue-700",
    C: "bg-green-100 text-green-700",
    D: "bg-purple-100 text-purple-700",
    E: "bg-amber-100 text-amber-700",
    F: "bg-pink-100 text-pink-700",
    G: "bg-cyan-100 text-cyan-700",
    H: "bg-orange-100 text-orange-700",
  };

  return (
    <AppLayout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jogadores</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os participantes do campeonato
          </p>
        </div>
        {isAuthenticated && (
          <div className="flex gap-2">
            <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Upload className="w-4 h-4" />
                  Importar
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Importar Jogadores em Lote</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground mb-3">
                  Cole os dados no formato: <code className="text-xs bg-muted px-1 py-0.5 rounded">Nome;Município;Clube;Grupo;Posição</code> (uma linha por jogador).
                </p>
                <textarea
                  className="w-full h-48 border rounded-lg p-3 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder={"João Silva;Mogi das Cruzes;Palmeiras FC;A;1\nMaria Santos;Suzano;Santos FC;A;2"}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Atenção: importar em lote substituirá todos os jogadores e partidas existentes.
                </p>
                <Button onClick={handleBulkImport} disabled={bulkCreateMutation.isPending} className="w-full mt-2">
                  {bulkCreateMutation.isPending ? "Importando..." : "Importar Todos"}
                </Button>
              </DialogContent>
            </Dialog>

            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Novo Jogador
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingPlayerId ? "Editar Jogador" : "Cadastrar Jogador"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <Input placeholder="Nome completo" value={name} onChange={(e) => setName(e.target.value)} />
                  <Input placeholder="Município" value={municipality} onChange={(e) => setMunicipality(e.target.value)} />
                  <Input placeholder="Time / Clube do Botão" value={club} onChange={(e) => setClub(e.target.value)} />
                  <div className="grid grid-cols-2 gap-3">
                    <Select value={groupLetter} onValueChange={setGroupLetter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Grupo" />
                      </SelectTrigger>
                      <SelectContent>
                        {GROUPS.map(g => (
                          <SelectItem key={g} value={g}>Grupo {g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={seed} onValueChange={setSeed}>
                      <SelectTrigger>
                        <SelectValue placeholder="Posição" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5,6,7,8].map(s => (
                          <SelectItem key={s} value={String(s)}>{s}º</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={handleSave} 
                    disabled={createMutation.isPending || updateMutation.isPending} 
                    className="w-full"
                  >
                    {createMutation.isPending || updateMutation.isPending ? "Salvando..." : (editingPlayerId ? "Atualizar" : "Cadastrar")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Filter */}
      <div className="mb-6">
        <Select value={filterGroup} onValueChange={setFilterGroup}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por grupo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Grupos</SelectItem>
            {GROUPS.map(g => (
              <SelectItem key={g} value={g}>Grupo {g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">#</TableHead>
                <TableHead className="font-semibold">Nome</TableHead>
                <TableHead className="font-semibold">Município</TableHead>
                <TableHead className="font-semibold">Clube</TableHead>
                <TableHead className="font-semibold">Grupo</TableHead>
                {isAuthenticated && <TableHead className="font-semibold w-24"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlayers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>Nenhum jogador cadastrado</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredPlayers.map((player, idx) => (
                  <TableRow key={player.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-semibold">{player.name}</TableCell>
                    <TableCell className="text-muted-foreground">{player.municipality}</TableCell>
                    <TableCell className="text-muted-foreground">{player.club}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={groupColors[player.groupLetter] || ""}>
                        {player.groupLetter}
                      </Badge>
                    </TableCell>
                    {isAuthenticated && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => handleEdit(player)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive/70 hover:text-destructive"
                            onClick={() => {
                              if (confirm("Tem certeza que deseja remover este jogador?")) {
                                deleteMutation.mutate({ id: player.id });
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
