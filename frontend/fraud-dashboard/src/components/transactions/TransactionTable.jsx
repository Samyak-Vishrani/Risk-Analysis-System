import { formatCurrency, formatUSD, formatTimeAgo, getActionBgClass, truncate } from "@/lib/utils";
import { CURRENCY_SYMBOLS } from "@/constants";
import RiskBadge from "./RiskBadge";
import FraudProbBar from "./FraudProbBar";

const ActionBadge = ({ action }) => {
  if (!action) return <span className="text-gray-500 text-xs">-</span>;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getActionBgClass(action)}`}
    >
      {action}
    </span>
  );
};

const TH = ({ children, className = "" }) => (
  <th
    className={`px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap ${className}`}
  >
    {children}
  </th>
);

const TD = ({ children, className = "" }) => (
  <td className={`px-4 py-3 text-sm whitespace-nowrap ${className}`}>
    {children}
  </td>
);

export default function TransactionTable({ data, isLoading, limit, onLimitChange }) {
  if (isLoading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <div className="h-4 bg-gray-800 rounded w-48 animate-pulse" />
        </div>
        <div className="divide-y divide-gray-800">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="px-5 py-4 flex gap-4 animate-pulse">
              <div className="h-3 bg-gray-800 rounded w-24" />
              <div className="h-3 bg-gray-800 rounded w-20" />
              <div className="h-3 bg-gray-800 rounded w-16" />
              <div className="h-3 bg-gray-800 rounded w-32" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
        <p className="text-gray-400">No transactions found</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">

      {/* table header row */}
      <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {/* live pulse dot */}
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shrink-0" />
          <p className="text-white text-sm font-medium">Live Transaction Feed</p>
          <span className="text-gray-500 text-xs">
            {data.length} transactions
          </span>
        </div>

        {/* limit selector */}
        {onLimitChange && (
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-2 py-1.5 outline-none"
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                Show {n}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* scrollable table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-800/50">
            <tr>
              <TH>Transaction ID</TH>
              <TH>Amount</TH>
              <TH>Risk Level</TH>
              <TH>Fraud Probability</TH>
              <TH>Action</TH>
              <TH>Customer</TH>
              <TH>Merchant</TH>
              <TH>Scored At</TH>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {data.map((tx) => (
              <tr
                key={tx.transaction_id}
                className="hover:bg-gray-800/30 transition-colors"
              >

                {/* transaction id */}
                <TD className="text-gray-300 font-mono">
                  #{tx.transaction_id}
                </TD>

                {/* amount — original currency + usd */}
                <TD>
                  <div>
                    <p className="text-white font-medium">
                      {CURRENCY_SYMBOLS[tx.currency] ?? ""}
                      {Number(tx.amount).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      {" "}
                      <span className="text-gray-500 text-xs">{tx.currency}</span>
                    </p>
                    {tx.currency !== "USD" && (
                      <p className="text-gray-500 text-xs mt-0.5">
                        {formatUSD(tx.amount_usd)}
                      </p>
                    )}
                  </div>
                </TD>

                {/* risk level badge */}
                <TD>
                  <RiskBadge level={tx.risk_level} />
                </TD>

                {/* fraud probability bar */}
                <TD>
                  <FraudProbBar
                    probability={tx.fraud_probability}
                    riskLevel={tx.risk_level}
                  />
                </TD>

                {/* recommended action badge */}
                <TD>
                  <ActionBadge action={tx.action} />
                </TD>

                {/* customer */}
                <TD>
                  <div>
                    <p className="text-gray-300 text-xs font-medium">
                      {tx.customer_name ?? "-"}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      #{tx.customer_id}
                    </p>
                  </div>
                </TD>

                {/* merchant name + category */}
                <TD>
                  <div>
                    <p className="text-gray-300 text-xs font-medium">
                      {truncate(tx.merchant_name, 18) ?? "-"}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {tx.merchant_category ?? "-"}
                    </p>
                  </div>
                </TD>

                {/* scored at */}
                <TD className="text-gray-400 text-xs">
                  {tx.scored_at ? formatTimeAgo(tx.scored_at) : "-"}
                </TD>

              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}