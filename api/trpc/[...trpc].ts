import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { appRouter } from "@/backend/trpc/app-router";
import { createContext } from "@/backend/trpc/create-context";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: ({ req, resHeaders, info }) => createContext({ req, resHeaders, info }),
  });

export const GET = handler;
export const POST = handler;
// Diğer method'lar için:
export const PUT = handler;
export const DELETE = handler;
