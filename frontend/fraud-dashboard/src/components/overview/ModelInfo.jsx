import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { formatTimeAgo, formatPercent } from "@/lib/utils";
import { Brain, CheckCircle, XCircle } from "lucide-react";
import { POLL_INTERVALS } from "@/constants";

const Pill = ({ label, value }) => (
  <div className="bg-gray-800 rounded-lg px-3 py-2 text-center">
    <p className="text-gray-400 text-xs">{label}</p>
    <p className="text-white text-sm font-semibold mt-0.5">{value}</p>
  </div>
);

export default function ModelInfo() {
  const { data, isLoading } = useQuery({
    queryKey: ["modelHealth"],
    queryFn: () => api.get("/model/health").then((r) => r.data),
    refetchInterval: POLL_INTERVALS.STATIC,
  });

  if (isLoading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 animate-pulse">
        <div className="h-4 bg-gray-800 rounded w-32 mb-4" />
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 bg-gray-800 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const health = data?.data;
  const champion = health?.champion;
  const mlService = health?.ml_service;
  const isHealthy = mlService?.status === "healthy";

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-indigo-400" />
          <p className="text-white text-sm font-medium">Model Status</p>
        </div>
        <div className="flex items-center gap-1.5">
          {isHealthy
            ? <CheckCircle size={14} className="text-green-400" />
            : <XCircle size={14} className="text-red-400" />
          }
          <span className={`text-xs ${isHealthy ? "text-green-400" : "text-red-400"}`}>
            {mlService?.status ?? "unknown"}
          </span>
          {mlService?.model_version && (
            <span className="text-gray-600 text-xs ml-2">
              v{mlService.model_version}
            </span>
          )}
        </div>
      </div>

      {champion ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <Pill label="ROC-AUC" value={champion.roc_auc} />
            <Pill label="Precision" value={formatPercent(champion.precision * 100)} />
            <Pill label="Recall" value={formatPercent(champion.recall * 100)} />
            <Pill label="F1 Score" value={formatPercent(champion.f1 * 100)} />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-xs">
              Last trained {champion.trained_at ? formatTimeAgo(champion.trained_at) : "-"}
            </p>
            <p className="text-gray-500 text-xs">
              {health?.total_training_runs ?? 0} total training runs
            </p>
          </div>
        </>
      ) : (
        <p className="text-gray-500 text-sm">No champion model found - run train_model.py first</p>
      )}
    </div>
  );
}