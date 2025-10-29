"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { zCounselorsResponse, zFmrResponse } from "@cl/types";
import SourceChip from "@/components/SourceChip";

interface CounselorForm {
  lat: string;
  lon: string;
  radius: string;
}

interface FmrForm {
  fips: string;
  year: string;
}

const defaultCounselorForm: CounselorForm = { lat: "32.889", lon: "-90.405", radius: "30" };
const defaultFmrForm: FmrForm = { fips: "28163", year: new Date().getFullYear().toString() };

async function fetchCounselors(params: CounselorForm) {
  const search = new URLSearchParams();
  search.set("lat", params.lat.trim());
  search.set("lon", params.lon.trim());
  if (params.radius.trim()) search.set("radius", params.radius.trim());
  const res = await fetch(`/api/housing/counselors?${search.toString()}`, { headers: { accept: "application/json" } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (json as any)?.error?.message || (json as any)?.error?.code || "Unable to load counselors";
    throw new Error(message);
  }
  return zCounselorsResponse.parse(json);
}

async function fetchFmr(params: FmrForm) {
  const search = new URLSearchParams();
  search.set("fips", params.fips.trim());
  search.set("year", params.year.trim());
  const res = await fetch(`/api/housing/fmr?${search.toString()}`, { headers: { accept: "application/json" } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (json as any)?.error?.message || (json as any)?.error?.code || "Unable to load HUD FMR";
    throw new Error(message);
  }
  return zFmrResponse.parse(json);
}

export default function HousingPage() {
  const [counselorForm, setCounselorForm] = useState<CounselorForm>(defaultCounselorForm);
  const [counselorSearch, setCounselorSearch] = useState<CounselorForm>(defaultCounselorForm);

  const [fmrForm, setFmrForm] = useState<FmrForm>(defaultFmrForm);
  const [fmrSearch, setFmrSearch] = useState<FmrForm>(defaultFmrForm);

  const counselorsQuery = useQuery({
    queryKey: ["housing:counselors", counselorSearch.lat, counselorSearch.lon, counselorSearch.radius],
    queryFn: () => fetchCounselors(counselorSearch),
    enabled: !!counselorSearch.lat && !!counselorSearch.lon,
    staleTime: 60_000,
  });

  const fmrQuery = useQuery({
    queryKey: ["housing:fmr", fmrSearch.fips, fmrSearch.year],
    queryFn: () => fetchFmr(fmrSearch),
    enabled: !!fmrSearch.fips && !!fmrSearch.year,
    staleTime: 300_000,
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-slate-900">Housing Support</h1>
        <p className="text-sm text-slate-600">
          Run live HUD integrations to identify nearby housing counselors and retrieve Fair Market Rent (FMR) figures.
        </p>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h2 className="text-xl font-semibold text-slate-900">HUD Housing Counselors</h2>
          {counselorsQuery.data && (
            <SourceChip source={counselorsQuery.data.source} lastUpdated={counselorsQuery.data.lastUpdated} />
          )}
        </div>
        <form
          className="mt-4 grid gap-4 md:grid-cols-5 md:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            setCounselorSearch({
              lat: counselorForm.lat.trim(),
              lon: counselorForm.lon.trim(),
              radius: counselorForm.radius.trim() || "30",
            });
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="lat">
              Latitude
            </label>
            <input
              id="lat"
              value={counselorForm.lat}
              onChange={(event) => setCounselorForm((prev) => ({ ...prev, lat: event.target.value }))}
              className="rounded border border-slate-300 px-2 py-1 text-sm"
              placeholder="32.889"
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="lon">
              Longitude
            </label>
            <input
              id="lon"
              value={counselorForm.lon}
              onChange={(event) => setCounselorForm((prev) => ({ ...prev, lon: event.target.value }))}
              className="rounded border border-slate-300 px-2 py-1 text-sm"
              placeholder="-90.405"
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="radius">
              Radius (miles)
            </label>
            <input
              id="radius"
              value={counselorForm.radius}
              onChange={(event) => setCounselorForm((prev) => ({ ...prev, radius: event.target.value }))}
              className="rounded border border-slate-300 px-2 py-1 text-sm"
              placeholder="30"
            />
          </div>
          <div className="flex items-center gap-3 md:col-span-2">
            <button
              type="submit"
              className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              disabled={counselorsQuery.isFetching}
            >
              {counselorsQuery.isLoading || counselorsQuery.isFetching ? "Searching…" : "Search"}
            </button>
            <span className="text-xs text-slate-500">
              `/api/housing/counselors?lat={counselorSearch.lat}&amp;lon={counselorSearch.lon}&amp;radius={counselorSearch.radius}`
            </span>
          </div>
        </form>

        <div className="mt-5">
          {counselorsQuery.isError && (
            <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {(counselorsQuery.error as Error)?.message || "Unable to fetch counselors."}
            </div>
          )}
          {!counselorsQuery.isError && !counselorsQuery.data && !counselorsQuery.isLoading && (
            <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Adjust the coordinates and run the query to see nearby counsellors.
            </div>
          )}
          {counselorsQuery.isLoading && (
            <div className="h-24 animate-pulse rounded border border-slate-200 bg-slate-50" aria-hidden="true" />
          )}
          {counselorsQuery.data && (
            <ul className="divide-y divide-slate-200 rounded border border-slate-200">
              {counselorsQuery.data.items.map((item) => (
                <li key={item.id} className="grid gap-2 bg-white p-4 md:grid-cols-[minmax(0,1fr)_200px]">
                  <div>
                    <div className="font-medium text-slate-900">{item.name}</div>
                    {item.coords && (
                      <div className="text-xs text-slate-500">
                        Lon {item.coords[0].toFixed(4)}, Lat {item.coords[1].toFixed(4)}
                      </div>
                    )}
                    {item.services && item.services.length > 0 && (
                      <div className="mt-1 text-xs text-slate-500">Services: {item.services.join(", ")}</div>
                    )}
                    {item.languages && item.languages.length > 0 && (
                      <div className="mt-1 text-xs text-slate-500">Languages: {item.languages.join(", ")}</div>
                    )}
                  </div>
                  <div className="text-sm text-slate-600">
                    {item.phone && <div>Phone: {item.phone}</div>}
                    {item.website && (
                      <div>
                        Website:{" "}
                        <a href={item.website} className="text-blue-600 hover:underline" target="_blank" rel="noreferrer">
                          {item.website}
                        </a>
                      </div>
                    )}
                  </div>
                </li>
              ))}
              {counselorsQuery.data.items.length === 0 && (
                <li className="p-4 text-sm text-slate-600">No counselors returned for this search area.</li>
              )}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h2 className="text-xl font-semibold text-slate-900">HUD Fair Market Rents (FMR)</h2>
          {fmrQuery.data && <SourceChip source={fmrQuery.data.source} lastUpdated={fmrQuery.data.lastUpdated} />}
        </div>

        <form
          className="mt-4 grid gap-4 md:grid-cols-4 md:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            setFmrSearch({
              fips: fmrForm.fips.trim(),
              year: fmrForm.year.trim(),
            });
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="fmr-fips">
              County (5-digit FIPS)
            </label>
            <input
              id="fmr-fips"
              value={fmrForm.fips}
              onChange={(event) => setFmrForm((prev) => ({ ...prev, fips: event.target.value }))}
              className="rounded border border-slate-300 px-2 py-1 text-sm"
              placeholder="28163"
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="fmr-year">
              Year
            </label>
            <input
              id="fmr-year"
              value={fmrForm.year}
              onChange={(event) => setFmrForm((prev) => ({ ...prev, year: event.target.value }))}
              className="rounded border border-slate-300 px-2 py-1 text-sm"
              placeholder="2024"
              required
            />
          </div>
          <div className="flex items-center gap-3 md:col-span-2">
            <button
              type="submit"
              className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              disabled={fmrQuery.isFetching}
            >
              {fmrQuery.isLoading || fmrQuery.isFetching ? "Loading…" : "Run query"}
            </button>
            <span className="text-xs text-slate-500">
              `/api/housing/fmr?fips={fmrSearch.fips}&amp;year={fmrSearch.year}`
            </span>
          </div>
        </form>

        <div className="mt-5">
          {fmrQuery.isError && (
            <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {(fmrQuery.error as Error)?.message || "Unable to fetch HUD FMR data."}
            </div>
          )}
          {!fmrQuery.isError && !fmrQuery.data && !fmrQuery.isLoading && (
            <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Enter a county FIPS and year to see Fair Market Rent values.
            </div>
          )}
          {fmrQuery.isLoading && (
            <div className="h-24 animate-pulse rounded border border-slate-200 bg-slate-50" aria-hidden="true" />
          )}
          {fmrQuery.data && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 text-sm text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Area</th>
                    <th className="px-3 py-2 text-left font-semibold">Efficiency</th>
                    <th className="px-3 py-2 text-left font-semibold">1 BR</th>
                    <th className="px-3 py-2 text-left font-semibold">2 BR</th>
                    <th className="px-3 py-2 text-left font-semibold">3 BR</th>
                    <th className="px-3 py-2 text-left font-semibold">4 BR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white text-sm">
                  <tr>
                    <td className="px-3 py-2 font-medium text-slate-900">{fmrQuery.data.areaName}</td>
                    <td className="px-3 py-2">${fmrQuery.data.br0.toLocaleString()}</td>
                    <td className="px-3 py-2">${fmrQuery.data.br1.toLocaleString()}</td>
                    <td className="px-3 py-2">${fmrQuery.data.br2.toLocaleString()}</td>
                    <td className="px-3 py-2">${fmrQuery.data.br3.toLocaleString()}</td>
                    <td className="px-3 py-2">${fmrQuery.data.br4.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
