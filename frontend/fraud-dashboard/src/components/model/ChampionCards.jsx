import { formatPercent, formatTimeAgo } from "@/lib/utils";
import { Brain, Target, RefreshCw, TrendingUp, CheckCircle, XCircle } from "lucide-react";

const MetricCard = ({ label, value, sub, icon: Icon, iconColor, iconBg }) => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-gray-400 text-sm truncate">{label}</p>
        <p className="text-white text-2xl font-semibold mt-1">{value}</p>
        {sub && <p className="text-gray-500 text-xs mt-1 truncate">{sub}</p>}
      </div>
      <div className={`p-2 rounded-lg ml-3 shrink-0 ${iconBg}`}>
        <Icon size={18} className={iconColor} />
      </div>
    </div>
  </div>
);

export default function ChampionCards({ champion, health, metricsData }) {
  if (!champion) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
        <Brain size={32} className="text-gray-700 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">No champion model found</p>
        <p className="text-gray-600 text-xs mt-1">Run train_model.py to train the first model</p>
      </div>
    );
  }

  const mlService = health?.ml_service;
  const isHealthy = mlService?.status === "healthy";
  const totalRuns = metricsData?.summary?.total_runs ?? 0;
  const promotedRuns = metricsData?.summary?.promoted_runs ?? 0;

  const cards = [
    {
      label: "ROC-AUC Score",
      value: champion.roc_auc ?? "-",
      sub: `Best: ${metricsData?.summary?.best_auc ?? "-"}`,
      icon: Target,
      iconBg: "bg-indigo-500/10",
      iconColor: "text-indigo-400",
    },
    {
      label: "Precision",
      value: champion.precision != null
        ? formatPercent(champion.precision * 100)
        : "-",
      sub: "Fraud detection precision",
      icon: TrendingUp,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-400",
    },
    {
      label: "Recall",
      value: champion.recall != null
        ? formatPercent(champion.recall * 100)
        : "-",
      sub: "Fraud cases caught",
      icon: TrendingUp,
      iconBg: "bg-green-500/10",
      iconColor: "text-green-400",
    },
    {
      label: "F1 Score",
      value: champion.f1 != null
        ? formatPercent(champion.f1 * 100)
        : "-",
      sub: "Precision / recall balance",
      icon: Brain,
      iconBg: "bg-purple-500/10",
      iconColor: "text-purple-400",
    },
    {
      label: "ML Service",
      value: mlService?.status ?? "unknown",
      sub: `v${mlService?.model_version ?? "-"}`,
      icon: isHealthy ? CheckCircle : XCircle,
      iconBg: isHealthy ? "bg-green-500/10" : "bg-red-500/10",
      iconColor: isHealthy ? "text-green-400" : "text-red-400",
    },
    {
      label: "Training Runs",
      value: totalRuns,
      sub: `${promotedRuns} promoted to champion`,
      icon: RefreshCw,
      iconBg: "bg-yellow-500/10",
      iconColor: "text-yellow-400",
    },
  ];

  return (
    <div className="space-y-3">
      {/* last trained banner */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Brain size={15} className="text-indigo-400" />
          <p className="text-white text-sm font-medium">Current Champion Model</p>
        </div>
        <p className="text-gray-500 text-xs">
          Last trained{" "}
          {champion.trained_at ? formatTimeAgo(champion.trained_at) : "-"}
          {champion.auc_improvement_since_first != null && (
            <span className="text-green-400 ml-2">
              +{champion.auc_improvement_since_first} AUC since first model
            </span>
          )}
        </p>
      </div>

      {/* metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {cards.map((c) => (
          <MetricCard key={c.label} {...c} />
        ))}
      </div>
    </div>
  );
}