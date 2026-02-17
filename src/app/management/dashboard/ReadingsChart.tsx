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

export default function ReadingsChart({
  data,
}: {
  data: { report_date: string; water_reading: number | null; electric_reading: number | null }[];
}) {
  const hasAny =
    (data || []).some((d) => d.water_reading !== null && d.water_reading !== undefined) ||
    (data || []).some((d) => d.electric_reading !== null && d.electric_reading !== undefined);

  if (!hasAny) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        No meter readings yet. Submit a report to see the readings trend.
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
          <Line type="monotone" dataKey="water_reading" dot={{ r: 3 }} connectNulls />
          <Line type="monotone" dataKey="electric_reading" dot={{ r: 3 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
