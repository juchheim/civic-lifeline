import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Benefits & Programs – Civic Lifeline",
  description: "Plain-language guides to SNAP, LIHEAP, housing aid, healthcare options, and more.",
  alternates: { canonical: "/benefits" },
};

export default function BenefitsPage() {
  return (
    <main className="space-y-12 bg-neutral-bg pb-16">
      <section className="mt-4 overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-lg shadow-slate-400/10">
        <div className="space-y-4 px-4 py-10 sm:px-6 lg:px-8">
          <header>
            <h1 className="text-3xl font-semibold text-slate-900">Benefits & Programs</h1>
            <p className="mt-3 text-base text-slate-600">Content coming soon.</p>
          </header>
        </div>
      </section>
    </main>
  );
}
