"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/food", label: "Food" },
  { href: "/jobs", label: "Jobs" },
  { href: "/broadband", label: "Broadband" },
  { href: "/housing", label: "Housing" },
  { href: "/resources", label: "Resources" },
  { href: "/submit", label: "Submit" },
  { href: "/moderate", label: "Moderate" },
];

export default function MainNav() {
  const pathname = usePathname() || "/";

  return (
    <nav className="flex flex-wrap items-center gap-2 text-sm">
      {links.map(({ href, label }) => {
        const active = pathname === href || (href !== "/" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={
              active
                ? "rounded-full bg-blue-600 px-3 py-1 font-medium text-white shadow-sm"
                : "rounded-full px-3 py-1 font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-700"
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
