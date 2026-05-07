import { useReviewHistory } from "@/hooks/useReviews";
import { useAlerts } from "@/hooks/useAlerts";
import ReviewQueue from "@/components/reviews/ReviewQueue";
import { formatTimeAgo, formatUSD } from "@/lib/utils";
import RiskBadge from "@/components/transactions/RiskBadge";
import { CheckCircle, XCircle, Search } from "lucide-react";
import { ANALYST_DECISIONS } from "@/constants";
import { useState } from "react";

const DecisionBadge = ({ decision }) => {
  const found = ANALYST_DECISIONS.find((d) => d.value === decision);
  if (!found) return <span className="text-gray-500 text-xs">-</span>;
  return (
    <span className={`text-xs font-medium ${found.color}`}>
      {found.label}
    </span>
  );
};

export default function Reviews() {
  const { data: alertData } = useAlerts();
  const [showHistory, setShowHistory] = useState(false);
  const { data: historyData, isLoading: historyLoading } = useReviewHistory(
    {},
    { enabled: showHistory }
  );

  const counts = alertData?.data;
  const history = historyData?.data ?? [];
  const decisionSummary = historyData?.decision_summary;

  return (
    <div className="space-y-4">

      {/* page header with live counts */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-white text-xl font-semibold">Review Queue</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Transactions flagged for manual review
          </p>
        </div>

        {/* unreviewed count chips */}
        {counts && (
          <div className="flex items-center gap-2">
            {counts.critical_count > 0 && (
              <span className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                {counts.critical_count} Critical
              </span>
            )}
            {counts.total_unreviewed > 0 && (
              <span className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium px-3 py-1.5 rounded-full">
                {counts.total_unreviewed} Pending
              </span>
            )}
          </div>
        )}
      </div>

      {/* pending review queue */}
      <ReviewQueue />

      {/* history toggle */}
      <div>
        <button
          onClick={() => setShowHistory((v) => !v)}
          className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors"
        >
          <Search size={14} />
          {showHistory ? "Hide" : "Show"} Review History
        </button>
      </div>

      {/* review history */}
      {showHistory && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">

          {/* decision summary */}
          {decisionSummary && (
            <div className="px-5 py-4 border-b border-gray-800 grid grid-cols-3 gap-4">
              {ANALYST_DECISIONS.map((d) => (
                <div key={d.value} className="text-center">
                  <p className={`text-lg font-semibold ${d.color}`}>
                    {decisionSummary[d.value] ?? 0}
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5">{d.label}</p>
                </div>
              ))}
            </div>
          )}

          {historyLoading ? (
            <div className="p-5 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-800 rounded animate-pulse" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-gray-500 text-sm">No review history yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/50">
                  <tr>
                    {["Transaction", "Amount", "Risk", "Action", "Decision", "Note", "Reviewed"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {history.map((tx) => (
                    <tr key={tx.transaction_id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-300 font-mono whitespace-nowrap">
                        #{tx.transaction_id}
                      </td>
                      <td className="px-4 py-3 text-xs text-white whitespace-nowrap">
                        {formatUSD(tx.amount_usd)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <RiskBadge level={tx.risk_level} />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-300 whitespace-nowrap">
                        {tx.action}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <DecisionBadge decision={tx.analyst_decision} />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">
                        {tx.analyst_note ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {tx.reviewed_at ? formatTimeAgo(tx.reviewed_at) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
}