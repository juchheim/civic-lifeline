import type { Metadata } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL || "https://civiclifeline.org";

export const metadata: Metadata = {
  title: "Food Access — Find SNAP Retailers",
  description:
    "Find stores that accept SNAP benefits near you using an interactive map. Filter by store type and locate EBT-accepting retailers. Data from USDA SNAP Retailer Database.",
  keywords: [
    "SNAP retailers",
    "EBT stores",
    "food assistance",
    "SNAP benefits",
    "food stamps",
    "SNAP map",
    "grocery stores accepting EBT",
    "USDA SNAP",
    "find SNAP stores",
    "where to use EBT",
    "food access",
    "SNAP locations",
  ],
  openGraph: {
    title: "Food Access — Find SNAP Retailers Near You | Civic Lifeline",
    description:
      "Use your location to see stores that accept SNAP benefits on an interactive map. Filter by store type to find exactly what you need.",
    url: "/food",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Find SNAP Retailers Near You",
    description:
      "Interactive map showing stores that accept SNAP benefits. Filter by type and plan your trip. Free tool from Civic Lifeline.",
  },
  alternates: {
    canonical: "/food",
  },
};

export default function FoodLayout({ children }: { children: React.ReactNode }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "SNAP Retailer Finder",
    description:
      "Find stores that accept SNAP benefits near any location using an interactive map with store type filtering.",
    url: `${baseUrl}/food`,
    applicationCategory: "UtilityApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "Location-based SNAP retailer search",
      "Interactive map with store pins",
      "Store type filtering (Supermarket, Convenience Store, etc.)",
      "Distance calculation to nearby stores",
      "Address search with autocomplete",
      "Real-time data from USDA SNAP Retailer Database",
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
        name: "What is SNAP and who can use it?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "SNAP (Supplemental Nutrition Assistance Program), formerly known as food stamps, helps low-income individuals and families buy food. You can use SNAP benefits at authorized retailers with an EBT card.",
        },
      },
      {
        "@type": "Question",
        name: "How do I find stores that accept SNAP near me?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Click 'Use my current location' to allow location access, and we'll show you all nearby SNAP-accepting stores on an interactive map. You can also type in an address or ZIP code manually.",
        },
      },
      {
        "@type": "Question",
        name: "What data source is used for SNAP retailers?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "All SNAP retailer data comes from the USDA SNAP Retailer Database via ArcGIS FeatureServer, ensuring accurate and up-to-date information.",
        },
      },
      {
        "@type": "Question",
        name: "Do you save my location data?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No, we do not save your location data. Your location is only used temporarily to search for nearby stores and is not stored on our servers.",
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
      {children}
    </>
  );
}

