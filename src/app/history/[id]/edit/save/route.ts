import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { withBasePath } from "@/lib/app-path";

const EDIT_WINDOW_MINUTES = 120;

function supabaseFromRequest(req: NextRequest, res: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );
}

function parseOptionalNumber(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  if (Number.isNaN(n)) return null;
  return n;
}

function parseOptionalText(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

function parseOptionalBool(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "true") return true;
  if (s === "false") return false;
  return null;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const editUrl = withBasePath(`/history/${id}/edit`);
  const historyUrl = withBasePath("/history");

  const res = NextResponse.redirect(new URL(`${editUrl}?save=ok`, req.url), { status: 303 });
  const supabase = supabaseFromRequest(req, res);

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.redirect(new URL(withBasePath("/auth/login"), req.url), { status: 303 });
  }

  const { data: report } = await supabase
    .from("maintenance_reports")
    .select("id,submitted_by,submitted_at")
    .eq("id", id)
    .eq("submitted_by", userData.user.id)
    .single();

  if (!report) {
    return NextResponse.redirect(new URL(historyUrl, req.url), { status: 303 });
  }

  const submittedMs = new Date(report.submitted_at).getTime();
  if (Number.isNaN(submittedMs) || Date.now() - submittedMs > EDIT_WINDOW_MINUTES * 60 * 1000) {
    return NextResponse.redirect(new URL(`${historyUrl}?err=edit_window_expired`, req.url), { status: 303 });
  }

  const form = await req.formData();

  const payload = {
    report_date: String(form.get("report_date") || "").trim(),
    water_meter_reading: parseOptionalNumber(form.get("water_meter_reading")),
    water_meter_time: parseOptionalText(form.get("water_meter_time")),
    electric_meter_reading: parseOptionalNumber(form.get("electric_meter_reading")),
    electric_meter_time: parseOptionalText(form.get("electric_meter_time")),
    water_heater_temp: parseOptionalNumber(form.get("water_heater_temp")),
    water_heater_temp_time: parseOptionalText(form.get("water_heater_temp_time")),
    water_tanks_status: parseOptionalText(form.get("water_tanks_status")),
    water_level_check_time: parseOptionalText(form.get("water_level_check_time")),
    water_tanks_notes: parseOptionalText(form.get("water_tanks_notes")),
    pump_psi: parseOptionalNumber(form.get("pump_psi")),
    pump_psi_time: parseOptionalText(form.get("pump_psi_time")),
    issues_summary: parseOptionalText(form.get("issues_summary")),
    lights_issues_notes: parseOptionalText(form.get("lights_issues_notes")),
    lights_deluxe_ok: parseOptionalBool(form.get("lights_deluxe_ok")),
    lights_superior_ok: parseOptionalBool(form.get("lights_superior_ok")),
    lights_standard_ok: parseOptionalBool(form.get("lights_standard_ok")),
    lights_garden_ok: parseOptionalBool(form.get("lights_garden_ok")),
    lights_pooldeck_ok: parseOptionalBool(form.get("lights_pooldeck_ok")),
    lights_restaurant_ok: parseOptionalBool(form.get("lights_restaurant_ok")),
    lights_restaurant_deck_ok: parseOptionalBool(form.get("lights_restaurant_deck_ok")),
    plumbing_restaurant_male_ok: parseOptionalBool(form.get("plumbing_restaurant_male_ok")),
    plumbing_restaurant_female_ok: parseOptionalBool(form.get("plumbing_restaurant_female_ok")),
    plumbing_scuba_shower_ok: parseOptionalBool(form.get("plumbing_scuba_shower_ok")),
    plumbing_gym_footwash_ok: parseOptionalBool(form.get("plumbing_gym_footwash_ok")),
    plumbing_pool_shower_ok: parseOptionalBool(form.get("plumbing_pool_shower_ok")),
    plumbing_family_room_bathroom_ok: parseOptionalBool(form.get("plumbing_family_room_bathroom_ok")),
    plumbing_laundry_female_bathroom_ok: parseOptionalBool(form.get("plumbing_laundry_female_bathroom_ok")),
    plumbing_laundry_male_bathroom_ok: parseOptionalBool(form.get("plumbing_laundry_male_bathroom_ok")),
    plumbing_lobby_male_bathroom_ok: parseOptionalBool(form.get("plumbing_lobby_male_bathroom_ok")),
    plumbing_lobby_female_bathroom_ok: parseOptionalBool(form.get("plumbing_lobby_female_bathroom_ok")),
  };

  const { error } = await supabase
    .from("maintenance_reports")
    .update(payload)
    .eq("id", id)
    .eq("submitted_by", userData.user.id);

  if (error) {
    return NextResponse.redirect(new URL(`${editUrl}?err=${encodeURIComponent(error.message)}`, req.url), { status: 303 });
  }

  return NextResponse.redirect(new URL(`${historyUrl}?save=edited`, req.url), { status: 303 });
}
