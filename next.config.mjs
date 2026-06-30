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
  {
    protocol: "https",
    hostname: "upload.wikimedia.org",
  },
  {
    protocol: "https",
    hostname: "*.public.blob.vercel-storage.com",
  },
];

const imageSources = [
  "'self'",
  "data:",
  "blob:",
  ...imageRemotePatterns.map((pattern) => `${pattern.protocol}://${pattern.hostname}`),
];

const isDockerBuild = process.env.DOCKER_BUILD === "true";
const projectRoot = import.meta.dirname;

const nextConfig = {
  // Pin tracing root so a parent lockfile does not break /public image optimization.
  outputFileTracingRoot: projectRoot,
  // Standalone is for Docker only. On Vercel it breaks next/image for /public assets.
  ...(isDockerBuild ? { output: "standalone" } : {}),
  images: {
    remotePatterns: imageRemotePatterns,
    unoptimized: isDockerBuild,
  },
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/paintings/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" },
        ],
      },
      {
        source: "/images/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" },
        ],
      },
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
