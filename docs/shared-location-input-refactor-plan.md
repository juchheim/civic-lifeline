# Shared Location Input Components Refactor Plan

## Problem Statement

Three major page components (`food/page.tsx`, `housing/HousingExperience.tsx`, `broadband/BroadbandExperience.tsx`) contain nearly identical code for:
- Location input with autocomplete suggestions
- Geocoding functionality
- Keyboard navigation (Arrow keys, Enter, Escape)
- Debounced value handling
- Suggestion state management

This duplication makes the codebase harder to maintain, test, and extend. A bug fix or enhancement requires changes in 3+ places.

## Current State Analysis

### Duplicated Code Patterns

1. **`useDebouncedValue` hook** - Duplicated in all 3 files
   - `food/page.tsx` (lines 26-33)
   - `housing/HousingExperience.tsx` (lines 43-50)
   - `broadband/BroadbandExperience.tsx` (lines 20-27)

2. **Suggestion fetching logic** - Nearly identical across all 3
   - Same API endpoint: `/api/geocode/suggest`
   - Same error handling (404, 429, generic errors)
   - Same state management (suggestions, loading, error, activeIndex)
   - Same debounce threshold (350ms)
   - Same minimum query length (3 characters)

3. **Keyboard navigation** - Duplicated logic
   - ArrowDown/ArrowUp for navigation
   - Enter to select
   - Escape to close
   - Same index wrapping logic

4. **Suggestion state management** - Same pattern everywhere
   - `suggestions: Suggestion[]`
   - `isSuggestionOpen: boolean`
   - `isSuggestLoading: boolean`
   - `suggestError: string | null`
   - `activeSuggestionIndex: number | null`
   - `suppressSuggestions: boolean`

5. **Geocoding logic** - Similar patterns
   - Manual geocode on Enter/submit
   - Error handling
   - Location selection callbacks

### File Sizes
- `food/page.tsx`: 773 lines (20+ useState hooks)
- `housing/HousingExperience.tsx`: 775 lines
- `broadband/BroadbandExperience.tsx`: 425 lines

## Proposed Solution

Extract shared location input functionality into reusable components and hooks.

### New Shared Components & Hooks

_Implementation status: Debounce/suggestion hooks plus both LocationInput components are implemented and integrated into food, housing, and broadband pages. Remaining work lives in Phase 5 (code cleanup/tests/documentation)._

#### 1. `hooks/useDebouncedValue.ts`
**Purpose**: Shared debounce hook (used in 3+ places)
**Status**: ✅ Implemented at `apps/web/hooks/useDebouncedValue.ts` and now imported by `food/page.tsx`, `housing/HousingExperience.tsx`, and `broadband/BroadbandExperience.tsx` (no more inline copies).

```typescript
export function useDebouncedValue<T>(value: T, delayMs: number): T
```

**Location**: `apps/web/hooks/useDebouncedValue.ts`

#### 2. `hooks/useLocationSuggestions.ts`
**Purpose**: Manages suggestion fetching, state, and keyboard navigation
**Status**: ✅ Implemented at `apps/web/hooks/useLocationSuggestions.ts` and wired into `food/page.tsx`, `housing/HousingExperience.tsx`, and `broadband/BroadbandExperience.tsx`, replacing their inline fetching and keyboard logic.

**Returns**:
```typescript
{
  suggestions: Suggestion[];
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  activeIndex: number | null;
  handleKeyDown: (event: KeyboardEvent) => void;
  handleSuggestionPick: (suggestion: Suggestion) => void;
  handleInputFocus: () => void;
  handleInputBlur: (event: FocusEvent) => void;
  openSuggestions: () => void;
  closeSuggestions: () => void;
}
```

**Location**: `apps/web/hooks/useLocationSuggestions.ts`

**Features**:
- Debounced suggestion fetching
- AbortController for cleanup
- Error handling (404, 429, generic)
- Keyboard navigation (ArrowUp/Down, Enter, Escape)
- Minimum query length validation
- Suppress suggestions flag

#### 3. `components/LocationInput.tsx`
**Purpose**: Complete location input with autocomplete dropdown
**Status**: ✅ Implemented at `apps/web/components/LocationInput.tsx` and used by `food/page.tsx`, `housing/HousingExperience.tsx`, and `broadband/BroadbandExperience.tsx` to render the shared input/dropdown UI while delegating suggestion logic to the hook.

**Props**:
```typescript
{
  value: string;
  onChange: (value: string) => void;
  onLocationSelect: (lat: number, lon: number) => void;
  onGeocode?: (query: string) => Promise<{ lat: number; lon: number }>;
  placeholder?: string;
  label?: string;
  error?: string | null;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
}
```

**Location**: `apps/web/components/LocationInput.tsx`

**Features**:
- Input field with autocomplete
- Suggestion dropdown
- Keyboard navigation
- ARIA attributes for accessibility
- Error display
- Loading states

#### 4. `components/LocationInputWithGeocode.tsx`
**Purpose**: Location input that handles geocoding internally
**Status**: ✅ Implemented at `apps/web/components/LocationInputWithGeocode.tsx` and adopted by the food manual search form plus the housing primary search input to centralize `/api/geocode` calls and loading/error handling (broadband does not need geocoding).

**Props**:
```typescript
{
  value: string;
  onChange: (value: string) => void;
  onLocationSelect: (lat: number, lon: number) => void;
  geocodeEndpoint?: string; // defaults to '/api/geocode'
  placeholder?: string;
  label?: string;
  error?: string | null;
  disabled?: boolean;
}
```

**Location**: `apps/web/components/LocationInputWithGeocode.tsx`

**Features**:
- Everything from `LocationInput`
- Built-in geocoding on Enter/submit
- Error handling for geocoding failures

#### 5. `types/location.ts`
**Purpose**: Shared types for location functionality
**Status**: ✅ Implemented at `apps/web/types/location.ts` and consumed by `food`, `housing`, and `broadband` pages to eliminate duplicated type definitions.

```typescript
export type LocationSuggestion = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  kind: string;
};

export type LocationSelection = {
  label: string;
  lat: number;
  lon: number;
  postalCode?: string;
};
```

**Location**: `apps/web/types/location.ts`

## Refactoring Steps

### Phase 1: Extract Shared Utilities
1. [x] Create `hooks/useDebouncedValue.ts`
2. [x] Create `types/location.ts`
3. [x] Update all 3 files to use shared hook and types
4. [x] Test that functionality is unchanged

### Phase 2: Extract Suggestion Hook
1. [x] Create `hooks/useLocationSuggestions.ts`
2. [x] Extract suggestion fetching logic
3. [x] Extract keyboard navigation logic
4. [x] Update `food/page.tsx` to use new hook
5. [x] Test food page functionality
6. [x] Update `housing/HousingExperience.tsx` to use new hook
7. [x] Test housing page functionality
8. [x] Update `broadband/BroadbandExperience.tsx` to use new hook
9. [x] Test broadband page functionality

### Phase 3: Extract Location Input Component
1. [x] Create `components/LocationInput.tsx`
2. [x] Extract input field and dropdown UI
3. [x] Integrate with `useLocationSuggestions` hook
4. [x] Update `food/page.tsx` to use component
5. [x] Test food page
6. [x] Update `housing/HousingExperience.tsx` to use component
7. [x] Test housing page
8. [x] Update `broadband/BroadbandExperience.tsx` to use component
9. [x] Test broadband page

### Phase 4: Extract Geocoding Component (Optional)
1. [x] Create `components/LocationInputWithGeocode.tsx`
2. [x] Extract geocoding logic
3. [x] Update pages that need geocoding (food manual entry + housing search)
4. [x] Test all affected pages

### Phase 5: Cleanup
1. [x] Remove duplicate code from all 3 files
2. [x] Verify no functionality regressions (typecheck, lint, smoke tests)
3. [x] Update tests if needed (none required beyond shared lint/typecheck)
4. [x] Update documentation

## Benefits

### Immediate Benefits
- **Reduced code duplication**: ~200-300 lines of duplicate code eliminated
- **Easier maintenance**: Bug fixes and enhancements in one place
- **Better testability**: Shared components can be tested in isolation
- **Consistent UX**: All location inputs behave identically

### Long-term Benefits
- **Easier to add new features**: New location-based pages can reuse components
- **Better accessibility**: ARIA attributes centralized and consistent
- **Performance**: Shared components can be optimized once
- **Type safety**: Shared types prevent inconsistencies

## Migration Strategy

### Backward Compatibility
- Keep existing functionality working during migration
- Migrate one page at a time
- Test thoroughly after each migration

### Testing Checklist
For each page after refactoring:
- [ ] Location input accepts text
- [ ] Suggestions appear after 3+ characters
- [ ] Keyboard navigation works (ArrowUp/Down, Enter, Escape)
- [ ] Mouse selection works
- [ ] Error states display correctly
- [ ] Loading states display correctly
- [ ] Geocoding works (where applicable)
- [ ] Location selection triggers correct callbacks
- [ ] Accessibility (screen reader, keyboard-only navigation)

## Estimated Impact

### Code Reduction
- **Before**: ~1,973 lines across 3 files (with duplication)
- **After**: ~1,200 lines (shared components + page-specific logic)
- **Savings**: ~773 lines (~39% reduction)

### Complexity Reduction
- **Before**: 20+ useState hooks in food page alone
- **After**: 5-8 useState hooks per page (page-specific state only)
- **Maintainability**: Single source of truth for location input logic

## Risks & Mitigation

### Risk: Breaking existing functionality
**Mitigation**: 
- Migrate one page at a time
- Comprehensive testing after each step
- Keep old code until new code is verified

### Risk: Over-abstracting
**Mitigation**:
- Start with minimal abstraction
- Only extract truly shared patterns
- Allow page-specific customization via props

### Risk: Performance regression
**Mitigation**:
- Profile before and after
- Use React.memo where appropriate
- Optimize shared hooks

## Success Criteria

1. [ ] All 3 pages work identically to before refactoring
2. [ ] No duplicate location input code remains
3. [ ] Shared components are reusable for future pages
4. [ ] Tests pass (or new tests added for shared components)
5. [ ] Code is easier to understand and maintain

## Next Steps

1. Review and approve this plan
2. Create shared utilities (Phase 1)
3. Extract suggestion hook (Phase 2)
4. Extract location input component (Phase 3)
5. Clean up and document (Phase 5)

## Notes

- Food page has additional complexity (geolocation, map integration) that should remain page-specific
- Housing page has two search flows (counselors + FMR) that can share location input
- Broadband page is simpler and will benefit most from shared components
