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

function pill(text: string) {
  return <span className="inline-flex items-center rounded-full border px-2 py-1 text-xs">{text}</span>;
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
  if (!UUID_RE.test(reportId)) redirect("/management/reports");

  const { data: report, error: repErr } = await supabase
    .from("maintenance_reports")
    .select("*")
    .eq("id", reportId)
    .single();

  if (repErr || !report) redirect("/management/reports");

  const reportDate = report.report_date;

  const { data: deltaRow } = await supabase
    .from("v_report_deltas")
    .select("water_delta, electric_delta")
    .eq("report_date", reportDate)
    .maybeSingle();

  const { data: exRow } = await supabase
    .from("v_report_exceptions")
    .select("exception_reasons, generator_not_completed_count")
    .eq("report_date", reportDate)
    .maybeSingle();

  const exceptionReasons: string[] = exRow?.exception_reasons || [];
  const genNotCompletedCount = exRow?.generator_not_completed_count ?? 0;

  const { data: followup } = await supabase
    .from("maintenance_followups")
    .select("status, assigned_to, internal_notes, reading_anomaly_type, reading_anomaly_notes, corrected_water_reading, corrected_electric_reading, updated_at")
    .eq("report_id", reportId)
    .maybeSingle();

  const { data: staff } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active")
    .in("role", ["maintenance", "manager", "admin"])
    .eq("is_active", true)
    .order("full_name", { ascending: true });

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

  const notCompleted = gens.filter((g: any) => g.status === "Not Completed");
  const completed = gens.filter((g: any) => g.status === "Completed");
  const na = gens.filter((g: any) => g.status === "N/A");

  // Lights issues: any boolean false = issue
  const lightsChecks: { label: string; key: string }[] = [
    { label: "Deluxe", key: "lights_deluxe_ok" },
    { label: "Superior", key: "lights_superior_ok" },
    { label: "Standard", key: "lights_standard_ok" },
    { label: "Garden lights", key: "lights_garden_ok" },
    { label: "Pool deck lights", key: "lights_pooldeck_ok" },
    { label: "Restaurant lights", key: "lights_restaurant_ok" },
    { label: "Restaurant deck lights", key: "lights_restaurant_deck_ok" },
  ];
  const lightsIssues = lightsChecks
    .filter((c) => report[c.key] === false)
    .map((c) => c.label);

  // Plumbing issues: any boolean false = issue
  const plumbingChecks: { label: string; key: string }[] = [
    { label: "Restaurant Male", key: "plumbing_restaurant_male_ok" },
    { label: "Restaurant Female", key: "plumbing_restaurant_female_ok" },
    { label: "Scuba shower", key: "plumbing_scuba_shower_ok" },
    { label: "Gym Footwash", key: "plumbing_gym_footwash_ok" },
    { label: "Pool Shower", key: "plumbing_pool_shower_ok" },
    { label: "Family Room bathroom", key: "plumbing_family_room_bathroom_ok" },
    { label: "Laundry Female Bathroom", key: "plumbing_laundry_female_bathroom_ok" },
    { label: "Laundry Male Bathroom", key: "plumbing_laundry_male_bathroom_ok" },
    { label: "Lobby Male bathroom", key: "plumbing_lobby_male_bathroom_ok" },
    { label: "Lobby Female bathroom", key: "plumbing_lobby_female_bathroom_ok" },
  ];
  const plumbingIssues = plumbingChecks
    .filter((c) => report[c.key] === false)
    .map((c) => c.label);

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
            <Link className="rounded-lg border px-3 py-2 text-sm" href={`/management/reports/${reportId}/print`}>
              Print
            </Link>
            <Link className="rounded-lg border px-3 py-2 text-sm" href="/management/reports">
              Back
            </Link>
            <SignOutButton />
          </div>
        </header>

        {/* At a glance */}
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
              <div className="mt-2 text-sm">
                {pill(`Completed: ${completed.length}`)}{" "}
                {pill(`Not Completed: ${notCompleted.length}`)}{" "}
                {pill(`N/A: ${na.length}`)}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Not completed (rule): {fmt(genNotCompletedCount)}
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-xs text-muted-foreground">Property checks</div>
              <div className="mt-2 text-sm">
                Lights issues: <span className="font-semibold">{lightsIssues.length || 0}</span><br />
                Plumbing issues: <span className="font-semibold">{plumbingIssues.length || 0}</span>
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

        {/* Follow-up tracking */}
        <section className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">Follow-up (management)</h2>

          <form action={`/management/reports//followup`} method="post" className="space-y-4">
  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">Status</div>
      <select name="status" defaultValue={followup?.status || "open"} className="w-full rounded border px-2 py-2 text-sm">
        <option value="open">open</option>
        <option value="in_progress">in progress</option>
        <option value="resolved">resolved</option>
      </select>
    </div>

    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">Assigned to</div>
      <select name="assigned_to" defaultValue={followup?.assigned_to || ""} className="w-full rounded border px-2 py-2 text-sm">
        <option value="">Unassigned</option>
        {(staff || []).map((p: any) => (
          <option key={p.id} value={p.id}>
            {p.full_name} ({p.role})
          </option>
        ))}
      </select>
    </div>

    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">Reading anomaly</div>
      <select name="reading_anomaly_type" defaultValue={followup?.reading_anomaly_type || "none"} className="w-full rounded border px-2 py-2 text-sm">
        <option value="none">none</option>
        <option value="typo_suspected">typo suspected</option>
        <option value="meter_rollover_reset">meter rollover/reset</option>
        <option value="other">other</option>
      </select>
    </div>

    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">Save</div>
      <button type="submit" className="w-full rounded border px-3 py-2 text-sm">Save</button>
    </div>

    <div className="md:col-span-2 space-y-1">
      <div className="text-xs text-muted-foreground">Corrected water reading (optional)</div>
      <input name="corrected_water_reading" defaultValue={followup?.corrected_water_reading ?? ""} className="w-full rounded border px-3 py-2 text-sm" placeholder="Leave blank unless correcting" />
    </div>

    <div className="md:col-span-2 space-y-1">
      <div className="text-xs text-muted-foreground">Corrected electric reading (optional)</div>
      <input name="corrected_electric_reading" defaultValue={followup?.corrected_electric_reading ?? ""} className="w-full rounded border px-3 py-2 text-sm" placeholder="Leave blank unless correcting" />
    </div>

    <div className="md:col-span-4 space-y-1">
      <div className="text-xs text-muted-foreground">Anomaly notes</div>
      <input name="reading_anomaly_notes" defaultValue={followup?.reading_anomaly_notes || ""} className="w-full rounded border px-3 py-2 text-sm" placeholder="Optional: explain why the delta is negative (reset, rollover, etc.)" />
    </div>

    <div className="md:col-span-4 space-y-1">
      <div className="text-xs text-muted-foreground">Internal notes</div>
      <textarea name="internal_notes" defaultValue={followup?.internal_notes || ""} className="w-full rounded border px-3 py-2 text-sm" rows={4} placeholder="Notes for management / maintenance follow-up" />
    </div>
  </div>
</form>
        </section>

        {/* What needs attention */}
        <section className="rounded-xl border bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold">What needs attention</h2>

          {report.issues_summary ? (
            <div className="rounded-lg border p-4">
              <div className="text-sm font-medium">Notes / issues</div>
              <p className="mt-2 text-sm whitespace-pre-wrap">{report.issues_summary}</p>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No issues noted.</div>
          )}

          {lightsIssues.length ? (
            <div className="rounded-lg border p-4">
              <div className="text-sm font-medium">Lights flagged</div>
              <ul className="mt-2 list-disc pl-5 text-sm">
                {lightsIssues.map((x) => <li key={x}>{x}</li>)}
              </ul>
              <div className="mt-2 text-sm text-muted-foreground">
                Notes/material: {report.lights_issues_notes ?? "—"}
              </div>
            </div>
          ) : null}

          {plumbingIssues.length ? (
            <div className="rounded-lg border p-4">
              <div className="text-sm font-medium">Faucets / Toilets / Drains flagged</div>
              <ul className="mt-2 list-disc pl-5 text-sm">
                {plumbingIssues.map((x) => <li key={x}>{x}</li>)}
              </ul>
            </div>
          ) : null}

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

        {/* Details */}
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <details>
            <summary className="cursor-pointer text-sm text-muted-foreground">
              Show full details (meters, tanks, gas, all generator items, lights, plumbing)
            </summary>

            <div className="mt-5 space-y-5 text-sm">
              <div className="rounded-lg border p-4">
                <div className="font-medium">Meters</div>
                <div className="mt-2">
                  Water: {fmt(report.water_meter_reading)} (time: {report.water_meter_time ?? "—"})<br />
                  Electric: {fmt(report.electric_meter_reading)} (time: {report.electric_meter_time ?? "—"})
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="font-medium">Lights</div>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {lightsChecks.map((c) => (
                    <div key={c.key} className="rounded border p-2">
                      {c.label}: <span className="font-semibold">{report[c.key] === false ? "Issue" : report[c.key] === true ? "OK" : "—"}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-muted-foreground">
                  Notes/material: {report.lights_issues_notes ?? "—"}
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="font-medium">Faucets / Toilets / Drains</div>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {plumbingChecks.map((c) => (
                    <div key={c.key} className="rounded border p-2">
                      {c.label}: <span className="font-semibold">{report[c.key] === false ? "Issue" : report[c.key] === true ? "OK" : "—"}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="font-medium">Generator (all)</div>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {gens.map((g: any, idx: number) => (
                    <div key={idx} className="rounded border p-2">
                      <div className="text-xs text-muted-foreground">{g.category}</div>
                      <div className="font-medium">{g.label}</div>
                      <div className="text-sm font-semibold">{g.status}</div>
                      {g.notes ? <div className="text-xs text-muted-foreground">{g.notes}</div> : null}
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
