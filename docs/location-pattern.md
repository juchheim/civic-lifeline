# Location pattern – address / ZIP + "Use my current location"

Use this pattern on every Civic Lifeline page that needs local results
(**Benefits**, **Food**, **Housing & Utilities**, etc.).  
Goal: make “set your location first” obvious, calm, and consistent.

---

## 1. Where it lives

- The location UI always sits in the hero, directly under the H1 + subhead.
- When the hero has extra content (important notes, maps, etc.), the location card remains the primary element on the left.

Recommended scan order:

> Logo → Nav → H1 → Subhead → **Location card (Step 1)** → rest of page (Step 2 / Step 3).

---

## 2. Shared implementation

- Wrap pages that need location with `SharedLocationProvider` (`apps/web/components/location/SharedLocationContext.tsx`).
- Render the hero card with `HeroLocationCard` (`apps/web/components/location/HeroLocationCard.tsx`).
- Do **not** duplicate geolocation logic, storage, or markup in individual pages.
- Persist the selection client-side only (context + `localStorage`). Never store exact addresses on the backend.

---

## 3. Card structure (canonical copy)

- Optional step chip: `STEP 1: ADD YOUR CITY OR ZIP`
- Heading: `Add your city or ZIP one time.`
- Description (when used): `We use this to show nearby programs and stats. We do not save your address.`
- Input row:
  - Label: **Address or ZIP code**
  - Placeholder: **E.g. 39194 or 123 Main St**
  - Inline action on the right: icon + **Use my current location** (subtle pill, secondary emphasis)
- Helper text (beneath input): **City, county, or ZIP all work.**
- Status line:
  - Empty: **No location yet. Add one to unlock local results.**
  - Filled: **Using: {short place name}.** Optionally append a small `Change` affordance that focuses the input.
- Styling: slightly stronger border/elevation than generic inputs, but stay within existing color tokens.

The Benefits hero is the canonical reference. Food and Housing & Utilities reuse the exact component and strings.

### Two modes

- **Input mode** (default): shows the address/ZIP field, helper text, and the `Use my current location` control until a location is set.
- **Summary mode** (active location): replaces the input with a calm status row — `Using: {location}` on the left and a `Clear location` button on the right — while keeping the card size identical.
- The same `HeroLocationCard` component powers `/benefits`, `/food`, `/housing-utilities`, and `/stats`, so setting the location on one page shows the summary on the others immediately.
- Clearing the location resets the shared store, switches every page back to input mode, and removes the persisted value.

---

## 4. Behavior rules

- **Use my current location** invokes the browser geolocation API (high accuracy).
- All pages read/write location through the shared provider—no custom hooks or local storage keys per page.
- When a saved location exists:
  - Prefill the status immediately.
  - Only overwrite the input after the user picks a suggestion or geolocation succeeds (no silent changes).
- Handle errors with shared strings from `config/locationCopy.ts`.
- Clearing the location removes the stored value and resets the card.

---

## 5. Page-specific notes

### Benefits

- Keep the hero subhead copy:  
  `Add your city or ZIP to see local help for {topics}. Then use the simple guides below for next steps.`
- The “Important to know” card stays separate and must not host another location input.

### Food

- Hero uses the shared card (no standalone button or manual form).
- Map + retailers read from the shared location:
  - No location → overlay: “Turn on location or type an address to unlock the map.”
  - Location set → pan map & fetch nearby retailers.
- Keep the privacy line: `We don't save your location.`

### Housing & Utilities

- Hero uses the shared card; Housing, Broadband, and Utilities panels consume the shared state.
- Panel “Change location” actions call `promptForLocation` (scroll+focus the hero card).
- Advanced overrides (radius, coordinates, FIPS) live inside the Housing panel only and augment the shared location.

### Stats

- Hero uses the shared card to capture address/ZIP and map it into the State + County selectors.
- When a location is set, `/stats` pre-fills the selectors with the derived state + county while still allowing manual exploration of other counties.

---

## 6. UX constraints

- The card should feel important but calm:
  - No loud primary-colored buttons inside the card.
  - No extra paragraphs beyond the defined description, helper, and status text.
- Never introduce a second, visually different “set location” UI on the same page.
- If copy needs to change, update `HeroLocationCard`, this doc, and every page together so strings stay in sync.
