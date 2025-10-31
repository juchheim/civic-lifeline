/** @type {import("next").NextConfig} */
const nextConfig = {
  transpilePackages: ["@cl/types", "@cl/utils", "@cl/db"],
  experimental: {
    outputFileTracingIncludes: {
      "/api/pdf": [
        "./resume/templates/**/*",
        "./node_modules/.cache/ms-playwright/**/*",
      ],
    },
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.hbs$/i,
      type: 'asset/source',
    });
    return config;
  },
};

export default nextConfig;
