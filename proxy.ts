import { NextResponse, type NextRequest } from "next/server";
import { serverClient } from "@/lib/supabase";

const PREVIEW_ALLOWED = ["/book", "/b", "/rules", "/privacy"];

function isPreviewAllowed(pathname: string): boolean {
  if (pathname === "/") return true;
  return PREVIEW_ALLOWED.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function hasValidPreviewLogin(header: string | null): boolean {
  if (!header?.startsWith("Basic ")) return false;
  try {
    const [user, ...rest] = atob(header.slice(6)).split(":"); // "username:password"
    return user === process.env.PREVIEW_USER && rest.join(":") === process.env.PREVIEW_PASSWORD;
  } catch {
    return false; // malformed header
  }
}

// A request is a client preview when it comes in on the client-preview branch address,
// or when PREVIEW_MODE is on. Checking the address means the lock never depends on a variable.
function isPreviewRequest(request: NextRequest): boolean {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  return host.startsWith("client-preview--") || process.env.PREVIEW_MODE === "true";
}

// TEMP: explains why a preview login failed, with yes/no answers only (never the values). Remove once login works.
function previewLoginDebug(header: string | null): string {
  const envUser = process.env.PREVIEW_USER ?? "";
  const envPass = process.env.PREVIEW_PASSWORD ?? "";
  const received = header?.startsWith("Basic ") ?? false;
  let user = "";
  let pass = "";
  if (received && header) {
    try {
      const decoded = atob(header.slice(6));
      const colon = decoded.indexOf(":");
      user = colon === -1 ? decoded : decoded.slice(0, colon);
      pass = colon === -1 ? "" : decoded.slice(colon + 1);
    } catch {
      // leave both empty
    }
  }
  return [
    `login header received: ${received}`,
    `username variable set: ${envUser.length > 0}`,
    `password variable set: ${envPass.length > 0}`,
    `username matches: ${received && user === envUser}`,
    `password matches: ${received && pass === envPass}`,
    `password length typed minus stored: ${received ? pass.length - envPass.length : "n/a"}`,
  ].join("\n");
}

function previewGate(request: NextRequest): NextResponse | null {
  if (!isPreviewRequest(request)) return null; // production: gate is off

  if (!hasValidPreviewLogin(request.headers.get("authorization"))) {
    return new NextResponse("Authentication required\n\n" + previewLoginDebug(request.headers.get("authorization")), {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="The Rio preview"' },
    });
  }

  if (!isPreviewAllowed(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return null;
}

export async function proxy(request: NextRequest) {
  const blocked = previewGate(request);
  if (blocked) return blocked;

  if (!request.nextUrl.pathname.startsWith("/admin")) {
    const pass = NextResponse.next();
    if (isPreviewRequest(request)) {
      pass.headers.set("X-Robots-Tag", "noindex, nofollow");
    }
    return pass;
  }

  let response = NextResponse.next({ request });

  const supabase = serverClient({
    getAll: () => request.cookies.getAll(),
    setAll: (list, headers) => {
      for (const { name, value } of list) {
        request.cookies.set(name, value);
      }
      response = NextResponse.next({ request });
      for (const { name, value, options } of list) {
        response.cookies.set(name, value, options);
      }
      for (const [key, value] of Object.entries(headers)) {
        response.headers.set(key, value);
      }
    },
  });

  await supabase.auth.getClaims();

  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|webp|svg|gif|ico|mp4|woff2?)$).*)"],
};