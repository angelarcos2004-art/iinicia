import { NextResponse, type NextRequest } from "next/server";

/**
 * script-src necesita 'unsafe-inline': con Turbopack, Next no le pone nonce a los scripts
 * inline que genera para la hidratación (self.__next_f.push(...)), así que un CSP con nonce +
 * strict-dynamic bloquearía el JS del propio framework (verificado con `next build && next
 * start`: cero atributos nonce= en el HTML). Sigue bloqueando cualquier script de origen
 * externo, que es el vector real de la IDOR/XSS que corrigió la auditoría.
 */
export function proxy(_request: NextRequest) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
  const csp = `
    default-src 'self';
    script-src 'self' 'unsafe-inline';
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' blob: data:;
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self' ${apiUrl};
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
  `
    .replace(/\s{2,}/g, " ")
    .trim();

  const response = NextResponse.next();
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
