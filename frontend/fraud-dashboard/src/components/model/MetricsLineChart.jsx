import { useState } from "react";
import { format } from "date-fns";
import ChartCard from "@/components/charts/ChartCard";
import BaseLineChart from "@/components/charts/BaseLineChart";
import { formatPercent } from "@/lib/utils";

const CHART_MODES = [
  { key: "auc", label: "ROC-AUC" },
  { key: "precision_recall", label: "Precision / Recall" },
  { key: "f1", label: "F1 Score" },
];

export default function MetricsLineChart({ data, isLoading }) {
  const [mode, setMode] = useState("auc");

  if (!data || data.length === 0) {
    return (
      <ChartCard
        title="Model Metrics Over Time"
        isLoading={isLoading}
      >
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-500 text-sm">No training history found</p>
        </div>
      </ChartCard>
    );
  }

  // shape data — x axis is run index since runs may be irregular
  const chartData = data.map((run, i) => ({
    date: run.run_at
      ? format(new Date(run.run_at), "yyyy-MM-dd")
      : `Run ${i + 1}`,
    roc_auc: run.roc_auc,
    precision: run.precision_fraud,
    recall: run.recall_fraud,
    f1: run.f1_fraud,
    cv_auc_mean: run.cv_auc_mean,
    promoted: run.promoted,
  }));

  const linesByMode = {
    auc: [
      { dataKey: "roc_auc", name: "ROC-AUC", color: "#6366f1" },
      { dataKey: "cv_auc_mean", name: "CV AUC (mean)", color: "#818cf8" },
    ],
    precision_recall: [
      { dataKey: "precision", name: "Precision", color: "#22c55e" },
      { dataKey: "recall", name: "Recall", color: "#f97316" },
    ],
    f1: [
      { dataKey: "f1", name: "F1 Score", color: "#a855f7" },
    ],
  };

  // reference lines on promoted runs
  const referenceLines = chartData
    .filter((r) => r.promoted)
    .map((r) => ({ x: r.date, label: "Promoted" }));

  return (
    <ChartCard
      title="Model Metrics Over Training Runs"
      subtitle="How model performance changes across retraining cycles"
      isLoading={isLoading}
      controls={
        <div className="flex bg-gray-800 border border-gray-700 rounded-lg p-0.5 gap-0.5">
          {CHART_MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                mode === m.key
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      }
    >
      <BaseLineChart
        data={chartData}
        lines={linesByMode[mode]}
        referenceLines={referenceLines}
        formatter={(val) => val?.toFixed(4)}
        yTickFormatter={(v) => v?.toFixed(2)}
        height={280}
      />
      {referenceLines.length > 0 && (
        <div className="flex items-center gap-1.5 mt-3">
          <span className="w-4 border-t border-dashed border-indigo-500" />
          <span className="text-gray-500 text-xs">
            Vertical lines = runs promoted to champion ({referenceLines.length} total)
          </span>
        </div>
      )}
    </ChartCard>
  );
}