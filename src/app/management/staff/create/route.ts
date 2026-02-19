import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getAppUrl } from "@/lib/site-url";
import { withBasePath } from "@/lib/app-path";

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

function toSlug(v: string) {
  return (
    v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "") || "staff"
  );
}

function makeUsernameEmail(username: string) {
  return `${toSlug(username)}@travellers.local`;
}

function makePlaceholderEmail(fullName: string) {
  return `${toSlug(fullName)}.${Date.now()}@travellers.local`;
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
  const redirectUrl = new URL(withBasePath("/management/staff"), req.url);
  const res = NextResponse.redirect(redirectUrl, { status: 303 });
  const supabase = supabaseFromRequest(req, res);

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.redirect(new URL(withBasePath("/auth/login"), req.url), { status: 303 });

  const { data: me } = await supabase
    .from("profiles")
    .select("role,is_active")
    .eq("id", userData.user.id)
    .single();

  if (!me?.is_active || !["manager", "admin"].includes(me.role)) {
    return NextResponse.redirect(new URL(withBasePath("/maintenance/new"), req.url), { status: 303 });
  }

  const form = await req.formData();
  const fullName = String(form.get("full_name") || "").trim();
  const role = String(form.get("role") || "maintenance");
  const emailRaw = String(form.get("email") || "").trim().toLowerCase();
  const usernameRaw = String(form.get("username") || "").trim();
  const passwordRaw = String(form.get("password") || "");

  if (!fullName || !["maintenance", "manager", "admin"].includes(role)) {
    redirectUrl.searchParams.set("err", "invalid_input");
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }
  if (passwordRaw && passwordRaw.length < 8) {
    redirectUrl.searchParams.set("err", "weak_password");
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }
  if (me.role !== "admin" && role === "admin") {
    redirectUrl.searchParams.set("err", "forbidden_role");
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }

  const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const loginUrl = getAppUrl("/auth/login", req.nextUrl.origin);

  const wantsEmailInvite = !!emailRaw && (role === "manager" || role === "admin") && !passwordRaw;
  const targetEmail = wantsEmailInvite
    ? emailRaw
    : emailRaw
      ? emailRaw
      : usernameRaw
        ? makeUsernameEmail(usernameRaw)
        : makePlaceholderEmail(fullName);
  let userId: string | null = null;

  if (!wantsEmailInvite && role === "maintenance" && (!usernameRaw || !passwordRaw || passwordRaw.length < 8)) {
    redirectUrl.searchParams.set("err", "maintenance_creds_required");
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }

  const existing = await findUserByEmail(service, targetEmail);
  if (existing?.id) {
    if (!wantsEmailInvite && passwordRaw) {
      const { error: pwErr } = await service.auth.admin.updateUserById(existing.id, {
        password: passwordRaw,
        user_metadata: { full_name: fullName },
      });
      if (pwErr) {
        redirectUrl.searchParams.set("err", "create_failed");
        return NextResponse.redirect(redirectUrl, { status: 303 });
      }
    }
    userId = existing.id;
  } else if (wantsEmailInvite) {
    const { data, error } = await service.auth.admin.inviteUserByEmail(targetEmail, {
      data: { full_name: fullName },
      redirectTo: loginUrl,
    });
    if (error || !data.user?.id) {
      redirectUrl.searchParams.set("err", "invite_failed");
      return NextResponse.redirect(redirectUrl, { status: 303 });
    }
    userId = data.user.id;
  } else {
    const { data, error } = await service.auth.admin.createUser({
      email: targetEmail,
      password: passwordRaw || tempPassword(),
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error || !data.user?.id) {
      redirectUrl.searchParams.set("err", "create_failed");
      return NextResponse.redirect(redirectUrl, { status: 303 });
    }
    userId = data.user.id;
  }

  const { error: upsertErr } = await service.from("profiles").upsert({
    id: userId,
    full_name: fullName,
    role,
    is_active: true,
  });

  if (upsertErr) {
    redirectUrl.searchParams.set("err", "profile_upsert_failed");
    redirectUrl.searchParams.set("msg", upsertErr.message);
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }

  redirectUrl.searchParams.set("ok", emailRaw ? "staff_invited" : "staff_created");
  return NextResponse.redirect(redirectUrl, { status: 303 });
}
