# Housing & Utilities Experience

## Purpose
- Consolidated page combining Housing, Broadband, and Utilities tools into one unified experience.
- Three service sections: Housing Support, Internet & Broadband, and Utilities Assistance.
- Shared location input across all services for consistent user experience.
- Accordion-style panels with expand/collapse functionality.

## Current Implementation

### Page Structure
**Location**: `apps/web/app/housing-utilities/page.tsx` and `HousingUtilitiesClient.tsx`

### Three Service Sections
1. **Housing Support** (`id: "housing"`)
   - Label: "Housing Support"
   - Pill text: "Find rent limits and counselors"
   - Icon: Home
   - Component: `HousingExperience` (dynamically imported)
   - Features: HUD counselors, Fair Market Rent data

2. **Internet & Broadband** (`id: "internet"`)
   - Label: "Internet & Broadband"
   - Pill text: "Find coverage and speeds"
   - Icon: Wifi
   - Component: `BroadbandExperience` (dynamically imported)
   - Features: FCC broadband coverage statistics

3. **Utilities Assistance** (`id: "utilities"`)
   - Label: "Utilities Assistance"
   - Pill text: "Find costs and providers"
   - Icon: Droplets
   - Component: `UtilitiesExperience` (dynamically imported)
   - Features: Electric, gas, and water provider directories and cost estimates

### Layout Components

#### 1. Hero Section
- Two-column grid layout (desktop) / stacked (mobile)
- Left column:
  - Brand badge ("Housing & Utilities")
  - Page title: "Everything you need to know before renting or buying."
  - Description text
  - `HeroLocationCard` component for location input
  - "Jump to a service" button with dropdown menu
- Right column:
  - "Why it matters" section with highlight points
  - Info card: "Simple help in one place"

#### 2. Navigation
**Desktop (≥1024px)**:
- Sticky sidebar navigation (left column, ~32% width)
- Vertical list of service buttons
- Active section highlighted with brand-primary background
- "Expand all" and "Collapse to housing" controls
- Scroll spy automatically highlights active section

**Mobile (<1024px)**:
- Horizontal pill selector above content
- Scrollable row of service buttons
- "Expand all" and "Collapse to housing" controls below pills

#### 3. Service Panels
- Accordion-style panels with smooth expand/collapse
- Each panel:
  - Header button with icon, label, and chevron
  - Optional status chip ("New layout", "Coming soon")
  - Collapsible content area
  - Focus management: moves focus to content when expanded
- Active panel highlighted with ring border

#### 4. Jump Menu
- Button in hero section: "Jump to a service"
- Dropdown menu (portal) with all three services
- Clicking a service:
  - Expands that section if collapsed
  - Scrolls to section smoothly
  - Sets as active section
- Menu closes on outside click or Escape key

### State Management

#### Open Sections
- Default: Only primary section (Housing) open on mobile
- Desktop: All sections open by default
- Users can toggle individual sections
- "Expand all" opens all sections
- "Collapse to housing" closes all except Housing

#### Active Section
- Tracks which section is currently in view
- Updated via scroll spy (IntersectionObserver)
- Manual navigation temporarily disables scroll spy
- Active section highlighted in navigation and panel

#### Location Sharing
- Uses `SharedLocationProvider` context
- Location input in hero shared across all three services
- Each service component receives `location` and `promptForLocation` props
- Location persists across service switches

### Scroll Spy Implementation
- Uses `IntersectionObserver` API
- Observes all service section elements
- Root margin: `-25% 0px -55% 0px`
- Thresholds: `[0, 0.2, 0.4, 0.6]`
- Finds most visible section and sets as active
- Disabled during manual navigation (1 second cooldown)

### Responsive Behavior
- **Mobile (<1024px)**:
  - Single column layout
  - Horizontal navigation pills
  - Only primary section open by default
  - Jump menu in hero
  
- **Desktop (≥1024px)**:
  - Two-column layout (nav sidebar + content)
  - Vertical navigation sidebar
  - All sections open by default
  - Sticky navigation sidebar

## Accessibility Features
- Accordion buttons: `<button>` with `aria-expanded`, `aria-controls`
- Focus management: moves to content when panel expands
- Keyboard navigation: full keyboard support for all controls
- Skip links: jump menu provides quick navigation
- Screen reader announcements: proper ARIA labels and live regions
- Visible focus indicators on all interactive elements

## Component Architecture

### Main Components
- `HousingUtilitiesClient`: Main page component with state management
- `ServicePanel`: Reusable accordion panel component
- `HousingExperience`: Housing-specific content (imported from `/housing`)
- `BroadbandExperience`: Broadband-specific content (imported from `/broadband`)
- `UtilitiesExperience`: Utilities-specific content

### Shared Components
- `HeroLocationCard`: Location input with geocoding
- `SharedLocationProvider`: Context for location state
- `LocationInputWithGeocode`: Geocoding input component

## Data Flow
1. User enters location in hero section
2. Location stored in `SharedLocationContext`
3. All three service components receive location via props
4. Each service component fetches its own data using location
5. React Query caches data per service independently
6. Location changes trigger refetch in all services

## Future Enhancements
- Additional service sections can be added via `BASE_SERVICE_CONFIGS` array
- Status chips ("New layout", "Coming soon") for experimental features
- Optional service-specific location overrides
- Analytics tracking for section usage

