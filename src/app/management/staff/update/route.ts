import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function supabaseFromRequest(req: NextRequest, res: NextResponse) {
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
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
  });
}

export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/management/staff", req.url), { status: 303 });
  const supabase = supabaseFromRequest(req, res);

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.redirect(new URL("/auth/login", req.url), { status: 303 });

  const { data: me } = await supabase
    .from("profiles")
    .select("role,is_active")
    .eq("id", userData.user.id)
    .single();

  if (!me?.is_active || !["manager", "admin"].includes(me.role)) {
    return NextResponse.redirect(new URL("/maintenance/new", req.url), { status: 303 });
  }

  const form = await req.formData();
  const id = String(form.get("id") || "");
  const role = String(form.get("role") || "");
  const is_active = String(form.get("is_active") || "");
  const full_name = String(form.get("full_name") || "").trim();

  if (!id || !["maintenance", "manager", "admin"].includes(role) || !["true", "false"].includes(is_active)) {
    return res;
  }
  if (me.role !== "admin" && role === "admin") return res;

  await supabase
    .from("profiles")
    .update({
      role,
      is_active: is_active === "true",
      ...(full_name ? { full_name } : {}),
    })
    .eq("id", id);

  return res;
}
