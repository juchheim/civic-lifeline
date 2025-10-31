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
                // Prevent body height extension - monitor and constrain body height
                var lastBodyHeight = 0;
                var checkHeight = function() {
                  var body = document.body;
                  var html = document.documentElement;
                  var contentHeight = Math.max(
                    body.scrollHeight,
                    body.offsetHeight,
                    html.clientHeight,
                    html.scrollHeight,
                    html.offsetHeight
                  );
                  // If body height suddenly increases dramatically, reset it
                  if (lastBodyHeight > 0 && contentHeight > lastBodyHeight + 5000) {
                    body.style.height = 'auto';
                    body.style.minHeight = '0';
                    html.style.height = 'auto';
                    html.style.minHeight = '0';
                  }
                  lastBodyHeight = contentHeight;
                };
                
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
                  checkHeight();
                }
                
                // Run immediately
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', function() {
                    fixRechartsSpan();
                    checkHeight();
                  });
                } else {
                  fixRechartsSpan();
                  checkHeight();
                }
                
                // Watch for new spans and height changes
                var observer = new MutationObserver(function() {
                  fixRechartsSpan();
                  checkHeight();
                });
                observer.observe(document.body || document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
                
                // Monitor height periodically
                setInterval(checkHeight, 100);
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
