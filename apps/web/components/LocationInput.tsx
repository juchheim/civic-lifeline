"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { useLocationSuggestions } from "@/hooks/useLocationSuggestions";
import type { LocationSuggestion } from "@/types/location";
import { locationCopy } from "@/config/locationCopy";

type Size = "md" | "lg";

export type LocationInputHandle = {
  reset: () => void;
  focusInput: () => void;
};

export interface LocationInputProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helperText?: string;
  error?: string | null;
  disabled?: boolean;
  suppressSuggestions?: boolean;
  debounceMs?: number;
  minLength?: number;
  limit?: number;
  onSuggestionSelect?: (suggestion: LocationSuggestion) => void;
  onSubmit?: () => void;
  autoFillOnSelect?: boolean;
  size?: Size;
  className?: string;
  inputClassName?: string;
  listClassName?: string;
  listItemClassName?: string;
  loadingText?: string;
  emptyText?: string;
  inputRef?: React.Ref<HTMLInputElement | null>;
  getSuggestionKindLabel?: (kind?: string) => React.ReactNode;
}

const sizeStyles: Record<Size, { label: string; input: string; listItem: string }> = {
  md: {
    label: "text-sm font-medium text-slate-700",
    input: "rounded-xl px-3 py-2 text-sm",
    listItem: "px-3 py-2 text-sm",
  },
  lg: {
    label: "text-sm font-semibold text-slate-700",
    input: "rounded-2xl px-4 py-3 text-base",
    listItem: "px-4 py-3 text-sm",
  },
};

const LocationInput = forwardRef<LocationInputHandle, LocationInputProps>(
  (
    {
      id,
      label,
      value,
      onChange,
      placeholder,
      helperText,
      error,
      disabled = false,
      suppressSuggestions = false,
      debounceMs,
      minLength,
      limit,
      onSuggestionSelect,
      onSubmit,
      autoFillOnSelect = true,
      size = "md",
      className = "",
      inputClassName = "",
      listClassName = "",
      listItemClassName = "",
      loadingText = "Searching…",
      emptyText = locationCopy.geocodeGenericError,
      inputRef,
      getSuggestionKindLabel,
    },
    ref,
  ) => {
    const internalInputRef = useRef<HTMLInputElement | null>(null);
    const setInputRef = useCallback(
      (node: HTMLInputElement | null) => {
        internalInputRef.current = node;
        if (typeof inputRef === "function") {
          inputRef(node);
        } else if (inputRef && typeof inputRef === "object") {
          (inputRef as MutableRefObject<HTMLInputElement | null>).current = node;
        }
      },
      [inputRef],
    );

    const uniqueId = useId();
    const inputId = id ?? `location-input-${uniqueId}`;
    const listboxId = `${inputId}-listbox`;
    const statusMessageId = `${inputId}-status`;

    const {
      suggestions,
      isOpen,
      isLoading,
      error: suggestionError,
      activeIndex,
      setActiveIndex,
      comboboxRef,
      handleInputFocus,
      handleInputBlur,
      handleKeyDown,
      handleSuggestionPick,
      resetSuggestions,
    } = useLocationSuggestions({
      query: value,
      suppress: suppressSuggestions,
      debounceMs,
      minLength,
      limit,
      onSelect: (suggestion) => {
        if (autoFillOnSelect) {
          onChange(suggestion.name);
        }
        onSuggestionSelect?.(suggestion);
      },
      onSubmitWithoutSelection: () => {
        onSubmit?.();
      },
    });

    useImperativeHandle(
      ref,
      () => ({
        reset: () => resetSuggestions(),
        focusInput: () => {
          internalInputRef.current?.focus();
        },
      }),
      [resetSuggestions],
    );

    const [liveMessage, setLiveMessage] = useState("");
    const effectiveMinLength = minLength ?? 3;

    useEffect(() => {
      if (!isOpen) {
        setLiveMessage("");
        return;
      }

      if (activeIndex !== null && suggestions[activeIndex]) {
        const current = suggestions[activeIndex];
        setLiveMessage(`Suggestion ${activeIndex + 1} of ${suggestions.length}: ${current.name}`);
        return;
      }

      if (isLoading) {
        setLiveMessage(loadingText);
        return;
      }

      if (suggestionError) {
        setLiveMessage(suggestionError);
        return;
      }

      if (suggestions.length > 0) {
        setLiveMessage(`${suggestions.length} suggestion${suggestions.length === 1 ? "" : "s"} available.`);
        return;
      }

      if (value.trim().length >= effectiveMinLength) {
        setLiveMessage(emptyText);
        return;
      }

      setLiveMessage("");
    }, [activeIndex, effectiveMinLength, emptyText, isLoading, isOpen, loadingText, suggestionError, suggestions, value]);

    const shouldShowDropdown = isOpen && (suggestions.length > 0 || isLoading || !!suggestionError);

    const suggestionKindLabel = useCallback(
      (kind?: string) => {
        if (!kind) return null;
        if (getSuggestionKindLabel) return getSuggestionKindLabel(kind);
        return kind.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
      },
      [getSuggestionKindLabel],
    );

    const containerClasses = useMemo(() => ["space-y-2", className].filter(Boolean).join(" "), [className]);

    const currentSize = sizeStyles[size];
    const mergedInputClass = [
      "w-full border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/40 disabled:cursor-not-allowed disabled:opacity-60",
      currentSize.input,
      inputClassName,
    ]
      .filter(Boolean)
      .join(" ");

    const mergedListClass = [
      "absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white text-sm shadow-lg",
      size === "lg" ? "rounded-2xl" : "",
      listClassName,
    ]
      .filter(Boolean)
      .join(" ");

    const mergedListItemClass = [
      "flex w-full items-start gap-2 text-left transition",
      currentSize.listItem,
      listItemClassName,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={containerClasses}>
        {label && (
          <label htmlFor={inputId} className={currentSize.label}>
            {label}
          </label>
        )}
        <div
          ref={comboboxRef}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={shouldShowDropdown}
          aria-owns={shouldShowDropdown ? listboxId : undefined}
          aria-controls={listboxId}
          className="relative"
          onBlur={handleInputBlur}
        >
          <input
            id={inputId}
            ref={setInputRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onFocus={handleInputFocus}
            onKeyDown={(event) => {
              if (disabled) return;
              handleKeyDown(event);
            }}
            placeholder={placeholder}
            className={mergedInputClass}
            disabled={disabled}
            autoComplete="off"
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-activedescendant={
              shouldShowDropdown && activeIndex !== null && suggestions[activeIndex]
                ? `${listboxId}-option-${suggestions[activeIndex].id}`
                : undefined
            }
          />
          {shouldShowDropdown && (
            <ul id={listboxId} role="listbox" className={mergedListClass}>
              {suggestions.map((suggestion, index) => {
                const isActive = index === activeIndex;
                return (
                  <li key={suggestion.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      id={`${listboxId}-option-${suggestion.id}`}
                      className={`${mergedListItemClass} ${
                        isActive ? "bg-brand-primary/10 text-brand-primary" : "hover:bg-slate-100"
                      }`}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => handleSuggestionPick(suggestion)}
                    >
                      <span className="flex-1">{suggestion.name}</span>
                      {suggestion.kind && (
                        <span className="text-xs uppercase text-slate-500">{suggestionKindLabel(suggestion.kind)}</span>
                      )}
                    </button>
                  </li>
                );
              })}
              {isLoading && <li className="px-3 py-2 text-slate-500">{loadingText}</li>}
              {!isLoading && suggestionError && <li className="px-3 py-2 text-slate-500">{suggestionError}</li>}
            </ul>
          )}
        </div>
        {helperText && !error && <p className="text-xs text-slate-500">{helperText}</p>}
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <p id={statusMessageId} aria-live="polite" className="sr-only">
          {liveMessage}
        </p>
      </div>
    );
  },
);

LocationInput.displayName = "LocationInput";

export default LocationInput;
