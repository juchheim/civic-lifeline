import type { Metadata } from "next";
import HousingUtilitiesClient from "./HousingUtilitiesClient";

const baseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL || "https://civiclifeline.org";

export const metadata: Metadata = {
  title: "Housing & Utilities — Counselors, Rent Data & Broadband",
  description:
    "Find HUD housing counselors, check fair market rent, locate utility providers, and view broadband coverage. Comprehensive housing and utility resources with verified data from HUD, EPA, FCC.",
  keywords: [
    "housing counselors",
    "HUD counselors",
    "fair market rent",
    "FMR data",
    "utility costs",
    "broadband coverage",
    "water providers",
    "electric providers",
    "gas providers",
    "internet coverage",
    "housing assistance",
    "utility assistance",
    "EPA SDWIS",
    "FCC broadband",
  ],
  openGraph: {
    title: "Housing & Utilities Resources | Civic Lifeline",
    description:
      "Access HUD housing counselors, fair market rent data, utility cost information, broadband coverage, and provider directories all in one place.",
    url: "/housing-utilities",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Housing & Utilities Resources",
    description:
      "Find housing counselors, check rent limits, locate utility providers, and view broadband coverage. Free verified data.",
  },
  alternates: {
    canonical: "/housing-utilities",
  },
};

export default function HousingUtilitiesPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Housing & Utilities Resources",
    description:
      "Comprehensive housing and utility resources including HUD counselors, fair market rent data, broadband coverage, and utility provider directories.",
    url: `${baseUrl}/housing-utilities`,
    applicationCategory: "UtilityApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "HUD-approved housing counselor search with radius filtering",
      "Fair Market Rent data by county (HUD FY2024)",
      "County-level broadband coverage statistics (FCC data)",
      "Utility cost estimates (electric, gas, water/sewer)",
      "Electric service provider directory",
      "Gas service provider directory",
      "Public water system directory (EPA SDWIS)",
      "Interactive maps for counselor locations",
    ],
    provider: {
      "@type": "Organization",
      name: "Civic Lifeline",
      url: baseUrl,
    },
  };

  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is Fair Market Rent (FMR)?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Fair Market Rent is the estimated amount (base rent + essential utilities) that a property in a given area typically rents for. It is determined annually by HUD and used to calculate Housing Choice Voucher payment standards.",
        },
      },
      {
        "@type": "Question",
        name: "How do I find a HUD-approved housing counselor?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Enter your location and select a search radius (5-100 miles) in the Housing Support tab. We'll show you HUD-approved counselors near you with contact information, services offered, and languages spoken.",
        },
      },
      {
        "@type": "Question",
        name: "What utility data sources do you use?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Utility cost estimates come from Census ACS 2023 5-year tables. Provider data comes from HIFLD service territories (electric and gas) and EPA SDWIS (water systems). All sources are clearly labeled.",
        },
      },
      {
        "@type": "Question",
        name: "How accurate is the broadband coverage data?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Broadband coverage data comes directly from the FCC National Broadband Map, which is continuously updated based on provider submissions. We show county-level statistics for various speed tiers and technologies.",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqData) }}
      />
      <HousingUtilitiesClient />
    </>
  );
}
