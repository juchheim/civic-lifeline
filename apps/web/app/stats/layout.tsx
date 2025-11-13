import type { Metadata } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL || "https://civiclifeline.org";

export const metadata: Metadata = {
  title: "Local Safety Net — County Statistics",
  description:
    "Select a state and county to view unemployment trends and supporting economic indicators including poverty rates, median income, SNAP participation, education levels, uninsured rates, and housing burden. Data from BLS LAUS and Census ACS.",
  keywords: [
    "unemployment rate",
    "county statistics",
    "BLS LAUS",
    "unemployment trends",
    "poverty rate",
    "median income",
    "SNAP participation",
    "education attainment",
    "uninsured rate",
    "housing burden",
    "economic indicators",
    "county metrics",
    "Census ACS",
    "local statistics",
  ],
  openGraph: {
    title: "Local Safety Net — County Statistics | Civic Lifeline",
    description:
      "Select a state and county to see unemployment trends from BLS LAUS plus supporting indicators like poverty, SNAP usage, housing burden, and median wages.",
    url: "/stats",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Local Safety Net — County Economic Indicators",
    description:
      "Track unemployment trends and local safety net metrics by county. Data from BLS and Census Bureau, updated regularly.",
  },
  alternates: {
    canonical: "/stats",
  },
};

export default function StatsLayout({ children }: { children: React.ReactNode }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Local Safety Net Statistics",
    description:
      "Interactive dashboard showing county-level unemployment trends and supporting economic indicators from BLS LAUS and Census ACS. Select a state and county to view local safety net metrics.",
    url: `${baseUrl}/stats`,
    applicationCategory: "DataVisualization",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "Unemployment rate time series (2018-2025)",
      "Poverty rate and count by county",
      "Median household income",
      "SNAP participation statistics",
      "Education attainment levels",
      "Uninsured population rates",
      "Housing cost burden data",
      "State and county selector",
      "Interactive time-series charts",
    ],
    provider: {
      "@type": "Organization",
      name: "Civic Lifeline",
      url: baseUrl,
    },
  };

  const datasetSchema = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "County Unemployment Statistics",
    description:
      "Historical unemployment data by county from the Bureau of Labor Statistics LAUS program, combined with supporting economic indicators from Census ACS.",
    creator: [
      {
        "@type": "Organization",
        name: "Bureau of Labor Statistics",
      },
      {
        "@type": "Organization",
        name: "U.S. Census Bureau",
      },
    ],
    distribution: {
      "@type": "DataDownload",
      contentUrl: `${baseUrl}/stats`,
    },
    temporalCoverage: "2018/2025",
    spatialCoverage: "United States counties",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetSchema) }}
      />
      {children}
    </>
  );
}

