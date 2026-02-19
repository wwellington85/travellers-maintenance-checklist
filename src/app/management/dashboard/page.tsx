import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";
import DeltasChart from "./DeltasChart";
import ReadingsChart from "./ReadingsChart";
import DashboardSummary from "./DashboardSummary";
import { withBasePath } from "@/lib/app-path";

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

function isIsoDate(v: string | undefined): v is string {
  return !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function isoUTCDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function utcTodayISO() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return isoUTCDate(d);
}

function utcDaysAgoISO(daysAgo: number) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return isoUTCDate(d);
}

function dashboardHref(preset: string, start?: string, end?: string) {
  const sp = new URLSearchParams();
  sp.set("preset", preset);
  if (start) sp.set("start", start);
  if (end) sp.set("end", end);
  return `${withBasePath("/management/dashboard")}?${sp.toString()}`;
}

function applyDateRange<T>(query: T, startDate: string, endDate: string) {
  return (query as any).gte("report_date", startDate).lte("report_date", endDate);
}

function inclusiveDateSpan(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.floor((end - start) / dayMs) + 1);
}

export default async function ManagementDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const supabase = await createSupabaseServerClient();
  const sp = (searchParams ? await searchParams : {}) as Record<string, string | undefined>;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth/login");

  const today = utcTodayISO();
  const presetRaw = (sp?.preset || "60").toLowerCase();
  const startRaw = sp?.start;
  const endRaw = sp?.end;

  let startDate = utcDaysAgoISO(59);
  let endDate = today;
  let activePreset = "60";

  if (presetRaw === "today") {
    startDate = today;
    endDate = today;
    activePreset = "today";
  } else if (presetRaw === "30" || presetRaw === "60" || presetRaw === "90") {
    const days = Number(presetRaw);
    startDate = utcDaysAgoISO(days - 1);
    endDate = today;
    activePreset = presetRaw;
  } else if (isIsoDate(startRaw) && isIsoDate(endRaw)) {
    startDate = startRaw <= endRaw ? startRaw : endRaw;
    endDate = startRaw <= endRaw ? endRaw : startRaw;
    activePreset = "custom";
  }

  const rangeLabel =
    activePreset === "today"
      ? "today"
      : activePreset === "custom"
        ? `${startDate} to ${endDate}`
        : `last ${activePreset} days`;
  const spanDays = inclusiveDateSpan(startDate, endDate);
  const rowLimit = Math.min(Math.max(spanDays + 10, 120), 5000);

  // For the *cards*, we want the latest row even if it's null (shows that the delta isn't computable yet)
  const deltasAllQ = applyDateRange(
    supabase
    .from("v_report_deltas_effective")
    .select("report_date, water_delta, electric_delta")
    .order("report_date", { ascending: false }),
    startDate,
    endDate
  );
  const { data: deltasAll, error: deltasErr } = await deltasAllQ.limit(rowLimit);

  // For the *chart*, we want only real deltas so the line always makes sense
  const deltasNonNullQ = applyDateRange(
    supabase
    .from("v_report_deltas_nonnull")
    .select("report_date, water_delta, electric_delta")
    .order("report_date", { ascending: false }),
    startDate,
    endDate
  );
  const { data: deltasNonNull } = await deltasNonNullQ.limit(rowLimit);

  // Raw readings chart (always chartable)
  const readingsQ = applyDateRange(
    supabase
    .from("v_report_readings")
    .select("report_date, water_reading, electric_reading")
    .order("report_date", { ascending: false }),
    startDate,
    endDate
  );
  const { data: readings } = await readingsQ.limit(rowLimit);

  const exceptionsQ = applyDateRange(
    supabase
    .from("v_report_exceptions")
    .select(
      "report_date, generator_not_completed, water_spike, electric_spike, water_tanks_almost_empty, softwater_hard, pump_psi_out_of_range"
    )
    .order("report_date", { ascending: false }),
    startDate,
    endDate
  );
  const { data: exceptions, error: exErr } = await exceptionsQ.limit(rowLimit);

  const latest = deltasAll?.[0];

  // helpful: latest computable delta (for warning logic)
  const latestDelta = deltasNonNull?.[0];
  const latestFollowup = latestDelta?.report_date
    ? await (async () => {
        const { data: latestReport } = await supabase
          .from("maintenance_reports")
          .select("id")
          .eq("report_date", latestDelta.report_date)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!latestReport?.id) return null;

        const { data: lf } = await supabase
          .from("maintenance_followups")
          .select("reading_anomaly_type")
          .eq("report_id", latestReport.id)
          .maybeSingle();

        return lf;
      })()
    : null;

  const anomalyType = latestFollowup?.reading_anomaly_type || "none";

  const negativeWarnings: string[] = [];
  if (anomalyType !== "meter_rollover_reset" && latestDelta?.water_delta !== null && latestDelta?.water_delta < 0)
    negativeWarnings.push("Negative water delta (possible reading error/rollover)");
  if (anomalyType !== "meter_rollover_reset" && latestDelta?.electric_delta !== null && latestDelta?.electric_delta < 0)
    negativeWarnings.push("Negative electric delta (possible reading error/rollover)");

  const exceptionCount =
    exceptions?.filter(
      (e: any) =>
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
            <a className="rounded-lg border px-3 py-2 text-sm" href={withBasePath("/management/rollups")}>
              Rollups
            </a>
            <Link className="rounded-lg border px-3 py-2 text-sm" href="/management/reports">
              Reports
            </Link>
            <Link className="rounded-lg border px-3 py-2 text-sm" href="/management/exceptions">
              Exceptions
            </Link>
            <Link className="rounded-lg border px-3 py-2 text-sm" href="/management/staff">
              Staff
            </Link>
            <SignOutButton />
          </div>
        </header>

        <section className="rounded-xl border bg-white p-4 shadow-sm flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">Date range</div>
            <div className="flex flex-wrap gap-2 text-sm">
              {["today", "30", "60", "90"].map((p) => (
                <a
                  key={p}
                  href={dashboardHref(p)}
                  className={`rounded border px-3 py-1.5 ${activePreset === p ? "bg-black text-white" : ""}`}
                >
                  {p === "today" ? "Today" : `Last ${p}`}
                </a>
              ))}
            </div>
          </div>

          <form method="get" className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="preset" value="custom" />
            <label className="text-xs text-muted-foreground">
              Start
              <input
                type="date"
                name="start"
                defaultValue={startDate}
                className="mt-1 block rounded border px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              End
              <input
                type="date"
                name="end"
                defaultValue={endDate}
                className="mt-1 block rounded border px-2 py-1.5 text-sm"
              />
            </label>
            <button className="rounded border px-3 py-1.5 text-sm">Apply</button>
            <a className="rounded border px-3 py-1.5 text-sm" href={dashboardHref("60")}>
              Reset
            </a>
          </form>
          <div className="w-full text-xs text-muted-foreground">
            Showing data from <span className="font-medium">{startDate}</span> to{" "}
            <span className="font-medium">{endDate}</span> ({rangeLabel}).
          </div>
        </section>

        <DashboardSummary startDate={startDate} endDate={endDate} rangeLabel={rangeLabel} />

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
            <div className="text-sm text-muted-foreground">Exceptions ({rangeLabel})</div>
            <div className="mt-2 text-3xl font-semibold">{fmt(exceptionCount)}</div>
            <div className="mt-1 text-xs text-muted-foreground">Needs review</div>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Meter readings chart ({rangeLabel})</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Raw meter readings (always available even when deltas are null).
          </p>
          <div className="mt-4 h-72 w-full">
            <ReadingsChart data={readingsChartData as any} />
          </div>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Usage deltas chart ({rangeLabel})</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Shows only days where a delta could be computed (non-null).
          </p>
          <div className="mt-4 h-72 w-full">
            <DeltasChart data={deltaChartData as any} />
          </div>
        </section>
      </div>
    </main>
  );
}
