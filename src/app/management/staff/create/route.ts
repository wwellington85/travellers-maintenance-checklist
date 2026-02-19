import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

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

function makePlaceholderEmail(fullName: string) {
  const slug = fullName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "") || "staff";
  return `${slug}.${Date.now()}@travellers.local`;
}

function tempPassword() {
  return `Temp-${Math.random().toString(36).slice(2)}!A1`;
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
  const fullName = String(form.get("full_name") || "").trim();
  const role = String(form.get("role") || "maintenance");
  const emailRaw = String(form.get("email") || "").trim();

  if (!fullName || !["maintenance", "manager", "admin"].includes(role)) return res;
  if (me.role !== "admin" && role === "admin") return res;

  const email = emailRaw || makePlaceholderEmail(fullName);

  const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existingUsers } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = (existingUsers?.users || []).find((u) => (u.email || "").toLowerCase() === email.toLowerCase());

  let userId = existing?.id;
  if (!userId) {
    const { data, error } = await service.auth.admin.createUser({
      email,
      password: tempPassword(),
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error || !data.user?.id) return res;
    userId = data.user.id;
  }

  await supabase.from("profiles").upsert({
    id: userId,
    full_name: fullName,
    role,
    is_active: true,
  });

  return res;
}
