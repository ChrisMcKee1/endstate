import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["@github/copilot-sdk", "@github/copilot"],
};

export default nextConfig;
