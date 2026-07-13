import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { History as HistoryIcon, Edit, RotateCcw, Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTournament } from "@/contexts/TournamentContext";

const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

export default function History() {
  const { isAuthenticated } = useAuth();
  const { selectedTournamentId } = useTournament();
  const utils = trpc.useUtils();
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [editMatch, setEditMatch] = useState<any>(null);
  const [editHome, setEditHome] = useState("");
  const [editAway, setEditAway] = useState("");

  const { data: matches } = trpc.matches.list.useQuery({ group: filterGroup === "all" ? undefined : filterGroup, tournamentId: selectedTournamentId });
  const { data: players } = trpc.players.list.useQuery({ tournamentId: selectedTournamentId });

  const updateScoreMutation = trpc.matches.updateScore.useMutation({
    onSuccess: () => {
      utils.matches.list.invalidate();
      utils.standings.all.invalidate();
      utils.dashboard.stats.invalidate();
      toast.success("Placar corrigido com sucesso!");
      setEditMatch(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const resetScoreMutation = trpc.matches.resetScore.useMutation({
    onSuccess: () => {
      utils.matches.list.invalidate();
      utils.standings.all.invalidate();
      utils.dashboard.stats.invalidate();
      toast.success("Placar resetado.");
    },
    onError: (err) => toast.error(err.message),
  });

  function getPlayerName(id: number) {
    return players?.find(p => p.id === id)?.name || `Jogador ${id}`;
  }

  function handleEditSave() {
    if (!editMatch || editHome === "" || editAway === "") return;
    updateScoreMutation.mutate({
      id: editMatch.id,
      homeScore: parseInt(editHome),
      awayScore: parseInt(editAway),
    });
  }

  const playedMatches = matches?.filter(m => m.played === 1) || [];
  const groupedByRound: Record<number, typeof playedMatches> = {};
  playedMatches.forEach(m => {
    if (!groupedByRound[m.round]) groupedByRound[m.round] = [];
    groupedByRound[m.round].push(m);
  });

  async function handleExportExcel() {
    toast.info("Preparando exportação...");
    try {
      const response = await fetch(`/api/export/excel?tournamentId=${selectedTournamentId}`);
      if (!response.ok) throw new Error("Erro na exportação");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Liga_Futeboton_Copa64T.xlsx";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Arquivo exportado com sucesso!");
    } catch (err) {
      toast.error("Erro ao exportar. Tente novamente.");
    }
  }

  return (
    <AppLayout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Histórico de Resultados</h1>
          <p className="text-muted-foreground mt-1">
            Todos os jogos realizados — com opção de correção
          </p>
        </div>
        <Button onClick={handleExportExcel} variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Exportar Excel
        </Button>
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

      {playedMatches.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center text-muted-foreground">
            <HistoryIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Nenhum resultado registrado</p>
            <p className="text-sm mt-1">Os resultados aparecerão aqui conforme os placares forem lançados.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByRound)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .map(([round, roundMatches]) => (
              <Card key={round} className="border-0 shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/50 py-3 px-5">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">Rodada {round}</Badge>
                    <span className="text-muted-foreground font-normal">
                      {roundMatches.length} {roundMatches.length === 1 ? "jogo" : "jogos"}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-semibold">Grupo</TableHead>
                        <TableHead className="font-semibold">Mandante</TableHead>
                        <TableHead className="text-center font-semibold">Placar</TableHead>
                        <TableHead className="font-semibold">Visitante</TableHead>
                        {isAuthenticated && <TableHead className="w-20"></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {roundMatches.map((match) => (
                        <TableRow key={match.id} className="hover:bg-muted/30">
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{match.groupLetter}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{getPlayerName(match.homePlayerId)}</TableCell>
                          <TableCell className="text-center">
                            <span className="font-bold text-primary">{match.homeScore}</span>
                            <span className="text-muted-foreground mx-1">×</span>
                            <span className="font-bold text-primary">{match.awayScore}</span>
                          </TableCell>
                          <TableCell className="font-medium">{getPlayerName(match.awayPlayerId)}</TableCell>
                          {isAuthenticated && (
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => {
                                    setEditMatch(match);
                                    setEditHome(String(match.homeScore));
                                    setEditAway(String(match.awayScore));
                                  }}
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive/70 hover:text-destructive"
                                  onClick={() => resetScoreMutation.mutate({ id: match.id })}
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editMatch} onOpenChange={() => setEditMatch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Corrigir Placar</DialogTitle>
          </DialogHeader>
          {editMatch && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 text-right">
                  <p className="font-semibold text-sm">{getPlayerName(editMatch.homePlayerId)}</p>
                </div>
                <Input
                  type="number"
                  min="0"
                  className="w-16 text-center font-bold"
                  value={editHome}
                  onChange={(e) => setEditHome(e.target.value)}
                />
                <span className="text-muted-foreground">×</span>
                <Input
                  type="number"
                  min="0"
                  className="w-16 text-center font-bold"
                  value={editAway}
                  onChange={(e) => setEditAway(e.target.value)}
                />
                <div className="flex-1">
                  <p className="font-semibold text-sm">{getPlayerName(editMatch.awayPlayerId)}</p>
                </div>
              </div>
              <Button onClick={handleEditSave} disabled={updateScoreMutation.isPending} className="w-full">
                {updateScoreMutation.isPending ? "Salvando..." : "Salvar Correção"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
