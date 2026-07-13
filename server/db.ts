import { eq, and, or, sql, desc, asc, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users, players, groupMatches, knockoutMatches,
  tournaments, registrations, registeredPlayers, tenants, memberships
} from "../drizzle/schema";
import type { InsertPlayer, InsertGroupMatch, InsertKnockoutMatch, InsertMembership, Membership } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ========== TENANTS ==========
export async function getAllTenants() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tenants).orderBy(desc(tenants.createdAt));
}

export async function getTenantById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  return result[0] || null;
}

export async function getTenantBySlug(slug: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
  return result[0] || null;
}

export async function createTenant(data: { slug: string; name: string; description?: string; logoUrl?: string; primaryColor?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(tenants).values(data);
  return result[0].insertId;
}

export async function updateTenant(id: number, data: Partial<{ name: string; description: string; logoUrl: string; primaryColor: string; isActive: number }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(tenants).set(data).where(eq(tenants.id, id));
}

// ========== MEMBERSHIPS ==========

// Verificar se user é admin de um tenant
export async function getUserTenantRole(userId: number, tenantId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.tenantId, tenantId)))
    .limit(1);
  return result[0]?.role ?? null;
}

// Verificar se user pertence a um tenant (qualquer role)
export async function isUserMemberOfTenant(userId: number, tenantId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.tenantId, tenantId)))
    .limit(1);
  return result.length > 0;
}

// Listar todos os admins de um tenant
export async function getTenantAdmins(tenantId: number): Promise<Membership[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(memberships)
    .where(and(eq(memberships.tenantId, tenantId), eq(memberships.role, "admin")));
}

// Contar admins de um tenant
export async function countTenantAdmins(tenantId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(memberships)
    .where(and(eq(memberships.tenantId, tenantId), eq(memberships.role, "admin")));
  return result[0]?.count ?? 0;
}

// Listar todos os membros de um tenant
export async function getTenantMembers(tenantId: number): Promise<(Membership & { userName: string | null; userEmail: string | null; userOpenId: string | null })[]> {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({
    id: memberships.id,
    tenantId: memberships.tenantId,
    userId: memberships.userId,
    role: memberships.role,
    invitedBy: memberships.invitedBy,
    joinedAt: memberships.joinedAt,
    createdAt: memberships.createdAt,
    updatedAt: memberships.updatedAt,
    userName: users.name,
    userEmail: users.email,
    userOpenId: users.openId,
  }).from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(eq(memberships.tenantId, tenantId));
  return result;
}

// Criar membership com validação de "1 admin por tenant"
export async function createMembership(data: InsertMembership): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // VALIDAÇÃO DE NEGÓCIO: bloquear criação de segundo admin por tenant
  if (data.role === "admin") {
    const adminCount = await countTenantAdmins(data.tenantId);
    if (adminCount >= 1) {
      throw new Error("Este tenant já possui um administrador. Apenas 1 admin é permitido por tenant.");
    }
  }

  const result = await db.insert(memberships).values(data);
  return result[0].insertId;
}

// Promover membro a admin (com validação)
export async function promoteToAdmin(tenantId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Verificar se o usuário já é admin
  const currentRole = await getUserTenantRole(userId, tenantId);
  if (currentRole === "admin") {
    throw new Error("Este usuário já é administrador deste tenant.");
  }

  // Verificar se já existe um admin
  const adminCount = await countTenantAdmins(tenantId);
  if (adminCount >= 1) {
    throw new Error("Este tenant já possui um administrador. Apenas 1 admin é permitido por tenant.");
  }

  // Verificar se o usuário é membro do tenant
  const isMember = await isUserMemberOfTenant(userId, tenantId);
  if (!isMember) {
    throw new Error("Usuário não é membro deste tenant.");
  }

  await db.update(memberships)
    .set({ role: "admin" })
    .where(and(eq(memberships.tenantId, tenantId), eq(memberships.userId, userId)));
}

// Remover membro de um tenant
export async function removeMembership(tenantId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Verificar se é admin antes de remover
  const currentRole = await getUserTenantRole(userId, tenantId);
  if (currentRole === "admin") {
    // Verificar se é o único admin
    const adminCount = await countTenantAdmins(tenantId);
    if (adminCount <= 1) {
      throw new Error("Não é possível remover o único administrador do tenant.");
    }
  }

  await db.delete(memberships)
    .where(and(eq(memberships.tenantId, tenantId), eq(memberships.userId, userId)));
}

// Listar todos os tenants de um usuário
export async function getUserTenants(userId: number): Promise<(typeof tenants.$inferSelect & { role: string })[]> {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({
    id: tenants.id,
    slug: tenants.slug,
    name: tenants.name,
    description: tenants.description,
    logoUrl: tenants.logoUrl,
    primaryColor: tenants.primaryColor,
    isActive: tenants.isActive,
    createdAt: tenants.createdAt,
    updatedAt: tenants.updatedAt,
    role: memberships.role,
  }).from(memberships)
    .innerJoin(tenants, eq(memberships.tenantId, tenants.id))
    .where(eq(memberships.userId, userId));
  return result;
}

// ========== USERS ==========
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function listUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

// ========== TOURNAMENTS ==========
export async function getAllTournaments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tournaments).orderBy(desc(tournaments.createdAt));
}

// Listar torneios de um tenant específico
export async function getTournamentsByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tournaments)
    .where(eq(tournaments.tenantId, tenantId))
    .orderBy(desc(tournaments.createdAt));
}

export async function getActiveTournamentByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(tournaments)
    .where(and(eq(tournaments.tenantId, tenantId), sql`${tournaments.status} != 'finished'`))
    .orderBy(desc(tournaments.createdAt)).limit(1);
  return result[0] || null;
}

// Legacy: keep for backward compat but deprecated
export async function getActiveTournament() {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(tournaments)
    .where(sql`${tournaments.status} != 'finished'`)
    .orderBy(desc(tournaments.createdAt)).limit(1);
  return result[0] || null;
}

export async function getTournamentById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
  return result[0] || null;
}

export async function createTournament(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(tournaments).values(data);
  return result[0].insertId;
}

export async function updateTournament(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(tournaments).set(data).where(eq(tournaments.id, id));
}

// ========== PLAYERS ==========
export async function getAllPlayers(tournamentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(players)
    .where(eq(players.tournamentId, tournamentId))
    .orderBy(asc(players.groupLetter), asc(players.seed));
}

export async function getPlayersByGroup(tournamentId: number, group: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(players)
    .where(and(eq(players.tournamentId, tournamentId), eq(players.groupLetter, group as any)))
    .orderBy(asc(players.seed));
}

export async function createPlayer(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(players).values(data);
  return result[0].insertId;
}

export async function updatePlayer(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(players).set(data).where(eq(players.id, id));
}

export async function deletePlayer(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(players).where(eq(players.id, id));
}

export async function deleteAllPlayers(tournamentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(players).where(eq(players.tournamentId, tournamentId));
}

// ========== GROUP MATCHES ==========
export async function getGroupMatches(tournamentId: number, group?: string) {
  const db = await getDb();
  if (!db) return [];
  if (group) {
    return db.select().from(groupMatches)
      .where(and(eq(groupMatches.tournamentId, tournamentId), eq(groupMatches.groupLetter, group as any)))
      .orderBy(asc(groupMatches.round), asc(groupMatches.id));
  }
  return db.select().from(groupMatches)
    .where(eq(groupMatches.tournamentId, tournamentId))
    .orderBy(asc(groupMatches.groupLetter), asc(groupMatches.round), asc(groupMatches.id));
}

export async function getGroupMatchesByRound(tournamentId: number, group: string, round: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(groupMatches)
    .where(and(
      eq(groupMatches.tournamentId, tournamentId),
      eq(groupMatches.groupLetter, group as any),
      eq(groupMatches.round, round)
    ));
}

export async function createGroupMatchesBulk(data: any[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.length === 0) return;
  await db.insert(groupMatches).values(data);
}

export async function updateGroupMatchScore(id: number, homeScore: number, awayScore: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(groupMatches).set({ homeScore, awayScore, played: 1 }).where(eq(groupMatches.id, id));
}

export async function resetGroupMatchScore(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(groupMatches).set({ homeScore: null, awayScore: null, played: 0 }).where(eq(groupMatches.id, id));
}

export async function deleteAllGroupMatches(tournamentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(groupMatches).where(eq(groupMatches.tournamentId, tournamentId));
}

// ========== STANDINGS ==========
export interface StandingRow {
  playerId: number;
  playerName: string;
  sportName: string | null;
  club: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

export async function calculateGroupStandings(tournamentId: number, group: string): Promise<StandingRow[]> {
  const db = await getDb();
  if (!db) return [];

  const groupPlayers = await db.select().from(players)
    .where(and(eq(players.tournamentId, tournamentId), eq(players.groupLetter, group as any)));

  const matches = await db.select().from(groupMatches)
    .where(and(
      eq(groupMatches.tournamentId, tournamentId),
      eq(groupMatches.groupLetter, group as any),
      eq(groupMatches.played, 1)
    ));

  const standingsMap = new Map<number, StandingRow>();
  for (const p of groupPlayers) {
    standingsMap.set(p.id, {
      playerId: p.id,
      playerName: p.name,
      sportName: p.sportName,
      club: p.club,
      played: 0, won: 0, drawn: 0, lost: 0,
      goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0,
    });
  }

  for (const m of matches) {
    const home = standingsMap.get(m.homePlayerId);
    const away = standingsMap.get(m.awayPlayerId);
    if (!home || !away) continue;

    const hs = m.homeScore ?? 0;
    const as2 = m.awayScore ?? 0;

    home.played++; away.played++;
    home.goalsFor += hs; home.goalsAgainst += as2;
    away.goalsFor += as2; away.goalsAgainst += hs;

    if (hs > as2) { home.won++; home.points += 3; away.lost++; }
    else if (hs < as2) { away.won++; away.points += 3; home.lost++; }
    else { home.drawn++; away.drawn++; home.points += 1; away.points += 1; }
  }

  const result = Array.from(standingsMap.values());
  for (const r of result) { r.goalDiff = r.goalsFor - r.goalsAgainst; }

  result.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.playerName.localeCompare(b.playerName);
  });

  return result;
}

// ========== KNOCKOUT ==========
export async function getKnockoutMatches(tournamentId: number, series?: string) {
  const db = await getDb();
  if (!db) return [];
  if (series) {
    return db.select().from(knockoutMatches)
      .where(and(eq(knockoutMatches.tournamentId, tournamentId), eq(knockoutMatches.series, series as any)))
      .orderBy(asc(knockoutMatches.matchOrder));
  }
  return db.select().from(knockoutMatches)
    .where(eq(knockoutMatches.tournamentId, tournamentId))
    .orderBy(asc(knockoutMatches.series), asc(knockoutMatches.matchOrder));
}

export async function getKnockoutMatchesBySeries(tournamentId: number, series: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(knockoutMatches)
    .where(and(eq(knockoutMatches.tournamentId, tournamentId), eq(knockoutMatches.series, series as any)));
}

export async function getKnockoutMatchById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(knockoutMatches).where(eq(knockoutMatches.id, id)).limit(1);
  return result[0] || null;
}

export async function createKnockoutMatchesBulk(data: any[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.length === 0) return;
  await db.insert(knockoutMatches).values(data);
}

export async function updateKnockoutMatchFull(id: number, data: {
  homeScore: number;
  awayScore: number;
  homeExtraTime: number | null;
  awayExtraTime: number | null;
  homePenalties: number | null;
  awayPenalties: number | null;
  decisionMethod: "normal" | "penalties";
  winnerId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(knockoutMatches).set({
    homeScore: data.homeScore,
    awayScore: data.awayScore,
    homePenalties: data.homePenalties,
    awayPenalties: data.awayPenalties,
    decisionMethod: data.decisionMethod,
    played: 1,
    winnerId: data.winnerId,
  }).where(eq(knockoutMatches.id, id));
}

export async function updateKnockoutMatchPlayers(id: number, homePlayerId: number | null, awayPlayerId: number | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(knockoutMatches).set({ homePlayerId, awayPlayerId }).where(eq(knockoutMatches.id, id));
}

export async function deleteAllKnockoutMatches(tournamentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(knockoutMatches).where(eq(knockoutMatches.tournamentId, tournamentId));
}

// ========== REGISTRATIONS ==========
export async function getRegistrations(tournamentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(registrations)
    .where(eq(registrations.tournamentId, tournamentId))
    .orderBy(asc(registrations.createdAt));
}

export async function getRegistrationsWithPlayers(tournamentId: number) {
  const db = await getDb();
  if (!db) return [];
  const regs = await db.select().from(registrations)
    .where(eq(registrations.tournamentId, tournamentId))
    .orderBy(asc(registrations.createdAt));

  const enriched = [];
  for (const reg of regs) {
    const playerResult = await db.select().from(registeredPlayers)
      .where(eq(registeredPlayers.id, reg.registeredPlayerId)).limit(1);
    const player = playerResult[0];
    enriched.push({
      ...reg,
      playerName: player?.fullName || "Desconhecido",
      playerSportName: player?.sportName || "",
      playerEmail: player?.email || "",
      playerMunicipality: player?.municipality || "",
    });
  }
  return enriched;
}

export async function confirmRegistrationPayment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(registrations).set({
    status: "confirmed",
    paymentConfirmedAt: new Date(),
  }).where(eq(registrations.id, id));
}

export async function cancelRegistration(id: number, refund: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const reg = await db.select().from(registrations).where(eq(registrations.id, id)).limit(1);
  if (!reg[0]) throw new Error("Inscrição não encontrada.");

  const tournamentId = reg[0].tournamentId;
  const previousStatus = reg[0].status;

  const realSlotStatuses = ["confirmed", "pending_payment", "called_from_waitlist"];
  const wasOccupyingSlot = realSlotStatuses.includes(previousStatus);

  await db.update(registrations).set({
    status: refund ? "withdrawn_refund" : "withdrawn_no_refund",
  }).where(eq(registrations.id, id));

  if (tournamentId && wasOccupyingSlot) {
    const nextInWaitlist = await db.select().from(registrations)
      .where(and(
        eq(registrations.tournamentId, tournamentId),
        eq(registrations.status, "waitlist")
      ))
      .orderBy(asc(registrations.waitlistPosition))
      .limit(1);

    if (nextInWaitlist.length > 0) {
      const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000);
      await db.update(registrations).set({
        status: "called_from_waitlist",
        calledFromWaitlistAt: new Date(),
        paymentDeadline: deadline,
        waitlistPosition: null,
      }).where(eq(registrations.id, nextInWaitlist[0].id));

      const remainingWaitlist = await db.select().from(registrations)
        .where(and(
          eq(registrations.tournamentId, tournamentId),
          eq(registrations.status, "waitlist")
        ))
        .orderBy(asc(registrations.waitlistPosition));

      for (let i = 0; i < remainingWaitlist.length; i++) {
        await db.update(registrations).set({
          waitlistPosition: i + 1,
        }).where(eq(registrations.id, remainingWaitlist[i].id));
      }
    }
  }
}

export async function callFromWaitlist(id: number, paymentDeadlineHours: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const deadline = new Date(Date.now() + paymentDeadlineHours * 60 * 60 * 1000);
  await db.update(registrations).set({
    status: "called_from_waitlist",
    calledFromWaitlistAt: new Date(),
    paymentDeadline: deadline,
    waitlistPosition: null,
  }).where(eq(registrations.id, id));
}

export async function createRegistration(data: { tournamentId: number; registeredPlayerId: number; club: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Validar duplicidade
  const existing = await db.select().from(registrations)
    .where(and(
      eq(registrations.tournamentId, data.tournamentId),
      eq(registrations.registeredPlayerId, data.registeredPlayerId),
      sql`${registrations.status} NOT IN ('withdrawn_refund', 'withdrawn_no_refund', 'cancelled')`
    )).limit(1);

  if (existing.length > 0) {
    throw new Error("Este jogador já está inscrito neste torneio.");
  }

  const tournament = await db.select().from(tournaments)
    .where(eq(tournaments.id, data.tournamentId)).limit(1);
  if (!tournament[0]) throw new Error("Torneio não encontrado.");

  // Contar vagas confirmadas
  const confirmedCount = await db.select({ count: sql<number>`count(*)` }).from(registrations)
    .where(and(
      eq(registrations.tournamentId, data.tournamentId),
      eq(registrations.status, "confirmed")
    ));
  const count = confirmedCount[0]?.count ?? 0;

  let status = "pending_payment";
  let waitlistPosition = null;

  if (count >= tournament[0].maxPlayers) {
    status = "waitlist";
    const waitlistCount = await db.select({ count: sql<number>`count(*)` }).from(registrations)
      .where(and(
        eq(registrations.tournamentId, data.tournamentId),
        eq(registrations.status, "waitlist")
      ));
    waitlistPosition = (waitlistCount[0]?.count ?? 0) + 1;
  }

  const result = await db.insert(registrations).values({
    ...data,
    status,
    waitlistPosition,
  });

  return { id: result[0].insertId, status, waitlistPosition };
}

export async function getRegistrationByPlayer(tournamentId: number, registeredPlayerId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(registrations)
    .where(and(
      eq(registrations.tournamentId, tournamentId),
      eq(registrations.registeredPlayerId, registeredPlayerId)
    )).limit(1);
  return result[0] || null;
}

export async function getRegistrationStats(tournamentId: number) {
  const db = await getDb();
  if (!db) return {};
  const tournament = await getTournamentById(tournamentId);
  if (!tournament) return {};

  const allRegs = await db.select().from(registrations)
    .where(eq(registrations.tournamentId, tournamentId));

  const confirmed = allRegs.filter(r => r.status === "confirmed").length;
  const pending = allRegs.filter(r => r.status === "pending_payment").length;
  const waitlist = allRegs.filter(r => r.status === "waitlist").length;
  const called = allRegs.filter(r => r.status === "called_from_waitlist").length;

  return {
    total: tournament.maxPlayers,
    confirmed,
    pending,
    waitlist,
    called,
    available: Math.max(0, tournament.maxPlayers - confirmed - called),
  };
}

export async function getDashboardStats(tournamentId: number) {
  const db = await getDb();
  if (!db) return {};

  const tournament = await getTournamentById(tournamentId);
  if (!tournament) return {};

  const allPlayers = await db.select().from(players).where(eq(players.tournamentId, tournamentId));
  const allGroupMatches = await db.select().from(groupMatches).where(eq(groupMatches.tournamentId, tournamentId));
  const playedMatches = allGroupMatches.filter(m => m.played === 1);
  const stats = await getRegistrationStats(tournamentId);

  return {
    tournament,
    players: allPlayers.length,
    matches: {
      total: allGroupMatches.length,
      played: playedMatches.length,
      pending: allGroupMatches.length - playedMatches.length,
    },
    registrations: stats,
  };
}
