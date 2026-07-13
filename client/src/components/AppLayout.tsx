import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTournament } from "@/contexts/TournamentContext";
import {
  LayoutDashboard,
  Users,
  Swords,
  Trophy,
  GitBranch,
  History,
  LogIn,
  LogOut,
  Menu,
  X,
  ClipboardList,
  CalendarDays,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tournaments", label: "Torneios", icon: CalendarDays },
  { href: "/players", label: "Jogadores", icon: Users },
  { href: "/matches", label: "Lançar Placares", icon: Swords },
  { href: "/standings", label: "Classificação", icon: Trophy },
  { href: "/knockout", label: "Eliminatórias", icon: GitBranch },
  { href: "/history", label: "Histórico", icon: History },
  { href: "/admin/inscricoes", label: "Inscrições", icon: ClipboardList },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { tournaments, selectedTournamentId, setSelectedTournamentId, selectedTournament } = useTournament();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-72 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        {/* Logo */}
        <div className="px-6 py-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sidebar-primary/20 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-sidebar-primary" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-sidebar-foreground">Liga Futeboton</h1>
              <p className="text-xs text-sidebar-foreground/60">Campeonato Mogiano</p>
            </div>
          </div>
        </div>

        {/* Tournament Selector */}
        {tournaments.length > 0 && (
          <div className="px-4 py-3 border-b border-sidebar-border">
            <label className="text-[11px] uppercase tracking-wider text-sidebar-foreground/50 font-medium mb-1.5 block">
              Torneio Ativo
            </label>
            <Select
              value={String(selectedTournamentId)}
              onValueChange={(val) => setSelectedTournamentId(parseInt(val))}
            >
              <SelectTrigger className="bg-sidebar-accent/30 border-sidebar-border text-sidebar-foreground text-sm h-9">
                <SelectValue placeholder="Selecionar torneio" />
              </SelectTrigger>
              <SelectContent>
                {tournaments.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  }`}
                >
                  <item.icon className="w-4.5 h-4.5" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="px-4 py-4 border-t border-sidebar-border">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-xs font-semibold text-sidebar-primary">
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name || "Usuário"}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-sidebar-foreground/60 hover:text-sidebar-foreground h-8 w-8"
                onClick={() => logout()}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground"
              onClick={() => startLogin()}
            >
              <LogIn className="w-4 h-4 mr-2" />
              Entrar
            </Button>
          )}
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar text-sidebar-foreground border-b border-sidebar-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-sidebar-primary" />
            <span className="font-bold text-sm">Liga Futeboton</span>
            {selectedTournament && (
              <span className="text-xs text-sidebar-foreground/60 ml-1">• {selectedTournament.name}</span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
        {mobileMenuOpen && (
          <div className="px-3 pb-3 space-y-2">
            {/* Mobile Tournament Selector */}
            {tournaments.length > 0 && (
              <div className="pb-2 mb-2 border-b border-sidebar-border">
                <Select
                  value={String(selectedTournamentId)}
                  onValueChange={(val) => setSelectedTournamentId(parseInt(val))}
                >
                  <SelectTrigger className="bg-sidebar-accent/30 border-sidebar-border text-sidebar-foreground text-sm h-9">
                    <SelectValue placeholder="Selecionar torneio" />
                  </SelectTrigger>
                  <SelectContent>
                    {tournaments.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/70"
                      }`}
                    >
                      <item.icon className="w-4.5 h-4.5" />
                      {item.label}
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto lg:pt-0 pt-14">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
