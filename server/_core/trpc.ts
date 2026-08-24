import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import superjson from "superjson";
import { users } from "../../drizzle/schema";
import { closeDbPool, getDb } from "../db";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

async function assertActiveAccount(userId: number) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const db = await getDb();
    if (!db) return;
    try {
      const [account] = await db.select({ accountStatus: users.accountStatus }).from(users).where(eq(users.id, userId)).limit(1);
      if (account && account.accountStatus !== "active") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Ce compte n’est pas actif. Veuillez contacter l’administration." });
      }
      return;
    } catch (error) {
      if (error instanceof TRPCError || attempt === 1) throw error;
      await closeDbPool();
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
}

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  await assertActiveAccount(ctx.user.id);

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    await assertActiveAccount(ctx.user.id);

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
