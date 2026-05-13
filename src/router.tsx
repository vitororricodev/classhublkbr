import type { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  return createRouter({
    routeTree,
    context: { queryClient: undefined as unknown as QueryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });
};
