import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

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

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: false }, { status: 500 });
  const supabase = supabaseFromRequest(req, res);

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ ok: false, error: "You are not signed in. Please log in again." }, { status: 401 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: false, error: "Missing service role key on server." }, { status: 500 });
  }

  const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const body = await req.json();
    const reportPayload = body?.reportPayload || {};
    const items = Array.isArray(body?.items) ? body.items : [];

    const payload = {
      ...reportPayload,
      submitted_by: userData.user.id,
    };

    const { data: inserted, error: insertErr } = await service
      .from("maintenance_reports")
      .insert(payload)
      .select("id, submitted_at")
      .single();

    if (insertErr) {
      return NextResponse.json({ ok: false, error: insertErr.message }, { status: 400 });
    }

    const reportId = inserted.id as string;
    const rows = items.map((i: any) => ({
      report_id: reportId,
      category: i.category,
      item_key: i.item_key,
      status: i.status,
      notes: i.notes ?? null,
    }));

    if (rows.length) {
      const { error: genErr } = await service.from("generator_check_items").insert(rows);
      if (genErr) {
        return NextResponse.json({ ok: false, error: genErr.message }, { status: 400 });
      }
    }

    return NextResponse.json({
      ok: true,
      reportId,
      submittedAt: inserted.submitted_at,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid submit payload." }, { status: 400 });
  }
}
