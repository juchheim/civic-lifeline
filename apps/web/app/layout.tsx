import "./globals.css";
import "leaflet/dist/leaflet.css";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import MainNav from "@/components/MainNav";
import { Providers } from "./providers";

const footerLinks = [
  { href: "/food", label: "Food Help" },
  { href: "/resume", label: "Resume Tool" },
  { href: "/housing-utilities", label: "Housing & Utilities" },
  { href: "/housing", label: "Housing Help" },
  { href: "/broadband", label: "Internet Map" },
  { href: "/stats", label: "Job Numbers" },
];

export const metadata: Metadata = {
  title: "Civic Lifeline",
  description: "Community data and services",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Aggressively constrain body and html height to prevent any extension
                function enforceHeightConstraints() {
                  var body = document.body;
                  var html = document.documentElement;
                  
                  if (!body || !html) return;
                  
                  // Get the actual content height (not including any off-screen elements)
                  var actualContentHeight = Math.max(
                    body.scrollHeight || 0,
                    html.scrollHeight || 0
                  );
                  
                  // Force body to match actual content height, never exceed it
                  if (body.style.height !== actualContentHeight + 'px') {
                    body.style.height = 'auto';
                    body.style.minHeight = '0';
                    body.style.maxHeight = 'none';
                  }
                  
                  if (html.style.height !== actualContentHeight + 'px') {
                    html.style.height = 'auto';
                    html.style.minHeight = '0';
                    html.style.maxHeight = 'none';
                  }
                  
                  // Check for any absolutely positioned elements that might be extending height
                  var allElements = document.querySelectorAll('*');
                  for (var i = 0; i < allElements.length; i++) {
                    var el = allElements[i];
                    var style = window.getComputedStyle(el);
                    if (style.position === 'absolute' && style.top && parseFloat(style.top) < -1000) {
                      el.style.position = 'fixed';
                      el.style.top = '0';
                      el.style.left = '-9999px';
                      el.style.width = '1px';
                      el.style.height = '1px';
                    }
                  }
                }
                
                // Fix Recharts measurement span
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
                
                // Run after hydration to avoid style mismatch warnings
                // Use requestAnimationFrame to ensure DOM is ready
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', function() {
                    requestAnimationFrame(function() {
                      enforceHeightConstraints();
                      fixRechartsSpan();
                    });
                  });
                } else {
                  requestAnimationFrame(function() {
                    enforceHeightConstraints();
                    fixRechartsSpan();
                  });
                }
                
                // Watch for any changes
                var observer = new MutationObserver(function() {
                  enforceHeightConstraints();
                  fixRechartsSpan();
                });
                observer.observe(document.body || document.documentElement, { 
                  childList: true, 
                  subtree: true, 
                  attributes: true,
                  attributeFilter: ['style', 'class', 'height']
                });
                
                // Aggressive monitoring
                setInterval(enforceHeightConstraints, 50);
                setInterval(fixRechartsSpan, 50);
                
                // Also on window resize and scroll
                window.addEventListener('resize', enforceHeightConstraints);
                window.addEventListener('scroll', enforceHeightConstraints);
              })();
            `,
          }}
        />
      </head>
      <body className="bg-slate-100 text-slate-900 antialiased" data-cl-app="true" suppressHydrationWarning>
        <Providers>
          <div className="flex flex-col">
            <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
              <div className="mx-auto flex w-full max-w-[85rem] items-center justify-between px-4 py-4">
                <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
                  <Image
                    src="/CivicLifelineOGB.png"
                    alt="Civic Lifeline"
                    width={200}
                    height={50}
                    priority
                    className="h-auto w-auto max-h-[40px]"
                  />
                </Link>
                <MainNav />
              </div>
            </header>
            <div role="main">
              <div className="mx-auto w-full max-w-[85rem] px-4 pt-2 pb-2 md:pb-4">{children}</div>
            </div>
            <footer className="border-t border-slate-200 bg-gradient-to-b from-white via-slate-50 to-slate-100 text-slate-700">
              <div className="mx-auto flex w-full max-w-[85rem] flex-col gap-10 px-4 py-12 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl space-y-6">
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-civic-blue/80">
                      Simple tools
                    </p>
                    <p className="text-2xl font-semibold text-slate-900">
                      Get quick help for your next step.
                    </p>
                    <p className="text-sm text-slate-600">Use these tools to find local help and clear facts fast.</p>
                  </div>
                  <nav aria-label="Helpful links" className="grid gap-3 grid-cols-1 min-[520px]:grid-cols-[repeat(5,minmax(max-content,1fr))]">
                    {footerLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-civic-blue/40 hover:bg-civic-blue/5 hover:text-civic-blue whitespace-nowrap"
                      >
                        <span>{link.label}</span>
                        <ArrowRight className="h-4 w-4 text-civic-blue transition group-hover:translate-x-1" />
                      </Link>
                    ))}
                  </nav>
                </div>
                <div className="flex flex-col items-start gap-4 lg:items-end">
                  <Image
                    src="/CivicLifelineOGB.png"
                    alt="Civic Lifeline"
                    width={200}
                    height={60}
                    className="h-auto w-auto max-h-[48px]"
                    priority
                  />
                  <p className="text-xs text-slate-500">© {new Date().getFullYear()} Civic Lifeline. All rights reserved.</p>
                </div>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
