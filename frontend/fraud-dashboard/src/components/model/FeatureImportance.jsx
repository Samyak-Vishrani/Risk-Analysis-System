import { useState } from "react";
import ChartCard from "@/components/charts/ChartCard";
import { CHART_COLORS } from "@/constants";

const GROUP_LABELS = {
  numeric: "Numeric Features",
  binary: "Binary / Flag Features",
  categorical: "Categorical (One-Hot Encoded)",
};

const GROUP_COLORS = {
  numeric: "#6366f1",
  binary: "#22c55e",
  categorical: "#f97316",
};

export default function FeatureImportance({ data, grouped, modelVersion, isLoading }) {
  const [view, setView] = useState("chart");
  const [groupFilter, setGroupFilter] = useState("all");

  if (isLoading) {
    return (
      <ChartCard title="Feature Importances" isLoading={true}>
        <div />
      </ChartCard>
    );
  }

  if (!data || data.length === 0) {
    return (
      <ChartCard title="Feature Importances">
        <div className="h-40 flex items-center justify-center">
          <p className="text-gray-500 text-sm">No feature data available</p>
        </div>
      </ChartCard>
    );
  }

  // filter by group if selected
  const getFilteredData = () => {
    if (groupFilter === "all") return data;
    const keys = (grouped?.[groupFilter] ?? []).map((f) => f.feature);
    return data.filter((f) => keys.includes(f.feature));
  };

  const filtered = getFilteredData().slice(0, 20);
  const maxImportance = Math.max(...filtered.map((f) => f.importance));

  // determine group for a feature
  const getGroup = (feature) => {
    if (!grouped) return "numeric";
    if ((grouped.binary ?? []).some((f) => f.feature === feature)) return "binary";
    if ((grouped.categorical ?? []).some((f) => f.feature === feature)) return "categorical";
    return "numeric";
  };

  return (
    <ChartCard
      title="Feature Importances"
      subtitle={`Top features driving fraud predictions${modelVersion ? ` — model v${modelVersion}` : ""}`}
      controls={
        <div className="flex items-center gap-2">
          {/* group filter */}
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-2 py-1.5 outline-none"
          >
            <option value="all">All Features</option>
            <option value="numeric">Numeric</option>
            <option value="binary">Binary</option>
            <option value="categorical">Categorical</option>
          </select>

          {/* chart vs table toggle */}
          <div className="flex bg-gray-800 border border-gray-700 rounded-lg p-0.5 gap-0.5">
            {["chart", "table"].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                  view === v
                    ? "bg-gray-700 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      }
    >
      {view === "chart" ? (
        <div className="space-y-2 mt-2">
          {filtered.map((f, i) => {
            const group = getGroup(f.feature);
            const color = GROUP_COLORS[group];
            const barWidth = (f.importance / maxImportance) * 100;

            return (
              <div key={f.feature} className="flex items-center gap-3">
                {/* rank */}
                <span className="text-gray-600 text-xs w-5 text-right shrink-0">
                  {i + 1}
                </span>

                {/* feature name */}
                <span
                  className="text-gray-300 text-xs w-48 truncate shrink-0"
                  title={f.feature}
                >
                  {f.feature}
                </span>

                {/* importance bar */}
                <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${barWidth}%`, background: color }}
                  />
                </div>

                {/* importance value */}
                <span className="text-gray-400 text-xs w-14 text-right shrink-0">
                  {(f.importance * 100).toFixed(2)}%
                </span>

                {/* group dot */}
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: color }}
                  title={GROUP_LABELS[group]}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto mt-2">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                {["Rank", "Feature", "Importance", "% of Total", "Type"].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.map((f, i) => {
                const group = getGroup(f.feature);
                const color = GROUP_COLORS[group];
                const totalImportance = filtered.reduce(
                  (s, r) => s + r.importance, 0
                );
                const pctOfTotal = ((f.importance / totalImportance) * 100).toFixed(1);

                return (
                  <tr key={f.feature} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-3 py-2 text-xs text-gray-500">{i + 1}</td>
                    <td className="px-3 py-2 text-xs text-gray-300 font-mono">
                      {f.feature}
                    </td>
                    <td className="px-3 py-2 text-xs text-white font-medium">
                      {f.importance.toFixed(4)}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-400">
                      {pctOfTotal}%
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: `${color}20`,
                          color,
                        }}
                      >
                        {GROUP_LABELS[group]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* group legend */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-800">
        {Object.entries(GROUP_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: GROUP_COLORS[key] }}
            />
            <span className="text-gray-500 text-xs">{label}</span>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}