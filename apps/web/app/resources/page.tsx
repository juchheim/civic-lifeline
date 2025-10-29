"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import SourceChip from "@/components/SourceChip";

const RESOURCE_TYPES = ["all", "wifi", "food_pantry", "meal_site", "clinic", "other"] as const;

const zContact = z.object({
  phone: z.string().optional(),
  email: z.string().optional(),
  site: z.string().optional(),
});

const zResourceItem = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  description: z.string().optional(),
  coords: z.tuple([z.number(), z.number()]).optional(),
  address: z.string().optional(),
  contact: zContact.partial().optional(),
  hours: z.string().optional(),
  verified: z
    .object({
      by: z.string(),
      at: z.string(),
      method: z.union([z.literal("phone"), z.literal("site"), z.literal("email")]),
    })
    .optional(),
});

const zResourcesResponse = z.object({
  items: z.array(zResourceItem),
  source: z.string(),
  lastUpdated: z.string(),
});

interface FetchOptions {
  type?: string;
  includeQueue?: boolean;
}

type ResourcesResponse = z.infer<typeof zResourcesResponse>;

async function fetchResources(options: FetchOptions): Promise<ResourcesResponse> {
  const params = new URLSearchParams();
  if (options.type) params.set("type", options.type);
  if (options.includeQueue) params.set("queue", "1");
  const query = params.toString();
  const res = await fetch(`/api/resources${query ? `?${query}` : ""}`, { headers: { accept: "application/json" } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (json as any)?.error?.message || (json as any)?.error?.code || "Unable to load resources";
    throw new Error(message);
  }
  return zResourcesResponse.parse(json);
}

export default function ResourcesPage() {
  const [selectedType, setSelectedType] = useState<(typeof RESOURCE_TYPES)[number]>("all");
  const [showQueue, setShowQueue] = useState(false);

  const query = useQuery<ResourcesResponse, Error>({
    queryKey: ["resources", selectedType, showQueue],
    queryFn: () =>
      fetchResources({
        type: selectedType === "all" ? undefined : selectedType,
        includeQueue: showQueue,
      }),
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });

  const availableTypes = useMemo(() => RESOURCE_TYPES, []);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Community Resources</h1>
          <p className="text-sm text-slate-600">
            Inspect verified submissions stored in MongoDB and optionally include the moderation queue.
          </p>
        </div>
        {query.data && <SourceChip source={query.data.source} lastUpdated={query.data.lastUpdated} />}
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-slate-700" htmlFor="resource-type">
              Type
            </label>
            <select
              id="resource-type"
              className="rounded border border-slate-300 px-2 py-1 text-sm"
              value={selectedType}
              onChange={(event) => setSelectedType(event.target.value as (typeof RESOURCE_TYPES)[number])}
            >
              {availableTypes.map((type) => (
                <option key={type} value={type}>
                  {type === "all" ? "All types" : type}
                </option>
              ))}
            </select>
            <label className="inline-flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={showQueue}
                onChange={(event) => setShowQueue(event.target.checked)}
              />
              Include moderation queue
            </label>
          </div>
          <button
            type="button"
            onClick={() => query.refetch()}
            className="inline-flex items-center rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            disabled={query.isFetching}
          >
            {query.isFetching ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        <div className="mt-5">
          {query.isError && (
            <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {(query.error as Error)?.message || "Unable to fetch resources."}
            </div>
          )}
          {!query.isError && !query.data && !query.isLoading && (
            <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Adjust the filters to load community resources.
            </div>
          )}
          {query.isLoading && (
            <div className="h-24 animate-pulse rounded border border-slate-200 bg-slate-50" aria-hidden="true" />
          )}
          {query.data && (
            <div className="space-y-3">
              <div className="text-xs text-slate-500">
                Showing {query.data.items.length} {query.data.items.length === 1 ? "record" : "records"} from{" "}
                {showQueue ? "the moderation queue" : "verified submissions"}.
              </div>
              <ul className="divide-y divide-slate-200 rounded border border-slate-200">
                {query.data.items.map((item) => (
                  <li key={item.id} className="grid gap-3 bg-white p-4 md:grid-cols-[minmax(0,1fr)_220px]">
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-lg font-semibold text-slate-900">{item.name}</div>
                        <span className="rounded-full border border-slate-200 px-2 py-0.5 text-xs uppercase text-slate-600">
                          {item.type}
                        </span>
                      </div>
                      {item.address && <div className="mt-1 text-sm text-slate-600">{item.address}</div>}
                      {item.description && <div className="mt-2 text-sm text-slate-500">{item.description}</div>}
                      {item.hours && (
                        <div className="mt-2 text-xs text-slate-500">
                          Hours: <span className="font-medium text-slate-700">{item.hours}</span>
                        </div>
                      )}
                      {item.coords && (
                        <div className="mt-2 text-xs text-slate-500">
                          Coordinates: Lon {item.coords[0].toFixed(4)}, Lat {item.coords[1].toFixed(4)}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 text-sm text-slate-600">
                      {item.contact && (
                        <div>
                          <div className="font-medium text-slate-700">Contact</div>
                          {item.contact.phone && <div>Phone: {item.contact.phone}</div>}
                          {item.contact.email && <div>Email: {item.contact.email}</div>}
                          {item.contact.site && (
                            <div>
                              Website:{" "}
                              <a href={item.contact.site} className="text-blue-600 hover:underline" target="_blank" rel="noreferrer">
                                {item.contact.site}
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                      {item.verified ? (
                        <div className="rounded border border-green-200 bg-green-50 px-2 py-1 text-xs text-green-700">
                          Verified via {item.verified.method} on {new Date(item.verified.at).toLocaleString()} by {item.verified.by}
                        </div>
                      ) : (
                        <div className="rounded border border-yellow-200 bg-yellow-50 px-2 py-1 text-xs text-yellow-700">
                          Pending moderation
                        </div>
                      )}
                    </div>
                  </li>
                ))}
                {query.data.items.length === 0 && (
                  <li className="p-4 text-sm text-slate-600">No resources match the current filters.</li>
                )}
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
