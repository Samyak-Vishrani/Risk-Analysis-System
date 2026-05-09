import { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import { getRiskColor } from "@/lib/utils";
import { formatUSD, formatNumber } from "@/lib/utils";

const GEOJSON_URL =
  "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson";

const MAP_MODES = [
  { key: "fraud_rate_percent", label: "Fraud Rate %" },
  { key: "fraud_count", label: "Fraud Count" },
  { key: "amount_at_risk_usd", label: "Amount at Risk" },
];

const getFillColor = (value, maxValue) => {
  if (!value || maxValue === 0) return "#111827";
  const intensity = value / maxValue;
  if (intensity > 0.75) return "#ef4444";
  if (intensity > 0.50) return "#f97316";
  if (intensity > 0.25) return "#eab308";
  if (intensity > 0.05) return "#22c55e";
  return "#1f2937";
};

const formatTooltipValue = (value, mode) => {
  if (!value) return "0";
  if (mode === "fraud_rate_percent") return `${value}%`;
  if (mode === "amount_at_risk_usd") return formatUSD(value);
  return formatNumber(value);
};

function GeoJSONLayer({ url, countryMap, mode, maxValue }) {
  const [geoData, setGeoData] = useState(null);

  useEffect(() => {
    fetch(url)
      .then((r) => r.json())
      .then(setGeoData)
      .catch((err) => console.error("GeoJSON fetch failed:", err));
  }, [url]);

  if (!geoData) return null;

  const styleFeature = (feature) => {
    const name = feature.properties.ADMIN;
    const data = countryMap[name];
    return {
      fillColor: getFillColor(data?.[mode], maxValue),
      fillOpacity: 0.8,
      color: "#374151",
      weight: 0.5,
    };
  };

  const onEachFeature = (feature, layer) => {
    const name = feature.properties.ADMIN;
    const data = countryMap[name];
    const modeLabel = MAP_MODES.find((m) => m.key === mode)?.label ?? mode;

    layer.bindTooltip(
      `<div style="background:#1f2937;color:white;padding:8px 10px;border-radius:8px;font-size:12px;border:1px solid #374151;min-width:160px;">
        <p style="font-weight:600;margin-bottom:6px;color:#f9fafb;">${name}</p>
        ${data ? `
          <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
            <span style="color:#9ca3af;">Total Txns</span>
            <span>${formatNumber(data.total_transactions)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
            <span style="color:#9ca3af;">Fraud Count</span>
            <span style="color:#ef4444;">${formatNumber(data.fraud_count)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
            <span style="color:#9ca3af;">Fraud Rate</span>
            <span style="color:#f97316;">${data.fraud_rate_percent}%</span>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span style="color:#9ca3af;">At Risk</span>
            <span style="color:#eab308;">${formatUSD(data.amount_at_risk_usd)}</span>
          </div>
        ` : `<p style="color:#6b7280;">No transaction data</p>`}
      </div>`,
      { sticky: true, opacity: 1, className: "leaflet-tooltip-custom" }
    );
  };

  return (
    <GeoJSON
      key={mode}
      data={geoData}
      style={styleFeature}
      onEachFeature={onEachFeature}
    />
  );
}

export default function WorldMap({ data, summary, isLoading }) {
  const [mode, setMode] = useState("fraud_count");

  if (isLoading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <div className="h-4 bg-gray-800 rounded w-32 animate-pulse" />
          <div className="h-7 bg-gray-800 rounded w-48 animate-pulse" />
        </div>
        <div className="h-[460px] bg-gray-800/30 animate-pulse" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
        <p className="text-gray-500 text-sm">No geographic data found</p>
      </div>
    );
  }

  const countryMap = {};
  data.forEach((row) => { countryMap[row.country] = row; });

  const maxValue = Math.max(...data.map((r) => parseFloat(r[mode] ?? 0)));

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">

      {/* header */}
      <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-white text-sm font-medium">Global Fraud Distribution</p>
          <p className="text-gray-500 text-xs mt-0.5">
            {summary?.total_countries ?? 0} countries with transaction data
          </p>
        </div>
        <div className="flex bg-gray-800 border border-gray-700 rounded-lg p-0.5 gap-0.5">
          {MAP_MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                mode === m.key
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* map */}
      <div className="h-[460px]">
        <MapContainer
          center={[20, 0]}
          zoom={2}
          minZoom={1.5}
          maxZoom={6}
          style={{ height: "100%", width: "100%", background: "#111827" }}
          scrollWheelZoom={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />
          <GeoJSONLayer
            url={GEOJSON_URL}
            countryMap={countryMap}
            mode={mode}
            maxValue={maxValue}
          />
        </MapContainer>
      </div>

      {/* legend + summary strip */}
      <div className="px-5 py-3 border-t border-gray-800 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4 text-xs">
          <span className="text-gray-500">
            {MAP_MODES.find((m) => m.key === mode)?.label}:
          </span>
          {[
            { color: "#22c55e", label: "Low" },
            { color: "#eab308", label: "Medium" },
            { color: "#f97316", label: "High" },
            { color: "#ef4444", label: "Critical" },
            { color: "#111827", label: "No data", border: true },
          ].map((l) => (
            <span key={l.label} className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-sm inline-block shrink-0"
                style={{
                  background: l.color,
                  border: l.border ? "1px solid #374151" : "none",
                }}
              />
              <span className="text-gray-400">{l.label}</span>
            </span>
          ))}
        </div>
        {summary && (
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>
              Total fraud:{" "}
              <span className="text-red-400 font-medium">
                {formatNumber(summary.total_fraud)}
              </span>
            </span>
            <span>
              At risk:{" "}
              <span className="text-orange-400 font-medium">
                {formatUSD(summary.total_at_risk_usd)}
              </span>
            </span>
            <span>
              Peak rate:{" "}
              <span className="text-yellow-400 font-medium">
                {summary.highest_fraud_rate}%
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}