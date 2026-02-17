import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fmt(n: any) {
  if (n === null || n === undefined) return "—";
  const num = Number(n);
  if (Number.isNaN(num)) return String(n);
  return num.toLocaleString();
}

function statusPill(s: string) {
  const base = "inline-flex items-center rounded-full border px-2 py-1 text-xs";
  return <span className={base}>{s}</span>;
}

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth/login");

  const { id: reportId } = await params;

  if (!UUID_RE.test(reportId)) {
    return (
      <main className="min-h-screen p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <header className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Report Detail</h1>
            <div className="flex items-center gap-3">
              <Link className="rounded-lg border px-3 py-2 text-sm" href="/management/reports">Back</Link>
              <SignOutButton />
            </div>
          </header>
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-red-600">
              Invalid report id: <span className="font-mono">{reportId}</span>
            </p>
          </div>
        </div>
      </main>
    );
  }

  const { data: report, error: repErr } = await supabase
    .from("maintenance_reports")
    .select("*")
    .eq("id", reportId)
    .single();

  if (repErr || !report) {
    return (
      <main className="min-h-screen p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <header className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Report Detail</h1>
            <div className="flex items-center gap-3">
              <Link className="rounded-lg border px-3 py-2 text-sm" href="/management/reports">Back</Link>
              <SignOutButton />
            </div>
          </header>
          <div className="rounded-xl border bg-white p-6 shadow-sm text-sm text-red-600">
            {repErr?.message || "Report not found"}
          </div>
        </div>
      </main>
    );
  }

  const reportDate = report.report_date;

  // Deltas + exceptions (what management cares about)
  const { data: deltaRow } = await supabase
    .from("v_report_deltas")
    .select("report_date, water_delta, electric_delta")
    .eq("report_date", reportDate)
    .maybeSingle();

  const { data: exRow } = await supabase
    .from("v_report_exceptions")
    .select("report_date, exception_reasons, generator_not_completed_count")
    .eq("report_date", reportDate)
    .maybeSingle();

  const exceptionReasons: string[] = exRow?.exception_reasons || [];
  const genNotCompletedCount = exRow?.generator_not_completed_count ?? 0;

  // Generator items + labels
  const { data: genItems, error: genErr } = await supabase
    .from("generator_check_items")
    .select("category,item_key,status,notes")
    .eq("report_id", reportId);

  const { data: keyRows } = await supabase
    .from("generator_item_keys")
    .select("category,item_key,label")
    .eq("is_active", true);

  const labelMap = new Map<string, string>();
  (keyRows || []).forEach((k: any) => labelMap.set(`${k.category}:${k.item_key}`, k.label));

  const gens = (genItems || []).map((g: any) => ({
    ...g,
    label: labelMap.get(`${g.category}:${g.item_key}`) || g.item_key,
  }));

  const gensVisual = gens.filter((g: any) => g.category === "visual");
  const gensOperational = gens.filter((g: any) => g.category === "operational");

  const notCompleted = gens.filter((g: any) => g.status === "Not Completed");
  const completed = gens.filter((g: any) => g.status === "Completed");
  const na = gens.filter((g: any) => g.status === "N/A");

  // A few “quick status” fields for management
  const soft1 = report.softwater_tank_1 ?? "—";
  const soft2 = report.softwater_tank_2 ?? "—";
  const tanks = report.water_tanks_status ?? "—";
  const pump = report.pump_psi ?? "—";

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Night Report</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {reportDate} • Submitted {new Date(report.submitted_at).toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-muted-foreground font-mono">{report.id}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link className="rounded-lg border px-3 py-2 text-sm" href="/management/reports">Back</Link>
            <SignOutButton />
          </div>
        </header>

        {/* AT A GLANCE */}
        <section className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">At a glance</h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-lg border p-4">
              <div className="text-xs text-muted-foreground">Water Δ</div>
              <div className="mt-1 text-2xl font-semibold">{fmt(deltaRow?.water_delta)}</div>
              <div className="mt-1 text-xs text-muted-foreground">Reading: {fmt(report.water_meter_reading)}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-xs text-muted-foreground">Electric Δ</div>
              <div className="mt-1 text-2xl font-semibold">{fmt(deltaRow?.electric_delta)}</div>
              <div className="mt-1 text-xs text-muted-foreground">Reading: {fmt(report.electric_meter_reading)}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-xs text-muted-foreground">Generator</div>
              <div className="mt-1 text-sm">
                {statusPill(`Completed: ${completed.length}`)}{" "}
                {statusPill(`Not Completed: ${notCompleted.length}`)}{" "}
                {statusPill(`N/A: ${na.length}`)}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Not completed (view rule): {fmt(genNotCompletedCount)}
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-xs text-muted-foreground">Quick status</div>
              <div className="mt-2 text-sm">
                <div>Softwater: {soft1} / {soft2}</div>
                <div>Tanks: {tanks}</div>
                <div>Pump PSI: {pump}</div>
              </div>
            </div>
          </div>

          {exceptionReasons.length ? (
            <div className="rounded-lg border p-4">
              <div className="text-sm font-medium">Flags</div>
              <ul className="mt-2 list-disc pl-5 text-sm">
                {exceptionReasons.map((r, idx) => <li key={idx}>{r}</li>)}
              </ul>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No exception flags for this report.</div>
          )}
        </section>

        {/* WHAT NEEDS ATTENTION */}
        <section className="rounded-xl border bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold">What needs attention</h2>
          <p className="text-sm text-muted-foreground">
            Focused view. Only issues and “Not Completed” generator items.
          </p>

          {report.issues_summary ? (
            <div className="rounded-lg border p-4">
              <div className="text-sm font-medium">Notes / issues</div>
              <p className="mt-2 text-sm">{report.issues_summary}</p>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No issues noted.</div>
          )}

          {genErr ? (
            <p className="text-sm text-red-600">{genErr.message}</p>
          ) : notCompleted.length ? (
            <div className="rounded-lg border p-4">
              <div className="text-sm font-medium">Generator items not completed</div>
              <div className="mt-3 space-y-2">
                {notCompleted.map((g: any, idx: number) => (
                  <div key={idx} className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">{g.category}</div>
                    <div className="font-medium">{g.label}</div>
                    {g.notes ? <div className="mt-1 text-xs text-muted-foreground">{g.notes}</div> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No generator items marked Not Completed.</div>
          )}
        </section>

        {/* DETAILS (expandable) */}
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <details>
            <summary className="cursor-pointer text-sm text-muted-foreground">
              Show full report details (meters, tanks, gas, plumbing, lights, all generator items)
            </summary>

            <div className="mt-5 space-y-6">
              <div className="rounded-lg border p-4">
                <div className="text-sm font-medium">Meters</div>
                <div className="mt-2 text-sm">
                  Water: {fmt(report.water_meter_reading)} (time: {report.water_meter_time ?? "—"})<br />
                  Electric: {fmt(report.electric_meter_reading)} (time: {report.electric_meter_time ?? "—"})
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="text-sm font-medium">Gas levels</div>
                <div className="mt-2 text-sm grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>Kitchen 1: {report.kitchen_tank_1 ?? "—"}</div>
                  <div>Kitchen 2: {report.kitchen_tank_2 ?? "—"}</div>
                  <div>Laundry 1: {report.laundry_tank_1 ?? "—"}</div>
                  <div>Laundry 2: {report.laundry_tank_2 ?? "—"}</div>
                  <div>Spare 1: {report.spare_tank_1 ?? "—"}</div>
                  <div>Spare 2: {report.spare_tank_2 ?? "—"}</div>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="text-sm font-medium">Water system</div>
                <div className="mt-2 text-sm">
                  Heater temp: {report.water_heater_temp ?? "—"} (time: {report.water_heater_temp_time ?? "—"})<br />
                  Softwater: {soft1} / {soft2}<br />
                  Tanks: {tanks} (time: {report.water_level_check_time ?? "—"})<br />
                  Tank notes: {report.water_tanks_notes ?? "—"}<br />
                  Pump PSI: {pump} (time: {report.pump_psi_time ?? "—"})
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="text-sm font-medium">Generator — Visual</div>
                <div className="mt-3 space-y-2">
                  {gensVisual.map((g: any, idx: number) => (
                    <div key={idx} className="rounded-md border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium">{g.label}</div>
                        {statusPill(g.status)}
                      </div>
                      {g.notes ? <div className="mt-1 text-xs text-muted-foreground">{g.notes}</div> : null}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="text-sm font-medium">Generator — Operational</div>
                <div className="mt-3 space-y-2">
                  {gensOperational.map((g: any, idx: number) => (
                    <div key={idx} className="rounded-md border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium">{g.label}</div>
                        {statusPill(g.status)}
                      </div>
                      {g.notes ? <div className="mt-1 text-xs text-muted-foreground">{g.notes}</div> : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </details>
        </section>
      </div>
    </main>
  );
}
