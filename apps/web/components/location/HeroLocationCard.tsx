"use client";

import { useCallback, useEffect, useMemo, useRef, useState, forwardRef, type Ref } from "react";
import { Crosshair, MapPin } from "lucide-react";
import LocationInputWithGeocode, { type LocationInputWithGeocodeHandle } from "@/components/LocationInputWithGeocode";
import { locationCopy } from "@/config/locationCopy";
import { useSharedLocation } from "./SharedLocationContext";
import { reverseGeocodeLocation } from "@/lib/location/reverseGeocode";
import type { LocationSelection } from "@/types/location";

type StatusVariant = "card" | "inline";

type HeroLocationCardProps = {
  stepLabel?: string;
  stepChipClassName?: string;
  title?: string;
  description?: string;
  helperText?: string;
  emptyStatusText?: string;
  statusVariant?: StatusVariant;
  showClearButton?: boolean;
  showChangeLink?: boolean;
  changeLabel?: string;
  clearLabel?: string;
  className?: string;
  statusFormatter?: (label: string) => string;
  cardRef?: Ref<HTMLDivElement>;
  inputHandleRef?: Ref<LocationInputWithGeocodeHandle | null>;
};

const DEFAULT_TITLE = "Add your city or ZIP one time.";
const DEFAULT_HELPER = "City, county, or ZIP all work.";
const DEFAULT_EMPTY_STATUS = "No location yet. Add one to unlock local results.";

export const HeroLocationCard = forwardRef<HTMLDivElement, HeroLocationCardProps>(function HeroLocationCard(
  {
    stepLabel,
    stepChipClassName,
    title = DEFAULT_TITLE,
    description,
    helperText = DEFAULT_HELPER,
    emptyStatusText = DEFAULT_EMPTY_STATUS,
    statusVariant = "card",
    showClearButton,
    showChangeLink,
    changeLabel = "Change",
    clearLabel = "Clear location",
    className,
    statusFormatter,
    cardRef,
    inputHandleRef,
  },
  legacyRef,
) {
  const { location, setLocationFromSelection, clearLocation } = useSharedLocation();
  const [inputValue, setInputValue] = useState(location?.displayLabel ?? "");
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const internalInputRef = useRef<LocationInputWithGeocodeHandle | null>(null);
  const rootRef = useCombinedRefs<HTMLDivElement>(legacyRef, cardRef);

  useEffect(() => {
    setInputValue(location?.displayLabel ?? "");
  }, [location?.displayLabel]);

  const handleSelection = useCallback(
    (selection: LocationSelection) => {
      setLocationFromSelection(selection);
      setInputValue(selection.label);
      setError(null);
      setIsEditing(false);
    },
    [setLocationFromSelection, setIsEditing],
  );

  const focusInput = useCallback(() => {
    setIsEditing(true);
    setTimeout(() => {
      internalInputRef.current?.focusInput();
    }, 0);
  }, [setIsEditing]);

  const setLocationInputHandle = useCallback(
    (node: LocationInputWithGeocodeHandle | null) => {
      internalInputRef.current = node;
      if (!inputHandleRef) return;
      const externalHandle: LocationInputWithGeocodeHandle | null = node
        ? {
            reset: () => node.reset(),
            focusInput: () => {
              focusInput();
            },
            geocode: () => node.geocode(),
          }
        : null;
      if (typeof inputHandleRef === "function") {
        inputHandleRef(externalHandle);
      } else if (typeof inputHandleRef === "object" && inputHandleRef !== null) {
        (inputHandleRef as { current: LocationInputWithGeocodeHandle | null }).current = externalHandle;
      }
    },
    [inputHandleRef, focusInput],
  );

  const handleUseCurrentLocation = useCallback(() => {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError(locationCopy.browserNoGeolocation);
      return;
    }
    setIsGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const selection = await reverseGeocodeLocation(position.coords.latitude, position.coords.longitude);
          setLocationFromSelection(selection);
          setInputValue(selection.label);
          setError(null);
          setIsEditing(false);
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "We couldn't access your current location. Please allow access or enter it manually.";
          setError(message);
        } finally {
          setIsGeolocating(false);
        }
      },
      (err) => {
        setIsGeolocating(false);
        const blocked = typeof err?.code === "number" && typeof err?.PERMISSION_DENIED === "number" && err.code === err.PERMISSION_DENIED;
        if (blocked) {
          setError(locationCopy.locationBlocked);
          return;
        }
        setError("We couldn't access your current location. Please allow access or enter it manually.");
      },
      { enableHighAccuracy: true },
    );
  }, [setLocationFromSelection, setIsEditing]);

  const formattedStatus = useMemo(() => {
    if (!location) return null;
    if (statusFormatter) return statusFormatter(location.displayLabel);
    return location.displayLabel;
  }, [location, statusFormatter]);

  const computedShowClearButton = showClearButton ?? statusVariant === "card";
  const computedShowChangeLink = showChangeLink ?? statusVariant === "inline";
  const hasActiveLocation = Boolean(location);
  const showInput = !hasActiveLocation || isEditing;
  const showSummary = hasActiveLocation && !isEditing;

  return (
    <section
      ref={rootRef}
      className={[
        "rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5 shadow-lg shadow-slate-400/10 sm:px-6 sm:py-6",
        className ?? "",
      ].join(" ")}
    >
      {stepLabel ? (
        <span
          className={[
            "inline-flex w-fit items-center gap-2 rounded-full border border-civic-blue/30 bg-civic-blue/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.32em] text-civic-blue",
            stepChipClassName ?? "",
          ].join(" ")}
        >
          {stepLabel}
        </span>
      ) : null}
      <div className="mt-3 space-y-3">
        {showInput ? (
          <div className="space-y-1.5">
            <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">{title}</h2>
            {description ? <p className="text-sm text-slate-600">{description}</p> : null}
          </div>
        ) : null}
        {showInput ? (
          <>
            <LocationInputWithGeocode
              ref={setLocationInputHandle}
              placeholder="E.g. 39194 or 123 Main St"
              value={inputValue}
              onChange={(next) => {
                setInputValue(next);
                setError(null);
              }}
              onLocationSelect={handleSelection}
              onGeocodeError={(message) => setError(message)}
              size="lg"
              leadingVisual={<MapPin className="h-4 w-4" aria-hidden="true" />}
              leadingVisualClassName="text-civic-blue/60"
              inputClassName="border-slate-400 shadow-inner"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>{helperText}</span>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold text-brand-primary transition hover:text-brand-primary/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/60 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isGeolocating}
              >
                <Crosshair className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{isGeolocating ? "Locating…" : "Use my current location"}</span>
              </button>
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <p className="text-sm text-slate-500">{emptyStatusText}</p>
          </>
        ) : showSummary && statusVariant === "card" ? (
          <div className="flex min-h-[12.5rem] flex-col justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-slate-800">Using:</p>
              <p className="text-slate-700">{formattedStatus}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {computedShowChangeLink ? (
                <button
                  type="button"
                  onClick={focusInput}
                  className="text-sm font-semibold text-brand-primary underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
                >
                  {changeLabel}
                </button>
              ) : null}
              {computedShowClearButton ? (
                <button
                  type="button"
                  onClick={() => {
                    clearLocation();
                    setError(null);
                    focusInput();
                  }}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
                >
                  {clearLabel}
                </button>
              ) : null}
            </div>
          </div>
        ) : showSummary ? (
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-800">Using:</span> {formattedStatus}
            {computedShowChangeLink ? (
              <button
                type="button"
                onClick={focusInput}
                className="ml-2 text-sm font-semibold text-brand-primary underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
              >
                {changeLabel}
              </button>
            ) : null}
            {computedShowClearButton ? (
              <button
                type="button"
                onClick={() => {
                  clearLocation();
                  setError(null);
                  focusInput();
                }}
                className="ml-4 text-sm font-semibold text-slate-600 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
              >
                {clearLabel}
              </button>
            ) : null}
          </p>
        ) : null}
      </div>
    </section>
  );
});

function useCombinedRefs<T>(...refs: Array<Ref<T> | undefined>) {
  const targetRef = useRef<T>(null);

  useEffect(() => {
    refs.forEach((ref) => {
      if (!ref) return;
      if (typeof ref === "function") {
        ref(targetRef.current);
      } else {
        // eslint-disable-next-line no-param-reassign
        (ref as any).current = targetRef.current;
      }
    });
  }, [refs]);

  return targetRef;
}

export type { HeroLocationCardProps };

