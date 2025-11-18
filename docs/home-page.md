# Home Page

## Overview

The Home page (`/`) serves as the landing page and navigation hub for Civic Lifeline, providing clear entry points to all major tools and features.

**Location**: `apps/web/app/page.tsx`

## Page Structure

### Main Hero Section

Large card container with two-column grid layout:

#### Left Column
- Brand badge: "Civic Lifeline" (uppercase, tracking-wide)
- Headline: "Get help with food, jobs, and housing."
- Description: Explains Civic Lifeline's purpose and privacy commitment
- Three highlight points:
  1. Food help - "Find stores near you that take SNAP."
  2. Resume help - "Make a job resume step by step."
  3. Housing & bills - "Check rent, find counselors, and see utility info."
- Background: `civic-blue` with white text

#### Right Column
- Section label: "Start here" (uppercase, tracking-wide)
- Main heading: "What kind of help do you need today?"
- Subtext: "Pick one option so we can guide you right to the tool you need."
- **Triage Sections**: Three large action cards:
  1. **Food Help** (`/food`)
     - Color: `civic-green`
     - Description: "Find stores that take SNAP near you."
  2. **Resume Help** (`/resume`)
     - Color: `civic-blue`
     - Description: "Build a simple resume you can download."
  3. **Housing & Bills** (`/housing-utilities`)
     - Color: `amber-600`
     - Description: "See fair rent estimates, counselors, and utility information."
- Each card:
  - Large, clickable area
  - Icon with arrow (right arrow in circle)
  - Hover effects (scale, shadow)
  - Color-coded styling

### Additional Links Section

Below the main hero, a second section with:

- Section label: "Simple tools" (uppercase, tracking-wide)
- Heading: "Use these buttons to jump right in."
- Subtext: "Prefer a simple list? Tap one of the tools below to go straight to that page."
- **Simple Tool Links**: Five smaller cards in grid:
  1. **Food Help** (`/food`)
     - "Look up stores that take SNAP nearby."
  2. **Resume Help** (`/resume`)
     - "Make a job resume step by step."
  3. **Housing & Bills** (`/housing-utilities`)
     - "Check rent, counselors, and utility help."
  4. **Local Numbers** (`/stats`)
     - "View job and money numbers for your county."
  5. **Benefits Info.** (`/benefits`)
     - "See government programs you may qualify for."
- Each card:
  - Smaller, more compact design
  - White background with border
  - Hover effects (border color change, shadow)
  - "Go to {label}" link with arrow

### Additional Information Links

Within the right column, below triage sections:

- Two informational links:
  1. **Benefits & Programs** (`/benefits`)
     - "Not sure what government help you might get?"
     - Link: "See Benefits & Programs"
  2. **Local Numbers** (`/stats`)
     - "Want to see local job and money numbers?"
     - Link: "View local numbers"
- Each with bullet point indicator and arrow icon

## Design System

### Color Scheme
- **Food Help**: `civic-green` (green theme)
- **Resume Help**: `civic-blue` (blue theme)
- **Housing & Bills**: `amber-600` (amber/orange theme)
- **Background**: White with subtle borders and shadows
- **Text**: Slate colors (900 for headings, 600 for body)

### Typography
- Headings: Semibold, large sizes (3xl to 2.75rem)
- Body: Base to lg sizes
- Labels: Uppercase, tracking-wide, small text
- Consistent line heights and spacing

### Layout
- Max width: `85rem` (1360px)
- Rounded corners: `2.5rem` for main container, `2rem` for cards
- Shadows: Subtle, color-tinted shadows on action cards
- Spacing: Consistent gap system (gap-4, gap-8, gap-10, gap-12)

## Structured Data (SEO)

The page includes JSON-LD structured data for search engines:

### WebSite Schema
```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Civic Lifeline",
  "description": "Free tools and verified public data...",
  "url": "https://civiclifeline.org",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://civiclifeline.org/api/geocode/suggest?q={search_term_string}"
    }
  },
  "mainEntity": {
    "@type": "ItemList",
    "itemListElement": [
      { "position": 1, "name": "Food Help", "url": "/food" },
      { "position": 2, "name": "Resume Help", "url": "/resume" },
      { "position": 3, "name": "Housing & Bills", "url": "/housing-utilities" },
      { "position": 4, "name": "Local Numbers", "url": "/stats" }
    ]
  }
}
```

## Metadata

### Open Graph
- Title: "Civic Lifeline — Essential Resources & Tools"
- Description: "Free tools and verified public data for food assistance, housing help, job resources, and essential services across the United States."
- URL: "/"

### Standard Metadata
- Title: "Home"
- Description: "Find the help you need with free tools and verified data. Locate SNAP retailers, build resumes, find housing counselors, check utility costs, and view unemployment statistics."
- Canonical: "/"

## Responsive Design

### Mobile (< 640px)
- Single column layout
- Cards stack vertically
- Reduced padding and spacing
- Triage cards remain prominent

### Tablet (640px - 1024px)
- Two-column grid for triage sections
- Simple tool links: 2-3 columns
- Maintains readability

### Desktop (≥ 1024px)
- Full two-column hero layout
- Simple tool links: 5 columns
- Maximum width container
- Optimal spacing and typography

## Accessibility Features
- Semantic HTML structure
- ARIA labels where needed
- Keyboard navigation support
- Focus indicators on all interactive elements
- Color contrast meets WCAG standards
- Descriptive link text
- Clear heading hierarchy

## User Flow

### Primary Paths
1. **Food Assistance**: Click "Food Help" → `/food`
2. **Resume Building**: Click "Resume Help" → `/resume`
3. **Housing Resources**: Click "Housing & Bills" → `/housing-utilities`

### Secondary Paths
1. **Benefits Information**: Click "Benefits Info." or "See Benefits & Programs" → `/benefits`
2. **Local Statistics**: Click "Local Numbers" or "View local numbers" → `/stats`

### Entry Points
- Triage sections: Large, prominent, color-coded (primary entry)
- Simple tool links: Smaller, list-style (secondary entry)
- Informational links: Text links within content (tertiary entry)

## Component Architecture

### Main Component
- `HomePage`: Main page component (server component)
- Renders structured data scripts
- Defines page metadata

### No Client Components
- Entire page is server-rendered
- No interactive JavaScript required
- Fast initial load

## Performance
- Server-side rendered (SSR)
- No client-side JavaScript for core functionality
- Static content with Next.js optimization
- Fast Time to First Byte (TTFB)

## Related Documentation
- `docs/01-civic-lifeline-roadmap.md` - Product roadmap
- `docs/product/vision.md` - Product vision
- `docs/product/roadmap.md` - Development phases

