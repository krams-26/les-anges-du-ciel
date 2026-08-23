import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import superjson from "superjson";
import { users } from "../../drizzle/schema";
import { getDb } from "../db";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

async function assertActiveAccount(userId: number) {
  const db = await getDb();
  if (!db) return;
  const [account] = await db.select({ accountStatus: users.accountStatus }).from(users).where(eq(users.id, userId)).limit(1);
  if (account && account.accountStatus !== "active") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Ce compte n’est pas actif. Veuillez contacter l’administration." });
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
