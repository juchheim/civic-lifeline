/** @type {import("next").NextConfig} */
const nextConfig = {
  transpilePackages: ["@cl/types", "@cl/utils", "@cl/db"],
  experimental: {
    serverComponentsExternalPackages: ["@sparticuz/chromium-min", "puppeteer-core"],
    outputFileTracingIncludes: {
      "/api/pdf": [
        "./resume/templates/**/*",
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
