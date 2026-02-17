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

function parseOptionalNumber(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  if (Number.isNaN(n)) return null;
  return n;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: reportId } = await ctx.params;

  const res = NextResponse.redirect(new URL(`/management/reports/${reportId}`, req.url), {
    status: 303,
  });

  const supabase = supabaseFromRequest(req, res);

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.redirect(new URL("/auth/login", req.url), { status: 303 });
  }

  const { data: me } = await supabase
    .from("profiles")
    .select("role,is_active")
    .eq("id", userData.user.id)
    .single();

  if (!me?.is_active || !["manager", "admin"].includes(me.role)) {
    return NextResponse.redirect(new URL("/maintenance/new", req.url), { status: 303 });
  }

  const form = await req.formData();

  const status = String(form.get("status") || "open");
  const assigned_to_raw = String(form.get("assigned_to") || "").trim();
  const internal_notes = String(form.get("internal_notes") || "").trim();

  const reading_anomaly_type = String(form.get("reading_anomaly_type") || "none");
  const reading_anomaly_notes = String(form.get("reading_anomaly_notes") || "").trim();

  const corrected_water_reading = parseOptionalNumber(form.get("corrected_water_reading"));
  const corrected_electric_reading = parseOptionalNumber(form.get("corrected_electric_reading"));

  const assigned_to = assigned_to_raw.length ? assigned_to_raw : null;

  await supabase.from("maintenance_followups").upsert({
    report_id: reportId,
    status,
    assigned_to,
    internal_notes: internal_notes.length ? internal_notes : null,
    reading_anomaly_type,
    reading_anomaly_notes: reading_anomaly_notes.length ? reading_anomaly_notes : null,
    corrected_water_reading,
    corrected_electric_reading,
    updated_by: userData.user.id,
    updated_at: new Date().toISOString(),
  });

  return res;
}
