import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

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

function csvEscape(v: any) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function POST(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = supabaseFromRequest(req, res);

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,is_active")
    .eq("id", userData.user.id)
    .single();

  if (!profile?.is_active || !["manager", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Pull latest 365 reports (MVP)
  const { data: reports, error: repErr } = await supabase
    .from("maintenance_reports")
    .select("*")
    .order("report_date", { ascending: false })
    .limit(365);

  if (repErr) return NextResponse.json({ error: repErr.message }, { status: 500 });

  const reportIds = (reports || []).map((r: any) => r.id);

  const { data: genItems, error: genErr } = await supabase
    .from("generator_check_items")
    .select("report_id,category,item_key,status,notes")
    .in("report_id", reportIds);

  if (genErr) return NextResponse.json({ error: genErr.message }, { status: 500 });

  const genByReport = new Map<string, any[]>();
  (genItems || []).forEach((g: any) => {
    const arr = genByReport.get(g.report_id) || [];
    arr.push(g);
    genByReport.set(g.report_id, arr);
  });

  const headers = [
    "report_id",
    "report_date",
    "submitted_by",
    "submitted_at",
    "water_meter_reading",
    "water_meter_time",
    "electric_meter_reading",
    "electric_meter_time",
    "kitchen_tank_1",
    "kitchen_tank_2",
    "laundry_tank_1",
    "laundry_tank_2",
    "spare_tank_1",
    "spare_tank_2",
    "water_heater_temp",
    "water_heater_temp_time",
    "softwater_tank_1",
    "softwater_tank_2",
    "water_tanks_status",
    "water_level_check_time",
    "water_tanks_notes",
    "pump_psi",
    "pump_psi_time",
    "lights_issues_notes",
    "issues_summary",
    "generator_items_json",
  ];

  const lines = [];
  lines.push(headers.join(","));

  for (const r of reports || []) {
    const gens = genByReport.get(r.id) || [];
    const generator_items_json = JSON.stringify(gens);

    const row = [
      r.id,
      r.report_date,
      r.submitted_by,
      r.submitted_at,
      r.water_meter_reading,
      r.water_meter_time,
      r.electric_meter_reading,
      r.electric_meter_time,
      r.kitchen_tank_1,
      r.kitchen_tank_2,
      r.laundry_tank_1,
      r.laundry_tank_2,
      r.spare_tank_1,
      r.spare_tank_2,
      r.water_heater_temp,
      r.water_heater_temp_time,
      r.softwater_tank_1,
      r.softwater_tank_2,
      r.water_tanks_status,
      r.water_level_check_time,
      r.water_tanks_notes,
      r.pump_psi,
      r.pump_psi_time,
      r.lights_issues_notes,
      r.issues_summary,
      generator_items_json,
    ].map(csvEscape);

    lines.push(row.join(","));
  }

  const csv = lines.join("\n");
  const filename = `maintenance_reports_${new Date().toISOString().slice(0,10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
