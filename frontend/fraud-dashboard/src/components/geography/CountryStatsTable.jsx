import { formatNumber, formatPercent, formatUSD, getRiskColor } from "@/lib/utils";

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

export default function CountryStatsTable({ data, isLoading }) {
  if (isLoading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden animate-pulse">
        <div className="px-5 py-4 border-b border-gray-800">
          <div className="h-4 bg-gray-800 rounded w-40" />
        </div>
        <div className="divide-y divide-gray-800">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="px-5 py-3 flex gap-4">
              <div className="h-3 bg-gray-800 rounded w-24" />
              <div className="h-3 bg-gray-800 rounded w-16" />
              <div className="h-3 bg-gray-800 rounded w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) return null;

  const sorted = [...data].sort((a, b) => b.fraud_count - a.fraud_count);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800">
        <p className="text-white text-sm font-medium">All Countries</p>
        <p className="text-gray-500 text-xs mt-0.5">
          {sorted.length} countries with transaction data
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-800/50">
            <tr>
              <TH>#</TH>
              <TH>Country</TH>
              <TH>Merchants</TH>
              <TH>Total Txns</TH>
              <TH>Fraud Count</TH>
              <TH>Fraud Rate</TH>
              <TH>Blocked</TH>
              <TH>Amount at Risk</TH>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {sorted.map((row, i) => {
              const riskColor = getRiskColor(
                row.fraud_rate_percent > 30 ? "CRITICAL" :
                row.fraud_rate_percent > 20 ? "HIGH" :
                row.fraud_rate_percent > 10 ? "MEDIUM" : "LOW"
              );
              return (
                <tr
                  key={row.country}
                  className="hover:bg-gray-800/30 transition-colors"
                >
                  <TD className="text-gray-500">{i + 1}</TD>
                  <TD>
                    <p className="text-white text-xs font-medium">{row.country}</p>
                  </TD>
                  <TD className="text-gray-300 text-xs">
                    {formatNumber(row.merchant_count)}
                  </TD>
                  <TD className="text-gray-300 text-xs">
                    {formatNumber(row.total_transactions)}
                  </TD>
                  <TD className="text-red-400 text-xs font-medium">
                    {formatNumber(row.fraud_count)}
                  </TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <div className="w-14 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(row.fraud_rate_percent, 100)}%`,
                            background: riskColor,
                          }}
                        />
                      </div>
                      <span className="text-xs" style={{ color: riskColor }}>
                        {formatPercent(row.fraud_rate_percent)}
                      </span>
                    </div>
                  </TD>
                  <TD className="text-orange-400 text-xs font-medium">
                    {formatNumber(row.block_count)}
                  </TD>
                  <TD className="text-orange-400 text-xs font-medium">
                    {formatUSD(row.amount_at_risk_usd)}
                  </TD>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}