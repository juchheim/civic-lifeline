/** @type {import("next").NextConfig} */
const nextConfig = {
  transpilePackages: ["@cl/types", "@cl/utils", "@cl/db"],
  experimental: {
    serverComponentsExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
    outputFileTracingIncludes: {
      "/api/pdf": [
        "./resume/templates/**/*",
        "../../node_modules/@sparticuz/**",
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
