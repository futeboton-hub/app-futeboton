import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, tenantProcedure, tenantAdminProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

// Gerar rodadas round-robin para N jogadores
function generateRoundRobin(playerIds: number[]): { round: number; home: number; away: number }[] {
  const n = playerIds.length;
  const rounds: { round: number; home: number; away: number }[] = [];
  const fixed = playerIds[0];
  const rotating = playerIds.slice(1);

  for (let r = 0; r < n - 1; r++) {
    const currentOrder = [fixed, ...rotating];
    for (let i = 0; i < n / 2; i++) {
      const home = currentOrder[i];
      const away = currentOrder[n - 1 - i];
      rounds.push({ round: r + 1, home, away });
    }
    rotating.push(rotating.shift()!);
  }
  return rounds;
}

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ========== TENANTS ==========
  tenants: router({
    // Listar todos os tenants (público)
    list: publicProcedure.query(async () => {
      return db.getAllTenants();
    }),

    // Obter tenant por ID
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getTenantById(input.id);
      }),

    // Obter tenant por slug
    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        return db.getTenantBySlug(input.slug);
      }),

    // Criar tenant (admin global)
    create: adminProcedure
      .input(z.object({
        slug: z.string().min(2).max(100),
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        logoUrl: z.string().optional(),
        primaryColor: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createTenant(input);
        return { id };
      }),

    // Atualizar tenant (admin global)
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        logoUrl: z.string().optional(),
        primaryColor: z.string().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateTenant(id, data);
        return { success: true };
      }),
  }),

  // ========== MEMBERSHIPS ==========
  memberships: router({
    // Listar membros do tenant (admin do tenant)
    list: tenantAdminProcedure
      .input(z.object({ tenantId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getTenantMembers(input.tenantId);
      }),

    // Adicionar membro ao tenant (admin do tenant)
    addMember: tenantAdminProcedure
      .input(z.object({
        tenantId: z.number(),
        userId: z.number(),
        role: z.enum(["admin", "member"]).default("member"),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verificar se o user que está adicionando é admin do tenant
        if (ctx.tenantRole !== "admin") {
          throw new Error("Apenas administradores do tenant podem adicionar membros.");
        }

        // VALIDAÇÃO DE NEGÓCIO: bloquear segundo admin
        if (input.role === "admin") {
          const adminCount = await db.countTenantAdmins(input.tenantId);
          if (adminCount >= 1) {
            throw new Error("Este tenant já possui um administrador. Apenas 1 admin é permitido por tenant.");
          }
        }

        // Verificar se já é membro
        const existing = await db.isUserMemberOfTenant(input.userId, input.tenantId);
        if (existing) {
          throw new Error("Este usuário já é membro deste tenant.");
        }

        const id = await db.createMembership({
          tenantId: input.tenantId,
          userId: input.userId,
          role: input.role,
          invitedBy: ctx.user.id,
        });
        return { id };
      }),

    // Promover membro a admin (admin global ou admin do tenant)
    promoteAdmin: adminProcedure
      .input(z.object({
        tenantId: z.number(),
        userId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.promoteToAdmin(input.tenantId, input.userId);
        return { success: true };
      }),

    // Remover membro do tenant (admin do tenant)
    removeMember: tenantAdminProcedure
      .input(z.object({
        tenantId: z.number(),
        userId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Não pode remover a si mesmo se for o único admin
        if (ctx.user.id === input.userId && ctx.tenantRole === "admin") {
          const adminCount = await db.countTenantAdmins(input.tenantId);
          if (adminCount <= 1) {
            throw new Error("Não é possível se remover sendo o único administrador do tenant.");
          }
        }

        await db.removeMembership(input.tenantId, input.userId);
        return { success: true };
      }),

    // Listar meus tenants (usuário logado)
    myTenants: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserTenants(ctx.user.id);
    }),
  }),

  // ========== TOURNAMENTS ==========
  tournaments: router({
    // Listar torneios de um tenant
    list: tenantProcedure
      .input(z.object({ tenantId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getTournamentsByTenant(input.tenantId);
      }),

    // Obter torneio ativo do tenant
    getActive: tenantProcedure
      .input(z.object({ tenantId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getActiveTournamentByTenant(input.tenantId);
      }),

    // Criar torneio (admin do tenant)
    create: tenantAdminProcedure
      .input(z.object({
        tenantId: z.number(),
        name: z.string().min(1),
        description: z.string().optional(),
        maxPlayers: z.number().min(2).default(64),
        entryFee: z.number().min(0).default(0),
        pixKey: z.string().optional(),
        pixHolderName: z.string().optional(),
        registrationDeadline: z.string().optional(),
        refundDeadline: z.string().optional(),
        noRefundDeadline: z.string().optional(),
        eventDate: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { tenantId, ...data } = input;
        const id = await db.createTournament({ ...data, tenantId });
        return { id };
      }),

    // Atualizar torneio (admin do tenant)
    update: tenantAdminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        maxPlayers: z.number().min(2).optional(),
        entryFee: z.number().min(0).optional(),
        pixKey: z.string().optional(),
        pixHolderName: z.string().optional(),
        registrationOpen: z.number().optional(),
        registrationDeadline: z.string().optional(),
        refundDeadline: z.string().optional(),
        noRefundDeadline: z.string().optional(),
        eventDate: z.string().optional(),
        status: z.enum(["draft", "registration", "in_progress", "finished"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateTournament(id, data);
        return { success: true };
      }),
  }),

  // ========== PLAYERS ==========
  players: router({
    list: tenantProcedure
      .input(z.object({ tournamentId: z.number(), tenantId: z.number() }).optional())
      .query(async ({ input }) => {
        if (!input?.tournamentId) return [];
        return db.getAllPlayers(input.tournamentId);
      }),

    listByGroup: tenantProcedure
      .input(z.object({ group: z.string(), tournamentId: z.number().optional(), tenantId: z.number() }))
      .query(async ({ input }) => {
        if (!input.tournamentId) return [];
        return db.getPlayersByGroup(input.tournamentId, input.group);
      }),

    create: tenantAdminProcedure
      .input(z.object({
        tournamentId: z.number(),
        tenantId: z.number(),
        name: z.string().min(1),
        sportName: z.string().optional(),
        municipality: z.string().min(1),
        club: z.string().min(1),
        groupLetter: z.enum(["A", "B", "C", "D", "E", "F", "G", "H"]),
        seed: z.number().min(1).max(8),
      }))
      .mutation(async ({ input }) => {
        const { tenantId, ...data } = input;
        const id = await db.createPlayer(data);
        return { id };
      }),

    bulkCreate: tenantAdminProcedure
      .input(z.object({
        tournamentId: z.number(),
        tenantId: z.number(),
        players: z.array(z.object({
          name: z.string().min(1),
          sportName: z.string().optional(),
          municipality: z.string().min(1),
          club: z.string().min(1),
          groupLetter: z.enum(["A", "B", "C", "D", "E", "F", "G", "H"]),
          seed: z.number().min(1).max(8),
        })),
      }))
      .mutation(async ({ input }) => {
        const tid = input.tournamentId;
        await db.deleteAllKnockoutMatches(tid);
        await db.deleteAllGroupMatches(tid);
        await db.deleteAllPlayers(tid);
        for (const p of input.players) {
          await db.createPlayer({ ...p, tournamentId: tid });
        }
        return { success: true, count: input.players.length };
      }),

    update: tenantAdminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        sportName: z.string().optional(),
        municipality: z.string().min(1).optional(),
        club: z.string().min(1).optional(),
        groupLetter: z.enum(["A", "B", "C", "D", "E", "F", "G", "H"]).optional(),
        seed: z.number().min(1).max(8).optional(),
        tenantId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updatePlayer(id, data);
        return { success: true };
      }),

    delete: tenantAdminProcedure
      .input(z.object({ id: z.number(), tenantId: z.number() }))
      .mutation(async ({ input }) => {
        await db.deletePlayer(input.id);
        return { success: true };
      }),
  }),

  // ========== GROUP MATCHES ==========
  matches: router({
    list: tenantProcedure
      .input(z.object({ group: z.string().optional(), tournamentId: z.number().optional(), tenantId: z.number() }).optional())
      .query(async ({ input }) => {
        if (!input?.tournamentId) return [];
        return db.getGroupMatches(input.tournamentId, input?.group);
      }),

    listByRound: tenantProcedure
      .input(z.object({ group: z.string(), round: z.number(), tournamentId: z.number().optional(), tenantId: z.number() }))
      .query(async ({ input }) => {
        if (!input.tournamentId) return [];
        return db.getGroupMatchesByRound(input.tournamentId, input.group, input.round);
      }),

    generateFixtures: tenantAdminProcedure
      .input(z.object({ tournamentId: z.number(), tenantId: z.number() }))
      .mutation(async ({ input }) => {
        const tid = input.tournamentId;
        await db.deleteAllGroupMatches(tid);
        await db.deleteAllKnockoutMatches(tid);

        const allPlayers = await db.getAllPlayers(tid);
        const groups = ["A", "B", "C", "D", "E", "F", "G", "H"];

        for (const g of groups) {
          const groupPlayers = allPlayers.filter(p => p.groupLetter === g);
          if (groupPlayers.length < 2) continue;

          const fixtures = generateRoundRobin(groupPlayers.map(p => p.id));
          const matchData = fixtures.map(f => ({
            tournamentId: tid,
            groupLetter: g as any,
            round: f.round,
            homePlayerId: f.home,
            awayPlayerId: f.away,
          }));
          await db.createGroupMatchesBulk(matchData);
        }

        return { success: true };
      }),

    updateScore: tenantAdminProcedure
      .input(z.object({
        id: z.number(),
        homeScore: z.number().min(0),
        awayScore: z.number().min(0),
        tenantId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.updateGroupMatchScore(input.id, input.homeScore, input.awayScore);
        return { success: true };
      }),

    resetScore: tenantAdminProcedure
      .input(z.object({ id: z.number(), tenantId: z.number() }))
      .mutation(async ({ input }) => {
        await db.resetGroupMatchScore(input.id);
        return { success: true };
      }),
  }),

  // ========== STANDINGS ==========
  standings: router({
    byGroup: tenantProcedure
      .input(z.object({ group: z.string(), tournamentId: z.number().optional(), tenantId: z.number() }))
      .query(async ({ input }) => {
        if (!input.tournamentId) return [];
        return db.calculateGroupStandings(input.tournamentId, input.group);
      }),

    all: tenantProcedure
      .input(z.object({ tournamentId: z.number().optional(), tenantId: z.number() }).optional())
      .query(async ({ input }) => {
        if (!input?.tournamentId) return {};
        const tid = input.tournamentId;
        const groups = ["A", "B", "C", "D", "E", "F", "G", "H"];
        const result: Record<string, db.StandingRow[]> = {};
        for (const g of groups) {
          result[g] = await db.calculateGroupStandings(tid, g);
        }
        return result;
      }),
  }),

  // ========== KNOCKOUT (4 SÉRIES) ==========
  knockout: router({
    list: tenantProcedure
      .input(z.object({ tournamentId: z.number().optional(), series: z.string().optional(), tenantId: z.number() }).optional())
      .query(async ({ input }) => {
        if (!input?.tournamentId) return [];
        return db.getKnockoutMatches(input.tournamentId, input?.series);
      }),

    generate: tenantAdminProcedure
      .input(z.object({ tournamentId: z.number(), tenantId: z.number() }))
      .mutation(async ({ input }) => {
        const tid = input.tournamentId;
        await db.deleteAllKnockoutMatches(tid);

        const groups = ["A", "B", "C", "D", "E", "F", "G", "H"];
        const standings: Record<string, db.StandingRow[]> = {};
        for (const g of groups) {
          standings[g] = await db.calculateGroupStandings(tid, g);
        }

        const seriesConfig = [
          { series: "A", positions: [0, 1] },
          { series: "B", positions: [2, 3] },
          { series: "C", positions: [4, 5] },
          { series: "D", positions: [6, 7] },
        ];

        const knockoutData: any[] = [];

        for (const { series, positions } of seriesConfig) {
          const r16Matchups = [
            { home: standings["A"]?.[positions[0]], away: standings["B"]?.[positions[1]] },
            { home: standings["B"]?.[positions[0]], away: standings["A"]?.[positions[1]] },
            { home: standings["C"]?.[positions[0]], away: standings["D"]?.[positions[1]] },
            { home: standings["D"]?.[positions[0]], away: standings["C"]?.[positions[1]] },
            { home: standings["E"]?.[positions[0]], away: standings["F"]?.[positions[1]] },
            { home: standings["F"]?.[positions[0]], away: standings["E"]?.[positions[1]] },
            { home: standings["G"]?.[positions[0]], away: standings["H"]?.[positions[1]] },
            { home: standings["H"]?.[positions[0]], away: standings["G"]?.[positions[1]] },
          ];

          for (let i = 0; i < r16Matchups.length; i++) {
            const m = r16Matchups[i];
            knockoutData.push({
              tournamentId: tid,
              series,
              phase: "round_of_16",
              matchOrder: i + 1,
              homePlayerId: m.home?.playerId ?? null,
              awayPlayerId: m.away?.playerId ?? null,
            });
          }

          for (let i = 0; i < 4; i++) {
            knockoutData.push({
              tournamentId: tid,
              series,
              phase: "quarter_finals",
              matchOrder: i + 1,
              homePlayerId: null,
              awayPlayerId: null,
            });
          }

          for (let i = 0; i < 2; i++) {
            knockoutData.push({
              tournamentId: tid,
              series,
              phase: "semi_finals",
              matchOrder: i + 1,
              homePlayerId: null,
              awayPlayerId: null,
            });
          }

          knockoutData.push({
            tournamentId: tid,
            series,
            phase: "third_place",
            matchOrder: 1,
            homePlayerId: null,
            awayPlayerId: null,
          });

          knockoutData.push({
            tournamentId: tid,
            series,
            phase: "final",
            matchOrder: 1,
            homePlayerId: null,
            awayPlayerId: null,
          });
        }

        await db.createKnockoutMatchesBulk(knockoutData);
        return { success: true };
      }),

    updateScore: tenantAdminProcedure
      .input(z.object({
        id: z.number(),
        homeScore: z.number().min(0),
        awayScore: z.number().min(0),
        homePenalties: z.number().min(0).optional(),
        awayPenalties: z.number().min(0).optional(),
        tenantId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const match = await db.getKnockoutMatchById(input.id);
        if (!match) throw new Error("Partida não encontrada");

        let winner: number;
        let decisionMethod: "normal" | "penalties" = "normal";

        if (input.homeScore !== input.awayScore) {
          winner = input.homeScore > input.awayScore ? match.homePlayerId! : match.awayPlayerId!;
          decisionMethod = "normal";
        } else if (input.homePenalties !== undefined && input.awayPenalties !== undefined) {
          if (input.homePenalties === input.awayPenalties) {
            throw new Error("Os pênaltis não podem terminar empatados.");
          }
          winner = input.homePenalties > input.awayPenalties ? match.homePlayerId! : match.awayPlayerId!;
          decisionMethod = "penalties";
        } else {
          throw new Error("Empate no tempo normal. Informe o resultado dos pênaltis.");
        }

        const loser = winner === match.homePlayerId ? match.awayPlayerId! : match.homePlayerId!;

        await db.updateKnockoutMatchFull(input.id, {
          homeScore: input.homeScore,
          awayScore: input.awayScore,
          homeExtraTime: null,
          awayExtraTime: null,
          homePenalties: input.homePenalties ?? null,
          awayPenalties: input.awayPenalties ?? null,
          decisionMethod,
          winnerId: winner,
        });

        const allMatches = await db.getKnockoutMatchesBySeries(match.tournamentId, match.series);
        const phaseOrder = ["round_of_16", "quarter_finals", "semi_finals", "final"];
        const currentPhaseIdx = phaseOrder.indexOf(match.phase);

        if (match.phase === "semi_finals") {
          const finalMatch = allMatches.find(m => m.phase === "final" && m.matchOrder === 1);
          if (finalMatch) {
            const isHome = match.matchOrder === 1;
            if (isHome) {
              await db.updateKnockoutMatchPlayers(finalMatch.id, winner, finalMatch.awayPlayerId);
            } else {
              await db.updateKnockoutMatchPlayers(finalMatch.id, finalMatch.homePlayerId, winner);
            }
          }

          const thirdPlaceMatch = allMatches.find(m => m.phase === "third_place" && m.matchOrder === 1);
          if (thirdPlaceMatch) {
            const isHome = match.matchOrder === 1;
            if (isHome) {
              await db.updateKnockoutMatchPlayers(thirdPlaceMatch.id, loser, thirdPlaceMatch.awayPlayerId);
            } else {
              await db.updateKnockoutMatchPlayers(thirdPlaceMatch.id, thirdPlaceMatch.homePlayerId, loser);
            }
          }
        } else if (currentPhaseIdx < phaseOrder.length - 1 && match.phase !== "third_place") {
          const nextPhase = phaseOrder[currentPhaseIdx + 1];
          const nextMatchOrder = Math.ceil(match.matchOrder / 2);
          const nextMatch = allMatches.find(m => m.phase === nextPhase && m.matchOrder === nextMatchOrder);

          if (nextMatch) {
            const isHome = match.matchOrder % 2 === 1;
            if (isHome) {
              await db.updateKnockoutMatchPlayers(nextMatch.id, winner, nextMatch.awayPlayerId);
            } else {
              await db.updateKnockoutMatchPlayers(nextMatch.id, nextMatch.homePlayerId, winner);
            }
          }
        }

        return { success: true, winnerId: winner, decisionMethod };
      }),
  }),

  // ========== REGISTRATIONS (INSCRIÇÕES) ==========
  registrations: router({
    list: tenantAdminProcedure
      .input(z.object({ tournamentId: z.number(), tenantId: z.number() }))
      .query(async ({ input }) => {
        return db.getRegistrationsWithPlayers(input.tournamentId);
      }),

    confirmPayment: tenantAdminProcedure
      .input(z.object({ id: z.number(), tenantId: z.number() }))
      .mutation(async ({ input }) => {
        await db.confirmRegistrationPayment(input.id);
        return { success: true };
      }),

    cancelRegistration: tenantAdminProcedure
      .input(z.object({ id: z.number(), refund: z.boolean().optional(), tenantId: z.number() }))
      .mutation(async ({ input }) => {
        let refund = input.refund;
        if (refund === undefined) {
          const tournament = await db.getTournamentById(input.id); // need tournament, not reg id
          // Fallback: try to get from tournament
          if (tournament) {
            const now = new Date();
            if (tournament.refundDeadline && now <= new Date(tournament.refundDeadline)) {
              refund = true;
            } else if (tournament.noRefundDeadline && now <= new Date(tournament.noRefundDeadline)) {
              refund = false;
            } else {
              refund = false;
            }
          } else {
            refund = false;
          }
        }
        await db.cancelRegistration(input.id, refund);
        return { success: true, refund };
      }),

    callFromWaitlist: tenantAdminProcedure
      .input(z.object({ id: z.number(), paymentDeadlineHours: z.number().default(48), tenantId: z.number() }))
      .mutation(async ({ input }) => {
        await db.callFromWaitlist(input.id, input.paymentDeadlineHours);
        return { success: true };
      }),
  }),

  // ========== DASHBOARD ==========
  dashboard: router({
    stats: tenantProcedure
      .input(z.object({ tournamentId: z.number().optional(), tenantId: z.number() }).optional())
      .query(async ({ input }) => {
        if (!input?.tournamentId) return {};
        return db.getDashboardStats(input.tournamentId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
