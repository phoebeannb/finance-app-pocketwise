import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer,
} from "recharts";
import { formatMoney, formatMoneyCompact } from "../utils/format";
import useMediaQuery from "../hooks/useMediaQuery";

// series = [{ key, name, color }]; kind = "bar" | "line"; onSelect(point) runs when a bar or point is clicked
export default function TrendChart({ data, series, kind = "bar", onSelect, label }) {
  const phone = useMediaQuery("(max-width: 639px)");
  const common = { data, margin: { top: 8, right: 8, left: 0, bottom: 0 } };
  const description = label || `${series.map((s) => s.name).join(" and ")} over time`;

  const axes = (
    <>
      <CartesianGrid strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="label" tick={{ fontSize: 12 }} interval="preserveStartEnd" minTickGap={phone ? 28 : 8} />
      <YAxis tick={{ fontSize: 12 }} tickFormatter={formatMoneyCompact} width={phone ? 48 : 60} tickCount={phone ? 4 : 6} />
      <Tooltip formatter={(v) => formatMoney(v)} />
      {series.length > 1 && <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: 8 }} />}
    </>
  );

  return (
    <div className="h-64 w-full sm:h-72" role="img" aria-label={description}>
      <ResponsiveContainer>
        {kind === "line" ? (
          <LineChart {...common}
            onClick={(e) => { const p = e?.activePayload?.[0]?.payload; if (p && onSelect) onSelect(p); }}
            style={{ cursor: onSelect ? "pointer" : "default" }}>
            {axes}
            {series.map((s) => (
              <Line key={s.key} type="linear" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2.5} dot={{ r: 3 }} />
            ))}
          </LineChart>
        ) : (
          <BarChart {...common}>
            {axes}
            {series.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[4, 4, 0, 0]}
                style={{ cursor: onSelect ? "pointer" : "default" }}
                onClick={(entry) => { const p = entry?.payload ?? entry; if (p && onSelect) onSelect(p); }} />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}