import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";

function isoWeekKey(d: Date) {
  // ISO week approx good enough for MVP: week starts Monday
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
  return num.toLocaleString();
}

export default async function RollupsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth/login");

  // Pull last 365 deltas
  const { data: rows, error } = await supabase
    .from("v_report_deltas")
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
    ...r,
    d: new Date(r.report_date + "T00:00:00"),
    water_delta: r.water_delta ?? 0,
    electric_delta: r.electric_delta ?? 0,
  }));

  const weekly = new Map<string, { water: number; electric: number; days: number }>();
  const monthly = new Map<string, { water: number; electric: number; days: number }>();

  for (const r of data) {
    const wk = isoWeekKey(r.d);
    const mk = monthKey(r.d);

    const w = weekly.get(wk) || { water: 0, electric: 0, days: 0 };
    w.water += Number(r.water_delta) || 0;
    w.electric += Number(r.electric_delta) || 0;
    w.days += 1;
    weekly.set(wk, w);

    const m = monthly.get(mk) || { water: 0, electric: 0, days: 0 };
    m.water += Number(r.water_delta) || 0;
    m.electric += Number(r.electric_delta) || 0;
    m.days += 1;
    monthly.set(mk, m);
  }

  const weeklyRows = Array.from(weekly.entries())
    .map(([k, v]) => ({ k, ...v }))
    .sort((a, b) => (a.k < b.k ? 1 : -1))
    .slice(0, 12);

  const monthlyRows = Array.from(monthly.entries())
    .map(([k, v]) => ({ k, ...v }))
    .sort((a, b) => (a.k < b.k ? 1 : -1))
    .slice(0, 12);

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Usage Rollups</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Weekly and monthly totals (from report deltas).
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link className="rounded-lg border px-3 py-2 text-sm" href="/management/dashboard">
              Dashboard
            </Link>
            <SignOutButton />
          </div>
        </header>

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
