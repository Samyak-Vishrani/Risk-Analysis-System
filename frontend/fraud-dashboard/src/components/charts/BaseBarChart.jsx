import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { format } from "date-fns";

const CustomTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-gray-400 mb-1.5">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 mb-0.5">
          <span
            className="w-2 h-2 rounded-sm shrink-0"
            style={{ background: entry.fill }}
          />
          <span className="text-gray-300">{entry.name}:</span>
          <span className="text-white font-medium">
            {formatter ? formatter(entry.value, entry.dataKey) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function BaseBarChart({
  data = [],
  bars = [],
  xDataKey = "name",
  formatter,
  yTickFormatter,
  xTickFormatter,
  colorByValue,
  height = 280,
  layout = "horizontal",
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={layout}
        margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
        {layout === "horizontal" ? (
          <>
            <XAxis
              dataKey={xDataKey}
              tick={{ fill: "#6b7280", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={xTickFormatter}
              interval={0}
            />
            <YAxis
              tick={{ fill: "#6b7280", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={yTickFormatter}
              width={45}
            />
          </>
        ) : (
          <>
            <XAxis
              type="number"
              tick={{ fill: "#6b7280", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={yTickFormatter}
            />
            <YAxis
              type="category"
              dataKey={xDataKey}
              tick={{ fill: "#6b7280", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={100}
              tickFormatter={(v) => v?.length > 14 ? `${v.slice(0, 14)}...` : v}
            />
          </>
        )}
        <Tooltip
          content={<CustomTooltip formatter={formatter} />}
          cursor={{ fill: "#1f2937" }}
        />
        {bars.map((bar) => (
          <Bar
            key={bar.dataKey}
            dataKey={bar.dataKey}
            name={bar.name ?? bar.dataKey}
            fill={bar.color ?? "#6366f1"}
            radius={[4, 4, 0, 0]}
          >
            {colorByValue &&
              data.map((entry, i) => (
                <Cell key={i} fill={colorByValue(entry[bar.dataKey])} />
              ))}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}