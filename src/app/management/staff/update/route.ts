import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getCanonicalSiteUrl } from "@/lib/site-url";

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

async function sendReset(service: any, email: string, siteUrl: string) {
  const { error } = await service.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/login`,
  });
  return !error;
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
  const id = String(form.get("id") || "");
  const role = String(form.get("role") || "");
  const is_active = String(form.get("is_active") || "");
  const full_name = String(form.get("full_name") || "").trim();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const username = String(form.get("username") || "").trim();
  const password = String(form.get("password") || "");
  const sendInvite = String(form.get("send_invite") || "") === "true";

  if (!id || !["maintenance", "manager", "admin"].includes(role) || !["true", "false"].includes(is_active)) {
    redirectUrl.searchParams.set("err", "invalid_input");
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }
  if (password && password.length < 8) {
    redirectUrl.searchParams.set("err", "weak_password");
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }
  if (me.role !== "admin" && role === "admin") {
    redirectUrl.searchParams.set("err", "forbidden_role");
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }

  const { error: upErr } = await supabase
    .from("profiles")
    .update({ role, is_active: is_active === "true", ...(full_name ? { full_name } : {}) })
    .eq("id", id);

  if (upErr) {
    redirectUrl.searchParams.set("err", "profile_update_failed");
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }

  const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const siteUrl = getCanonicalSiteUrl(req.nextUrl.origin);

  let effectiveEmail = email;
  const usernameEmail = username ? makeUsernameEmail(username) : "";
  const nextEmail = email || usernameEmail;

  if (nextEmail) {
    const { error: userErr } = await service.auth.admin.updateUserById(id, {
      email: nextEmail,
      user_metadata: full_name ? { full_name } : undefined,
    });
    if (userErr) {
      redirectUrl.searchParams.set("err", "email_update_failed");
      return NextResponse.redirect(redirectUrl, { status: 303 });
    }
    effectiveEmail = nextEmail;
  } else if (full_name) {
    await service.auth.admin.updateUserById(id, { user_metadata: { full_name } });
  }

  if (!effectiveEmail) {
    const { data: u } = await service.auth.admin.getUserById(id);
    effectiveEmail = (u?.user?.email || "").toLowerCase();
  }

  if (password) {
    const { error: pwErr } = await service.auth.admin.updateUserById(id, { password });
    if (pwErr) {
      redirectUrl.searchParams.set("err", "password_update_failed");
      return NextResponse.redirect(redirectUrl, { status: 303 });
    }
  }

  if (sendInvite && effectiveEmail && !effectiveEmail.endsWith("@travellers.local")) {
    const sent = await sendReset(service, effectiveEmail, siteUrl);
    redirectUrl.searchParams.set("ok", sent ? "invite_sent" : "invite_failed");
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }

  redirectUrl.searchParams.set("ok", "staff_updated");
  return NextResponse.redirect(redirectUrl, { status: 303 });
}
