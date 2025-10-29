"use client";

import { useState } from "react";

const RESOURCE_TYPES = ["wifi", "food_pantry", "meal_site", "clinic", "other"] as const;

type ResourceType = typeof RESOURCE_TYPES[number];

export default function SubmitPage() {
  const [form, setForm] = useState({
    type: "wifi" as ResourceType,
    name: "",
    description: "",
    address: "",
    phone: "",
    email: "",
    site: "",
    hours: "",
    lon: "",
    lat: "",
  });
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    const lon = Number(form.lon);
    const lat = Number(form.lat);
    if (Number.isNaN(lon) || Number.isNaN(lat)) {
      setError("Please enter valid coordinates");
      return;
    }
    const body = {
      type: form.type,
      name: form.name,
      description: form.description || undefined,
      coords: [lon, lat] as [number, number],
      address: form.address || undefined,
      contact: { phone: form.phone || undefined, email: form.email || undefined, site: form.site || undefined },
      hours: form.hours || undefined,
    };
    const res = await fetch("/api/resources", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json?.error?.message || "Submission failed");
    } else {
      setResult(`Submitted! ID: ${json.id}`);
      setForm({ ...form, name: "", description: "", address: "", phone: "", email: "", site: "", hours: "" });
    }
  }

  return (
    <main className="max-w-2xl mx-auto p-4 md:p-6">
      <h1 className="text-xl md:text-2xl font-semibold mb-4">Submit a Community Resource</h1>
      {error && <div className="mb-3 rounded border border-red-300 bg-red-50 text-red-800 px-3 py-2 text-sm">{error}</div>}
      {result && <div className="mb-3 rounded border border-green-300 bg-green-50 text-green-800 px-3 py-2 text-sm">{result}</div>}
      <form className="space-y-3" onSubmit={onSubmit}>
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm">Type</label>
          <select className="border rounded px-2 py-1 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ResourceType })}>
            {RESOURCE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm">Name</label>
          <input className="border rounded px-2 py-1 text-sm flex-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm">Description</label>
          <input className="border rounded px-2 py-1 text-sm flex-1" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm">Address</label>
          <input className="border rounded px-2 py-1 text-sm flex-1" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm">Phone</label>
          <input className="border rounded px-2 py-1 text-sm flex-1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm">Email</label>
          <input className="border rounded px-2 py-1 text-sm flex-1" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm">Website</label>
          <input className="border rounded px-2 py-1 text-sm flex-1" value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })} />
        </div>
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm">Hours</label>
          <input className="border rounded px-2 py-1 text-sm flex-1" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
        </div>
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm">Lon, Lat</label>
          <input className="border rounded px-2 py-1 text-sm w-40" placeholder="-90.405" value={form.lon} onChange={(e) => setForm({ ...form, lon: e.target.value })} />
          <input className="border rounded px-2 py-1 text-sm w-40" placeholder="32.889" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} />
        </div>
        <div className="pt-2">
          <button type="submit" className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white">Submit</button>
        </div>
      </form>
    </main>
  );
}

