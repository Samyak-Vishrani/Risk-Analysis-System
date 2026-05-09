import { useState } from "react";
import { useCountryData, useLocationData } from "@/hooks/useGeography";
import WorldMap from "@/components/geography/WorldMap";
import CountryBarChart from "@/components/geography/CountryBarChart";
import LocationBarChart from "@/components/geography/LocationBarChart";
import CountryStatsTable from "@/components/geography/CountryStatsTable";
import { formatNumber, formatUSD, formatPercent } from "@/lib/utils";

export default function Geography() {
  const [locationLimit, setLocationLimit] = useState(20);

  const { data: countryData, isLoading: countryLoading } = useCountryData();
  const { data: locationData, isLoading: locationLoading } = useLocationData(locationLimit);

  const countries = countryData?.data ?? [];
  const locations = locationData?.data ?? [];
  const summary = countryData?.summary;

  return (
    <div className="space-y-4">

      {/* page header */}
      <div>
        <h1 className="text-white text-xl font-semibold">Geographic Analysis</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Where fraud is coming from across the world
        </p>
      </div>

      {/* summary chips */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Countries with Data",
              value: formatNumber(summary.total_countries),
              color: "text-blue-400",
            },
            {
              label: "Total Fraud Txns",
              value: formatNumber(summary.total_fraud),
              color: "text-red-400",
            },
            {
              label: "Total at Risk",
              value: formatUSD(summary.total_at_risk_usd),
              color: "text-orange-400",
            },
            {
              label: "Peak Fraud Rate",
              value: formatPercent(summary.highest_fraud_rate),
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

      {/* world map — full width */}
      <WorldMap
        data={countries}
        summary={summary}
        isLoading={countryLoading}
      />

      {/* country bar chart + location bar chart side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <CountryBarChart data={countries} isLoading={countryLoading} />
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-xs">Top transaction locations</p>
            <select
              value={locationLimit}
              onChange={(e) => setLocationLimit(Number(e.target.value))}
              className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-2 py-1.5 outline-none"
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>Top {n}</option>
              ))}
            </select>
          </div>
          <LocationBarChart data={locations} isLoading={locationLoading} />
        </div>
      </div>

      {/* full country stats table */}
      <CountryStatsTable data={countries} isLoading={countryLoading} />

    </div>
  );
}