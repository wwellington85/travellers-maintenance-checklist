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

async function findUserByEmail(service: any, email: string) {
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage });
    if (error) return null;
    const users = data?.users || [];
    const found = users.find((u: any) => (u.email || "").toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (users.length < perPage) return null;
    page += 1;
  }
}

export async function POST(req: NextRequest) {
  const redirectUrl = new URL("/management/staff", req.url);
  const res = NextResponse.redirect(redirectUrl, { status: 303 });
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
  const emailRaw = String(form.get("email") || "").trim().toLowerCase();

  if (!fullName || !["maintenance", "manager", "admin"].includes(role)) {
    redirectUrl.searchParams.set("err", "invalid_input");
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }
  if (me.role !== "admin" && role === "admin") {
    redirectUrl.searchParams.set("err", "forbidden_role");
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }

  const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const targetEmail = emailRaw || makePlaceholderEmail(fullName);
  let userId: string | null = null;

  const existing = await findUserByEmail(service, targetEmail);
  if (existing?.id) {
    userId = existing.id;
  } else if (emailRaw) {
    const { data, error } = await service.auth.admin.inviteUserByEmail(targetEmail, {
      data: { full_name: fullName },
      redirectTo: `${req.nextUrl.origin}/auth/login`,
    });
    if (error || !data.user?.id) {
      redirectUrl.searchParams.set("err", "invite_failed");
      return NextResponse.redirect(redirectUrl, { status: 303 });
    }
    userId = data.user.id;
  } else {
    const { data, error } = await service.auth.admin.createUser({
      email: targetEmail,
      password: tempPassword(),
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error || !data.user?.id) {
      redirectUrl.searchParams.set("err", "create_failed");
      return NextResponse.redirect(redirectUrl, { status: 303 });
    }
    userId = data.user.id;
  }

  const { error: upsertErr } = await supabase.from("profiles").upsert({
    id: userId,
    full_name: fullName,
    role,
    is_active: true,
  });

  if (upsertErr) {
    redirectUrl.searchParams.set("err", "profile_upsert_failed");
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }

  redirectUrl.searchParams.set("ok", emailRaw ? "staff_invited" : "staff_created");
  return NextResponse.redirect(redirectUrl, { status: 303 });
}
