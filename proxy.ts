import { NextRequest, NextResponse } from "next/server";
import { jwtDecrypt } from "jose";

const SESSION_COOKIE = "erp_session";

const ROUTE_ROLES: { prefix: string; roles: string[] }[] = [
  { prefix: "/users", roles: ["admin"] },
  { prefix: "/products", roles: ["admin", "warehouse"] },
  { prefix: "/categories", roles: ["admin", "warehouse"] },
  { prefix: "/stock-opname", roles: ["admin", "warehouse"] },
  { prefix: "/suppliers", roles: ["admin", "purchasing"] },
  { prefix: "/purchasing", roles: ["admin", "purchasing"] },
  { prefix: "/goods-receipts", roles: ["admin", "warehouse"] },
  { prefix: "/purchase-returns", roles: ["admin", "purchasing", "finance"] },
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const secret = process.env.SESSION_SECRET;
  const cookie = req.cookies.get(SESSION_COOKIE)?.value;

  let session: { userId?: string; role?: string } | null = null;
  if (cookie && secret) {
    try {
      const { payload } = await jwtDecrypt(cookie, new Uint8Array(Buffer.from(secret, "hex")), {
        keyManagementAlgorithms: ["dir"],
        contentEncryptionAlgorithms: ["A256GCM"],
      });
      session = {
        userId: typeof payload.userId === "string" ? payload.userId : undefined,
        role: typeof payload.role === "string" ? payload.role : undefined,
      };
    } catch {
      session = null;
    }
  }

  const isPublic = pathname === "/" || pathname === "/login";

  if (!session?.userId) {
    if (isPublic) return NextResponse.next();
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isPublic) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  for (const rule of ROUTE_ROLES) {
    if (pathname.startsWith(rule.prefix) && !rule.roles.includes(session.role ?? "")) {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
