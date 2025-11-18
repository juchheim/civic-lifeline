# Food Page

## Overview

The Food page (`/food`) helps users find stores that accept SNAP (Supplemental Nutrition Assistance Program) benefits near their location.

**Location**: `apps/web/app/food/page.tsx`

## Page Structure

### Hero Section
- Brand badge: "Food Help"
- Page title: "Find food retailers who accept SNAP."
- Description: "Tap **Use my current location** to see stores that accept EBT."
- Location input: `HeroLocationCard` component
- Privacy notice: "We don't save your location."

### Main Content Area

#### Left Column (Desktop)
- Location input card
- Store type filter chips (appears after location is set and map is interactive)

#### Right Column (Desktop)
- Interactive map view (Leaflet)
- Scrollable retailer list
- Overlay states for location confirmation

## Features

### Location Input
- Uses `HeroLocationCard` component
- Step label: "STEP 1: ADD YOUR CITY OR ZIP"
- Supports:
  - Current location (geolocation API)
  - Manual address/ZIP input with autocomplete
  - Geocoding via Nominatim (OpenStreetMap)
- Location shared via `SharedLocationProvider` context

### Interactive Map
- **Component**: `MapView` (dynamically imported, client-side only)
- **Library**: Leaflet
- **Features**:
  - Displays SNAP retailers as map markers
  - Bounding box (bbox) based queries
  - Debounced updates (400ms) when map is panned/zoomed
  - Focus handling: clicking a store in list highlights marker on map
  - Initial center set from user's location
  - Height: 31rem (496px)

### Store Type Filtering
- Filter chips appear after location is set and map is interactive
- Chips dynamically generated from available store types in results
- Each chip:
  - Shows store type name (e.g., "Supermarket", "Convenience Store")
  - Checkbox-style toggle (checked/unchecked)
  - Clicking toggles filter on/off
  - Selected filters highlighted with brand-primary color
- Filtering updates both map markers and retailer list
- Multiple filters can be active simultaneously

### Retailer List
- Scrollable list (height: calc(31rem - 5rem) when interactive)
- Displays all retailers matching current filters
- Each retailer shown in `StoreCard` component with:
  - Store name
  - Address
  - Store type
  - Distance (if available)
- Clicking a store:
  - Highlights corresponding marker on map
  - Scrolls map section into view (smooth scroll)
- Shows count: "{N} {match|matches}"
- Empty state when no results
- Loading skeleton while fetching

### Overlay States

The page uses three overlay states to guide users:

1. **"awaiting"** (default)
   - Shown when no location is set
   - Message: "Turn on location or type an address to unlock the map."
   - Map and list are disabled (opacity: 60%)

2. **"confirming"**
   - Shown immediately after location is set
   - Message: "Location on — showing stores near you."
   - Displays for 1.5 seconds
   - Crosshair icon

3. **"hidden"**
   - Shown after confirmation period
   - Map and list become fully interactive
   - Overlay fades out (opacity transition)

### Focus Handling
- When a store is focused (clicked in list):
  - Store details copied to `focusedItem` state
  - Map scrolls into view smoothly
  - Map marker for that store is highlighted
- Focus clears when filters change
- Map section has `tabIndex={-1}` for programmatic focus

## Data Flow

1. User enters location (geolocation or manual input)
2. Location stored in `SharedLocationContext`
3. Initial map center set from location coordinates
4. Map viewport changes trigger bbox calculation
5. Bbox debounced (400ms) to prevent excessive API calls
6. API call: `GET /api/food/snap?bbox={bbox}&types={types}&limit=300`
7. Results displayed on map and in list
8. Store type filters extracted from results
9. Filter changes trigger new API call with updated types parameter

## API Integration

### Endpoint
`GET /api/food/snap`

**Query Parameters**:
- `bbox` (required): Bounding box as comma-separated string `minLon,minLat,maxLon,maxLat`
- `types` (optional): Comma-separated store types to filter
- `limit` (default: 300): Maximum number of results

**Response**:
```typescript
{
  source: "usda-snap-arcgis",
  lastUpdated: "2024-01-01T00:00:00.000Z",
  items: [
    {
      id: string,
      name: string,
      address: string,
      city?: string,
      state?: string,
      zip?: string,
      latitude: number,
      longitude: number,
      storeType?: string,
      // ... other fields
    }
  ]
}
```

**Caching**: 60 seconds stale time (React Query)
**Retry**: 1 retry on failure
**Placeholder Data**: Shows previous results while fetching new ones

## Error Handling

- **API Errors**: Shows user-friendly message:
  "USDA data is temporarily unavailable; showing last good results if available."
- **No Results**: Shows `EmptyState` component with contextual message
- **Geocoding Errors**: Handled by `LocationInputWithGeocode` component
- **Map Errors**: Map shows empty state if no retailers found

## Empty States

- **No Location**: "No location yet. Add one to unlock local results."
- **No Results**: `EmptyState` component with food-specific messaging
- **Loading**: Skeleton loaders in retailer list

## Source Attribution

Footer text: "Search by Nominatim, © OpenStreetMap contributors."

## Accessibility Features
- Map has `aria-label="Map of SNAP retailers"`
- Store cards keyboard navigable
- Focus indicators visible
- Loading states announced via `aria-live="polite"`
- Error messages announced via `aria-live="polite"`
- Filter chips have `aria-pressed` attributes

## Component Architecture

### Main Components
- `FoodPageContent`: Main page component
- `MapView`: Leaflet map component (dynamic import)
- `StoreCard`: Individual retailer display
- `HeroLocationCard`: Location input
- `EmptyState`: Contextual empty states

### Shared Components
- `SharedLocationProvider`: Context for location state
- `LocationInputWithGeocode`: Geocoding input with autocomplete

## Responsive Design

- **Mobile**: Single column, stacked layout
- **Desktop**: Two-column grid (location/filters | map/list)
- Map and list side-by-side on desktop (xl breakpoint)
- Store type filters wrap on smaller screens

## Performance Optimizations

- Map component dynamically imported (code splitting)
- Bbox changes debounced (400ms)
- React Query caching (60s stale time)
- Placeholder data prevents layout shift
- Map markers only rendered for visible retailers
- List virtualization not implemented (opportunity for improvement with large result sets)

## Related Documentation
- `docs/architecture/data-sources.md` - USDA SNAP data source
- `docs/architecture/address-autocomplete.md` - Geocoding implementation

