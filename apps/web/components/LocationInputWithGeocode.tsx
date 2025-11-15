"use client";

import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import LocationInput, { type LocationInputHandle, type LocationInputProps } from "./LocationInput";
import type { LocationSelection } from "@/types/location";
import { locationCopy } from "@/config/locationCopy";

export type LocationInputWithGeocodeHandle = LocationInputHandle & {
  geocode: () => Promise<LocationSelection | null>;
};

type LocationInputWithGeocodeProps = Omit<LocationInputProps, "onSuggestionSelect" | "onSubmit"> & {
  geocodeEndpoint?: string;
  geocodeQueryParam?: string;
  onLocationSelect: (selection: LocationSelection) => void;
  onGeocodeStateChange?: (loading: boolean) => void;
  onGeocodeError?: (message: string | null) => void;
  onGeocodeSuccess?: (selection: LocationSelection) => void;
  emptyQueryError?: string;
};

const DEFAULT_ENDPOINT = "/api/geocode";
const DEFAULT_QUERY_PARAM = "q";

function createSelection(query: string, payload: any): LocationSelection {
  return {
    label: typeof payload?.name === "string" ? payload.name : query,
    lat: payload?.lat,
    lon: payload?.lon,
    postalCode: typeof payload?.address?.postalCode === "string" ? payload.address.postalCode : undefined,
    state: typeof payload?.address?.state === "string" ? payload.address.state : undefined,
    stateCode: typeof payload?.address?.stateCode === "string" ? payload.address.stateCode : undefined,
    county: typeof payload?.address?.county === "string" ? payload.address.county : undefined,
  };
}

const LocationInputWithGeocode = forwardRef<LocationInputWithGeocodeHandle, LocationInputWithGeocodeProps>(
  (
    {
      geocodeEndpoint = DEFAULT_ENDPOINT,
      geocodeQueryParam = DEFAULT_QUERY_PARAM,
      onLocationSelect,
      onGeocodeStateChange,
      onGeocodeError,
      onGeocodeSuccess,
      emptyQueryError = locationCopy.emptyQueryError,
      ...inputProps
    },
    ref,
  ) => {
    const locationInputRef = useRef<LocationInputHandle | null>(null);
    const [isGeocoding, setIsGeocoding] = useState(false);

    const notifyLoading = useCallback(
      (loading: boolean) => {
        setIsGeocoding(loading);
        onGeocodeStateChange?.(loading);
      },
      [onGeocodeStateChange],
    );

    const runGeocode = useCallback(async (): Promise<LocationSelection | null> => {
      const query = inputProps.value.trim();
      if (!query) {
        onGeocodeError?.(emptyQueryError);
        return null;
      }
      if (isGeocoding) {
        return null;
      }

      notifyLoading(true);
      onGeocodeError?.(null);
      try {
        const origin =
          typeof window !== "undefined" && window.location?.origin ? window.location.origin : "https://localhost";
        const url = new URL(geocodeEndpoint, origin);
        if (geocodeQueryParam) {
          url.searchParams.set(geocodeQueryParam, query);
        }
        const res = await fetch(url.toString(), { headers: { accept: "application/json" } });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          const message = (json as any)?.error || locationCopy.geocodeGenericError;
          throw new Error(typeof message === "string" ? message : locationCopy.geocodeGenericError);
        }
        if (typeof json.lat !== "number" || typeof json.lon !== "number") {
          throw new Error("Geocoding service returned invalid coordinates.");
        }
        const selection = createSelection(query, json);
        onLocationSelect(selection);
        onGeocodeSuccess?.(selection);
        return selection;
      } catch (error) {
        const message = error instanceof Error ? error.message : locationCopy.geocodeGenericError;
        onGeocodeError?.(message);
        return null;
      } finally {
        notifyLoading(false);
      }
    }, [
      emptyQueryError,
      geocodeEndpoint,
      geocodeQueryParam,
      inputProps.value,
      isGeocoding,
      notifyLoading,
      onGeocodeError,
      onGeocodeSuccess,
      onLocationSelect,
    ]);

    useImperativeHandle(
      ref,
      () => ({
        reset: () => {
          locationInputRef.current?.reset();
          onGeocodeError?.(null);
        },
        focusInput: () => {
          locationInputRef.current?.focusInput();
        },
        geocode: runGeocode,
      }),
      [runGeocode, onGeocodeError],
    );

    return (
      <LocationInput
        {...inputProps}
        ref={locationInputRef}
        onSuggestionSelect={(suggestion) => {
          const selection: LocationSelection = {
            label: suggestion.name,
            lat: suggestion.lat,
            lon: suggestion.lon,
            postalCode: undefined,
            county: suggestion.county,
            state: suggestion.state,
            stateCode: suggestion.stateCode,
          };
          onLocationSelect(selection);
          onGeocodeError?.(null);
          onGeocodeSuccess?.(selection);
        }}
        onSubmit={() => {
          void runGeocode();
        }}
      />
    );
  },
);

LocationInputWithGeocode.displayName = "LocationInputWithGeocode";

export default LocationInputWithGeocode;
