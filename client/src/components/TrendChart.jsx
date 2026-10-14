import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer,
} from "recharts";
import { formatMoney } from "../utils/format";

const short = (v) => (Math.abs(v) >= 1000 ? `${v / 1000}k` : v);

// series = [{ key, name, color }]; kind = "bar" | "line"
export default function TrendChart({ data, series, kind = "bar" }) {
  const common = { data, margin: { top: 8, right: 8, left: 0, bottom: 0 } };
  const axes = (
    <>
      <CartesianGrid strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
      <YAxis tick={{ fontSize: 12 }} tickFormatter={short} width={48} />
      <Tooltip formatter={(v) => formatMoney(v)} />
      {series.length > 1 && <Legend />}
    </>
  );

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        {kind === "line" ? (
          <LineChart {...common}>
            {axes}
            {series.map((s) => (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2.5} dot={{ r: 3 }} />
            ))}
          </LineChart>
        ) : (
          <BarChart {...common}>
            {axes}
            {series.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}