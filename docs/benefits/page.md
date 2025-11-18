# Benefits Page

## Overview

The Benefits page (`/benefits`) provides plain-language guides to government benefit programs, helping users understand what assistance they may qualify for and how to find local help.

**Location**: `apps/web/app/benefits/page.tsx` and `BenefitsClient.tsx`

## Page Structure

### Hero Section
- Brand badge: "BENEFITS"
- Page title: "Benefits help all in one place."
- Description: Explains that users should add their location to see local help
- Location input: `HeroLocationCard` component
- Important notice: Explains that users don't apply for benefits on this page; Civic Lifeline explains programs and sends users to official sites

### Four Benefit Sections

The page is organized into four main sections, each with its own accordion panel:

#### 1. Food and Money Help (`id: "food-money"`)
- **Label**: "Food and Money Help"
- **Description**: "SNAP, WIC, food boxes, and cash relief."
- **Pill text**: "Food and cash basics"
- **Icon**: Utensils

**Features**:
- Local help search with three categories:
  - SNAP food help
  - WIC for moms & kids
  - Cash help for bills
- Collapsible guide section with:
  - What this can help with
  - Good to know before you start
  - Next steps
  - Official links
  - Related tools on Civic Lifeline
- Program basics cards explaining SNAP, WIC, and cash assistance

**API Integration**:
- `POST /api/benefits/local-help` with `kind: "food" | "kids" | "cash"`
- See `docs/benefits/local-help.md` for API details

#### 2. Health Coverage (`id: "health-coverage"`)
- **Label**: "Health Coverage"
- **Description**: "Medicaid, CHIP, and Marketplace choices."
- **Pill text**: "Health coverage options"
- **Icon**: HeartPulse

**Features**:
- Health coverage metrics panel showing uninsured rates:
  - County-level (if available)
  - State-level
  - National comparison
- Quick coverage check form:
  - City or ZIP
  - People in your home
  - Monthly income before taxes
  - Age (optional)
- Health check results showing:
  - Coverage band (likely_medicaid_or_chip, likely_marketplace_with_savings, etc.)
  - Federal poverty level percentage
  - Program hints
  - Next steps
  - Official links (HealthCare.gov, Medicaid.gov)
- Local help search for health coverage assisters
- Collapsible guide section

**API Integration**:
- `POST /api/benefits/health-check` - Quick eligibility check
- `POST /api/benefits/local-help` with `kind: "health"`
- `GET /api/stats/uninsured` - Uninsured rate statistics

#### 3. Housing, Bills, and Daily Support (`id: "daily-support"`)
- **Label**: "Housing, Bills, and Daily Support"
- **Description**: "Rent, utilities, childcare, and daily basics."
- **Pill text**: "Help with housing and bills"
- **Icon**: Home

**Features**:
- Overview of available help:
  - Housing vouchers, public housing lists, emergency rent help
  - Energy, water, phone, internet discount programs
  - Subsidized childcare, school meals, daily support
- Local help search buttons:
  - Housing
  - Bills
  - Kids & families
- Link to housing data page (`/housing-utilities`)
- Collapsible guide section
- Official links (LIHEAP, HUD, housing counselors)

**API Integration**:
- `POST /api/benefits/local-help` with `kind: "housing" | "bills" | "kids"`

#### 4. Social Security and Disability (`id: "security-disability"`)
- **Label**: "Social Security and Disability"
- **Description**: "SSI, SSDI, survivors, and veterans help."
- **Pill text**: "Social Security basics"
- **Icon**: ShieldCheck

**Features**:
- Social Security statistics panel:
  - Total people receiving benefits in state
  - Share of all residents
  - Share of residents 65+
  - Data source and vintage
- Social Security offices panel (SSA office locator)
- Local help search buttons:
  - Social Security
  - Veterans
- SSI vs SSDI explanation card
- Collapsible guide section
- Official links (SSA.gov, disability benefits, appeals)

**API Integration**:
- `GET /api/benefits/state-social-security?stateCode={code}` - State statistics
- `POST /api/benefits/local-help` with `kind: "social-security" | "veterans"`

## Navigation

### Desktop (≥1024px)
- Sticky sidebar navigation on the left
- Vertical list of four benefit section buttons
- Active section highlighted with brand-primary background
- Scroll spy automatically highlights active section

### Mobile (<1024px)
- Horizontal navigation pills above content
- Scrollable row of section buttons

## State Management

### Location
- Uses `BenefitsLocationProvider` context (separate from `SharedLocationProvider`)
- Location input in hero section
- Location shared across all benefit sections
- Auto-populates local help searches when location is set

### Open Sections
- Default: Only primary section (Food and Money Help) open on mobile
- Desktop: All sections open by default
- Users can toggle individual sections
- Sections expand/collapse independently

### Active Section
- Tracks which section is currently in view
- Updated via scroll spy (IntersectionObserver)
- Active section highlighted in navigation and panel

## Scroll Spy Implementation
- Uses `IntersectionObserver` API
- Observes all benefit section elements
- Root margin: `-32% 0px -50% 0px`
- Thresholds: `[0, 0.2, 0.4, 0.6]`
- Finds most visible section and sets as active
- Disabled during manual navigation (600ms cooldown)

## Local Help Search

All sections use the same local help search pattern:

1. User adds location in hero section
2. Section-specific search buttons trigger `POST /api/benefits/local-help`
3. Results displayed in `BenefitLocalHelpList` component
4. Results include:
   - Name, address, phone, website
   - Distance in miles
   - Source attribution (CareerOneStop or sample data)
5. Disclaimer: "Program info comes from American Job Centers and official agencies"

See `docs/benefits/local-help.md` for API details.

## Health Coverage Check

The Health Coverage section includes a quick eligibility check:

1. User fills form: location, household size, monthly income, age (optional)
2. Form submits to `POST /api/benefits/health-check`
3. Response includes:
   - Coverage band (likely_medicaid_or_chip, likely_marketplace_with_savings, etc.)
   - Summary text
   - Federal poverty level percentage
   - Program hints (next steps)
   - Disclaimers
   - Data source and vintage
4. Results displayed in `HealthCheckResultCard` component

**Important**: This is a quick check, not a final decision. Only official agencies can determine eligibility.

## Social Security Statistics

The Social Security section displays state-level statistics:

1. Location determines state code
2. Fetches `GET /api/benefits/state-social-security?stateCode={code}`
3. Displays:
   - Total people receiving benefits
   - Share of all residents (percentage)
   - Share of residents 65+ (percentage)
   - Total people 65+ receiving benefits
4. Shows data source and vintage
5. Falls back to example state (MS) if no location set

## Print-Friendly Styles

The page includes print-specific CSS:
- Hides header, footer, and navigation on print
- Shows only active benefit panel
- Prevents page breaks inside sections
- Optimized for printing benefit guides

## Accessibility Features
- Accordion buttons: `<button>` with `aria-expanded`, `aria-controls`
- Focus management: moves to content when panel expands
- Keyboard navigation: full keyboard support
- Screen reader announcements: proper ARIA labels
- Visible focus indicators
- Form validation with accessible error messages

## Component Architecture

### Main Components
- `BenefitsClient`: Main page component with state management
- `BenefitPanel`: Reusable accordion panel component
- `FoodAndMoneyPanel`: Food and money help content
- `HealthCoveragePanel`: Health coverage content
- `BillsHousingPanel`: Housing and bills content
- `SecurityDisabilityPanel`: Social Security content

### Shared Components
- `HeroLocationCard`: Location input with geocoding
- `BenefitsLocationProvider`: Context for location state
- `BenefitLocalHelpList`: Displays local help search results
- `CollapsibleGuideSection`: Expandable guide content
- `SocialSecurityOfficesPanel`: SSA office locator
- `HealthCoverageMetricsPanel`: Uninsured rate display

## Data Flow

1. User enters location in hero section
2. Location stored in `BenefitsLocationContext`
3. All four benefit sections receive location via props
4. Each section can trigger local help searches independently
5. React Query caches search results per section
6. Location changes trigger refetch in all sections

## Related Documentation
- `docs/benefits/local-help.md` - Local help API endpoint
- `docs/architecture/data-sources.md` - Data source information

