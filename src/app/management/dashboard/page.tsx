import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";
import DeltasChart from "./DeltasChart";
import ReadingsChart from "./ReadingsChart";
import DashboardSummary from "./DashboardSummary";

function fmt(n: any) {
  if (n === null || n === undefined) return "—";
  const num = Number(n);
  if (Number.isNaN(num)) return String(n);
  return num.toLocaleString();
}

function warnPill(text: string) {
  return (
    <span className="inline-flex items-center rounded-full border px-2 py-1 text-xs">
      {text}
    </span>
  );
}

export default async function ManagementDashboardPage() {
  const supabase = await createSupabaseServerClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth/login");

  // For the *cards*, we want the latest row even if it's null (shows that the delta isn't computable yet)
  const { data: deltasAll, error: deltasErr } = await supabase
    .from("v_report_deltas_effective")
    .select("report_date, water_delta, electric_delta")
    .order("report_date", { ascending: false })
    .limit(60);

  // For the *chart*, we want only real deltas so the line always makes sense
  const { data: deltasNonNull } = await supabase
    .from("v_report_deltas_nonnull")
    .select("report_date, water_delta, electric_delta")
    .order("report_date", { ascending: false })
    .limit(60);

  // Raw readings chart (always chartable)
  const { data: readings } = await supabase
    .from("v_report_readings")
    .select("report_date, water_reading, electric_reading")
    .order("report_date", { ascending: false })
    .limit(60);

  const { data: exceptions, error: exErr } = await supabase
    .from("v_report_exceptions")
    .select(
      "report_date, generator_not_completed, water_spike, electric_spike, water_tanks_almost_empty, softwater_hard, pump_psi_out_of_range"
    )
    .order("report_date", { ascending: false })
    .limit(60);

  const latest = deltasAll?.[0];

  // helpful: latest computable delta (for warning logic)
  const latestDelta = deltasNonNull?.[0];

  const { data: latestFollowup } = latestDelta?.report_id
    ? await supabase
        .from("maintenance_followups")
        .select("reading_anomaly_type")
        .eq("report_id", latestDelta.report_id)
        .maybeSingle()
    : { data: null };

  const anomalyType = latestFollowup?.reading_anomaly_type || "none";

  const negativeWarnings: string[] = [];
  if (anomalyType !== "meter_rollover_reset" && latestDelta?.water_delta !== null && latestDelta?.water_delta < 0)
    negativeWarnings.push("Negative water delta (possible reading error/rollover)");
  if (anomalyType !== "meter_rollover_reset" && latestDelta?.electric_delta !== null && latestDelta?.electric_delta < 0)
    negativeWarnings.push("Negative electric delta (possible reading error/rollover)");

  const exceptionCount =
    exceptions?.filter(
      (e) =>
        e.generator_not_completed ||
        e.water_spike ||
        e.electric_spike ||
        e.water_tanks_almost_empty ||
        e.softwater_hard ||
        e.pump_psi_out_of_range
    ).length ?? 0;

  // Charts expect ascending dates
  const deltaChartData = [...(deltasNonNull || [])].reverse();
  const readingsChartData = [...(readings || [])].reverse();

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Maintenance Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Readings + usage deltas for water and electricity.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a className="rounded-lg border px-3 py-2 text-sm" href="/management/rollups">
              Rollups
            </a>
            <Link className="rounded-lg border px-3 py-2 text-sm" href="/management/reports">
              Reports
            </Link>
            <Link className="rounded-lg border px-3 py-2 text-sm" href="/management/exceptions">
              Exceptions
            </Link>
            <SignOutButton />
          </div>
        </header>

        <DashboardSummary />

        {deltasErr || exErr ? (
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-red-600">{deltasErr?.message || exErr?.message}</p>
          </section>
        ) : null}

        {negativeWarnings.length ? (
          <section className="rounded-xl border bg-white p-4 shadow-sm flex flex-wrap gap-2">
            {negativeWarnings.map((w) => (
              <span key={w}>{warnPill(w)}</span>
            ))}
            <span className="text-xs text-muted-foreground">
              Tip: Negative deltas usually mean the reading decreased vs yesterday.
            </span>
          </section>
        ) : null}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="text-sm text-muted-foreground">Latest water delta</div>
            <div className="mt-2 text-3xl font-semibold">{fmt(latest?.water_delta)}</div>
            <div className="mt-1 text-xs text-muted-foreground">{latest?.report_date ?? ""}</div>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="text-sm text-muted-foreground">Latest electric delta</div>
            <div className="mt-2 text-3xl font-semibold">{fmt(latest?.electric_delta)}</div>
            <div className="mt-1 text-xs text-muted-foreground">{latest?.report_date ?? ""}</div>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="text-sm text-muted-foreground">Exceptions (last 60)</div>
            <div className="mt-2 text-3xl font-semibold">{fmt(exceptionCount)}</div>
            <div className="mt-1 text-xs text-muted-foreground">Needs review</div>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Meter readings chart (last 60)</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Raw meter readings (always available even when deltas are null).
          </p>
          <div className="mt-4">
            <ReadingsChart data={readingsChartData as any} />
          </div>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Usage deltas chart (computable days)</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Shows only days where a delta could be computed (non-null).
          </p>
          <div className="mt-4">
            <DeltasChart data={deltaChartData as any} />
          </div>
        </section>
      </div>
    </main>
  );
}
