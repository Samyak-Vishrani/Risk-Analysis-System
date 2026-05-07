import { useState } from "react";
import { usePendingReviews } from "@/hooks/useReviews";
import { formatUSD, formatTimeAgo, formatMinutes, getActionBgClass } from "@/lib/utils";
import { CURRENCY_SYMBOLS } from "@/constants";
import RiskBadge from "@/components/transactions/RiskBadge";
import FraudProbBar from "@/components/transactions/FraudProbBar";
import ResolveDialog from "./ResolveDialog";
import { ClipboardCheck, Filter } from "lucide-react";

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

export default function ReviewQueue() {
  const [selected, setSelected] = useState(null);
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = usePendingReviews({
    action: actionFilter || undefined,
    page,
    limit: 20,
  });

  const reviews = data?.data ?? [];
  const pagination = data?.pagination;

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
        <p className="text-red-400 text-sm">Failed to load review queue</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">

        {/* header */}
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <ClipboardCheck size={16} className="text-orange-400" />
            <p className="text-white text-sm font-medium">Pending Reviews</p>
            {pagination && (
              <span className="text-gray-500 text-xs">
                {pagination.total} transactions
              </span>
            )}
          </div>

          {/* filter by action */}
          <div className="flex items-center gap-2">
            <Filter size={13} className="text-gray-500" />
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-2 py-1.5 outline-none"
            >
              <option value="">All Actions</option>
              <option value="REVIEW">REVIEW</option>
              <option value="BLOCK">BLOCK</option>
            </select>
          </div>
        </div>

        {/* loading skeleton */}
        {isLoading ? (
          <div className="divide-y divide-gray-800">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-5 py-4 flex gap-4 animate-pulse">
                <div className="h-3 bg-gray-800 rounded w-16" />
                <div className="h-3 bg-gray-800 rounded w-24" />
                <div className="h-3 bg-gray-800 rounded w-20" />
                <div className="h-3 bg-gray-800 rounded w-32" />
                <div className="h-3 bg-gray-800 rounded w-16" />
              </div>
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <ClipboardCheck size={32} className="text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No pending reviews</p>
            <p className="text-gray-600 text-xs mt-1">All caught up</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <TH>Transaction</TH>
                  <TH>Amount</TH>
                  <TH>Risk</TH>
                  <TH>Fraud Probability</TH>
                  <TH>Action</TH>
                  <TH>Customer</TH>
                  <TH>Merchant</TH>
                  <TH>Waiting</TH>
                  <TH>Resolve</TH>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {reviews.map((tx) => (
                  <tr key={tx.transaction_id} className="hover:bg-gray-800/30 transition-colors">

                    <TD className="text-gray-300 font-mono text-xs">
                      #{tx.transaction_id}
                    </TD>

                    <TD>
                      <p className="text-white font-medium text-xs">
                        {CURRENCY_SYMBOLS[tx.currency] ?? ""}
                        {Number(tx.amount).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        <span className="text-gray-500">{tx.currency}</span>
                      </p>
                      {tx.currency !== "USD" && (
                        <p className="text-gray-500 text-xs">{formatUSD(tx.amount_usd)}</p>
                      )}
                    </TD>

                    <TD>
                      <RiskBadge level={tx.risk_level} />
                    </TD>

                    <TD>
                      <FraudProbBar
                        probability={tx.fraud_probability}
                        riskLevel={tx.risk_level}
                      />
                    </TD>

                    <TD>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getActionBgClass(tx.action)}`}
                      >
                        {tx.action}
                      </span>
                    </TD>

                    <TD>
                      <p className="text-gray-300 text-xs">{tx.customer_name ?? "-"}</p>
                      <p className="text-gray-500 text-xs">#{tx.customer_id}</p>
                    </TD>

                    <TD>
                      <p className="text-gray-300 text-xs">{tx.merchant_name ?? "-"}</p>
                      <p className="text-gray-500 text-xs">{tx.merchant_category ?? "-"}</p>
                    </TD>

                    <TD className="text-gray-400 text-xs">
                      {formatMinutes(tx.unreviewed_for_minutes ?? 0)}
                    </TD>

                    <TD>
                      <button
                        onClick={() => setSelected(tx)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        Resolve
                      </button>
                    </TD>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* pagination */}
        {pagination && pagination.total_pages > 1 && (
          <div className="px-5 py-3 border-t border-gray-800 flex items-center justify-between">
            <p className="text-gray-500 text-xs">
              Page {pagination.current_page} of {pagination.total_pages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={!pagination.has_prev}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-gray-300 text-xs rounded-lg transition-colors"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!pagination.has_next}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-gray-300 text-xs rounded-lg transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* resolve dialog — renders outside table */}
      {selected && (
        <ResolveDialog
          transaction={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}