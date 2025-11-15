import type { Metadata } from "next";
import BenefitsClient from "./BenefitsClient";
import { BenefitsLocationProvider } from "./useBenefitsLocation";

export const metadata: Metadata = {
  title: "Benefits & Programs – Civic Lifeline",
  description: "Plain-language guides to food, money, health coverage, housing, and disability support.",
  alternates: { canonical: "/benefits" },
};

export default function BenefitsPage() {
  return (
    <main className="bg-neutral-bg">
      <BenefitsLocationProvider>
        <BenefitsClient />
      </BenefitsLocationProvider>
    </main>
  );
}
