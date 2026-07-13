import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTournament } from "@/contexts/TournamentContext";

const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

export default function Standings() {
  const { selectedTournamentId } = useTournament();
  const { data: allStandings, isLoading } = trpc.standings.all.useQuery({ tournamentId: selectedTournamentId });

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Classificação</h1>
        <p className="text-muted-foreground mt-1">
          Tabelas de classificação por grupo — atualização automática
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : (
        <Tabs defaultValue="grid" className="space-y-6">
          <TabsList>
            <TabsTrigger value="grid">Visão em Grade</TabsTrigger>
            <TabsTrigger value="list">Visão em Lista</TabsTrigger>
          </TabsList>

          <TabsContent value="grid">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {GROUPS.map(group => {
                const standings = allStandings?.[group] || [];
                return (
                  <Card key={group} className="border-0 shadow-sm overflow-hidden">
                    <CardHeader className="bg-primary/5 py-3 px-5">
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-bold text-primary">{group}</span>
                        </div>
                        Grupo {group}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow className="text-xs">
                            <TableHead className="w-8 font-semibold">#</TableHead>
                            <TableHead className="font-semibold">Jogador</TableHead>
                            <TableHead className="text-center font-semibold w-10">P</TableHead>
                            <TableHead className="text-center font-semibold w-8">J</TableHead>
                            <TableHead className="text-center font-semibold w-8">V</TableHead>
                            <TableHead className="text-center font-semibold w-8">E</TableHead>
                            <TableHead className="text-center font-semibold w-8">D</TableHead>
                            <TableHead className="text-center font-semibold w-10">GP</TableHead>
                            <TableHead className="text-center font-semibold w-10">GC</TableHead>
                            <TableHead className="text-center font-semibold w-10">SG</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {standings.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={10} className="text-center py-8 text-muted-foreground text-sm">
                                Sem dados
                              </TableCell>
                            </TableRow>
                          ) : (
                            standings.map((row, idx) => (
                              <TableRow
                                key={row.playerId}
                                className={`transition-colors ${
                                  idx < 2 ? "bg-emerald-50/50" : idx >= 6 ? "bg-red-50/30" : ""
                                }`}
                              >
                                <TableCell className="font-bold text-muted-foreground text-sm">
                                  {idx + 1}
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-semibold text-sm leading-tight">{row.playerName}</p>
                                    <p className="text-xs text-muted-foreground">{row.club}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center font-bold text-primary">{row.points}</TableCell>
                                <TableCell className="text-center text-sm">{row.played}</TableCell>
                                <TableCell className="text-center text-sm text-emerald-600 font-medium">{row.won}</TableCell>
                                <TableCell className="text-center text-sm text-amber-600 font-medium">{row.drawn}</TableCell>
                                <TableCell className="text-center text-sm text-red-600 font-medium">{row.lost}</TableCell>
                                <TableCell className="text-center text-sm">{row.goalsFor}</TableCell>
                                <TableCell className="text-center text-sm">{row.goalsAgainst}</TableCell>
                                <TableCell className="text-center text-sm font-medium">
                                  <span className={row.goalDiff > 0 ? "text-emerald-600" : row.goalDiff < 0 ? "text-red-600" : ""}>
                                    {row.goalDiff > 0 ? "+" : ""}{row.goalDiff}
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                      {standings.length > 0 && (
                        <div className="px-4 py-2 border-t bg-muted/30 flex gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                            Classificados
                          </span>
                          <span className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-red-400"></div>
                            Eliminados
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="list">
            <div className="space-y-6">
              {GROUPS.map(group => {
                const standings = allStandings?.[group] || [];
                if (standings.length === 0) return null;
                return (
                  <Card key={group} className="border-0 shadow-sm overflow-hidden">
                    <CardHeader className="bg-primary/5 py-3 px-5">
                      <CardTitle className="text-base font-bold">Grupo {group}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10 font-semibold">#</TableHead>
                            <TableHead className="font-semibold">Jogador</TableHead>
                            <TableHead className="font-semibold">Município</TableHead>
                            <TableHead className="font-semibold">Clube</TableHead>
                            <TableHead className="text-center font-semibold">Pts</TableHead>
                            <TableHead className="text-center font-semibold">J</TableHead>
                            <TableHead className="text-center font-semibold">V</TableHead>
                            <TableHead className="text-center font-semibold">E</TableHead>
                            <TableHead className="text-center font-semibold">D</TableHead>
                            <TableHead className="text-center font-semibold">GP</TableHead>
                            <TableHead className="text-center font-semibold">GC</TableHead>
                            <TableHead className="text-center font-semibold">SG</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {standings.map((row, idx) => (
                            <TableRow key={row.playerId}>
                              <TableCell className="font-bold">{idx + 1}</TableCell>
                              <TableCell className="font-semibold">{row.playerName}</TableCell>
                              <TableCell className="text-muted-foreground">{row.sportName || ''}</TableCell>
                              <TableCell className="text-muted-foreground">{row.club}</TableCell>
                              <TableCell className="text-center font-bold text-primary">{row.points}</TableCell>
                              <TableCell className="text-center">{row.played}</TableCell>
                              <TableCell className="text-center">{row.won}</TableCell>
                              <TableCell className="text-center">{row.drawn}</TableCell>
                              <TableCell className="text-center">{row.lost}</TableCell>
                              <TableCell className="text-center">{row.goalsFor}</TableCell>
                              <TableCell className="text-center">{row.goalsAgainst}</TableCell>
                              <TableCell className="text-center font-medium">
                                {row.goalDiff > 0 ? "+" : ""}{row.goalDiff}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </AppLayout>
  );
}
