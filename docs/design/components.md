# Components

## MapView
- Props: `data`, `onBboxChange`, `filters`.
- Behavior: clusters, keyboard focus to list alternative.
- A11y: List view mirrors map content.

## SourceChip
- Props: `provider`, `url`, `fetchedAt`, `dataVintage?`.
- Tooltip: provider description + “Open source”.

## TimeSeriesChart
- Props: `points`, `label`, `unit`, `source`.
- A11y: Table fallback with caption.

## AIChat
- Props: none (reads auth), server-proxied.
- UI: disclaimer header, citations footer.

## LetterWizard
- Steps: form → preview → generate PDF.
- Safe defaults; editable outputs.

## EmptyState
- Variants: food, housing, broadband, jobs.
- Contains: reason, next steps, submit link.

## ResourceCard (community)
- Verified badge; contact actions; moderation notes (mod view).
