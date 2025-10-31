/** @type {import("next").NextConfig} */
const nextConfig = {
  transpilePackages: ["@cl/types", "@cl/utils", "@cl/db"],
  experimental: {
    serverComponentsExternalPackages: ["@sparticuz/chromium"],
    outputFileTracingIncludes: {
      "/api/pdf": [
        "./resume/templates/**/*",
        "../../node_modules/.pnpm/@sparticuz+chromium@141.0.0/node_modules/@sparticuz/chromium/bin/**/*",
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
