"use client";

import { useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from "react-leaflet";
import type { SnapItem } from "@cl/types";

type Bbox = [number, number, number, number];

function boundsToBbox(bounds: any): Bbox {
  const south = bounds.getSouth();
  const west = bounds.getWest();
  const north = bounds.getNorth();
  const east = bounds.getEast();
  return [west, south, east, north];
}

function ViewportListener({ onBboxChange }: { onBboxChange: (b: Bbox) => void }) {
  const map = useMapEvents({
    moveend: () => onBboxChange(boundsToBbox(map.getBounds())),
    zoomend: () => onBboxChange(boundsToBbox(map.getBounds())),
  });

  useEffect(() => {
    onBboxChange(boundsToBbox(map.getBounds()));
  }, [map, onBboxChange]);

  return null;
}

export default function MapView({
  items,
  onBboxChange,
  focus,
}: {
  items: SnapItem[];
  onBboxChange: (b: Bbox) => void;
  focus?: SnapItem | null;
}) {
  const center = useMemo<[number, number]>(() => [32.889, -90.405], []); // [lat, lon] Yazoo City, MS
  const zoom = 10;
  const mapRef = useRef<any>(null);
  const popupRefs = useRef<Record<string, any>>({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mod = await import("leaflet");
      const L: any = (mod as any).default ?? mod;
      if (cancelled) return;
      const snapIcon = L.icon({
        iconUrl: "/icons/snap-marker.png",
        iconRetinaUrl: "/icons/snap-marker@2x.png",
        iconSize: [37, 41],
        iconAnchor: [18, 41],
        popupAnchor: [0, -36],
        shadowUrl: "/marker-shadow.png",
        shadowSize: [41, 41],
        shadowAnchor: [18, 41],
      });
      L.Marker.prototype.options.icon = snapIcon;
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !focus) return;
    const map = mapRef.current;
    const target: [number, number] = [focus.coords[1], focus.coords[0]];
    const nextZoom = Math.max(map.getZoom(), 16);
    map.flyTo(target, nextZoom, { duration: 0.6 });

    const popup = popupRefs.current[focus.id];
    if (popup) {
      popup.openOn(map);
    }
  }, [focus]);

  return (
    <MapContainer
      {...({ center, zoom, style: { height: "50vh", width: "100%" }, scrollWheelZoom: true, ref: mapRef } as any)}
    >
      <TileLayer
        {...({
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        } as any)}
      />
      <ViewportListener onBboxChange={onBboxChange} />
      {items.map((it) => (
        <Marker key={it.id} position={[it.coords[1], it.coords[0]] /* [lat, lon] */}>
          <Popup
            ref={(instance) => {
              if (instance) popupRefs.current[it.id] = instance;
              else delete popupRefs.current[it.id];
            }}
          >
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
