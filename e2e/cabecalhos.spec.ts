import { expect, test } from "@playwright/test";

// next.config.ts: every response carries the security headers, a page as much as the API (RNF-01)
const ROTAS = ["/login", "/api/v1/cursos"];

for (const rota of ROTAS) {
  test(`sends the security headers on ${rota}`, async ({ request }) => {
    const response = await request.get(rota, { maxRedirects: 0 });
    const headers = response.headers();

    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toContain("camera=()");
    expect(headers["strict-transport-security"]).toContain("max-age=");
    expect(headers["x-powered-by"]).toBeUndefined();
  });
}
