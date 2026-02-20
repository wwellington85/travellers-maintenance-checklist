import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { withBasePath } from "@/lib/app-path";

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
  const params = await ctx.params;
  const reportId = params?.id;
  if (!reportId) {
    return NextResponse.redirect(new URL(withBasePath("/management/reports?save=missing_id"), req.url), { status: 303 });
  }

  const successRedirect = new URL(withBasePath(`/management/reports/${reportId}?save=ok`), req.url);
  const res = NextResponse.redirect(successRedirect, { status: 303 });
  const supabase = supabaseFromRequest(req, res);

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.redirect(new URL(withBasePath("/auth/login"), req.url), { status: 303 });
  }

  const { data: me } = await supabase
    .from("profiles")
    .select("role,is_active")
    .eq("id", userData.user.id)
    .single();

  if (!me?.is_active || !["manager", "admin"].includes(me.role)) {
    return NextResponse.redirect(new URL(withBasePath(`/management/reports/${reportId}?save=forbidden`), req.url), { status: 303 });
  }

  const form = await req.formData();

  const reportUpdate = {
    report_date: String(form.get("report_date") || "").trim(),
    water_meter_reading: parseOptionalNumber(form.get("water_meter_reading")),
    water_meter_time: parseOptionalText(form.get("water_meter_time")),
    electric_meter_reading: parseOptionalNumber(form.get("electric_meter_reading")),
    electric_meter_time: parseOptionalText(form.get("electric_meter_time")),
    kitchen_tank_1: parseOptionalNumber(form.get("kitchen_tank_1")),
    kitchen_tank_2: parseOptionalNumber(form.get("kitchen_tank_2")),
    laundry_tank_1: parseOptionalNumber(form.get("laundry_tank_1")),
    laundry_tank_2: parseOptionalNumber(form.get("laundry_tank_2")),
    spare_tank_1: parseOptionalNumber(form.get("spare_tank_1")),
    spare_tank_2: parseOptionalNumber(form.get("spare_tank_2")),
    water_heater_temp: parseOptionalNumber(form.get("water_heater_temp")),
    water_heater_temp_time: parseOptionalText(form.get("water_heater_temp_time")),
    softwater_tank_1: parseOptionalText(form.get("softwater_tank_1")),
    softwater_tank_2: parseOptionalText(form.get("softwater_tank_2")),
    water_tanks_status: parseOptionalText(form.get("water_tanks_status")),
    water_level_check_time: parseOptionalText(form.get("water_level_check_time")),
    water_tanks_notes: parseOptionalText(form.get("water_tanks_notes")),
    pump_psi: parseOptionalNumber(form.get("pump_psi")),
    pump_psi_time: parseOptionalText(form.get("pump_psi_time")),
    lights_deluxe_ok: parseOptionalBool(form.get("lights_deluxe_ok")),
    lights_superior_ok: parseOptionalBool(form.get("lights_superior_ok")),
    lights_standard_ok: parseOptionalBool(form.get("lights_standard_ok")),
    lights_garden_ok: parseOptionalBool(form.get("lights_garden_ok")),
    lights_pooldeck_ok: parseOptionalBool(form.get("lights_pooldeck_ok")),
    lights_restaurant_ok: parseOptionalBool(form.get("lights_restaurant_ok")),
    lights_restaurant_deck_ok: parseOptionalBool(form.get("lights_restaurant_deck_ok")),
    lights_issues_notes: parseOptionalText(form.get("lights_issues_notes")),
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
    issues_summary: parseOptionalText(form.get("issues_summary")),
  };

  const { error: reportErr } = await supabase
    .from("maintenance_reports")
    .update(reportUpdate)
    .eq("id", reportId);

  if (reportErr) {
    return NextResponse.redirect(
      new URL(withBasePath(`/management/reports/${reportId}?save=error&msg=${encodeURIComponent(reportErr.message)}`), req.url),
      { status: 303 }
    );
  }

  const generatorUpdates = new Map<string, { category: string; item_key: string; status: string | null; notes: string | null }>();
  for (const [rawKey, rawVal] of form.entries()) {
    const key = String(rawKey);
    const val = String(rawVal || "").trim();
    if (key.startsWith("gen_status__")) {
      const [, category, itemKey] = key.split("__");
      if (!category || !itemKey) continue;
      const rowKey = `${category}::${itemKey}`;
      const current = generatorUpdates.get(rowKey) || { category, item_key: itemKey, status: null, notes: null };
      current.status = val || null;
      generatorUpdates.set(rowKey, current);
      continue;
    }
    if (key.startsWith("gen_notes__")) {
      const [, category, itemKey] = key.split("__");
      if (!category || !itemKey) continue;
      const rowKey = `${category}::${itemKey}`;
      const current = generatorUpdates.get(rowKey) || { category, item_key: itemKey, status: null, notes: null };
      current.notes = val || null;
      generatorUpdates.set(rowKey, current);
    }
  }

  const rows = [...generatorUpdates.values()]
    .filter((r) => r.status)
    .map((r) => ({
      report_id: reportId,
      category: r.category,
      item_key: r.item_key,
      status: r.status,
      notes: r.notes,
    }));

  if (rows.length) {
    const { error: genErr } = await supabase.from("generator_check_items").upsert(rows, {
      onConflict: "report_id,category,item_key",
    });
    if (genErr) {
      return NextResponse.redirect(
        new URL(withBasePath(`/management/reports/${reportId}?save=error&msg=${encodeURIComponent(genErr.message)}`), req.url),
        { status: 303 }
      );
    }
  }

  return res;
}
