import type { Metadata } from "next";
import { ResumeBuilderSection } from "@/components/resume/ResumeBuilderSection";

const baseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL || "https://civiclifeline.org";

export const metadata: Metadata = {
  title: "Resume Builder — Create Professional Resumes",
  description:
    "Free resume builder with guided steps and AI-powered summary support. Create professional resumes quickly and download ready-to-use PDFs instantly. No registration required.",
  keywords: [
    "resume builder",
    "free resume maker",
    "create resume",
    "resume template",
    "professional resume",
    "resume PDF download",
    "AI resume builder",
    "job application",
    "resume wizard",
    "guided resume builder",
    "no signup resume",
    "resume help",
  ],
  openGraph: {
    title: "Resume Builder — Create Professional Resumes | Civic Lifeline",
    description:
      "Guided steps keep you focused, AI helps with summaries, and you download a polished PDF with one click. All data stays on your device.",
    url: "/resume",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Resume Builder with AI Assistance",
    description:
      "Create professional resumes with guided steps. AI-powered summaries, multiple templates, instant PDF download. No registration needed.",
  },
  alternates: {
    canonical: "/resume",
  },
};

export default function ResumePage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Resume Builder",
    description:
      "Free resume builder with guided steps and AI-powered summary support. Create professional resumes and download PDFs instantly.",
    url: `${baseUrl}/resume`,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "Guided step-by-step resume creation",
      "AI-powered professional summary generation",
      "Multiple resume templates (Classic, Modern, Minimal)",
      "Instant PDF download",
      "Local data storage (no registration required)",
      "Work experience and education sections",
      "Skills management",
      "Real-time preview",
    ],
    provider: {
      "@type": "Organization",
      name: "Civic Lifeline",
      url: baseUrl,
    },
  };

  const howToData = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Create a Resume with Our Builder",
    description: "Step-by-step guide to creating a professional resume",
    step: [
      {
        "@type": "HowToStep",
        name: "Choose a Template",
        text: "Select from Classic, Modern, or Minimal resume templates.",
      },
      {
        "@type": "HowToStep",
        name: "Enter Contact Information",
        text: "Add your name, email, phone number, and location.",
      },
      {
        "@type": "HowToStep",
        name: "Write Professional Summary",
        text: "Create a compelling summary or use AI assistance to generate one based on your profile.",
      },
      {
        "@type": "HowToStep",
        name: "Add Skills",
        text: "List your relevant skills and competencies.",
      },
      {
        "@type": "HowToStep",
        name: "Add Work Experience",
        text: "Include job titles, companies, dates, and key responsibilities for each position.",
      },
      {
        "@type": "HowToStep",
        name: "Add Education",
        text: "List your educational background, including degrees, schools, and graduation dates.",
      },
      {
        "@type": "HowToStep",
        name: "Preview and Download",
        text: "Review your resume and download it as a professional PDF.",
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToData) }}
      />
      <main className="space-y-12 pb-16 bg-neutral-bg">
        <ResumeBuilderSection />
      </main>
    </>
  );
}
