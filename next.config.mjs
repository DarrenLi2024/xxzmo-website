/** @type {import('next').NextConfig} */
const imageRemotePatterns = [
  {
    protocol: "https",
    hostname: "images.metmuseum.org",
  },
  {
    protocol: "https",
    hostname: "res.cbvea.com",
  },
];

const imageSources = [
  "'self'",
  "data:",
  "blob:",
  ...imageRemotePatterns.map((pattern) => `${pattern.protocol}://${pattern.hostname}`),
];

const nextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/*": ["./prisma/dev.db"],
    "/api/**/*": ["./prisma/dev.db"],
  },
  images: {
    remotePatterns: imageRemotePatterns,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              `img-src ${imageSources.join(" ")}`,
              "connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
