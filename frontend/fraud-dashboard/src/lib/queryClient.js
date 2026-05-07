import { QueryClient } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // data is considered fresh for 30 seconds
      // within this window react-query won't refetch even if you revisit the page
      staleTime: 30000,

      // keep unused data in cache for 5 minutes
      // if you navigate away and back within 5 min, cached data shows instantly
      gcTime: 5 * 60 * 1000,

      // don't refetch just because the user clicked back on the tab
      refetchOnWindowFocus: false,

      // retry failed requests once before showing an error
      // don't hammer a down backend with 3 retries
      retry: 1,

      // wait 1 second before retrying - avoids immediate hammering
      retryDelay: 1000,
    },
    mutations: {
      // mutations (PATCH, POST) don't retry automatically
      // a failed review resolve should not silently retry
      retry: 0,
    },
  },
});

export default queryClient;