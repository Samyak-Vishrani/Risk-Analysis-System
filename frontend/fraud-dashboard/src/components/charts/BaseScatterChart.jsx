import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 shadow-xl text-xs max-w-[200px]">
      {data.name && (
        <p className="text-white font-medium mb-1.5 truncate">{data.name}</p>
      )}
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 mb-0.5">
          <span className="text-gray-300">{entry.name}:</span>
          <span className="text-white font-medium">
            {typeof entry.value === "number"
              ? entry.value.toFixed(2)
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function BaseScatterChart({
  data = [],
  xDataKey,
  yDataKey,
  xLabel,
  yLabel,
  color = "#6366f1",
  xTickFormatter,
  yTickFormatter,
  referenceLineX,
  referenceLineY,
  height = 280,
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis
          dataKey={xDataKey}
          type="number"
          name={xLabel}
          tick={{ fill: "#6b7280", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={xTickFormatter}
          label={{
            value: xLabel,
            position: "insideBottom",
            offset: -10,
            fill: "#6b7280",
            fontSize: 11,
          }}
        />
        <YAxis
          dataKey={yDataKey}
          type="number"
          name={yLabel}
          tick={{ fill: "#6b7280", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={yTickFormatter}
          width={45}
          label={{
            value: yLabel,
            angle: -90,
            position: "insideLeft",
            offset: 10,
            fill: "#6b7280",
            fontSize: 11,
          }}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3" }} />
        {referenceLineX && (
          <ReferenceLine
            x={referenceLineX}
            stroke="#374151"
            strokeDasharray="4 4"
          />
        )}
        {referenceLineY && (
          <ReferenceLine
            y={referenceLineY}
            stroke="#374151"
            strokeDasharray="4 4"
          />
        )}
        <Scatter data={data} fill={color} opacity={0.8} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}