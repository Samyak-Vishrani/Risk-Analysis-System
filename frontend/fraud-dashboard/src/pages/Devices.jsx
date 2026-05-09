import { useState } from "react";
import { useDevicesByAge, useTopRiskDevices } from "@/hooks/useDevices";
import DeviceAgeChart from "@/components/devices/DeviceAgeChart";
import TopRiskDevicesTable from "@/components/devices/TopRiskDevicesTable";
import NewDeviceInsightCard from "@/components/devices/NewDeviceInsightCard";
import { formatNumber, formatUSD, formatPercent } from "@/lib/utils";

const DEVICE_TYPES = ["", "mobile", "desktop", "tablet"];

export default function Devices() {
  const [tableLimit, setTableLimit] = useState(10);
  const [deviceType, setDeviceType] = useState("");

  const { data: ageData, isLoading: ageLoading } = useDevicesByAge();
  const { data: topData, isLoading: topLoading } = useTopRiskDevices(
    tableLimit,
    deviceType
  );

  const ageRows = ageData?.data ?? [];
  const topDevices = topData?.data ?? [];

  // summary stats
  const totalDevices = ageRows.reduce((s, r) => s + r.device_count, 0);
  const totalFraud = ageRows.reduce((s, r) => s + r.fraud_count, 0);
  const sameDayRow = ageRows.find((r) => r.device_age_bracket === "same-day");
  const totalAtRisk = topDevices.reduce(
    (s, d) => s + (d.amount_at_risk_usd ?? 0),
    0
  );

  return (
    <div className="space-y-4">

      {/* page header */}
      <div>
        <h1 className="text-white text-xl font-semibold">Device Analysis</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          New devices are your strongest fraud signal
        </p>
      </div>

      {/* summary chips */}
      {!ageLoading && ageRows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Total Devices",
              value: formatNumber(totalDevices),
              color: "text-blue-400",
            },
            {
              label: "Total Fraud Txns",
              value: formatNumber(totalFraud),
              color: "text-red-400",
            },
            {
              label: "Same-day Fraud Rate",
              value: sameDayRow
                ? formatPercent(sameDayRow.fraud_rate_percent)
                : "-",
              color: "text-orange-400",
            },
            {
              label: "Amount at Risk (Top)",
              value: formatUSD(totalAtRisk),
              color: "text-yellow-400",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center"
            >
              <p className={`text-base font-semibold ${s.color}`}>{s.value}</p>
              <p className="text-gray-500 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* new device insight card + bar chart side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <NewDeviceInsightCard
          data={ageData}
          isLoading={ageLoading}
        />
        <DeviceAgeChart data={ageRows} isLoading={ageLoading} />
      </div>

      {/* top risk devices table */}
      <div>
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <p className="text-gray-400 text-xs">Top risk devices</p>
          <div className="flex items-center gap-2">
            <select
              value={deviceType}
              onChange={(e) => setDeviceType(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-2 py-1.5 outline-none"
            >
              {DEVICE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t === "" ? "All Types" : t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
            <select
              value={tableLimit}
              onChange={(e) => setTableLimit(Number(e.target.value))}
              className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-2 py-1.5 outline-none"
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>Top {n}</option>
              ))}
            </select>
          </div>
        </div>
        <TopRiskDevicesTable data={topDevices} isLoading={topLoading} />
      </div>

    </div>
  );
}