import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, bigint, boolean } from "drizzle-orm/mysql-core";

// ========== TENANTS (Multi-tenant) ==========
export const tenants = mysqlTable("tenants", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(), // identificador único (ex: "liga-sul")
  name: varchar("name", { length: 255 }).notNull(), // nome exibível do tenant
  description: text("description"),
  logoUrl: text("logoUrl"),
  primaryColor: varchar("primaryColor", { length: 20 }).default("#1a73e8"),
  isActive: int("isActive").default(1).notNull(), // 1 = ativo, 0 = inativo
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

// ========== MEMBERSHIPS (Vínculo user + tenant com role) ==========
export const memberships = mysqlTable("memberships", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  userId: int("userId").notNull(), // referência a users.id
  role: mysqlEnum("role", ["admin", "member"]).default("member").notNull(),
  invitedBy: int("invitedBy"), // quem convidou (userId)
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Membership = typeof memberships.$inferSelect;
export type InsertMembership = typeof memberships.$inferInsert;

// ========== SISTEMA DE AUTENTICAÇÃO (Manus OAuth) ==========
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(), // admin global (sistema), user = padrão
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ========== CADASTRO PERMANENTE DE JOGADORES ==========
export const registeredPlayers = mysqlTable("registered_players", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId"), // opcional: jogadores podem ser globais ou por tenant
  fullName: varchar("fullName", { length: 255 }).notNull(),
  sportName: varchar("sportName", { length: 150 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  municipality: varchar("municipality", { length: 255 }).notNull(),
  birthDate: varchar("birthDate", { length: 10 }).notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  emailVerified: int("emailVerified").default(0).notNull(),
  verificationCode: varchar("verificationCode", { length: 10 }),
  verificationExpiry: timestamp("verificationExpiry"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RegisteredPlayer = typeof registeredPlayers.$inferSelect;
export type InsertRegisteredPlayer = typeof registeredPlayers.$inferInsert;

// ========== EVENTOS / TORNEIOS ==========
export const tournaments = mysqlTable("tournaments", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  maxPlayers: int("maxPlayers").default(64).notNull(),
  entryFee: int("entryFee").default(0).notNull(),
  pixKey: varchar("pixKey", { length: 255 }),
  pixHolderName: varchar("pixHolderName", { length: 255 }),
  registrationOpen: int("registrationOpen").default(1).notNull(),
  registrationDeadline: timestamp("registrationDeadline"),
  refundDeadline: timestamp("refundDeadline"),
  noRefundDeadline: timestamp("noRefundDeadline"),
  eventDate: timestamp("eventDate"),
  status: mysqlEnum("status", ["draft", "registration", "in_progress", "finished"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Tournament = typeof tournaments.$inferSelect;
export type InsertTournament = typeof tournaments.$inferInsert;

// ========== INSCRIÇÕES ==========
export const registrations = mysqlTable("registrations", {
  id: int("id").autoincrement().primaryKey(),
  tournamentId: int("tournamentId").notNull(),
  registeredPlayerId: int("registeredPlayerId").notNull(),
  club: varchar("club", { length: 255 }).notNull(),
  status: mysqlEnum("status", [
    "pending_payment",
    "confirmed",
    "waitlist",
    "called_from_waitlist",
    "withdrawn_refund",
    "withdrawn_no_refund",
    "cancelled",
  ]).default("pending_payment").notNull(),
  waitlistPosition: int("waitlistPosition"),
  paymentProof: text("paymentProof"),
  paymentConfirmedAt: timestamp("paymentConfirmedAt"),
  calledFromWaitlistAt: timestamp("calledFromWaitlistAt"),
  paymentDeadline: timestamp("paymentDeadline"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Registration = typeof registrations.$inferSelect;
export type InsertRegistration = typeof registrations.$inferInsert;

// ========== JOGADORES NO CAMPEONATO ==========
export const players = mysqlTable("players", {
  id: int("id").autoincrement().primaryKey(),
  tournamentId: int("tournamentId").notNull(),
  registeredPlayerId: int("registeredPlayerId"),
  name: varchar("name", { length: 255 }).notNull(),
  sportName: varchar("sportName", { length: 150 }),
  municipality: varchar("municipality", { length: 255 }).notNull(),
  club: varchar("club", { length: 255 }).notNull(),
  groupLetter: mysqlEnum("groupLetter", ["A", "B", "C", "D", "E", "F", "G", "H"]).notNull(),
  seed: int("seed").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Player = typeof players.$inferSelect;
export type InsertPlayer = typeof players.$inferInsert;

// ========== PARTIDAS DA FASE DE GRUPOS ==========
export const groupMatches = mysqlTable("group_matches", {
  id: int("id").autoincrement().primaryKey(),
  tournamentId: int("tournamentId").notNull(),
  groupLetter: mysqlEnum("groupLetter", ["A", "B", "C", "D", "E", "F", "G", "H"]).notNull(),
  round: int("round").notNull(),
  homePlayerId: int("homePlayerId").notNull(),
  awayPlayerId: int("awayPlayerId").notNull(),
  homeScore: int("homeScore"),
  awayScore: int("awayScore"),
  played: int("played").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GroupMatch = typeof groupMatches.$inferSelect;
export type InsertGroupMatch = typeof groupMatches.$inferInsert;

// ========== PARTIDAS DA FASE ELIMINATÓRIA ==========
export const knockoutMatches = mysqlTable("knockout_matches", {
  id: int("id").autoincrement().primaryKey(),
  tournamentId: int("tournamentId").notNull(),
  series: mysqlEnum("series", ["A", "B", "C", "D"]).notNull(),
  phase: mysqlEnum("phase", ["round_of_16", "quarter_finals", "semi_finals", "third_place", "final"]).notNull(),
  matchOrder: int("matchOrder").notNull(),
  homePlayerId: int("homePlayerId"),
  awayPlayerId: int("awayPlayerId"),
  homeScore: int("homeScore"),
  awayScore: int("awayScore"),
  homePenalties: int("homePenalties"),
  awayPenalties: int("awayPenalties"),
  decisionMethod: mysqlEnum("decisionMethod", ["normal", "penalties"]).default("normal"),
  played: int("played").default(0).notNull(),
  winnerId: int("winnerId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KnockoutMatch = typeof knockoutMatches.$inferSelect;
export type InsertKnockoutMatch = typeof knockoutMatches.$inferInsert;
