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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Fix Recharts measurement span that causes page height extension
                function fixRechartsSpan() {
                  var spans = document.querySelectorAll('[id^="recharts_measurement_span"], [id*="recharts_measurement"]');
                  spans.forEach(function(span) {
                    var el = span;
                    var style = window.getComputedStyle(el);
                    if (style.top.includes('-20000') || el.style.top.includes('-20000')) {
                      el.style.position = 'fixed';
                      el.style.top = '0px';
                      el.style.left = '-9999px';
                      el.style.width = '1px';
                      el.style.height = '1px';
                      el.style.margin = '0';
                      el.style.padding = '0';
                      el.style.border = 'none';
                      el.style.whiteSpace = 'normal';
                      el.style.fontSize = '0';
                      el.style.letterSpacing = 'normal';
                      el.style.lineHeight = '0';
                      el.style.overflow = 'hidden';
                      el.style.visibility = 'hidden';
                      el.style.pointerEvents = 'none';
                    }
                  });
                }
                // Run immediately
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', fixRechartsSpan);
                } else {
                  fixRechartsSpan();
                }
                // Watch for new spans
                var observer = new MutationObserver(fixRechartsSpan);
                observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
                // Fallback interval
                setInterval(fixRechartsSpan, 50);
              })();
            `,
          }}
        />
      </head>
      <body className="bg-slate-100 text-slate-900 antialiased" data-cl-app="true">
        <Providers>
          <div className="flex flex-col">
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
