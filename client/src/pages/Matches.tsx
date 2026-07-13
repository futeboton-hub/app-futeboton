import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Swords, Check, RefreshCw, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTournament } from "@/contexts/TournamentContext";

const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

export default function Matches() {
  const { isAuthenticated } = useAuth();
  const { selectedTournamentId } = useTournament();
  const utils = trpc.useUtils();
  const [selectedGroup, setSelectedGroup] = useState<string>("A");
  const [selectedRound, setSelectedRound] = useState<string>("1");

  const { data: matches, isLoading } = trpc.matches.listByRound.useQuery({
    group: selectedGroup,
    round: parseInt(selectedRound),
    tournamentId: selectedTournamentId,
  });

  const { data: players } = trpc.players.list.useQuery({ tournamentId: selectedTournamentId });

  const generateMutation = trpc.matches.generateFixtures.useMutation({
    onSuccess: () => {
      utils.matches.listByRound.invalidate();
      utils.matches.list.invalidate();
      utils.dashboard.stats.invalidate();
      toast.success("Tabela de jogos gerada com sucesso!");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateScoreMutation = trpc.matches.updateScore.useMutation({
    onSuccess: () => {
      utils.matches.listByRound.invalidate();
      utils.matches.list.invalidate();
      utils.standings.all.invalidate();
      utils.dashboard.stats.invalidate();
      toast.success("Placar registrado!");
    },
    onError: (err) => toast.error(err.message),
  });

  const [scores, setScores] = useState<Record<number, { home: string; away: string }>>({});

  function getPlayerName(id: number) {
    return players?.find(p => p.id === id)?.name || `Jogador ${id}`;
  }

  function handleSaveScore(matchId: number) {
    const s = scores[matchId];
    if (!s || s.home === "" || s.away === "") {
      toast.error("Preencha ambos os placares.");
      return;
    }
    updateScoreMutation.mutate({
      id: matchId,
      homeScore: parseInt(s.home),
      awayScore: parseInt(s.away),
    });
  }

  return (
    <AppLayout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lançar Placares</h1>
          <p className="text-muted-foreground mt-1">
            Registre os resultados das partidas por rodada
          </p>
        </div>
        {isAuthenticated && (
          <Button
            onClick={() => generateMutation.mutate({ tournamentId: selectedTournamentId })}
            disabled={generateMutation.isPending}
            variant="outline"
            className="gap-2"
          >
            <Zap className="w-4 h-4" />
            {generateMutation.isPending ? "Gerando..." : "Gerar Tabela de Jogos"}
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <Select value={selectedGroup} onValueChange={setSelectedGroup}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Grupo" />
          </SelectTrigger>
          <SelectContent>
            {GROUPS.map(g => (
              <SelectItem key={g} value={g}>Grupo {g}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedRound} onValueChange={setSelectedRound}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Rodada" />
          </SelectTrigger>
          <SelectContent>
            {[1,2,3,4,5,6,7].map(r => (
              <SelectItem key={r} value={String(r)}>Rodada {r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Matches */}
      <div className="space-y-4">
        {!matches || matches.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-16 text-center text-muted-foreground">
              <Swords className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Nenhum jogo encontrado</p>
              <p className="text-sm mt-1">Gere a tabela de jogos primeiro ou selecione outro grupo/rodada.</p>
            </CardContent>
          </Card>
        ) : (
          matches.map((match) => (
            <Card key={match.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="py-5 px-6">
                <div className="flex items-center gap-4">
                  {/* Home Player */}
                  <div className="flex-1 text-right">
                    <p className="font-semibold text-foreground text-base">
                      {getPlayerName(match.homePlayerId)}
                    </p>
                  </div>

                  {/* Score Input */}
                  <div className="flex items-center gap-2">
                    {match.played === 1 ? (
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-primary w-8 text-center">
                          {match.homeScore}
                        </span>
                        <span className="text-muted-foreground font-medium">×</span>
                        <span className="text-2xl font-bold text-primary w-8 text-center">
                          {match.awayScore}
                        </span>
                      </div>
                    ) : isAuthenticated ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          className="w-14 text-center font-bold text-lg h-10"
                          value={scores[match.id]?.home || ""}
                          onChange={(e) => setScores(prev => ({
                            ...prev,
                            [match.id]: { ...prev[match.id], home: e.target.value, away: prev[match.id]?.away || "" }
                          }))}
                        />
                        <span className="text-muted-foreground font-medium">×</span>
                        <Input
                          type="number"
                          min="0"
                          className="w-14 text-center font-bold text-lg h-10"
                          value={scores[match.id]?.away || ""}
                          onChange={(e) => setScores(prev => ({
                            ...prev,
                            [match.id]: { ...prev[match.id], home: prev[match.id]?.home || "", away: e.target.value }
                          }))}
                        />
                        <Button
                          size="icon"
                          className="h-10 w-10 ml-1"
                          onClick={() => handleSaveScore(match.id)}
                          disabled={updateScoreMutation.isPending}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Pendente</Badge>
                    )}
                  </div>

                  {/* Away Player */}
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-foreground text-base">
                      {getPlayerName(match.awayPlayerId)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </AppLayout>
  );
}
