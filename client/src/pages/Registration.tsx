import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trophy, UserPlus, LogIn, CheckCircle2, Clock, Users, QrCode, Copy } from "lucide-react";
import { toast } from "sonner";

type PlayerData = {
  id: number;
  fullName: string;
  sportName: string;
  email: string;
  municipality: string;
  birthDate: string;
  emailVerified: boolean;
};

type RegistrationData = {
  id: number;
  status: string;
  waitlistPosition: number | null;
  club: string;
};

type TournamentData = {
  id: number;
  name: string;
  description: string | null;
  maxPlayers: number;
  entryFee: number;
  pixKey: string | null;
  pixHolderName: string | null;
  registrationOpen: number;
  registrationDeadline: string | null;
  refundDeadline: string | null;
  noRefundDeadline: string | null;
  eventDate: string | null;
};

type StatsData = {
  confirmed: number;
  pendingPayment: number;
  waitlist: number;
  total: number;
  maxPlayers: number;
};

export default function Registration() {
  const [mode, setMode] = useState<"login" | "register" | "logged_in">("login");
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [registration, setRegistration] = useState<RegistrationData | null>(null);
  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [sportName, setSportName] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [club, setClub] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Carregar dados do torneio
    fetch("/api/tournament/info")
      .then(res => res.json())
      .then(data => {
        if (data.tournament) setTournament(data.tournament);
        if (data.stats) setStats(data.stats);
      })
      .catch(() => {});

    // Verificar sessão
    fetch("/api/player/me")
      .then(res => res.json())
      .then(data => {
        if (data.player) {
          setPlayer(data.player);
          setMode("logged_in");
          loadRegistration();
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function loadRegistration() {
    try {
      const res = await fetch("/api/player/my-registration?tournamentId=1");
      const data = await res.json();
      if (data.registration) {
        setRegistration(data.registration);
      }
    } catch {}
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/player/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao fazer login.");
        return;
      }
      setPlayer(data.player);
      setMode("logged_in");
      toast.success("Login realizado com sucesso!");
      loadRegistration();
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/player/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, sportName, email, municipality, birthDate, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao cadastrar.");
        return;
      }
      toast.success("Cadastro realizado! Faça login para continuar.");
      setMode("login");
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!player || !club.trim()) {
      toast.error("Informe o clube/time que vai representar.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/player/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentId: tournament?.id || 1, club }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao inscrever.");
        return;
      }
      setRegistration({ id: data.id, status: data.status, waitlistPosition: data.waitlistPosition, club });
      toast.success(data.status === "waitlist" ? "Você entrou na lista de espera!" : "Inscrição realizada! Efetue o pagamento.");
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/player/logout", { method: "POST" });
    setPlayer(null);
    setRegistration(null);
    setMode("login");
    toast.success("Logout realizado.");
  }

  function copyPixKey() {
    if (tournament?.pixKey) {
      navigator.clipboard.writeText(tournament.pixKey);
      toast.success("Chave PIX copiada!");
    }
  }

  function formatCurrency(cents: number) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-900 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-emerald-900">Liga Futeboton</h1>
              <p className="text-xs text-muted-foreground">Inscrição no Campeonato</p>
            </div>
          </div>
          {player && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{player.sportName}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>Sair</Button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        {/* Tournament Info Banner */}
        {tournament && (
          <Card className="border-0 shadow-sm mb-6 bg-emerald-900 text-white">
            <CardContent className="pt-6 pb-6">
              <h2 className="text-xl font-bold">{tournament.name}</h2>
              {tournament.description && <p className="text-emerald-200 mt-1 text-sm">{tournament.description}</p>}
              <div className="flex flex-wrap gap-4 mt-4 text-sm">
                {tournament.entryFee > 0 && (
                  <span className="bg-white/10 px-3 py-1 rounded-full">
                    Taxa: {formatCurrency(tournament.entryFee)}
                  </span>
                )}
                <span className="bg-white/10 px-3 py-1 rounded-full">
                  Vagas: {stats ? `${stats.confirmed}/${tournament.maxPlayers}` : `0/${tournament.maxPlayers}`}
                </span>
                {stats && stats.waitlist > 0 && (
                  <span className="bg-white/10 px-3 py-1 rounded-full">
                    Lista de espera: {stats.waitlist}
                  </span>
                )}
                {tournament.eventDate && (
                  <span className="bg-white/10 px-3 py-1 rounded-full">
                    Data: {new Date(tournament.eventDate).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {mode === "logged_in" && player ? (
          <div className="space-y-6">
            {/* Player Info Card */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Bem-vindo, {player.sportName}!
                </CardTitle>
                <CardDescription>Seus dados estão cadastrados. Inscreva-se no campeonato abaixo.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Nome completo:</span> <span className="font-medium">{player.fullName}</span></div>
                  <div><span className="text-muted-foreground">Nome esportivo:</span> <span className="font-medium">{player.sportName}</span></div>
                  <div><span className="text-muted-foreground">Município:</span> <span className="font-medium">{player.municipality}</span></div>
                  <div><span className="text-muted-foreground">E-mail:</span> <span className="font-medium">{player.email}</span></div>
                </div>
              </CardContent>
            </Card>

            {/* Registration Status or Enrollment Form */}
            {registration ? (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Status da Inscrição</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    {registration.status === "pending_payment" && (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                        <Clock className="w-3 h-3 mr-1" /> Aguardando Pagamento
                      </Badge>
                    )}
                    {registration.status === "confirmed" && (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Confirmado
                      </Badge>
                    )}
                    {registration.status === "waitlist" && (
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                        <Users className="w-3 h-3 mr-1" /> Lista de Espera (Posição {registration.waitlistPosition})
                      </Badge>
                    )}
                    {registration.status === "called_from_waitlist" && (
                      <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                        <Clock className="w-3 h-3 mr-1" /> Chamado — Aguardando Pagamento
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Clube inscrito:</span>{" "}
                    <span className="font-medium">{registration.club}</span>
                  </div>

                  {(registration.status === "pending_payment" || registration.status === "called_from_waitlist") && tournament?.pixKey && (
                    <div className="mt-4 p-4 rounded-lg bg-amber-50 border border-amber-200">
                      <div className="flex items-center gap-2 mb-3">
                        <QrCode className="w-5 h-5 text-amber-700" />
                        <span className="font-semibold text-amber-900">Pagamento via PIX</span>
                      </div>
                      {tournament.entryFee > 0 && (
                        <p className="text-lg font-bold text-amber-900 mb-2">
                          Valor: {formatCurrency(tournament.entryFee)}
                        </p>
                      )}
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-amber-700">Chave PIX:</span>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="bg-white px-3 py-1.5 rounded border text-amber-900 font-mono text-sm flex-1">
                              {tournament.pixKey}
                            </code>
                            <Button size="sm" variant="outline" onClick={copyPixKey} className="h-8 gap-1">
                              <Copy className="w-3 h-3" /> Copiar
                            </Button>
                          </div>
                        </div>
                        {tournament.pixHolderName && (
                          <div>
                            <span className="text-amber-700">Titular:</span>{" "}
                            <span className="font-medium text-amber-900">{tournament.pixHolderName}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-amber-700 mt-3">
                        Após realizar o pagamento, aguarde a confirmação do organizador. Seu status será atualizado automaticamente.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-primary" />
                    Inscrever-se no Campeonato
                  </CardTitle>
                  {tournament && (
                    <CardDescription>{tournament.name}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleEnroll} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="club">Clube / Time que vai representar</Label>
                      <Input
                        id="club"
                        placeholder="Ex: Palmeiras, Corinthians, São Paulo..."
                        value={club}
                        onChange={e => setClub(e.target.value)}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Este é o time de botão que você vai inscrever neste campeonato.
                      </p>
                    </div>
                    <Button type="submit" disabled={submitting} className="w-full gap-2">
                      <UserPlus className="w-4 h-4" />
                      {submitting ? "Inscrevendo..." : "Confirmar Inscrição"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Login Card */}
            <Card className={`border-0 shadow-sm transition-all ${mode === "login" ? "ring-2 ring-primary/20" : "opacity-80"}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LogIn className="w-5 h-5" />
                  Já tenho cadastro
                </CardTitle>
                <CardDescription>Faça login com seu e-mail e senha</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">E-mail</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onFocus={() => setMode("login")}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Sua senha"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onFocus={() => setMode("login")}
                      required
                    />
                  </div>
                  <Button type="submit" disabled={submitting || mode !== "login"} className="w-full">
                    {submitting ? "Entrando..." : "Entrar"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Register Card */}
            <Card className={`border-0 shadow-sm transition-all ${mode === "register" ? "ring-2 ring-primary/20" : "opacity-80"}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Primeiro acesso
                </CardTitle>
                <CardDescription>Cadastre-se para participar dos campeonatos</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegister} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-fullname">Nome completo</Label>
                    <Input
                      id="reg-fullname"
                      placeholder="João da Silva"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      onFocus={() => setMode("register")}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-sportname">Nome esportivo</Label>
                    <Input
                      id="reg-sportname"
                      placeholder="João Silva"
                      value={sportName}
                      onChange={e => setSportName(e.target.value)}
                      onFocus={() => setMode("register")}
                      required
                    />
                    <p className="text-xs text-muted-foreground">Nome + sobrenome ou apelido</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-email">E-mail</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onFocus={() => setMode("register")}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-municipality">Município</Label>
                    <Input
                      id="reg-municipality"
                      placeholder="Mogi das Cruzes"
                      value={municipality}
                      onChange={e => setMunicipality(e.target.value)}
                      onFocus={() => setMode("register")}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-birthdate">Data de Nascimento</Label>
                    <Input
                      id="reg-birthdate"
                      type="date"
                      value={birthDate}
                      onChange={e => setBirthDate(e.target.value)}
                      onFocus={() => setMode("register")}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-password">Criar senha</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onFocus={() => setMode("register")}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" disabled={submitting || mode !== "register"} className="w-full">
                    {submitting ? "Cadastrando..." : "Cadastrar"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/50 mt-16">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          Liga Futeboton — Campeonato Mogiano de Futebol de Botão
        </div>
      </footer>
    </div>
  );
}
