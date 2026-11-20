import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Packages that must stay server-side (Node APIs) and not be bundled.
  serverExternalPackages: ["mongoose", "razorpay", "nodemailer", "bcryptjs", "pdf-lib"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "utfs.io" },
      { protocol: "https", hostname: "*.ufs.sh" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "images.pexels.com" },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
