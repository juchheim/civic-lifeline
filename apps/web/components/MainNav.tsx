"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

const links = [
  { href: "/", label: "Home" },
  { href: "/food", label: "Food" },
  { href: "/resume", label: "Resume Builder" },
  { href: "/stats", label: "Stats" },
  { href: "/broadband", label: "Broadband" },
  { href: "/housing", label: "Housing" },
  { href: "/resources", label: "Resources" },
  { href: "/submit", label: "Submit" },
  { href: "/moderate", label: "Moderate" },
];

export default function MainNav() {
  const pathname = usePathname() || "/";
  const [isOpen, setIsOpen] = useState(false);

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const [mounted, setMounted] = useState(false);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Only render portal after mount to avoid SSR issues
  useEffect(() => {
    setMounted(true);
  }, []);

  const mobileMenu = (
    <>
      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm transition-opacity md:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Menu */}
      <nav
        className={`fixed right-0 top-0 z-[9999] h-full w-80 max-w-[85vw] transform bg-white shadow-2xl transition-transform duration-300 ease-out md:hidden ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-label="Main navigation"
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-900">Menu</h2>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-civic-blue"
              aria-label="Close menu"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <ul className="space-y-1">
              {links.map(({ href, label }) => {
                const active = pathname === href || (href !== "/" && pathname.startsWith(href));
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center rounded-lg px-4 py-3 text-base font-medium transition ${
                        active
                          ? "bg-civic-blue text-white shadow-sm"
                          : "text-slate-700 hover:bg-civic-blue/10 hover:text-civic-blue active:bg-civic-blue/20"
                      }`}
                    >
                      {label}
                      {active && (
                        <span className="ml-auto h-2 w-2 rounded-full bg-white" aria-hidden="true" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </nav>
    </>
  );

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex md:flex-wrap md:items-center md:gap-2 md:text-sm">
        {links.map(({ href, label }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={
                active
                  ? "rounded-full bg-civic-blue px-3 py-1 font-medium text-white shadow-sm transition"
                  : "rounded-full px-3 py-1 font-medium text-slate-600 transition hover:bg-civic-blue/10 hover:text-civic-blue"
              }
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Mobile Hamburger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative z-[9999] flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-lg transition hover:bg-civic-blue/10 focus:outline-none focus:ring-2 focus:ring-civic-blue focus:ring-offset-2 md:hidden"
        aria-label={isOpen ? "Close menu" : "Open menu"}
        aria-expanded={isOpen}
      >
        <span
          className={`h-0.5 w-6 origin-center rounded-full bg-civic-blue transition-all duration-300 ${
            isOpen ? "translate-y-1.5 rotate-45" : ""
          }`}
        />
        <span
          className={`h-0.5 w-6 rounded-full bg-blue-700 transition-all duration-300 ${
            isOpen ? "opacity-0" : "opacity-100"
          }`}
        />
        <span
          className={`h-0.5 w-6 origin-center rounded-full bg-civic-blue transition-all duration-300 ${
            isOpen ? "-translate-y-1.5 -rotate-45" : ""
          }`}
        />
      </button>

      {/* Render mobile menu in portal to body */}
      {mounted && typeof document !== "undefined" && createPortal(mobileMenu, document.body)}
    </>
  );
}
