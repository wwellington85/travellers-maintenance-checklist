import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";
import { MAINTENANCE_EDIT_WINDOW_MINUTES } from "@/lib/config";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toInput(v: unknown) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function boolValue(v: unknown) {
  if (v === true) return "true";
  if (v === false) return "false";
  return "";
}

export default async function MaintenanceEditReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const supabase = await createSupabaseServerClient();
  const { id } = await params;
  const sp = (searchParams ? await searchParams : {}) as Record<string, string | undefined>;

  if (!UUID_RE.test(id)) redirect("/history");

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth/login");

  const { data: report } = await supabase
    .from("maintenance_reports")
    .select("*")
    .eq("id", id)
    .eq("submitted_by", userData.user.id)
    .single();

  if (!report) redirect("/history");

  const submittedAtMs = new Date(report.submitted_at).getTime();
  if (Number.isNaN(submittedAtMs) || Date.now() - submittedAtMs > MAINTENANCE_EDIT_WINDOW_MINUTES * 60 * 1000) {
    redirect("/history?err=edit_window_expired");
  }

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Edit Submitted Report</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              You can edit for up to {MAINTENANCE_EDIT_WINDOW_MINUTES} minutes after submitting.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link className="rounded-lg border px-3 py-2 text-sm" href="/history">
              Back
            </Link>
            <SignOutButton />
          </div>
        </header>

        {sp?.save === "ok" ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            Changes saved.
          </div>
        ) : null}
        {sp?.err ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {sp.err}
          </div>
        ) : null}

        <form action={`/history/${id}/edit/save`} method="post" className="space-y-6">
          <section className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold">Core readings</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Date of check</label>
                <input name="report_date" type="date" defaultValue={toInput(report.report_date)} className="w-full rounded border px-3 py-2 text-sm" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Water meter reading</label>
                <input name="water_meter_reading" type="number" defaultValue={toInput(report.water_meter_reading)} className="w-full rounded border px-3 py-2 text-sm" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Time checked (water)</label>
                <input name="water_meter_time" type="time" defaultValue={toInput(report.water_meter_time)} className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Electric meter reading</label>
                <input name="electric_meter_reading" type="number" defaultValue={toInput(report.electric_meter_reading)} className="w-full rounded border px-3 py-2 text-sm" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Time checked (electric)</label>
                <input name="electric_meter_time" type="time" defaultValue={toInput(report.electric_meter_time)} className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Water heater status</label>
                <select name="water_heater_status" defaultValue={report.water_heater_temp === 2 ? "hot" : report.water_heater_temp === 1 ? "warm" : report.water_heater_temp === 0 ? "cold" : ""} className="w-full rounded border px-3 py-2 text-sm">
                  <option value="">Select…</option>
                  <option value="hot">Hot</option>
                  <option value="warm">Warm</option>
                  <option value="cold">Cold</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Time recorded (water heater/softwater)</label>
                <input name="water_heater_temp_time" type="time" defaultValue={toInput(report.water_heater_temp_time)} className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tank levels</label>
                <select name="water_tanks_status" defaultValue={toInput(report.water_tanks_status)} className="w-full rounded border px-3 py-2 text-sm">
                  <option value="">Select…</option>
                  <option value="all_full">All Full</option>
                  <option value="some_full">Some Full</option>
                  <option value="almost_empty">Almost all Empty</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Time checked (water tanks)</label>
                <input name="water_level_check_time" type="time" defaultValue={toInput(report.water_level_check_time)} className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Water tank notes</label>
                <input name="water_tanks_notes" defaultValue={toInput(report.water_tanks_notes)} className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Pump PSI</label>
                <input name="pump_psi" type="number" defaultValue={toInput(report.pump_psi)} className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Time checked (pump)</label>
                <input name="pump_psi_time" type="time" defaultValue={toInput(report.pump_psi_time)} className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Issues & actions taken</label>
                <textarea name="issues_summary" defaultValue={toInput(report.issues_summary)} rows={4} className="w-full rounded border px-3 py-2 text-sm" />
              </div>
            </div>
          </section>

          <section className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold">Lights / Faucets status</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                ["lights_deluxe_ok", "Lights Deluxe"],
                ["lights_superior_ok", "Lights Superior"],
                ["lights_standard_ok", "Lights Standard"],
                ["lights_garden_ok", "Lights Garden"],
                ["lights_pooldeck_ok", "Lights Pool Deck"],
                ["lights_restaurant_ok", "Lights Restaurant"],
                ["lights_restaurant_deck_ok", "Lights Restaurant Deck"],
                ["plumbing_restaurant_male_ok", "Plumbing Restaurant Male"],
                ["plumbing_restaurant_female_ok", "Plumbing Restaurant Female"],
                ["plumbing_scuba_shower_ok", "Plumbing Scuba Shower"],
                ["plumbing_gym_footwash_ok", "Plumbing Gym Footwash"],
                ["plumbing_pool_shower_ok", "Plumbing Pool Shower"],
                ["plumbing_family_room_bathroom_ok", "Plumbing Family Room Bathroom"],
                ["plumbing_laundry_female_bathroom_ok", "Plumbing Laundry Female Bathroom"],
                ["plumbing_laundry_male_bathroom_ok", "Plumbing Laundry Male Bathroom"],
                ["plumbing_lobby_male_bathroom_ok", "Plumbing Lobby Male Bathroom"],
                ["plumbing_lobby_female_bathroom_ok", "Plumbing Lobby Female Bathroom"],
              ].map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <label className="text-sm font-medium">{label}</label>
                  <select name={key} defaultValue={boolValue((report as any)[key])} className="w-full rounded border px-3 py-2 text-sm">
                    <option value="">Unset</option>
                    <option value="true">OK</option>
                    <option value="false">Issue</option>
                  </select>
                </div>
              ))}
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Lights issues/materials needed</label>
                <input name="lights_issues_notes" defaultValue={toInput(report.lights_issues_notes)} className="w-full rounded border px-3 py-2 text-sm" />
              </div>
            </div>
          </section>

          <div className="flex items-center gap-3">
            <button type="submit" className="rounded-lg bg-black px-4 py-2 text-white">
              Save changes
            </button>
            <Link className="rounded-lg border px-4 py-2" href="/history">
              Back to history
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
