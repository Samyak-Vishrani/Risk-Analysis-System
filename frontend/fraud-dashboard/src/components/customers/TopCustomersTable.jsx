import { formatUSD, formatPercent, formatNumber } from "@/lib/utils";
import { RISK_COLORS } from "@/constants";
import RiskBadge from "@/components/transactions/RiskBadge";
import { ShieldAlert } from "lucide-react";

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

const getRiskLevel = (count) => {
  if (count >= 10) return "CRITICAL";
  if (count >= 5) return "HIGH";
  if (count >= 2) return "MEDIUM";
  return "LOW";
};

export default function TopCustomersTable({ data, isLoading }) {
  if (isLoading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <div className="h-4 bg-gray-800 rounded w-52 animate-pulse" />
        </div>
        <div className="divide-y divide-gray-800">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="px-5 py-4 flex gap-4 animate-pulse">
              <div className="h-3 bg-gray-800 rounded w-24" />
              <div className="h-3 bg-gray-800 rounded w-16" />
              <div className="h-3 bg-gray-800 rounded w-20" />
              <div className="h-3 bg-gray-800 rounded w-28" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
        <p className="text-gray-500 text-sm">No customer data found</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800">
        <p className="text-white text-sm font-medium">
          Top Customers by High Risk Transactions
        </p>
        <p className="text-gray-500 text-xs mt-0.5">
          Ranked by number of HIGH and CRITICAL scored transactions
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-800/50">
            <tr>
              <TH>#</TH>
              <TH>Customer</TH>
              <TH>Age</TH>
              <TH>Income</TH>
              <TH>Location</TH>
              <TH>Total Txns</TH>
              <TH>Fraud Count</TH>
              <TH>High / Critical</TH>
              <TH>Blocked</TH>
              <TH>Avg Probability</TH>
              <TH>Amount at Risk</TH>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {data.map((c, i) => (
              <tr
                key={c.customer_id}
                className="hover:bg-gray-800/30 transition-colors"
              >
                <TD className="text-gray-500 font-medium">{i + 1}</TD>

                <TD>
                  <p className="text-white text-xs font-medium">{c.name}</p>
                  <p className="text-gray-500 text-xs">#{c.customer_id}</p>
                </TD>

                <TD className="text-gray-300 text-xs">{c.age}y</TD>

                <TD className="text-gray-300 text-xs">
                  {formatUSD(c.income)}
                </TD>

                <TD className="text-gray-300 text-xs max-w-[120px] truncate">
                  {c.location ?? "-"}
                </TD>

                <TD className="text-gray-300 text-xs">
                  {formatNumber(c.total_transactions)}
                </TD>

                <TD className="text-red-400 text-xs font-medium">
                  {formatNumber(c.fraud_count)}
                </TD>

                <TD>
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert
                      size={12}
                      style={{
                        color: RISK_COLORS[getRiskLevel(c.high_risk_count)],
                      }}
                    />
                    <span
                      className="text-xs font-semibold"
                      style={{
                        color: RISK_COLORS[getRiskLevel(c.high_risk_count)],
                      }}
                    >
                      {formatNumber(c.high_risk_count)}
                    </span>
                    <span className="text-gray-600 text-xs">
                      ({formatNumber(c.critical_count)} crit)
                    </span>
                  </div>
                </TD>

                <TD className="text-orange-400 text-xs font-medium">
                  {formatNumber(c.blocked_count)}
                </TD>

                <TD>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(c.avg_fraud_probability ?? 0) * 100}%`,
                          background:
                            RISK_COLORS[getRiskLevel(c.high_risk_count)],
                        }}
                      />
                    </div>
                    <span className="text-gray-400 text-xs">
                      {((c.avg_fraud_probability ?? 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                </TD>

                <TD className="text-orange-400 text-xs font-medium">
                  {formatUSD(c.amount_at_risk_usd)}
                </TD>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}