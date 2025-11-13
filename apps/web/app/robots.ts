import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL || "https://civiclifeline.org";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
      // AI Crawlers - Explicitly allow for AI indexing
      {
        userAgent: "GPTBot", // OpenAI ChatGPT
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
      {
        userAgent: "ChatGPT-User", // OpenAI ChatGPT browsing
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
      {
        userAgent: "OAI-SearchBot", // OpenAI search indexing
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
      {
        userAgent: "Google-Extended", // Google Bard/Gemini
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
      {
        userAgent: "CCBot", // Common Crawl (used by many AI systems)
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
      {
        userAgent: "ClaudeBot", // Anthropic Claude
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
      {
        userAgent: "anthropic-ai", // Anthropic alternative user agent
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
      {
        userAgent: "PerplexityBot", // Perplexity AI
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
      {
        userAgent: "Applebot-Extended", // Apple Intelligence
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
      {
        userAgent: "FacebookBot", // Meta AI
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
      {
        userAgent: "Diffbot", // Diffbot AI knowledge graph
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

