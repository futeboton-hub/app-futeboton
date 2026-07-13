import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, Trophy, Medal, Award } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTournament } from "@/contexts/TournamentContext";

const SERIES = ["A", "B", "C", "D"] as const;
const PHASES = ["round_of_16", "quarter_finals", "semi_finals", "third_place", "final"] as const;

const phaseLabels: Record<string, string> = {
  round_of_16: "Oitavas de Final",
  quarter_finals: "Quartas de Final",
  semi_finals: "Semifinal",
  third_place: "Disputa de 3º Lugar",
  final: "Grande Final",
};

const seriesDescriptions: Record<string, string> = {
  A: "1º e 2º colocados dos grupos",
  B: "3º e 4º colocados dos grupos",
  C: "5º e 6º colocados dos grupos",
  D: "7º e 8º colocados dos grupos",
};

export default function Knockout() {
  const { isAuthenticated } = useAuth();
  const { selectedTournamentId } = useTournament();
  const utils = trpc.useUtils();
  const [selectedSeries, setSelectedSeries] = useState<string>("A");
  const [scores, setScores] = useState<Record<number, { home: string; away: string; homePen: string; awayPen: string }>>({});

  const { data: matches, isLoading } = trpc.knockout.list.useQuery({ tournamentId: selectedTournamentId, series: selectedSeries });
  const { data: allPlayers } = trpc.players.list.useQuery({ tournamentId: selectedTournamentId });

  const generateMutation = trpc.knockout.generate.useMutation({
    onSuccess: () => {
      utils.knockout.list.invalidate();
      toast.success("Chaveamento gerado para todas as séries!");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateScoreMutation = trpc.knockout.updateScore.useMutation({
    onSuccess: (data) => {
      utils.knockout.list.invalidate();
      const method = data.decisionMethod === "penalties" ? " (nos pênaltis)" : "";
      toast.success(`Resultado registrado${method}!`);
    },
    onError: (err) => toast.error(err.message),
  });

  function getPlayerName(id: number | null) {
    if (!id) return "A definir";
    return allPlayers?.find(p => p.id === id)?.sportName || allPlayers?.find(p => p.id === id)?.name || `Jogador ${id}`;
  }

  function handleSaveScore(matchId: number) {
    const s = scores[matchId];
    if (!s || s.home === "" || s.away === "") {
      toast.error("Preencha o placar do tempo normal.");
      return;
    }
    const homeScore = parseInt(s.home);
    const awayScore = parseInt(s.away);

    const payload: any = { id: matchId, homeScore, awayScore };

    if (homeScore === awayScore) {
      if (!s.homePen || !s.awayPen || s.homePen === "" || s.awayPen === "") {
        toast.error("Empate! Informe o resultado dos pênaltis.");
        return;
      }
      payload.homePenalties = parseInt(s.homePen);
      payload.awayPenalties = parseInt(s.awayPen);
    }

    updateScoreMutation.mutate(payload);
  }

  const groupedByPhase = PHASES.reduce((acc, phase) => {
    acc[phase] = matches?.filter(m => m.phase === phase) || [];
    return acc;
  }, {} as Record<string, typeof matches>);

  return (
    <AppLayout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fase Eliminatória</h1>
          <p className="text-muted-foreground mt-1">
            4 séries com 16 jogadores cada — empate decide nos pênaltis
          </p>
        </div>
        {isAuthenticated && (
          <Button
            onClick={() => generateMutation.mutate({ tournamentId: selectedTournamentId })}
            disabled={generateMutation.isPending}
            className="gap-2"
          >
            <Zap className="w-4 h-4" />
            {generateMutation.isPending ? "Gerando..." : "Gerar Chaveamento"}
          </Button>
        )}
      </div>

      {/* Tabs por Série */}
      <Tabs value={selectedSeries} onValueChange={setSelectedSeries} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-md">
          {SERIES.map(s => (
            <TabsTrigger key={s} value={s} className="gap-1.5">
              {s === "A" && <Trophy className="w-3.5 h-3.5" />}
              {s === "B" && <Medal className="w-3.5 h-3.5" />}
              {s === "C" && <Award className="w-3.5 h-3.5" />}
              Série {s}
            </TabsTrigger>
          ))}
        </TabsList>

        {SERIES.map(series => (
          <TabsContent key={series} value={series} className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4 border">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Série {series}</span> — {seriesDescriptions[series]}
              </p>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-32 rounded-xl bg-muted/50 animate-pulse" />
                ))}
              </div>
            ) : !matches || matches.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="py-16 text-center">
                  <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    O chaveamento ainda não foi gerado. Complete a fase de grupos e clique em "Gerar Chaveamento".
                  </p>
                </CardContent>
              </Card>
            ) : (
              PHASES.map(phase => {
                const phaseMatches = groupedByPhase[phase];
                if (!phaseMatches || phaseMatches.length === 0) return null;

                return (
                  <Card key={phase} className="border-0 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        {phase === "final" && <Trophy className="w-4 h-4 text-amber-500" />}
                        {phase === "third_place" && <Medal className="w-4 h-4 text-amber-700" />}
                        {phaseLabels[phase]}
                        <Badge variant="outline" className="ml-2 text-xs">
                          {phaseMatches.filter(m => m.played === 1).length}/{phaseMatches.length} jogos
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {phaseMatches.map(match => {
                          const isPlayed = match.played === 1;
                          const isDrawn = !isPlayed && scores[match.id]?.home && scores[match.id]?.away &&
                            parseInt(scores[match.id].home) === parseInt(scores[match.id].away);

                          return (
                            <div key={match.id} className={`rounded-lg border p-4 transition-all ${isPlayed ? "bg-muted/30" : "hover:border-primary/30"}`}>
                              <div className="flex items-center gap-3">
                                {/* Home */}
                                <div className="flex-1 text-right">
                                  <span className={`text-sm font-medium ${!match.homePlayerId ? "text-muted-foreground italic" : ""}`}>
                                    {getPlayerName(match.homePlayerId)}
                                  </span>
                                </div>

                                {/* Score */}
                                {isPlayed ? (
                                  <div className="flex items-center gap-2 min-w-[120px] justify-center">
                                    <span className="text-lg font-bold">{match.homeScore}</span>
                                    <span className="text-muted-foreground">×</span>
                                    <span className="text-lg font-bold">{match.awayScore}</span>
                                  </div>
                                ) : match.homePlayerId && match.awayPlayerId && isAuthenticated ? (
                                  <div className="flex items-center gap-1 min-w-[120px] justify-center">
                                    <Input
                                      type="number"
                                      min="0"
                                      className="w-12 h-8 text-center text-sm"
                                      value={scores[match.id]?.home || ""}
                                      onChange={e => setScores(prev => ({ ...prev, [match.id]: { ...prev[match.id], home: e.target.value, away: prev[match.id]?.away || "", homePen: prev[match.id]?.homePen || "", awayPen: prev[match.id]?.awayPen || "" } }))}
                                    />
                                    <span className="text-muted-foreground text-xs">×</span>
                                    <Input
                                      type="number"
                                      min="0"
                                      className="w-12 h-8 text-center text-sm"
                                      value={scores[match.id]?.away || ""}
                                      onChange={e => setScores(prev => ({ ...prev, [match.id]: { ...prev[match.id], away: e.target.value, home: prev[match.id]?.home || "", homePen: prev[match.id]?.homePen || "", awayPen: prev[match.id]?.awayPen || "" } }))}
                                    />
                                  </div>
                                ) : (
                                  <div className="min-w-[120px] text-center">
                                    <span className="text-xs text-muted-foreground">vs</span>
                                  </div>
                                )}

                                {/* Away */}
                                <div className="flex-1 text-left">
                                  <span className={`text-sm font-medium ${!match.awayPlayerId ? "text-muted-foreground italic" : ""}`}>
                                    {getPlayerName(match.awayPlayerId)}
                                  </span>
                                </div>

                                {/* Action / Badge */}
                                <div className="w-24 flex justify-end">
                                  {isPlayed ? (
                                    <Badge variant={match.decisionMethod === "penalties" ? "destructive" : "secondary"} className="text-xs">
                                      {match.decisionMethod === "penalties"
                                        ? `Pên ${match.homePenalties}-${match.awayPenalties}`
                                        : "Normal"}
                                    </Badge>
                                  ) : match.homePlayerId && match.awayPlayerId && isAuthenticated ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleSaveScore(match.id)}
                                      disabled={updateScoreMutation.isPending}
                                      className="text-xs h-7"
                                    >
                                      Salvar
                                    </Button>
                                  ) : null}
                                </div>
                              </div>

                              {/* Pênaltis (se empate) */}
                              {isDrawn && !isPlayed && isAuthenticated && (
                                <div className="mt-3 pt-3 border-t flex items-center justify-center gap-3">
                                  <span className="text-xs font-medium text-amber-600">Pênaltis:</span>
                                  <Input
                                    type="number"
                                    min="0"
                                    className="w-12 h-7 text-center text-xs"
                                    placeholder="M"
                                    value={scores[match.id]?.homePen || ""}
                                    onChange={e => setScores(prev => ({ ...prev, [match.id]: { ...prev[match.id], homePen: e.target.value, home: prev[match.id]?.home || "", away: prev[match.id]?.away || "", awayPen: prev[match.id]?.awayPen || "" } }))}
                                  />
                                  <span className="text-muted-foreground text-xs">×</span>
                                  <Input
                                    type="number"
                                    min="0"
                                    className="w-12 h-7 text-center text-xs"
                                    placeholder="V"
                                    value={scores[match.id]?.awayPen || ""}
                                    onChange={e => setScores(prev => ({ ...prev, [match.id]: { ...prev[match.id], awayPen: e.target.value, home: prev[match.id]?.home || "", away: prev[match.id]?.away || "", homePen: prev[match.id]?.homePen || "" } }))}
                                  />
                                </div>
                              )}

                              {/* Vencedor */}
                              {isPlayed && match.winnerId && (
                                <div className="mt-2 pt-2 border-t text-center">
                                  <span className="text-xs text-muted-foreground">Classificado: </span>
                                  <span className="text-xs font-semibold text-primary">{getPlayerName(match.winnerId)}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        ))}
      </Tabs>
    </AppLayout>
  );
}
