import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { trpc } from "@/lib/trpc";

type Tournament = {
  id: number;
  name: string;
  status: string;
  maxPlayers: number;
  entryFee: number;
  eventDate: string | null;
};

type TournamentContextType = {
  tournaments: Tournament[];
  selectedTournamentId: number;
  selectedTournament: Tournament | null;
  setSelectedTournamentId: (id: number) => void;
  isLoading: boolean;
};

const TournamentContext = createContext<TournamentContextType>({
  tournaments: [],
  selectedTournamentId: 1,
  selectedTournament: null,
  setSelectedTournamentId: () => {},
  isLoading: true,
});

export function TournamentProvider({ children }: { children: ReactNode }) {
  const { data: tournaments, isLoading } = trpc.tournaments.list.useQuery();
  const [selectedTournamentId, setSelectedTournamentId] = useState<number>(() => {
    const saved = localStorage.getItem("selectedTournamentId");
    return saved ? parseInt(saved) : 1;
  });

  useEffect(() => {
    if (tournaments && tournaments.length > 0 && !tournaments.find((t: any) => t.id === selectedTournamentId)) {
      // Se o torneio selecionado não existe mais, selecionar o primeiro ativo
      const active = tournaments.find((t: any) => t.status !== "finished");
      if (active) {
        setSelectedTournamentId((active as any).id);
      } else {
        setSelectedTournamentId((tournaments[0] as any).id);
      }
    }
  }, [tournaments, selectedTournamentId]);

  useEffect(() => {
    localStorage.setItem("selectedTournamentId", String(selectedTournamentId));
  }, [selectedTournamentId]);

  const selectedTournament = tournaments?.find((t: any) => t.id === selectedTournamentId) as Tournament | undefined || null;

  return (
    <TournamentContext.Provider value={{
      tournaments: (tournaments || []) as Tournament[],
      selectedTournamentId,
      selectedTournament,
      setSelectedTournamentId,
      isLoading,
    }}>
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournament() {
  return useContext(TournamentContext);
}
