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
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="report_date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Line type="monotone" dataKey="water_delta" dot={false} />
          <Line type="monotone" dataKey="electric_delta" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
