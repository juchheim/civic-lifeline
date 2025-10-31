import "./globals.css";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import type { Metadata } from "next";
import MainNav from "@/components/MainNav";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Civic Lifeline",
  description: "Community resources and data",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-100 text-slate-900 antialiased">
        <Providers>
          <div className="flex min-h-screen flex-col">
            <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
              <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
                <Link href="/" className="text-lg font-semibold text-blue-700 hover:text-blue-800">
                  Civic Lifeline
                </Link>
                <MainNav />
              </div>
            </header>
            <div role="main">
              <div className="mx-auto w-full max-w-6xl px-4 py-6">{children}</div>
            </div>
            <footer className="border-t border-slate-200 bg-white/70">
              <div className="mx-auto w-full max-w-6xl px-4 py-4 text-xs text-slate-500">
                Internal testing UI for Civic Lifeline data integrations.
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
