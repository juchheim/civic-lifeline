"use client";

import { useEffect, useState } from "react";

type Item = {
  id: string;
  type: string;
  name: string;
  address?: string;
  contact?: { phone?: string; email?: string; site?: string };
};

export default function ModeratePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    const res = await fetch("/api/resources?queue=1");
    const json = await res.json();
    if (!res.ok) {
      setError(json?.error?.message || "Failed to load queue");
      return;
    }
    setItems(json.items || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function verify(id: string, method: "phone" | "site" | "email") {
    setError(null);
    const res = await fetch(`/api/resources/${id}/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ method }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json?.error?.message || "Verify failed");
      return;
    }
    await load();
  }

  return (
    <main className="max-w-3xl mx-auto p-4 md:p-6">
      <h1 className="text-xl md:text-2xl font-semibold mb-4">Moderation Queue</h1>
      {error && <div className="mb-3 rounded border border-red-300 bg-red-50 text-red-800 px-3 py-2 text-sm">{error}</div>}
      {items.length === 0 ? (
        <div className="p-6 text-center text-gray-600 text-sm">No items awaiting verification.</div>
      ) : (
        <ul className="divide-y rounded border bg-white">
          {items.map((it) => (
            <li key={it.id} className="p-3 flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">{it.name}</div>
                <div className="text-xs text-gray-600">{it.type}{it.address ? ` • ${it.address}` : ""}</div>
                {it.contact?.phone && <div className="text-xs">{it.contact.phone}</div>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => verify(it.id, "phone")} className="px-2 py-1 text-xs rounded bg-green-600 text-white">Verify (phone)</button>
                <button onClick={() => verify(it.id, "site")} className="px-2 py-1 text-xs rounded bg-blue-600 text-white">Verify (site)</button>
                <button onClick={() => verify(it.id, "email")} className="px-2 py-1 text-xs rounded bg-indigo-600 text-white">Verify (email)</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

