const isDev = process.env.NODE_ENV !== "production";

const cspDirectives = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  [
    "img-src 'self' data: blob:",
    "https://images.unsplash.com",
    "https://lh3.googleusercontent.com",
    "https://firebasestorage.googleapis.com",
    "https://*.firebasestorage.app",
  ].join(" "),
  [
    "frame-src 'self'",
    "https://firebasestorage.googleapis.com",
    "https://*.firebasestorage.app",
  ].join(" "),
  [
    "media-src 'self'",
    "https://firebasestorage.googleapis.com",
    "https://*.firebasestorage.app",
    "blob:",
  ].join(" "),
  [
    "font-src 'self' data:",
    "https://fonts.gstatic.com",
  ].join(" "),
  [
    "connect-src 'self'",
    "https://*.googleapis.com",
    "https://*.gstatic.com",
    "https://*.firebaseapp.com",
    "https://firebasestorage.googleapis.com",
    "https://*.firebasestorage.app",
  ].join(" "),
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: cspDirectives,
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: [
      "accelerometer=()",
      "camera=()",
      "geolocation=()",
      "gyroscope=()",
      "magnetometer=()",
      "microphone=()",
      "payment=()",
      "usb=()",
    ].join(", "),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
