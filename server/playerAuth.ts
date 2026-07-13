import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { registeredPlayers } from "../drizzle/schema";
import type { Request, Response } from "express";
import crypto from "crypto";

async function getDb() {
  if (!process.env.DATABASE_URL) return null;
  return drizzle(process.env.DATABASE_URL);
}

// Gerar código de 6 dígitos
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Hash simples de senha (bcrypt seria ideal, mas mantemos leve)
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// ========== REGISTRO ==========
export async function handlePlayerRegister(req: Request, res: Response) {
  try {
    const { fullName, sportName, email, municipality, birthDate, password } = req.body;

    if (!fullName || !sportName || !email || !municipality || !birthDate || !password) {
      return res.status(400).json({ error: "Todos os campos são obrigatórios." });
    }

    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Banco de dados indisponível." });

    // Verificar se e-mail já existe
    const existing = await db.select().from(registeredPlayers)
      .where(eq(registeredPlayers.email, email)).limit(1);

    if (existing.length > 0) {
      return res.status(409).json({ error: "Este e-mail já está cadastrado. Faça login." });
    }

    const verificationCode = generateCode();
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await db.insert(registeredPlayers).values({
      fullName,
      sportName,
      email,
      municipality,
      birthDate,
      passwordHash: hashPassword(password),
      emailVerified: 0,
      verificationCode,
      verificationExpiry,
    });

    // Em produção, enviaríamos o código por e-mail
    // Por enquanto, retornamos sucesso (o código pode ser verificado via painel admin)
    console.log(`[PlayerAuth] Código de verificação para ${email}: ${verificationCode}`);

    return res.json({
      success: true,
      message: "Cadastro realizado! Verifique seu e-mail para confirmar.",
    });
  } catch (error) {
    console.error("[PlayerAuth] Register error:", error);
    return res.status(500).json({ error: "Erro interno ao registrar." });
  }
}

// ========== LOGIN ==========
export async function handlePlayerLogin(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
    }

    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Banco de dados indisponível." });

    const result = await db.select().from(registeredPlayers)
      .where(eq(registeredPlayers.email, email)).limit(1);

    if (result.length === 0) {
      return res.status(401).json({ error: "E-mail ou senha incorretos." });
    }

    const player = result[0];

    if (player.passwordHash !== hashPassword(password)) {
      return res.status(401).json({ error: "E-mail ou senha incorretos." });
    }

    // Retornar dados do jogador (sessão simples via token no cookie)
    const token = crypto.randomBytes(32).toString("hex");

    // Armazenar token no cookie
    res.cookie("player_session", JSON.stringify({ id: player.id, email: player.email, token }), {
      httpOnly: true,
      secure: req.protocol === "https",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
      path: "/",
    });

    return res.json({
      success: true,
      player: {
        id: player.id,
        fullName: player.fullName,
        sportName: player.sportName,
        email: player.email,
        municipality: player.municipality,
        birthDate: player.birthDate,
        emailVerified: player.emailVerified === 1,
      },
    });
  } catch (error) {
    console.error("[PlayerAuth] Login error:", error);
    return res.status(500).json({ error: "Erro interno ao fazer login." });
  }
}

// ========== VERIFICAR E-MAIL ==========
export async function handlePlayerVerifyEmail(req: Request, res: Response) {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: "E-mail e código são obrigatórios." });
    }

    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Banco de dados indisponível." });

    const result = await db.select().from(registeredPlayers)
      .where(eq(registeredPlayers.email, email)).limit(1);

    if (result.length === 0) {
      return res.status(404).json({ error: "Jogador não encontrado." });
    }

    const player = result[0];

    if (player.verificationCode !== code) {
      return res.status(400).json({ error: "Código inválido." });
    }

    if (player.verificationExpiry && new Date() > player.verificationExpiry) {
      return res.status(400).json({ error: "Código expirado. Solicite um novo." });
    }

    await db.update(registeredPlayers).set({
      emailVerified: 1,
      verificationCode: null,
      verificationExpiry: null,
    }).where(eq(registeredPlayers.id, player.id));

    return res.json({ success: true, message: "E-mail verificado com sucesso!" });
  } catch (error) {
    console.error("[PlayerAuth] Verify error:", error);
    return res.status(500).json({ error: "Erro interno ao verificar." });
  }
}

// ========== SESSÃO DO JOGADOR ==========
export async function handlePlayerMe(req: Request, res: Response) {
  try {
    const sessionCookie = req.cookies?.player_session;
    if (!sessionCookie) {
      return res.json({ player: null });
    }

    const session = JSON.parse(sessionCookie);
    const db = await getDb();
    if (!db) return res.json({ player: null });

    const result = await db.select().from(registeredPlayers)
      .where(eq(registeredPlayers.id, session.id)).limit(1);

    if (result.length === 0) {
      return res.json({ player: null });
    }

    const player = result[0];
    return res.json({
      player: {
        id: player.id,
        fullName: player.fullName,
        sportName: player.sportName,
        email: player.email,
        municipality: player.municipality,
        birthDate: player.birthDate,
        emailVerified: player.emailVerified === 1,
      },
    });
  } catch (error) {
    return res.json({ player: null });
  }
}

// ========== INSCRIÇÃO NO TORNEIO ==========
export async function handlePlayerEnroll(req: Request, res: Response) {
  try {
    const sessionCookie = req.cookies?.player_session;
    if (!sessionCookie) {
      return res.status(401).json({ error: "Você precisa estar logado para se inscrever." });
    }

    const session = JSON.parse(sessionCookie);
    const { tournamentId, club } = req.body;

    if (!tournamentId || !club) {
      return res.status(400).json({ error: "Torneio e clube são obrigatórios." });
    }

    // Import db functions dynamically to avoid circular deps
    const dbModule = await import("./db");
    const result = await dbModule.createRegistration({
      tournamentId,
      registeredPlayerId: session.id,
      club,
    });

    return res.json(result);
  } catch (error: any) {
    console.error("[PlayerAuth] Enroll error:", error);
    return res.status(400).json({ error: error.message || "Erro ao inscrever." });
  }
}

// ========== CONSULTAR INSCRIÇÃO ==========
export async function handlePlayerMyRegistration(req: Request, res: Response) {
  try {
    const sessionCookie = req.cookies?.player_session;
    if (!sessionCookie) {
      return res.json({ registration: null });
    }

    const session = JSON.parse(sessionCookie);
    const tournamentId = parseInt(req.query.tournamentId as string) || 1;

    const dbModule = await import("./db");
    const reg = await dbModule.getRegistrationByPlayer(tournamentId, session.id);

    return res.json({ registration: reg });
  } catch (error) {
    return res.json({ registration: null });
  }
}

// ========== DADOS DO TORNEIO (PÚBLICO) ==========
export async function handleTournamentInfo(req: Request, res: Response) {
  try {
    const tournamentId = parseInt(req.query.id as string) || 1;
    const dbModule = await import("./db");
    const stats = await dbModule.getRegistrationStats(tournamentId);
    const tournament = await dbModule.getActiveTournament();

    return res.json({
      tournament: tournament ? {
        id: tournament.id,
        name: tournament.name,
        description: tournament.description,
        maxPlayers: tournament.maxPlayers,
        entryFee: tournament.entryFee,
        pixKey: tournament.pixKey,
        pixHolderName: tournament.pixHolderName,
        registrationOpen: tournament.registrationOpen,
        registrationDeadline: tournament.registrationDeadline,
        refundDeadline: tournament.refundDeadline,
        noRefundDeadline: tournament.noRefundDeadline,
        eventDate: tournament.eventDate,
      } : null,
      stats,
    });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar torneio." });
  }
}

// ========== LOGOUT ==========
export async function handlePlayerLogout(req: Request, res: Response) {
  res.clearCookie("player_session", { path: "/" });
  return res.json({ success: true });
}
