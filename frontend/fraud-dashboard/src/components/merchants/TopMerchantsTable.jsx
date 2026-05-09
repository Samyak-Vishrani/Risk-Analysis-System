import { formatUSD, formatPercent, formatNumber } from "@/lib/utils";
import { RISK_COLORS } from "@/constants";
import RiskBadge from "@/components/transactions/RiskBadge";

const getRiskLevelFromRate = (rate) => {
  if (rate > 30) return "CRITICAL";
  if (rate > 20) return "HIGH";
  if (rate > 10) return "MEDIUM";
  return "LOW";
};

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

export default function TopMerchantsTable({ data, isLoading }) {
  if (isLoading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <div className="h-4 bg-gray-800 rounded w-48 animate-pulse" />
        </div>
        <div className="divide-y divide-gray-800">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="px-5 py-4 flex gap-4 animate-pulse">
              <div className="h-3 bg-gray-800 rounded w-32" />
              <div className="h-3 bg-gray-800 rounded w-20" />
              <div className="h-3 bg-gray-800 rounded w-16" />
              <div className="h-3 bg-gray-800 rounded w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
        <p className="text-gray-500 text-sm">No merchant data found</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800">
        <p className="text-white text-sm font-medium">Top Merchants by Fraud Count</p>
        <p className="text-gray-500 text-xs mt-0.5">
          Ranked by number of confirmed fraud transactions
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-800/50">
            <tr>
              <TH>#</TH>
              <TH>Merchant</TH>
              <TH>Category</TH>
              <TH>Country</TH>
              <TH>Risk Rating</TH>
              <TH>Total Txns</TH>
              <TH>Fraud Count</TH>
              <TH>Fraud Rate</TH>
              <TH>Amount at Risk</TH>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {data.map((m, i) => (
              <tr key={m.merchant_id} className="hover:bg-gray-800/30 transition-colors">
                <TD className="text-gray-500 font-medium">{i + 1}</TD>
                <TD>
                  <p className="text-white text-xs font-medium">{m.merchant_name}</p>
                  <p className="text-gray-500 text-xs">#{m.merchant_id}</p>
                </TD>
                <TD className="text-gray-300 text-xs">{m.category}</TD>
                <TD className="text-gray-300 text-xs">{m.country}</TD>
                <TD>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-800 rounded-full w-16">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(m.risk_rating ?? 0) * 100}%`,
                          background: RISK_COLORS[getRiskLevelFromRate(
                            (m.risk_rating ?? 0) * 100
                          )],
                        }}
                      />
                    </div>
                    <span className="text-gray-400 text-xs w-8">
                      {((m.risk_rating ?? 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                </TD>
                <TD className="text-gray-300 text-xs">
                  {formatNumber(m.total_transactions)}
                </TD>
                <TD className="text-red-400 text-xs font-medium">
                  {formatNumber(m.fraud_count)}
                </TD>
                <TD>
                  <RiskBadge level={getRiskLevelFromRate(m.fraud_rate_percent)} />
                  <span className="text-gray-400 text-xs ml-2">
                    {formatPercent(m.fraud_rate_percent)}
                  </span>
                </TD>
                <TD className="text-orange-400 text-xs font-medium">
                  {formatUSD(m.amount_at_risk_usd)}
                </TD>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}