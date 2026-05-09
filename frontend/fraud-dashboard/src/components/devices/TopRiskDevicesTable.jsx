import { formatUSD, formatPercent, formatNumber, formatTimeAgo } from "@/lib/utils";
import { RISK_COLORS } from "@/constants";
import RiskBadge from "@/components/transactions/RiskBadge";
import { Smartphone, Monitor, Tablet } from "lucide-react";

const DeviceIcon = ({ type }) => {
  const props = { size: 13, className: "text-gray-400" };
  if (type === "mobile") return <Smartphone {...props} />;
  if (type === "tablet") return <Tablet {...props} />;
  return <Monitor {...props} />;
};

const getRiskLevel = (count) => {
  if (count >= 10) return "CRITICAL";
  if (count >= 5) return "HIGH";
  if (count >= 2) return "MEDIUM";
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

export default function TopRiskDevicesTable({ data, isLoading }) {
  if (isLoading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <div className="h-4 bg-gray-800 rounded w-52 animate-pulse" />
        </div>
        <div className="divide-y divide-gray-800">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="px-5 py-4 flex gap-4 animate-pulse">
              <div className="h-3 bg-gray-800 rounded w-20" />
              <div className="h-3 bg-gray-800 rounded w-16" />
              <div className="h-3 bg-gray-800 rounded w-24" />
              <div className="h-3 bg-gray-800 rounded w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
        <p className="text-gray-500 text-sm">No device data found</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800">
        <p className="text-white text-sm font-medium">
          Top Risk Devices
        </p>
        <p className="text-gray-500 text-xs mt-0.5">
          Ranked by number of HIGH and CRITICAL transactions
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-800/50">
            <tr>
              <TH>#</TH>
              <TH>Device</TH>
              <TH>Customer</TH>
              <TH>Age (days)</TH>
              <TH>Total Txns</TH>
              <TH>Fraud Count</TH>
              <TH>High / Critical</TH>
              <TH>Blocked</TH>
              <TH>Fraud Rate</TH>
              <TH>Amount at Risk</TH>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {data.map((d, i) => (
              <tr
                key={d.device_id}
                className="hover:bg-gray-800/30 transition-colors"
              >
                <TD className="text-gray-500 font-medium">{i + 1}</TD>

                <TD>
                  <div className="flex items-center gap-2">
                    <DeviceIcon type={d.device_type} />
                    <div>
                      <p className="text-white text-xs font-medium capitalize">
                        {d.device_type ?? "-"}
                      </p>
                      <p className="text-gray-500 text-xs">#{d.device_id}</p>
                    </div>
                  </div>
                </TD>

                <TD>
                  <p className="text-gray-300 text-xs">{d.customer_name ?? "-"}</p>
                  <p className="text-gray-500 text-xs">Age {d.customer_age}y</p>
                </TD>

                <TD>
                  <span
                    className={`text-xs font-medium ${
                      d.current_age_days < 1
                        ? "text-red-400"
                        : d.current_age_days < 7
                        ? "text-orange-400"
                        : "text-gray-300"
                    }`}
                  >
                    {d.current_age_days < 1
                      ? "Today"
                      : `${Math.round(d.current_age_days)}d`}
                  </span>
                </TD>

                <TD className="text-gray-300 text-xs">
                  {formatNumber(d.total_transactions)}
                </TD>

                <TD className="text-red-400 text-xs font-medium">
                  {formatNumber(d.fraud_count)}
                </TD>

                <TD>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-xs font-semibold"
                      style={{
                        color: RISK_COLORS[getRiskLevel(d.high_risk_count)],
                      }}
                    >
                      {formatNumber(d.high_risk_count)}
                    </span>
                    <span className="text-gray-600 text-xs">
                      ({formatNumber(d.critical_count)} crit)
                    </span>
                  </div>
                </TD>

                <TD className="text-orange-400 text-xs font-medium">
                  {formatNumber(d.blocked_count)}
                </TD>

                <TD>
                  <div className="flex items-center gap-2">
                    <div className="w-14 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(d.fraud_rate_percent, 100)}%`,
                          background: getRiskColor(
                            getRiskLevel(d.high_risk_count)
                          ),
                        }}
                      />
                    </div>
                    <span className="text-gray-400 text-xs">
                      {formatPercent(d.fraud_rate_percent)}
                    </span>
                  </div>
                </TD>

                <TD className="text-orange-400 text-xs font-medium">
                  {formatUSD(d.amount_at_risk_usd)}
                </TD>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}