import { useCriticalAlerts, useAlerts } from "@/hooks/useAlerts";
import { formatUSD, formatTimeAgo, formatMinutes } from "@/lib/utils";
import { CURRENCY_SYMBOLS } from "@/constants";
import RiskBadge from "@/components/transactions/RiskBadge";
import FraudProbBar from "@/components/transactions/FraudProbBar";
import ResolveDialog from "@/components/reviews/ResolveDialog";
import { ShieldAlert, Clock, AlertTriangle } from "lucide-react";
import { useState } from "react";

const StatChip = ({ label, value, color }) => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
    <p className="text-2xl font-semibold" style={{ color }}>
      {value ?? 0}
    </p>
    <p className="text-gray-400 text-xs mt-1">{label}</p>
  </div>
);

export default function Alerts() {
  const [selected, setSelected] = useState(null);
  const [limit, setLimit] = useState(50);

  const { data: countData } = useAlerts();
  const { data, isLoading, error } = useCriticalAlerts(limit);

  const alerts = data?.data ?? [];
  const meta = data?.meta;
  const counts = countData?.data;

  return (
    <div className="space-y-4">

      {/* header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-white text-xl font-semibold">Critical Alerts</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Unreviewed CRITICAL transactions requiring immediate attention
          </p>
        </div>

        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-2 py-1.5 outline-none"
        >
          {[25, 50, 100, 200].map((n) => (
            <option key={n} value={n}>Show {n}</option>
          ))}
        </select>
      </div>

      {/* stat chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatChip
          label="Critical Unreviewed"
          value={counts?.critical_count}
          color="#ef4444"
        />
        <StatChip
          label="High Unreviewed"
          value={counts?.high_count}
          color="#f97316"
        />
        <StatChip
          label="Total Pending"
          value={counts?.total_unreviewed}
          color="#eab308"
        />
        <StatChip
          label="Oldest Critical (mins)"
          value={counts?.oldest_critical_minutes}
          color={
            (counts?.oldest_critical_minutes ?? 0) > 60 ? "#ef4444" : "#22c55e"
          }
        />
      </div>

      {/* SLA warning if oldest alert > 60 mins */}
      {(meta?.oldest_unreviewed_minutes ?? 0) > 60 && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="text-red-400 shrink-0" />
          <p className="text-red-400 text-sm">
            Oldest unreviewed critical alert is{" "}
            <span className="font-semibold">
              {formatMinutes(meta.oldest_unreviewed_minutes)}
            </span>{" "}
            old. Immediate review required.
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <p className="text-red-400 text-sm">Failed to load critical alerts</p>
        </div>
      )}

      {/* alerts table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <ShieldAlert size={15} className="text-red-400" />
          <p className="text-white text-sm font-medium">
            {meta?.total_critical_unreviewed ?? 0} Critical Alerts
          </p>
        </div>

        {isLoading ? (
          <div className="divide-y divide-gray-800">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-5 py-4 flex gap-4 animate-pulse">
                <div className="h-3 bg-gray-800 rounded w-16" />
                <div className="h-3 bg-gray-800 rounded w-24" />
                <div className="h-3 bg-gray-800 rounded w-32" />
                <div className="h-3 bg-gray-800 rounded w-20" />
              </div>
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <ShieldAlert size={32} className="text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No critical alerts</p>
            <p className="text-gray-600 text-xs mt-1">All clear</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  {[
                    "Transaction", "Amount", "Risk", "Fraud Probability",
                    "Customer", "Merchant", "Device", "Waiting", "Action"
                  ].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {alerts.map((tx) => (
                  <tr key={tx.transaction_id} className="hover:bg-gray-800/30 transition-colors">

                    <td className="px-4 py-3 text-xs text-gray-300 font-mono whitespace-nowrap">
                      #{tx.transaction_id}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-white text-xs font-medium">
                        {CURRENCY_SYMBOLS[tx.currency] ?? ""}
                        {Number(tx.amount).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        <span className="text-gray-500">{tx.currency}</span>
                      </p>
                      {tx.currency !== "USD" && (
                        <p className="text-gray-500 text-xs">
                          {formatUSD(tx.amount_usd)}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <RiskBadge level={tx.risk_level} />
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <FraudProbBar
                        probability={tx.fraud_probability}
                        riskLevel={tx.risk_level}
                      />
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-gray-300 text-xs">{tx.customer_name ?? "-"}</p>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-gray-300 text-xs">{tx.merchant_name ?? "-"}</p>
                      <p className="text-gray-500 text-xs">{tx.merchant_category ?? "-"}</p>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-gray-300 text-xs">{tx.device_type ?? "-"}</p>
                      {tx.was_new_device && (
                        <span className="text-red-400 text-xs">New device</span>
                      )}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Clock
                          size={12}
                          className={
                            (tx.unreviewed_for_minutes ?? 0) > 60
                              ? "text-red-400"
                              : "text-gray-500"
                          }
                        />
                        <span
                          className={`text-xs ${
                            (tx.unreviewed_for_minutes ?? 0) > 60
                              ? "text-red-400"
                              : "text-gray-400"
                          }`}
                        >
                          {formatMinutes(tx.unreviewed_for_minutes ?? 0)}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => setSelected(tx)}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        Resolve
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <ResolveDialog
          transaction={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}