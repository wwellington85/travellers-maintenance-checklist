"use client";

import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function DeltasChart({
  data,
}: {
  data: { report_date: string; water_delta: number | null; electric_delta: number | null }[];
}) {
  const hasAny =
    (data || []).some((d) => d.water_delta !== null && d.water_delta !== undefined) ||
    (data || []).some((d) => d.electric_delta !== null && d.electric_delta !== undefined);

  if (!hasAny) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        Not enough delta data yet. Submit at least 2 reports (on different dates) to see a trend line.
      </div>
    );
  }

  return (
    <div className="w-full min-w-0" style={{ height: 360 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="report_date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="water_delta"
            dot={{ r: 3 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="electric_delta"
            dot={{ r: 3 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
