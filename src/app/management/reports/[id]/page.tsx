import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";

function yesNo(v: any) {
  if (v === true) return "OK";
  if (v === false) return "Issue";
  return "—";
}

export default async function ReportDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createSupabaseServerClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth/login");

  const reportId = params.id;

  const { data: report, error: repErr } = await supabase
    .from("maintenance_reports")
    .select("*")
    .eq("id", reportId)
    .single();

  const { data: genItems, error: genErr } = await supabase
    .from("generator_check_items")
    .select("category,item_key,status,notes")
    .eq("report_id", reportId)
    .order("category", { ascending: true })
    .order("item_key", { ascending: true });

  if (repErr) {
    return (
      <main className="min-h-screen p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <header className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Report</h1>
            <SignOutButton />
          </header>
          <div className="rounded-xl border bg-white p-6 shadow-sm text-sm text-red-600">
            {repErr.message}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Report Detail</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {report.report_date} • Submitted {new Date(report.submitted_at).toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-muted-foreground font-mono">{report.id}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link className="rounded-lg border px-3 py-2 text-sm" href="/management/reports">
              Back
            </Link>
            <SignOutButton />
          </div>
        </header>

        <section className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">Meters</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
            <div className="rounded-lg border p-3">
              <div className="text-muted-foreground text-xs">Water meter</div>
              <div className="text-lg font-semibold">{report.water_meter_reading}</div>
              <div className="text-xs text-muted-foreground">Time: {report.water_meter_time ?? "—"}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-muted-foreground text-xs">Electric meter</div>
              <div className="text-lg font-semibold">{report.electric_meter_reading}</div>
              <div className="text-xs text-muted-foreground">Time: {report.electric_meter_time ?? "—"}</div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">Gas levels</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
            <div className="rounded-lg border p-3">Kitchen tank 1: <span className="font-semibold">{report.kitchen_tank_1 ?? "—"}</span></div>
            <div className="rounded-lg border p-3">Kitchen tank 2: <span className="font-semibold">{report.kitchen_tank_2 ?? "—"}</span></div>
            <div className="rounded-lg border p-3">Laundry tank 1: <span className="font-semibold">{report.laundry_tank_1 ?? "—"}</span></div>
            <div className="rounded-lg border p-3">Laundry tank 2: <span className="font-semibold">{report.laundry_tank_2 ?? "—"}</span></div>
            <div className="rounded-lg border p-3">Spare tank 1: <span className="font-semibold">{report.spare_tank_1 ?? "—"}</span></div>
            <div className="rounded-lg border p-3">Spare tank 2: <span className="font-semibold">{report.spare_tank_2 ?? "—"}</span></div>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">Water heaters & softwater</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
            <div className="rounded-lg border p-3">
              Water heater temp: <span className="font-semibold">{report.water_heater_temp ?? "—"}</span>
              <div className="text-xs text-muted-foreground">Time: {report.water_heater_temp_time}</div>
            </div>
            <div className="rounded-lg border p-3">
              Softwater tank 1: <span className="font-semibold">{report.softwater_tank_1 ?? "—"}</span><br />
              Softwater tank 2: <span className="font-semibold">{report.softwater_tank_2 ?? "—"}</span>
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">Water tanks</h2>
          <div className="text-sm space-y-2">
            <div>Status: <span className="font-semibold">{report.water_tanks_status ?? "—"}</span></div>
            <div>Time checked: <span className="font-semibold">{report.water_level_check_time ?? "—"}</span></div>
            <div>Notes: <span className="font-semibold">{report.water_tanks_notes ?? "—"}</span></div>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">Pump</h2>
          <div className="text-sm">
            PSI: <span className="font-semibold">{report.pump_psi ?? "—"}</span> • Time: <span className="font-semibold">{report.pump_psi_time ?? "—"}</span>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">Lights</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
            <div className="rounded-lg border p-3">Deluxe: <span className="font-semibold">{yesNo(report.lights_deluxe_ok)}</span></div>
            <div className="rounded-lg border p-3">Superior: <span className="font-semibold">{yesNo(report.lights_superior_ok)}</span></div>
            <div className="rounded-lg border p-3">Standard: <span className="font-semibold">{yesNo(report.lights_standard_ok)}</span></div>
            <div className="rounded-lg border p-3">Garden: <span className="font-semibold">{yesNo(report.lights_garden_ok)}</span></div>
            <div className="rounded-lg border p-3">Pool Deck: <span className="font-semibold">{yesNo(report.lights_pooldeck_ok)}</span></div>
            <div className="rounded-lg border p-3">Restaurant: <span className="font-semibold">{yesNo(report.lights_restaurant_ok)}</span></div>
            <div className="rounded-lg border p-3">Restaurant Deck: <span className="font-semibold">{yesNo(report.lights_restaurant_deck_ok)}</span></div>
          </div>
          <div className="text-sm">
            Issues/material needed: <span className="font-semibold">{report.lights_issues_notes ?? "—"}</span>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">Plumbing checks</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
            <div className="rounded-lg border p-3">Restaurant Male: <span className="font-semibold">{yesNo(report.plumbing_restaurant_male_ok)}</span></div>
            <div className="rounded-lg border p-3">Restaurant Female: <span className="font-semibold">{yesNo(report.plumbing_restaurant_female_ok)}</span></div>
            <div className="rounded-lg border p-3">Scuba shower: <span className="font-semibold">{yesNo(report.plumbing_scuba_shower_ok)}</span></div>
            <div className="rounded-lg border p-3">Gym Footwash: <span className="font-semibold">{yesNo(report.plumbing_gym_footwash_ok)}</span></div>
            <div className="rounded-lg border p-3">Pool Shower: <span className="font-semibold">{yesNo(report.plumbing_pool_shower_ok)}</span></div>
            <div className="rounded-lg border p-3">Family Room: <span className="font-semibold">{yesNo(report.plumbing_family_room_bathroom_ok)}</span></div>
            <div className="rounded-lg border p-3">Laundry Female: <span className="font-semibold">{yesNo(report.plumbing_laundry_female_bathroom_ok)}</span></div>
            <div className="rounded-lg border p-3">Laundry Male: <span className="font-semibold">{yesNo(report.plumbing_laundry_male_bathroom_ok)}</span></div>
            <div className="rounded-lg border p-3">Lobby Male: <span className="font-semibold">{yesNo(report.plumbing_lobby_male_bathroom_ok)}</span></div>
            <div className="rounded-lg border p-3">Lobby Female: <span className="font-semibold">{yesNo(report.plumbing_lobby_female_bathroom_ok)}</span></div>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">Generator checklist</h2>
          {genErr ? (
            <p className="text-sm text-red-600">{genErr.message}</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
              {(genItems || []).map((g, idx) => (
                <div key={idx} className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">{g.category} • {g.item_key}</div>
                  <div className="font-semibold">{g.status}</div>
                  {g.notes ? <div className="text-xs text-muted-foreground mt-1">{g.notes}</div> : null}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold">Issues / actions taken</h2>
          <p className="text-sm">{report.issues_summary ?? "—"}</p>
        </section>
      </div>
    </main>
  );
}
