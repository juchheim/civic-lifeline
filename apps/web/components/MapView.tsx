"use client";

import { useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from "react-leaflet";
import type { SnapItem } from "@cl/types";

type Bbox = [number, number, number, number];

function ViewportListener({ onBboxChange }: { onBboxChange: (b: Bbox) => void }) {
  const map = useMapEvents({
    load: () => onBboxChange(boundsToBbox(map.getBounds())),
    moveend: () => onBboxChange(boundsToBbox(map.getBounds())),
    zoomend: () => onBboxChange(boundsToBbox(map.getBounds())),
  });
  return null;
}

function boundsToBbox(bounds: any): Bbox {
  const south = bounds.getSouth();
  const west = bounds.getWest();
  const north = bounds.getNorth();
  const east = bounds.getEast();
  return [west, south, east, north];
}

export default function MapView({ items, onBboxChange }: { items: SnapItem[]; onBboxChange: (b: Bbox) => void }) {
  const center = useMemo<[number, number]>(() => [32.889, -90.405], []); // [lat, lon] Yazoo City, MS
  const zoom = 10;

  // Leaflet must only run on client; this file is dynamically imported with ssr:false from page
  return (
    <MapContainer {...({ center, zoom, style: { height: "50vh", width: "100%" }, scrollWheelZoom: true } as any)}>
      <TileLayer
        {...({ attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" } as any)}
      />
      <ViewportListener onBboxChange={onBboxChange} />
      {items.map((it) => (
        <Marker key={it.id} position={[it.coords[1], it.coords[0]] /* [lat, lon] */}>
          <Popup>
            <div className="space-y-1">
              <div className="font-medium">{it.name}</div>
              <div className="text-xs text-gray-600">{it.address}</div>
              {it.storeType && <div className="text-xs">{it.storeType}</div>}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}


