import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { APP_BASE_PATH, withoutBasePath } from "@/lib/app-path";

function createSupabaseProxyClient(req: NextRequest, res: NextResponse) {
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

export async function proxy(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createSupabaseProxyClient(req, res);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = req.nextUrl.pathname;
  const appPathname = withoutBasePath(pathname);

  // When hosted with a base path, visiting the domain root should land in the app.
  if (APP_BASE_PATH && pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = APP_BASE_PATH;
    return NextResponse.redirect(url);
  }

  const isAuthRoute = appPathname.startsWith("/auth");
  const isMaintenanceRoute =
    appPathname.startsWith("/maintenance") || appPathname.startsWith("/new") || appPathname.startsWith("/history");
  const isManagementRoute = appPathname.startsWith("/management");
  const isAdminRoute = appPathname.startsWith("/admin");

  // If not logged in, protect app routes
  if (!user && (isMaintenanceRoute || isManagementRoute || isAdminRoute)) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("redirect", appPathname);
    return NextResponse.redirect(url);
  }

  // If logged in, grab profile once when needed
  let profile: { role: string; is_active: boolean } | null = null;

  async function getProfile() {
    if (profile) return profile;
    const { data } = await supabase
      .from("profiles")
      .select("role,is_active")
      .eq("id", user!.id)
      .single();
    profile = (data as any) || null;
    return profile;
  }

  // Role checks for management/admin routes
  if (user && (isManagementRoute || isAdminRoute)) {
    const p = await getProfile();

    if (!p?.is_active) {
      const url = req.nextUrl.clone();
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }

    if (isAdminRoute && p.role !== "admin") {
      const url = req.nextUrl.clone();
      url.pathname = "/new";
      return NextResponse.redirect(url);
    }

    if (isManagementRoute && !["manager", "admin"].includes(p.role)) {
      const url = req.nextUrl.clone();
      url.pathname = "/new";
      return NextResponse.redirect(url);
    }
  }

  // Logged in user visiting /auth routes -> route based on role
  if (user && isAuthRoute && appPathname !== "/auth/logout" && appPathname !== "/auth/set-password") {
    const p = await getProfile();
    const url = req.nextUrl.clone();
    url.pathname = p && ["manager", "admin"].includes(p.role) ? "/management/dashboard" : "/new";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
