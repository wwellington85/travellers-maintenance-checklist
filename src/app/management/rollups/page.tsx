import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";
import { withBasePath } from "@/lib/app-path";

function isoWeekKey(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function fmt(n: any) {
  if (n === null || n === undefined) return "—";
  const num = Number(n);
  if (Number.isNaN(num)) return String(n);
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default async function RollupsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(withBasePath("/auth/login"));

  const { data: rates } = await supabase.from("v_current_utility_rates").select("name, unit_label, rate_jmd");
  const electricRate = Number((rates || []).find((r: any) => r.name === "electric")?.rate_jmd ?? 0);
  const waterRate = Number((rates || []).find((r: any) => r.name === "water")?.rate_jmd ?? 0);

  const { data: rows, error } = await supabase
    .from("v_report_deltas_effective")
    .select("report_date, water_delta, electric_delta")
    .order("report_date", { ascending: false })
    .limit(365);

  if (error) {
    return (
      <main className="min-h-screen p-6">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-red-600">{error.message}</p>
        </div>
      </main>
    );
  }

  const data = (rows || []).map((r: any) => ({
    report_date: r.report_date,
    d: new Date(r.report_date + "T00:00:00"),
    water_delta: Number(r.water_delta ?? 0),
    electric_delta: Number(r.electric_delta ?? 0),
  }));

  // Daily spikes (top 10 by combined estimated cost)
  const daily = data
    .map((r) => ({
      ...r,
      cost_jmd: r.water_delta * waterRate + r.electric_delta * electricRate,
    }))
    .sort((a, b) => b.cost_jmd - a.cost_jmd)
    .slice(0, 10);

  const weekly = new Map<string, { water: number; electric: number; days: number }>();
  const monthly = new Map<string, { water: number; electric: number; days: number }>();

  for (const r of data) {
    const wk = isoWeekKey(r.d);
    const mk = monthKey(r.d);

    const w = weekly.get(wk) || { water: 0, electric: 0, days: 0 };
    w.water += r.water_delta;
    w.electric += r.electric_delta;
    w.days += 1;
    weekly.set(wk, w);

    const m = monthly.get(mk) || { water: 0, electric: 0, days: 0 };
    m.water += r.water_delta;
    m.electric += r.electric_delta;
    m.days += 1;
    monthly.set(mk, m);
  }

  const weeklyAll = Array.from(weekly.entries()).map(([k, v]) => ({
    k,
    ...v,
    cost_jmd: v.water * waterRate + v.electric * electricRate,
  }));

  const monthlyAll = Array.from(monthly.entries()).map(([k, v]) => ({
    k,
    ...v,
    cost_jmd: v.water * waterRate + v.electric * electricRate,
  }));

  const weeklyRows = weeklyAll.sort((a, b) => (a.k < b.k ? 1 : -1)).slice(0, 12);
  const monthlyRows = monthlyAll.sort((a, b) => (a.k < b.k ? 1 : -1)).slice(0, 12);

  const topWeeklySpikes = [...weeklyAll].sort((a, b) => b.cost_jmd - a.cost_jmd).slice(0, 3);
  const topMonthlySpikes = [...monthlyAll].sort((a, b) => b.cost_jmd - a.cost_jmd).slice(0, 3);

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Usage Rollups</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Weekly + monthly totals. Cost estimates use your current rates.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Rates: Electric JMD {fmt(electricRate)} per kWh • Water JMD {fmt(waterRate)} per unit
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link className="rounded-lg border px-3 py-2 text-sm" href="/management/dashboard">
              Dashboard
            </Link>
            <Link className="rounded-lg border px-3 py-2 text-sm" href="/management/staff">
              Staff
            </Link>
            <SignOutButton />
          </div>
        </header>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Top spikes</h2>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4">
              <div className="text-sm font-medium">Top 3 weeks</div>
              <ul className="mt-2 space-y-2 text-sm">
                {topWeeklySpikes.map((r) => (
                  <li key={r.k} className="rounded border p-2">
                    <div className="font-medium">{r.k}</div>
                    <div className="text-muted-foreground text-xs">
                      Water: {fmt(r.water)} • Electric: {fmt(r.electric)} • Cost: {fmt(r.cost_jmd)}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border p-4">
              <div className="text-sm font-medium">Top 3 months</div>
              <ul className="mt-2 space-y-2 text-sm">
                {topMonthlySpikes.map((r) => (
                  <li key={r.k} className="rounded border p-2">
                    <div className="font-medium">{r.k}</div>
                    <div className="text-muted-foreground text-xs">
                      Water: {fmt(r.water)} • Electric: {fmt(r.electric)} • Cost: {fmt(r.cost_jmd)}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border p-4">
              <div className="text-sm font-medium">Top 10 days</div>
              <ul className="mt-2 space-y-2 text-sm">
                {daily.map((r) => (
                  <li key={r.report_date} className="rounded border p-2">
                    <div className="font-medium">{r.report_date}</div>
                    <div className="text-muted-foreground text-xs">
                      Water Δ: {fmt(r.water_delta)} • Electric Δ: {fmt(r.electric_delta)} • Cost: {fmt(r.cost_jmd)}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Last 12 weeks</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-600">
                <tr>
                  <th className="py-2 pr-4">Week</th>
                  <th className="py-2 pr-4">Days</th>
                  <th className="py-2 pr-4">Water total</th>
                  <th className="py-2 pr-4">Electric total</th>
                  <th className="py-2 pr-4">Est. cost (JMD)</th>
                  <th className="py-2 pr-0">Avg/day (water / electric)</th>
                </tr>
              </thead>
              <tbody>
                {weeklyRows.map((r) => (
                  <tr key={r.k} className="border-t">
                    <td className="py-2 pr-4">{r.k}</td>
                    <td className="py-2 pr-4">{r.days}</td>
                    <td className="py-2 pr-4">{fmt(r.water)}</td>
                    <td className="py-2 pr-4">{fmt(r.electric)}</td>
                    <td className="py-2 pr-4">{fmt(r.cost_jmd)}</td>
                    <td className="py-2 pr-0">
                      {fmt(r.days ? r.water / r.days : 0)} / {fmt(r.days ? r.electric / r.days : 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Last 12 months</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-600">
                <tr>
                  <th className="py-2 pr-4">Month</th>
                  <th className="py-2 pr-4">Days</th>
                  <th className="py-2 pr-4">Water total</th>
                  <th className="py-2 pr-4">Electric total</th>
                  <th className="py-2 pr-4">Est. cost (JMD)</th>
                  <th className="py-2 pr-0">Avg/day (water / electric)</th>
                </tr>
              </thead>
              <tbody>
                {monthlyRows.map((r) => (
                  <tr key={r.k} className="border-t">
                    <td className="py-2 pr-4">{r.k}</td>
                    <td className="py-2 pr-4">{r.days}</td>
                    <td className="py-2 pr-4">{fmt(r.water)}</td>
                    <td className="py-2 pr-4">{fmt(r.electric)}</td>
                    <td className="py-2 pr-4">{fmt(r.cost_jmd)}</td>
                    <td className="py-2 pr-0">
                      {fmt(r.days ? r.water / r.days : 0)} / {fmt(r.days ? r.electric / r.days : 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
