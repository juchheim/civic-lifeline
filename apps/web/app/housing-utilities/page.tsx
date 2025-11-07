import type { Metadata } from "next";
import HousingUtilitiesClient from "./HousingUtilitiesClient";

export const metadata: Metadata = {
  title: "Housing & Utilities | Civic Lifeline",
  description: "Find housing counselors, rent limits, and broadband coverage in one simple page.",
};

export default function HousingUtilitiesPage() {
  return <HousingUtilitiesClient />;
}
