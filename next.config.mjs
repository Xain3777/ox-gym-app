/** @type {import('next').NextConfig} */

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "*.supabase.co";

const securityHeaders = [
  // Block browsers from MIME-sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Prevent clickjacking
  { key: "X-Frame-Options", value: "DENY" },
  // Disable legacy XSS auditor (modern CSP does this better)
  { key: "X-XSS-Protection", value: "0" },
  // Force HTTPS for 1 year, include subdomains
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  // Referrer policy
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Restrict browser features
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  // Content Security Policy
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Scripts: self + Next.js inline (unsafe-inline needed for Next.js hydration)
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      // Styles: self + Tailwind inline
      "style-src 'self' 'unsafe-inline'",
      // Images: self + Supabase storage
      `img-src 'self' data: blob: https://${supabaseHost}`,
      // Fonts: self
      "font-src 'self'",
      // API/WebSocket connections: self + Supabase
      `connect-src 'self' https://${supabaseHost} wss://${supabaseHost}`,
      // Frames: none
      "frame-src 'none'",
      // Objects: none
      "object-src 'none'",
      // Base URI: self only (prevent base tag injection)
      "base-uri 'self'",
      // Form submissions: self only
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [
      {
        // Apply to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
