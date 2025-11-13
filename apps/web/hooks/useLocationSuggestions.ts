"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, FocusEvent, KeyboardEvent, RefObject, SetStateAction } from "react";
import type { LocationSuggestion } from "@/types/location";
import { useDebouncedValue } from "./useDebouncedValue";

const DEFAULT_DEBOUNCE = 350;
const DEFAULT_MIN_LENGTH = 3;
const DEFAULT_LIMIT = 5;

const defaultMessages = {
  notFound: "No matches. Try a full address, city & state, or ZIP.",
  tooMany: "Too many searches, please pause briefly.",
  unavailable: "Suggestion service unavailable. You can still search manually.",
};

type UseLocationSuggestionsOptions = {
  query: string;
  debounceMs?: number;
  minLength?: number;
  limit?: number;
  suppress?: boolean;
  endpoint?: string;
  onSelect?: (suggestion: LocationSuggestion) => void;
  onSubmitWithoutSelection?: () => void;
};

export type UseLocationSuggestionsResult = {
  suggestions: LocationSuggestion[];
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  activeIndex: number | null;
  setActiveIndex: Dispatch<SetStateAction<number | null>>;
  comboboxRef: RefObject<HTMLDivElement | null>;
  handleInputFocus: () => void;
  handleInputBlur: (event: FocusEvent<HTMLElement>) => void;
  handleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  handleSuggestionPick: (suggestion: LocationSuggestion) => void;
  openSuggestions: () => void;
  closeSuggestions: () => void;
  resetSuggestions: () => void;
};

export function useLocationSuggestions(options: UseLocationSuggestionsOptions): UseLocationSuggestionsResult {
  const {
    query,
    debounceMs = DEFAULT_DEBOUNCE,
    minLength = DEFAULT_MIN_LENGTH,
    limit = DEFAULT_LIMIT,
    suppress = false,
    endpoint = "/api/geocode/suggest",
  } = options;

  const debouncedQuery = useDebouncedValue(query, debounceMs);
  const comboboxRef = useRef<HTMLDivElement | null>(null);
  const onSelectRef = useRef<UseLocationSuggestionsOptions["onSelect"] | null>(null);
  const onSubmitRef = useRef<UseLocationSuggestionsOptions["onSubmitWithoutSelection"] | null>(null);

  useEffect(() => {
    onSelectRef.current = options.onSelect;
  }, [options.onSelect]);

  useEffect(() => {
    onSubmitRef.current = options.onSubmitWithoutSelection;
  }, [options.onSubmitWithoutSelection]);

  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const resetSuggestions = useCallback(() => {
    setSuggestions([]);
    setIsOpen(false);
    setIsLoading(false);
    setError(null);
    setActiveIndex(null);
  }, []);

  useEffect(() => {
    if (suppress) {
      resetSuggestions();
    }
  }, [resetSuggestions, suppress]);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (suppress) {
      return;
    }
    if (trimmed.length < minLength) {
      resetSuggestions();
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setIsLoading(true);
    setIsOpen(true);
    setError(null);

    const fetchSuggestions = async () => {
      try {
        const res = await fetch(`${endpoint}?q=${encodeURIComponent(trimmed)}&limit=${limit}`, {
          headers: { accept: "application/json" },
          signal: controller.signal,
        });
        if (cancelled) return;

        if (res.status === 404) {
          setSuggestions([]);
          setError(defaultMessages.notFound);
          setActiveIndex(null);
          return;
        }

        if (res.status === 429) {
          setSuggestions([]);
          setError(defaultMessages.tooMany);
          setActiveIndex(null);
          return;
        }

        if (!res.ok) {
          throw new Error("Suggestion request failed");
        }

        const data = (await res.json()) as LocationSuggestion[];
        const sliced = data.slice(0, limit);
        setSuggestions(sliced);
        setError(sliced.length === 0 ? defaultMessages.notFound : null);
        setActiveIndex(null);
      } catch (err) {
        if (cancelled || (err instanceof Error && err.name === "AbortError")) {
          return;
        }
        setSuggestions([]);
        setError(defaultMessages.unavailable);
        setActiveIndex(null);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchSuggestions();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [debouncedQuery, endpoint, limit, minLength, resetSuggestions, suppress]);

  const openSuggestions = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeSuggestions = useCallback(() => {
    setIsOpen(false);
    setActiveIndex(null);
  }, []);

  const handleSuggestionPick = useCallback(
    (suggestion: LocationSuggestion) => {
      onSelectRef.current?.(suggestion);
      setSuggestions([]);
      setError(null);
      setIsOpen(false);
      setIsLoading(false);
      setActiveIndex(null);
    },
    [],
  );

  const handleInputFocus = useCallback(() => {
    if (suggestions.length > 0 || error || isLoading) {
      setIsOpen(true);
    }
  }, [error, isLoading, suggestions.length]);

  const handleInputBlur = useCallback(
    (event: FocusEvent<HTMLElement>) => {
      const related = event.relatedTarget;
      if (related && comboboxRef.current && comboboxRef.current.contains(related as Node)) {
        return;
      }
      closeSuggestions();
    },
    [closeSuggestions],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "ArrowDown") {
        if (suggestions.length === 0) return;
        event.preventDefault();
        openSuggestions();
        setActiveIndex((index) => {
          if (index === null) return 0;
          return Math.min(index + 1, suggestions.length - 1);
        });
        return;
      }

      if (event.key === "ArrowUp") {
        if (suggestions.length === 0) return;
        event.preventDefault();
        setActiveIndex((index) => {
          if (index === null || index <= 0) return 0;
          return index - 1;
        });
        return;
      }

      if (event.key === "Enter") {
        if (isOpen && activeIndex !== null && suggestions[activeIndex]) {
          event.preventDefault();
          handleSuggestionPick(suggestions[activeIndex]);
          return;
        }

        if (onSubmitRef.current) {
          event.preventDefault();
          onSubmitRef.current();
        }
        return;
      }

      if (event.key === "Escape") {
        if (isOpen) {
          event.preventDefault();
          closeSuggestions();
        }
      }
    },
    [activeIndex, closeSuggestions, handleSuggestionPick, isOpen, openSuggestions, suggestions],
  );

  return {
    suggestions,
    isOpen,
    isLoading,
    error,
    activeIndex,
    setActiveIndex,
    comboboxRef,
    handleInputFocus,
    handleInputBlur,
    handleKeyDown,
    handleSuggestionPick,
    openSuggestions,
    closeSuggestions,
    resetSuggestions,
  };
}
