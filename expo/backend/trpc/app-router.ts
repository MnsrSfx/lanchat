import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import translateRoute from "./routes/translate/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  translate: translateRoute,
});

export type AppRouter = typeof appRouter;
