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
  if (!id) {
    redirectUrl.searchParams.set("err", "missing_id");
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }

  const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const siteUrl = getCanonicalSiteUrl(req.nextUrl.origin);

  const { data } = await service.auth.admin.getUserById(id);
  const email = (data?.user?.email || "").toLowerCase();
  if (!email || email.endsWith("@travellers.local")) {
    redirectUrl.searchParams.set("err", "missing_real_email");
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }

  const { error } = await service.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/login`,
  });

  redirectUrl.searchParams.set("ok", error ? "invite_failed" : "invite_sent");
  return NextResponse.redirect(redirectUrl, { status: 303 });
}
