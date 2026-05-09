import { formatDateTime, formatTimeAgo } from "@/lib/utils";
import { CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

const TH = ({ children }) => (
  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">
    {children}
  </th>
);

const TD = ({ children, className = "" }) => (
  <td className={`px-4 py-3 text-sm whitespace-nowrap ${className}`}>
    {children}
  </td>
);

const MetricCell = ({ value, best, isHigherBetter = true }) => {
  if (value == null) return <TD className="text-gray-500">-</TD>;
  const isBest = value === best;
  return (
    <TD>
      <span className={isBest ? "text-green-400 font-semibold" : "text-gray-300"}>
        {value?.toFixed(4)}
      </span>
      {isBest && (
        <span className="ml-1.5 text-green-400 text-xs">best</span>
      )}
    </TD>
  );
};

export default function TrainingHistory({ data, summary, isLoading }) {
  const [showAll, setShowAll] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden animate-pulse">
        <div className="px-5 py-4 border-b border-gray-800">
          <div className="h-4 bg-gray-800 rounded w-44" />
        </div>
        <div className="divide-y divide-gray-800">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="px-5 py-3 flex gap-4">
              <div className="h-3 bg-gray-800 rounded w-32" />
              <div className="h-3 bg-gray-800 rounded w-16" />
              <div className="h-3 bg-gray-800 rounded w-16" />
              <div className="h-3 bg-gray-800 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
        <p className="text-gray-500 text-sm">No training history found</p>
        <p className="text-gray-600 text-xs mt-1">
          Run train_model.py to generate training history
        </p>
      </div>
    );
  }

  const bestAuc = Math.max(...data.map((r) => r.roc_auc ?? 0));
  const bestF1 = Math.max(...data.map((r) => r.f1_fraud ?? 0));
  const bestRecall = Math.max(...data.map((r) => r.recall_fraud ?? 0));
  const bestPrecision = Math.max(...data.map((r) => r.precision_fraud ?? 0));

  // show last 10 by default, all when expanded
  const reversed = [...data].reverse();
  const displayed = showAll ? reversed : reversed.slice(0, 10);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-white text-sm font-medium">Training History</p>
          <p className="text-gray-500 text-xs mt-0.5">
            {summary?.total_runs ?? 0} total runs,{" "}
            {summary?.promoted_runs ?? 0} promoted to champion
          </p>
        </div>
        {/* summary pills */}
        <div className="flex items-center gap-2">
          {[
            { label: "Best AUC", value: bestAuc?.toFixed(4), color: "text-indigo-400" },
            { label: "Best F1", value: bestF1?.toFixed(4), color: "text-purple-400" },
          ].map((p) => (
            <div
              key={p.label}
              className="bg-gray-800 rounded-lg px-3 py-1.5 text-center"
            >
              <p className={`text-xs font-semibold ${p.color}`}>{p.value}</p>
              <p className="text-gray-500 text-xs">{p.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-800/50">
            <tr>
              <TH>#</TH>
              <TH>Run At</TH>
              <TH>ROC-AUC</TH>
              <TH>CV AUC</TH>
              <TH>Precision</TH>
              <TH>Recall</TH>
              <TH>F1</TH>
              <TH>Fraud Count</TH>
              <TH>Test Size</TH>
              <TH>Promoted</TH>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {displayed.map((run, i) => {
              const runIndex = data.length - i;
              return (
                <tr
                  key={run.run_at ?? i}
                  className={`hover:bg-gray-800/30 transition-colors ${
                    run.promoted ? "border-l-2 border-indigo-500" : ""
                  }`}
                >
                  <TD className="text-gray-500">{runIndex}</TD>

                  <TD>
                    <p className="text-gray-300 text-xs">
                      {run.run_at ? formatDateTime(run.run_at) : "-"}
                    </p>
                    <p className="text-gray-600 text-xs">
                      {run.run_at ? formatTimeAgo(run.run_at) : ""}
                    </p>
                  </TD>

                  <MetricCell value={run.roc_auc} best={bestAuc} />
                  <MetricCell value={run.cv_auc_mean} best={null} />
                  <MetricCell value={run.precision_fraud} best={bestPrecision} />
                  <MetricCell value={run.recall_fraud} best={bestRecall} />
                  <MetricCell value={run.f1_fraud} best={bestF1} />

                  <TD className="text-gray-300 text-xs">
                    {run.fraud_count?.toLocaleString() ?? "-"}
                  </TD>

                  <TD className="text-gray-300 text-xs">
                    {run.test_size?.toLocaleString() ?? "-"}
                  </TD>

                  <TD>
                    {run.promoted ? (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle size={13} className="text-green-400" />
                        <span className="text-green-400 text-xs font-medium">
                          Yes
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <XCircle size={13} className="text-gray-600" />
                        <span className="text-gray-600 text-xs">No</span>
                      </div>
                    )}
                  </TD>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* show more / less toggle */}
      {data.length > 10 && (
        <div className="px-5 py-3 border-t border-gray-800">
          <button
            onClick={() => setShowAll((v) => !v)}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs transition-colors"
          >
            {showAll ? (
              <>
                <ChevronUp size={13} />
                Show less
              </>
            ) : (
              <>
                <ChevronDown size={13} />
                Show all {data.length} runs
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}