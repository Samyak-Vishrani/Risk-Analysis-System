import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { POLL_INTERVALS } from "@/constants";

export const useModelHealth = () =>
  useQuery({
    queryKey: ["modelHealth"],
    queryFn: () => api.get("/model/health").then((r) => r.data),
    refetchInterval: POLL_INTERVALS.STATIC,
    staleTime: POLL_INTERVALS.STATIC,
  });

export const useModelMetrics = () =>
  useQuery({
    queryKey: ["modelMetrics"],
    queryFn: () => api.get("/model/metrics").then((r) => r.data),
    staleTime: POLL_INTERVALS.STATIC,
    refetchInterval: POLL_INTERVALS.STATIC,
  });

export const useModelChampion = () =>
  useQuery({
    queryKey: ["modelChampion"],
    queryFn: () => api.get("/model/champion").then((r) => r.data),
    staleTime: POLL_INTERVALS.STATIC,
    refetchInterval: POLL_INTERVALS.STATIC,
  });

export const useModelFeatures = () =>
  useQuery({
    queryKey: ["modelFeatures"],
    queryFn: () => api.get("/model/features").then((r) => r.data),
    staleTime: POLL_INTERVALS.STATIC,
  });