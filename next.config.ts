import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["@github/copilot-sdk", "@github/copilot", "simple-git"],
};

export default nextConfig;
