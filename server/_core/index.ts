import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { handleExcelExport } from "../export";
import {
  handlePlayerRegister, handlePlayerLogin, handlePlayerVerifyEmail,
  handlePlayerMe, handlePlayerLogout, handlePlayerEnroll,
  handlePlayerMyRegistration, handleTournamentInfo
} from "../playerAuth";
import cookieParser from "cookie-parser";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import * as db from "../db";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(cookieParser());
  registerStorageProxy(app);
  registerOAuthRoutes(app);

  // ========== REST ROUTES FOR MULTI-TENANT ==========

  // Get tenant by slug (public, used by frontend to resolve current tenant)
  app.get("/api/tenant/:slug", async (req, res) => {
    try {
      const tenant = await db.getTenantBySlug(req.params.slug);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant não encontrado." });
      }
      return res.json(tenant);
    } catch (error) {
      return res.status(500).json({ error: "Erro ao buscar tenant." });
    }
  });

  // List all active tenants (public)
  app.get("/api/tenants", async (req, res) => {
    try {
      const allTenants = await db.getAllTenants();
      const active = allTenants.filter(t => t.isActive === 1);
      return res.json(active);
    } catch (error) {
      return res.status(500).json({ error: "Erro ao listar tenants." });
    }
  });

  // Tournament info with tenant support
  app.get("/api/tournament/info", async (req, res) => {
    try {
      const tournamentId = parseInt(req.query.id as string);
      const tenantSlug = req.query.tenantSlug as string;

      let tournament: any = null;

      if (tournamentId) {
        tournament = await db.getTournamentById(tournamentId);
      } else if (tenantSlug) {
        // If no tournamentId, try to find the active tournament for this tenant
        const tenant = await db.getTenantBySlug(tenantSlug);
        if (tenant) {
          tournament = await db.getActiveTournamentByTenant(tenant.id);
        }
      }

      if (!tournament) {
        return res.json({ tournament: null, stats: {} });
      }

      const stats = await db.getRegistrationStats(tournament.id);

      return res.json({
        tournament: {
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
        },
        stats,
      });
    } catch (error) {
      return res.status(500).json({ error: "Erro ao buscar torneio." });
    }
  });

  // Export Excel route
  app.get("/api/export/excel", handleExcelExport);

  // Player auth routes (public registration/login)
  app.post("/api/player/register", handlePlayerRegister);
  app.post("/api/player/login", handlePlayerLogin);
  app.post("/api/player/verify-email", handlePlayerVerifyEmail);
  app.get("/api/player/me", handlePlayerMe);
  app.post("/api/player/logout", handlePlayerLogout);
  app.post("/api/player/enroll", handlePlayerEnroll);
  app.get("/api/player/my-registration", handlePlayerMyRegistration);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
