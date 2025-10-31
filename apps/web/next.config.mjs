/** @type {import("next").NextConfig} */
const nextConfig = {
  transpilePackages: ["@cl/types", "@cl/utils", "@cl/db"],
  experimental: {
    outputFileTracingIncludes: {
      "/api/pdf": ["./resume/templates/**/*"],
    },
  },
};

export default nextConfig;
