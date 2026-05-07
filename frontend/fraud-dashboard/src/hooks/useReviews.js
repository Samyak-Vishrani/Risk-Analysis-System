import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { POLL_INTERVALS } from "@/constants";

export const usePendingReviews = (params = {}) => {
  return useQuery({
    queryKey: ["pendingReviews", params],
    queryFn: () =>
      api.get("/reviews/pending", { params }).then((r) => r.data),
    refetchInterval: POLL_INTERVALS.ALERT_COUNT,
    staleTime: 0,
  });
};

export const useReviewHistory = (params = {}) => {
  return useQuery({
    queryKey: ["reviewHistory", params],
    queryFn: () =>
      api.get("/reviews/history", { params }).then((r) => r.data),
    staleTime: POLL_INTERVALS.SUMMARY,
  });
};

export const useResolveReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ transaction_id, analyst_decision, analyst_note }) =>
      api
        .patch(`/reviews/${transaction_id}/resolve`, {
          analyst_decision,
          analyst_note,
        })
        .then((r) => r.data),

    onSuccess: () => {
      // invalidate all review and alert queries so counts update immediately
      queryClient.invalidateQueries({ queryKey: ["pendingReviews"] });
      queryClient.invalidateQueries({ queryKey: ["reviewHistory"] });
      queryClient.invalidateQueries({ queryKey: ["alertsCount"] });
      queryClient.invalidateQueries({ queryKey: ["criticalAlerts"] });
    },
  });
};