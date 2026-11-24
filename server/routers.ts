import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { getAnalysis, listAnalyses, listSavedJobDescriptions } from "./db";
import { rewriteBullet } from "./resumeRoutes";
import { z } from "zod";

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
  resume: router({
    history: publicProcedure.query(({ ctx }) => listAnalyses(ctx.user?.id)),
    getAnalysis: publicProcedure.input(z.object({ id: z.number().int().positive() })).query(({ input, ctx }) => getAnalysis(input.id, ctx.user?.id)),
    savedJDs: publicProcedure.query(({ ctx }) => listSavedJobDescriptions(ctx.user?.id)),
    rewriteBullet: publicProcedure.input(z.object({ bullet: z.string().min(1), context: z.string().optional() })).mutation(({ input }) => ({ rewrite: rewriteBullet(input.bullet, input.context) })),
  }),
});

export type AppRouter = typeof appRouter;
