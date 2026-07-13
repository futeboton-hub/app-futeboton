import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG, NOT_TENANT_MEMBER_ERR_MSG, NOT_TENANT_ADMIN_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import * as db from "../db";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// ========== REQUER USUÁRIO AUTENTICADO ==========
const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

// ========== REQUER ADMIN GLOBAL (sistema) ==========
export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

// ========== REQUER MEMBERSHIP EM TENANT ESPECÍFICO ==========
// Uso: passar tenantId no input, o middleware valida se o user pertence ao tenant
export const tenantProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next, input } = opts;

    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    // Extrair tenantId do input (pode estar em vários formatos)
    let tenantId: number | undefined;
    if (input && typeof input === "object" && "tenantId" in input) {
      tenantId = input.tenantId as number;
    }

    if (tenantId === undefined) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "tenantId é obrigatório." });
    }

    // Verificar se o usuário é membro do tenant
    const isMember = await db.isUserMemberOfTenant(ctx.user.id, tenantId);
    if (!isMember) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: NOT_TENANT_MEMBER_ERR_MSG,
      });
    }

    // Obter o role do usuário no tenant
    const userRole = await db.getUserTenantRole(ctx.user.id, tenantId);

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
        tenantId,
        tenantRole: userRole,
      },
    });
  }),
);

// ========== REQUER ADMIN DO TENANT ==========
export const tenantAdminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next, input } = opts;

    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    let tenantId: number | undefined;
    if (input && typeof input === "object" && "tenantId" in input) {
      tenantId = input.tenantId as number;
    }

    if (tenantId === undefined) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "tenantId é obrigatório." });
    }

    // Verificar se o usuário é admin do tenant
    const userRole = await db.getUserTenantRole(ctx.user.id, tenantId);
    if (userRole !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: NOT_TENANT_ADMIN_ERR_MSG,
      });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
        tenantId,
        tenantRole: userRole,
      },
    });
  }),
);
