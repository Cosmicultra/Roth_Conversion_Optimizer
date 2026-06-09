import { NextResponse, type NextRequest } from "next/server";
import { getMiddlewareUser, updateSupabaseSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdvisorRoute = pathname.startsWith("/advisor");
  const isAdvisorLogin = pathname === "/advisor/login";

  if (isAdvisorRoute && !isAdvisorLogin) {
    const user = await getMiddlewareUser(request);
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/advisor/login";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (isAdvisorLogin) {
    const user = await getMiddlewareUser(request);
    if (user) {
      const portalUrl = request.nextUrl.clone();
      portalUrl.pathname = "/advisor";
      portalUrl.search = "";
      return NextResponse.redirect(portalUrl);
    }
  }

  return updateSupabaseSession(request);
}

export const config = {
  matcher: ["/advisor/:path*"],
};
