import type { Metadata } from "next";
import { ResumeBuilderSection } from "@/components/resume/ResumeBuilderSection";

export const metadata: Metadata = {
  title: "Resume Builder | Civic Lifeline",
  description: "Follow guided steps to generate a polished resume and download it instantly.",
};

export default function ResumePage() {
  return (
    <main className="space-y-12 pb-16 bg-neutral-bg">
      <ResumeBuilderSection />
    </main>
  );
}
