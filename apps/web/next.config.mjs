import { resolve } from "node:path";

/** @type {import("next").NextConfig} */
const nextConfig = {
  transpilePackages: ["@cl/types", "@cl/utils", "@cl/db"],
  experimental: {
    serverComponentsExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
    outputFileTracingIncludes: {
      "/api/pdf": [
        "./resume/templates/**/*",
        "./public/resume/fonts/**/*",
        "../../node_modules/@sparticuz/**",
      ],
    },
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.hbs$/i,
      type: 'asset/source',
    });
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias.aws4 = resolve("./lib/aws4-stub.js");
    return config;
  },
};

export default nextConfig;
