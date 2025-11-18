# Stats Page

## Overview

The Stats page (`/stats`) displays county-level unemployment trends and supporting economic indicators to help users understand local economic conditions.

**Location**: `apps/web/app/stats/page.tsx`

**Page Title**: "Local Safety Net"

## Page Structure

### Header Section
- Brand badge: "County Metrics"
- Page title: "Local Safety Net"
- Description: "Select a state and your county to see the latest unemployment trend from BLS LAUS, plus supporting indicators like poverty, SNAP usage, housing burden, and median wages."
- Source chip: Shows "BLS LAUS" and last updated timestamp

### Location Input
- Uses `HeroLocationCard` component
- Location shared via `SharedLocationProvider` context
- Auto-populates state and county selectors when location is set

### State and County Selectors
- **State Selector**: Dropdown with all US states
- **County Selector**: Dynamically loaded based on selected state
- County selector disabled until state is selected
- Counties fetched from `GET /api/counties?stateCode={code}`
- County names normalized (removes "County", "Parish", "Borough", etc. suffixes)

### Location Auto-Population
When a location is set via `HeroLocationCard`:
1. Location's state code/name resolved to state code
2. State selector automatically set
3. Counties for that state loaded
4. County name from location matched against county list (normalized comparison)
5. County selector automatically set
6. All metrics and chart update automatically

**Normalization Logic**:
- Removes " County", " Parish", " Borough", " Census Area", " Municipality", " City and Borough" suffixes
- Case-insensitive matching
- Handles edge cases (e.g., "St. Louis" vs "Saint Louis")

### Six Metric Cards

When a county is selected, six metric cards display:

#### 1. Poverty Statistics
- **Component**: `PovertyStatCard`
- **Data Source**: Census ACS
- **API**: `GET /api/stats/poverty?countyFips={fips}&stateFips={fips}`
- **Displays**:
  - Poverty rate (percentage)
  - Number of people in poverty
  - County name fallback if county FIPS missing

#### 2. Median Household Income
- **Component**: `MedianIncomeCard`
- **Data Source**: Census ACS
- **API**: `GET /api/stats/median-income?countyFips={fips}&stateFips={fips}`
- **Displays**:
  - Median household income (formatted as currency)
  - County name fallback if county FIPS missing

#### 3. SNAP Participation
- **Component**: `SnapParticipationCard`
- **Data Source**: Census ACS
- **API**: `GET /api/stats/snap-participation?countyFips={fips}&stateFips={fips}`
- **Displays**:
  - SNAP participation rate (percentage)
  - Number of households receiving SNAP

#### 4. Education Attainment
- **Component**: `EducationLevelCard`
- **Data Source**: Census ACS
- **API**: `GET /api/stats/education-attainment?countyFips={fips}&stateFips={fips}`
- **Displays**:
  - Percentage with Bachelor's degree or higher
  - Educational attainment breakdown

#### 5. Uninsured Rate
- **Component**: `UninsuredRateCard`
- **Data Source**: Census ACS
- **API**: `GET /api/stats/uninsured?countyFips={fips}&stateFips={fips}`
- **Displays**:
  - Uninsured rate (percentage)
  - Number of uninsured residents

#### 6. Housing Cost Burden
- **Component**: `HousingBurdenCard`
- **Data Source**: Census ACS
- **API**: `GET /api/stats/housing-burden?countyFips={fips}&stateFips={fips}`
- **Displays**:
  - Percentage spending >30% of income on housing
  - Number of cost-burdened households

**Card Layout**:
- Responsive grid: 1 column (mobile) → 2 columns (sm) → 3 columns (md) → 4 columns (lg) → 6 columns (xl)
- Each card shows metric value, label, and supporting context

### Unemployment Trend Chart

- **Component**: `TimeSeriesChart` (dynamically imported, client-side only)
- **Data Source**: BLS LAUS (Local Area Unemployment Statistics)
- **API**: `GET /api/jobs/unemployment?countyFips={fips}&start=2018&end=2025`
- **Time Range**: 2018-2025 (configurable)
- **Displays**:
  - Monthly unemployment rate over time
  - Interactive line chart
  - X-axis: Time (months/years)
  - Y-axis: Unemployment rate (percentage)
- **Loading State**: Skeleton loader (h-64, animate-pulse)
- **Empty State**: "No series available for this county yet. Try another location later."

## Data Flow

1. User enters location OR selects state/county manually
2. If location entered:
   - State code extracted from location
   - State selector set automatically
   - Counties loaded for that state
   - County name matched and selector set automatically
3. When county FIPS is available:
   - All six metric cards fetch data in parallel
   - Unemployment chart fetches time series data
4. Data displayed in cards and chart
5. Location changes trigger refetch of all data

## API Integration

### Unemployment Data
**Endpoint**: `GET /api/jobs/unemployment`

**Query Parameters**:
- `countyFips` (required): 5-digit county FIPS code
- `start` (default: 2018): Start year
- `end` (default: 2025): End year

**Response**:
```typescript
{
  source: "bls-laus",
  lastUpdated: "2024-01-01T00:00:00.000Z",
  points: [
    {
      date: "2018-01-01",
      value: 4.2,
      adjusted: boolean
    }
  ]
}
```

**Caching**: 5 minutes stale time (300,000ms)
**Retry**: 1 retry on failure
**Placeholder Data**: Shows previous results while fetching

### States and Counties
**States Endpoint**: `GET /api/states`
- Returns list of all US states
- Cached indefinitely (staleTime: Infinity)

**Counties Endpoint**: `GET /api/counties?stateCode={code}`
- Returns counties for selected state
- Cached indefinitely (staleTime: Infinity)
- Requires MongoDB connection

### Census Statistics
All six metric cards use Census ACS endpoints:
- `GET /api/stats/poverty`
- `GET /api/stats/median-income`
- `GET /api/stats/snap-participation`
- `GET /api/stats/education-attainment`
- `GET /api/stats/uninsured`
- `GET /api/stats/housing-burden`

**Common Parameters**:
- `countyFips` (required): 5-digit county FIPS
- `stateFips` (optional): 2-digit state FIPS
- `countyNameFallback` (optional): County name if FIPS missing

**Caching**: Varies by endpoint (typically 24h for Census data)

## Error Handling

- **BLS Unavailable**: Shows yellow alert:
  "BLS data is temporarily unavailable; showing last good results if available."
- **County Not Found**: Selector shows empty state
- **API Errors**: Individual cards handle errors gracefully
- **Missing Data**: Cards show "Not available" or fallback to state-level data

## Empty States

- **No County Selected**: 
  "Unemployment trends, poverty snapshot, SNAP participation, housing burden, income, and insurance gap metrics will appear after you add your location."
- **No Chart Data**: 
  "No series available for this county yet. Try another location later."
- **Loading States**: Skeleton loaders for chart, loading text for cards

## Accessibility Features
- State and county selectors keyboard navigable
- Chart has descriptive title
- Loading states announced
- Error messages announced via `aria-live="polite"`
- Source attribution visible
- Metric cards have semantic HTML structure

## Component Architecture

### Main Components
- `StatsPageContent`: Main page component
- `TimeSeriesChart`: Unemployment trend visualization (dynamic import)
- `PovertyStatCard`: Poverty statistics
- `MedianIncomeCard`: Median income statistics
- `SnapParticipationCard`: SNAP participation statistics
- `EducationLevelCard`: Education attainment statistics
- `UninsuredRateCard`: Uninsured rate statistics
- `HousingBurdenCard`: Housing cost burden statistics
- `HeroLocationCard`: Location input
- `SourceChip`: Source attribution component

### Shared Components
- `SharedLocationProvider`: Context for location state
- `LocationInputWithGeocode`: Geocoding input with autocomplete

## Responsive Design

- **Mobile**: Single column, stacked layout
- **Tablet**: 2-3 columns for metric cards
- **Desktop**: Up to 6 columns for metric cards
- Chart full width on all screen sizes
- State/county selectors stack on mobile

## Performance Optimizations

- Chart component dynamically imported (code splitting)
- Parallel fetching of all metric cards
- React Query caching (5min for unemployment, longer for Census)
- Placeholder data prevents layout shift
- County list cached indefinitely
- State list cached indefinitely

## Related Documentation
- `docs/architecture/data-sources.md` - BLS LAUS and Census ACS data sources
- `STATS_PAGE_ENV_SETUP.md` - Environment setup for MongoDB connection

