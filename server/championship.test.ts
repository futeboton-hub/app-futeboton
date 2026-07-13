import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createTestContext(authenticated = true): TrpcContext {
  const user = authenticated
    ? {
        id: 1,
        openId: "test-user",
        email: "test@example.com",
        name: "Test User",
        loginMethod: "manus",
        role: "admin" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      }
    : null;

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("championship routers", () => {
  it("dashboard.stats returns correct structure", async () => {
    const ctx = createTestContext(false);
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.dashboard.stats();

    expect(stats).toHaveProperty("totalPlayers");
    expect(stats).toHaveProperty("totalMatches");
    expect(stats).toHaveProperty("playedMatches");
    expect(stats).toHaveProperty("pendingMatches");
    expect(stats).toHaveProperty("groupProgress");
    expect(typeof stats.groupProgress).toBe("object");
    expect(stats.groupProgress).toHaveProperty("A");
    expect(stats.groupProgress).toHaveProperty("H");
    expect(stats.groupProgress["A"]).toHaveProperty("played");
    expect(stats.groupProgress["A"]).toHaveProperty("total");
  });

  it("players.list returns an array", async () => {
    const ctx = createTestContext(false);
    const caller = appRouter.createCaller(ctx);
    const players = await caller.players.list();

    expect(Array.isArray(players)).toBe(true);
  });

  it("standings.all returns object with 8 groups", async () => {
    const ctx = createTestContext(false);
    const caller = appRouter.createCaller(ctx);
    const standings = await caller.standings.all();

    expect(standings).toHaveProperty("A");
    expect(standings).toHaveProperty("B");
    expect(standings).toHaveProperty("C");
    expect(standings).toHaveProperty("D");
    expect(standings).toHaveProperty("E");
    expect(standings).toHaveProperty("F");
    expect(standings).toHaveProperty("G");
    expect(standings).toHaveProperty("H");
  });

  it("standings.byGroup returns array for a specific group", async () => {
    const ctx = createTestContext(false);
    const caller = appRouter.createCaller(ctx);
    const standings = await caller.standings.byGroup({ group: "A" });

    expect(Array.isArray(standings)).toBe(true);
  });

  it("matches.list returns an array", async () => {
    const ctx = createTestContext(false);
    const caller = appRouter.createCaller(ctx);
    const matches = await caller.matches.list({});

    expect(Array.isArray(matches)).toBe(true);
  });

  it("knockout.list returns an array", async () => {
    const ctx = createTestContext(false);
    const caller = appRouter.createCaller(ctx);
    const knockout = await caller.knockout.list();

    expect(Array.isArray(knockout)).toBe(true);
  });

  it("tournaments.list returns an array", async () => {
    const ctx = createTestContext(false);
    const caller = appRouter.createCaller(ctx);
    const tournaments = await caller.tournaments.list();

    expect(Array.isArray(tournaments)).toBe(true);
  });
});
