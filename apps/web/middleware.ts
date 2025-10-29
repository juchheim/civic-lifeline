import { NextResponse } from "next/server";

const DISABLE_UI = process.env.DISABLE_UI === "true";

export const config = {
  matcher: ["/((?!api|_next|_vercel|favicon.ico|robots.txt|sitemap.xml|static).*)"],
};

export function middleware() {
  if (!DISABLE_UI) return NextResponse.next();
  return NextResponse.json({ error: "UI disabled on this deployment" }, { status: 404 });
}
