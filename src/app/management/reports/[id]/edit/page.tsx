import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";

type ReportRecord = Record<string, unknown>;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const LIGHT_FIELDS = [
  { label: "Deluxe", key: "lights_deluxe_ok" },
  { label: "Superior", key: "lights_superior_ok" },
  { label: "Standard", key: "lights_standard_ok" },
  { label: "Garden lights", key: "lights_garden_ok" },
  { label: "Pool deck lights", key: "lights_pooldeck_ok" },
  { label: "Restaurant lights", key: "lights_restaurant_ok" },
  { label: "Restaurant deck lights", key: "lights_restaurant_deck_ok" },
] as const;

const PLUMBING_FIELDS = [
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
] as const;

function toInputValue(v: unknown) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function boolValue(v: unknown) {
  if (v === true) return "true";
  if (v === false) return "false";
  return "";
}

export default async function EditReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { id: reportId } = await params;
  if (!UUID_RE.test(reportId)) redirect("/management/reports");

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("role,is_active")
    .eq("id", userData.user.id)
    .single();

  if (!me?.is_active || !["manager", "admin"].includes(me.role)) {
    redirect("/new");
  }

  const { data: report } = await supabase
    .from("maintenance_reports")
    .select("*")
    .eq("id", reportId)
    .single();
  if (!report) redirect("/management/reports");

  const { data: genItems } = await supabase
    .from("generator_check_items")
    .select("category,item_key,status,notes")
    .eq("report_id", reportId)
    .order("category", { ascending: true })
    .order("item_key", { ascending: true });

  const { data: keyRows } = await supabase
    .from("generator_item_keys")
    .select("category,item_key,label")
    .eq("is_active", true);

  const labelMap = new Map<string, string>();
  (keyRows || []).forEach((k) => {
    labelMap.set(`${k.category}:${k.item_key}`, k.label);
  });

  const typedReport = report as ReportRecord;

  return (
    <main className="min-h-screen px-4 py-4 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Edit Report</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {toInputValue(typedReport.report_date)} • {toInputValue(typedReport.id)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link className="rounded-lg border px-3 py-2 text-sm" href={`/management/reports/${reportId}`}>
              Cancel
            </Link>
            <SignOutButton />
          </div>
        </header>

        <form action={`/management/reports/${reportId}/edit/save`} method="post" className="space-y-6">
          <section className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold">Basics</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Report date</label>
                <input name="report_date" type="date" defaultValue={toInputValue(typedReport.report_date)} className="w-full rounded border px-3 py-2 text-sm" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Issues summary</label>
                <input name="issues_summary" defaultValue={toInputValue(typedReport.issues_summary)} className="w-full rounded border px-3 py-2 text-sm" />
              </div>
            </div>
          </section>

          <section className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold">Meters</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Water meter reading</label>
                <input name="water_meter_reading" type="number" defaultValue={toInputValue(typedReport.water_meter_reading)} className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Time checked (water)</label>
                <input name="water_meter_time" type="time" defaultValue={toInputValue(typedReport.water_meter_time)} className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Electric meter reading</label>
                <input name="electric_meter_reading" type="number" defaultValue={toInputValue(typedReport.electric_meter_reading)} className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Time checked (electric)</label>
                <input name="electric_meter_time" type="time" defaultValue={toInputValue(typedReport.electric_meter_time)} className="w-full rounded border px-3 py-2 text-sm" />
              </div>
            </div>
          </section>

          <section className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold">Gas</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                ["kitchen_tank_1", "Kitchen tank 1"],
                ["kitchen_tank_2", "Kitchen tank 2"],
                ["laundry_tank_1", "Laundry tank 1"],
                ["laundry_tank_2", "Laundry tank 2"],
                ["spare_tank_1", "Spare tank 1"],
                ["spare_tank_2", "Spare tank 2"],
              ].map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <label className="text-sm font-medium">{label}</label>
                  <input
                    name={key}
                    type="number"
                    defaultValue={toInputValue(typedReport[key])}
                    className="w-full rounded border px-3 py-2 text-sm"
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold">Water Heaters / Softwater / Water Tanks / Pump</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Water heater temperature</label>
                <input name="water_heater_temp" type="number" defaultValue={toInputValue(typedReport.water_heater_temp)} className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Water heater/softwater time</label>
                <input name="water_heater_temp_time" type="time" defaultValue={toInputValue(typedReport.water_heater_temp_time)} className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Softwater tank 1</label>
                <select name="softwater_tank_1" defaultValue={toInputValue(typedReport.softwater_tank_1)} className="w-full rounded border px-3 py-2 text-sm">
                  <option value="">Select…</option>
                  <option value="soft">Soft</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Softwater tank 2</label>
                <select name="softwater_tank_2" defaultValue={toInputValue(typedReport.softwater_tank_2)} className="w-full rounded border px-3 py-2 text-sm">
                  <option value="">Select…</option>
                  <option value="soft">Soft</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tank levels</label>
                <select name="water_tanks_status" defaultValue={toInputValue(typedReport.water_tanks_status)} className="w-full rounded border px-3 py-2 text-sm">
                  <option value="">Select…</option>
                  <option value="all_full">All Full</option>
                  <option value="some_full">Some Full</option>
                  <option value="almost_empty">Almost all Empty</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Water tank time checked</label>
                <input name="water_level_check_time" type="time" defaultValue={toInputValue(typedReport.water_level_check_time)} className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Water tank notes</label>
                <input name="water_tanks_notes" defaultValue={toInputValue(typedReport.water_tanks_notes)} className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Pump PSI</label>
                <input name="pump_psi" type="number" defaultValue={toInputValue(typedReport.pump_psi)} className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Pump time checked</label>
                <input name="pump_psi_time" type="time" defaultValue={toInputValue(typedReport.pump_psi_time)} className="w-full rounded border px-3 py-2 text-sm" />
              </div>
            </div>
          </section>

          <section className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold">Lights</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {LIGHT_FIELDS.map((f) => (
                <div key={f.key} className="space-y-2">
                  <label className="text-sm font-medium">{f.label}</label>
                  <select
                    name={f.key}
                    defaultValue={boolValue(typedReport[f.key])}
                    className="w-full rounded border px-3 py-2 text-sm"
                  >
                    <option value="">Unset</option>
                    <option value="true">OK</option>
                    <option value="false">Issue</option>
                  </select>
                </div>
              ))}
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Lights issues/materials needed</label>
                <input name="lights_issues_notes" defaultValue={toInputValue(typedReport.lights_issues_notes)} className="w-full rounded border px-3 py-2 text-sm" />
              </div>
            </div>
          </section>

          <section className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold">Faucets / Toilets / Drains</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {PLUMBING_FIELDS.map((f) => (
                <div key={f.key} className="space-y-2">
                  <label className="text-sm font-medium">{f.label}</label>
                  <select
                    name={f.key}
                    defaultValue={boolValue(typedReport[f.key])}
                    className="w-full rounded border px-3 py-2 text-sm"
                  >
                    <option value="">Unset</option>
                    <option value="true">OK</option>
                    <option value="false">Issue</option>
                  </select>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold">Generator</h2>
            <div className="space-y-3">
              {(genItems || []).map((g) => {
                const id = `${g.category}__${g.item_key}`;
                const label = labelMap.get(`${g.category}:${g.item_key}`) || g.item_key;
                return (
                  <div key={id} className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">{g.category}</div>
                    <div className="font-medium">{label}</div>
                    <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Status</label>
                        <select
                          name={`gen_status__${g.category}__${g.item_key}`}
                          defaultValue={toInputValue(g.status)}
                          className="w-full rounded border px-3 py-2 text-sm"
                        >
                          <option value="">Unset</option>
                          <option value="Completed">Completed</option>
                          <option value="Not Completed">Not Completed</option>
                          <option value="N/A">N/A</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Notes</label>
                        <input
                          name={`gen_notes__${g.category}__${g.item_key}`}
                          defaultValue={toInputValue(g.notes)}
                          className="w-full rounded border px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button type="submit" className="rounded-lg bg-black px-4 py-2 text-white">
              Save changes
            </button>
            <Link className="rounded-lg border px-4 py-2" href={`/management/reports/${reportId}`}>
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
