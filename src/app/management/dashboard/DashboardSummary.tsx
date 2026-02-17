import { createSupabaseServerClient } from "@/lib/supabase/server";

function fmt(n: any) {
  if (n === null || n === undefined) return "—";
  const num = Number(n);
  if (Number.isNaN(num)) return String(n);
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default async function DashboardSummary() {
  const supabase = await createSupabaseServerClient();

  // current rates
  const { data: rates } = await supabase.from("v_current_utility_rates").select("name, unit_label, rate_jmd");
  const electric = (rates || []).find((r: any) => r.name === "electric");
  const water = (rates || []).find((r: any) => r.name === "water");

  const electricRate = Number(electric?.rate_jmd ?? 0);
  const waterRate = Number(water?.rate_jmd ?? 0);

  // last 30 deltas
  const { data: deltas } = await supabase
    .from("v_report_deltas")
    .select("report_date, water_delta, electric_delta")
    .order("report_date", { ascending: false })
    .limit(30);

  const rows = (deltas || []).map((r: any) => ({
    report_date: r.report_date,
    water_delta: Number(r.water_delta ?? 0),
    electric_delta: Number(r.electric_delta ?? 0),
  }));

  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

  const last7 = rows.slice(0, 7);
  const w7 = sum(last7.map((r) => r.water_delta));
  const e7 = sum(last7.map((r) => r.electric_delta));
  const c7 = w7 * waterRate + e7 * electricRate;

  const w30 = sum(rows.map((r) => r.water_delta));
  const e30 = sum(rows.map((r) => r.electric_delta));
  const c30 = w30 * waterRate + e30 * electricRate;

  const topDays = [...rows]
    .map((r) => ({
      ...r,
      cost_jmd: r.water_delta * waterRate + r.electric_delta * electricRate,
    }))
    .sort((a, b) => b.cost_jmd - a.cost_jmd)
    .slice(0, 3);

  // Open follow-ups
  const { data: openFollowups } = await supabase
    .from("maintenance_followups")
    .select("report_id,status,updated_at")
    .neq("status", "resolved")
    .order("updated_at", { ascending: false })
    .limit(6);

  return (
    <section className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Management overview</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Rates: Electric JMD {fmt(electricRate)} / {electric?.unit_label ?? "unit"} • Water JMD {fmt(waterRate)} /{" "}
          {water?.unit_label ?? "unit"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg border p-4">
          <div className="text-xs text-muted-foreground">Last 7 days</div>
          <div className="mt-2 text-sm">Water total</div>
          <div className="text-2xl font-semibold">{fmt(w7)}</div>
          <div className="mt-2 text-sm">Electric total</div>
          <div className="text-2xl font-semibold">{fmt(e7)}</div>
          <div className="mt-2 text-sm">Est. cost (JMD)</div>
          <div className="text-2xl font-semibold">{fmt(c7)}</div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="text-xs text-muted-foreground">Last 30 days</div>
          <div className="mt-2 text-sm">Water total</div>
          <div className="text-2xl font-semibold">{fmt(w30)}</div>
          <div className="mt-2 text-sm">Electric total</div>
          <div className="text-2xl font-semibold">{fmt(e30)}</div>
          <div className="mt-2 text-sm">Est. cost (JMD)</div>
          <div className="text-2xl font-semibold">{fmt(c30)}</div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="text-xs text-muted-foreground">Top spike days (recent)</div>
          <div className="mt-3 space-y-2 text-sm">
            {topDays.length ? (
              topDays.map((d) => (
                <div key={d.report_date} className="rounded border p-2">
                  <div className="font-medium">{d.report_date}</div>
                  <div className="text-xs text-muted-foreground">
                    Cost {fmt(d.cost_jmd)} • W {fmt(d.water_delta)} • E {fmt(d.electric_delta)}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">No data.</div>
            )}
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="text-xs text-muted-foreground">Open follow-ups</div>
          <div className="mt-3 space-y-2 text-sm">
            {(openFollowups || []).length ? (
              (openFollowups || []).map((f: any) => (
                <a
                  key={f.report_id}
                  className="block rounded border p-3 hover:bg-gray-50"
                  href={`/management/reports/${f.report_id}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{f.status}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(f.updated_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground font-mono truncate">{f.report_id}</div>
                </a>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">No open follow-ups.</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
