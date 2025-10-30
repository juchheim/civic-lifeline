"use client";

import { MapPin, Phone, Clock } from "lucide-react";
import type { SnapItem } from "@cl/types";

export default function StoreCard({ item, onFocus }: { item: SnapItem; onFocus?: (item: SnapItem) => void }) {
  const handleFocus = () => {
    if (onFocus) onFocus({ ...item });
  };

  return (
    <div className="p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={handleFocus}
            className="font-medium text-left text-gray-900 hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded"
          >
            {item.name}
          </button>
          <div className="text-sm text-gray-600 flex items-center gap-1">
            <MapPin size={14} /> {item.address}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {item.storeType && <span className="mr-2">{item.storeType}</span>}
            {item.phone && (
              <span className="inline-flex items-center gap-1 mr-2">
                <Phone size={14} /> {item.phone}
              </span>
            )}
            {item.hours && (
              <span className="inline-flex items-center gap-1">
                <Clock size={14} /> {item.hours}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
