import type { NextConfig } from "next";

// Sent on every response, pages and API alike (RNF-01). The server proxy only forwards Host and
// X-Real-IP, so the application declares its own. There is no script policy: a CSP for scripts
// needs a nonce in every render, and the directives below change nothing on screen.
const securityHeaders = [
  // No page can be framed by another site, so a signature, a decision or a termination cannot be
  // triggered by a click on a disguised page (RF019, RF054, RF063). X-Frame-Options covers old browsers
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  },
  { key: "X-Frame-Options", value: "DENY" },
  // The PDF and CSV exports already sent it; now every response does
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Ids in the URL (estágio, estudante) do not leave the system in the Referer
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  // Browsers ignore it over plain HTTP, so local development and the e2e are not affected
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
