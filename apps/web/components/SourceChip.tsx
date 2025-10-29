"use client";

import dayjs from "dayjs";

export default function SourceChip({ source, lastUpdated, href }: { source: string; lastUpdated: string; href?: string }) {
  const ts = dayjs(lastUpdated).format("YYYY-MM-DD HH:mm");
  const label = `${source}`;
  const title = `${source} — Last updated ${ts}` + (href ? ` — ${href}` : "");
  const content = (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs bg-white"
      title={title}
      aria-label={`Source ${source}, last updated ${ts}`}
    >
      <span className="font-medium">{label}</span>
      <span className="text-gray-600">{ts}</span>
    </span>
  );
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="hover:underline">
        {content}
      </a>
    );
  }
  return content;
}


