import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function createSupabaseMiddlewareClient(req: NextRequest, res: NextResponse) {
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

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createSupabaseMiddlewareClient(req, res);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = req.nextUrl.pathname;

  const isAuthRoute = pathname.startsWith("/auth");
  const isMaintenanceRoute = pathname.startsWith("/maintenance");
  const isManagementRoute = pathname.startsWith("/management");
  const isAdminRoute = pathname.startsWith("/admin");

  // If not logged in, protect app routes
  if (!user && (isMaintenanceRoute || isManagementRoute || isAdminRoute)) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Role checks (read profile role)
  if (user && (isManagementRoute || isAdminRoute)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role,is_active")
      .eq("id", user.id)
      .single();

    if (!profile?.is_active) {
      const url = req.nextUrl.clone();
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }

    if (isAdminRoute && profile.role !== "admin") {
      const url = req.nextUrl.clone();
      url.pathname = "/maintenance/new";
      return NextResponse.redirect(url);
    }

    if (isManagementRoute && !["manager", "admin"].includes(profile.role)) {
      const url = req.nextUrl.clone();
      url.pathname = "/maintenance/new";
      return NextResponse.redirect(url);
    }
  }

  // Logged in user visiting /auth routes -> send to default page
  if (user && isAuthRoute && pathname !== "/auth/logout") {
    const url = req.nextUrl.clone();
    url.pathname = "/maintenance/new";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
