import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { schoolRouter } from "./routers/school";
import { teachingRouter } from "./routers/teaching";
import { parentRouter } from "./routers/parent";
import { governanceRouter } from "./routers/governance";
import { secondSessionRouter } from "./routers/secondSession";
import { personalRouter } from "./routers/personal";
import { annualControlRouter } from "./routers/annualControl";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  school: schoolRouter,
  teaching: teachingRouter,
  parent: parentRouter,
  governance: governanceRouter,
  secondSession: secondSessionRouter,
  personal: personalRouter,
  annualControl: annualControlRouter,

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
