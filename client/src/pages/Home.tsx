import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Users, Swords, CheckCircle, Clock, Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTournament } from "@/contexts/TournamentContext";

export default function Home() {
  const { selectedTournamentId, selectedTournament } = useTournament();
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery({ tournamentId: selectedTournamentId });

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {selectedTournament?.name || "Campeonato Mogiano de Futebol de Botão"}
        </h1>
        <p className="text-muted-foreground mt-1 text-base">
          Visão geral do campeonato
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <Card className="border-0 shadow-sm bg-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Jogadores</p>
                    <p className="text-2xl font-bold text-foreground">{stats?.totalPlayers || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Swords className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Total de Jogos</p>
                    <p className="text-2xl font-bold text-foreground">{stats?.totalMatches || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Realizados</p>
                    <p className="text-2xl font-bold text-foreground">{stats?.playedMatches || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Pendentes</p>
                    <p className="text-2xl font-bold text-foreground">{stats?.pendingMatches || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Group Progress */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                Progresso dos Grupos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats?.groupProgress && Object.entries(stats.groupProgress).map(([group, data]) => (
                  <div key={group} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">Grupo {group}</span>
                      <span className="text-xs text-muted-foreground">
                        {data.played}/{data.total}
                      </span>
                    </div>
                    <Progress value={data.total > 0 ? Math.round((data.played / data.total) * 100) : 0} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {data.total > 0 ? Math.round((data.played / data.total) * 100) : 0}% concluído
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </AppLayout>
  );
}
