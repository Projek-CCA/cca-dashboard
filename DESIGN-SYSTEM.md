# CCA Platform Design System v1.0

> **Reference:** samad.my (quality benchmark) — Inter font, warm off-white bg, generous spacing, clean hierarchy
> **Applies to:** cca-work.my + cca-clients.my
> **Rule:** Developers use this spec. No independent styling per page.

---

## Typography

| Element | Font | Weight | Size | Line Height |
|---------|------|--------|------|-------------|
| Page title | Inter | 600 | 24px | 1.3 |
| Section heading | Inter | 600 | 18px | 1.4 |
| Card heading | Inter | 500 | 14px | 1.4 |
| Body text | Inter | 400 | 13px | 1.5 |
| Small/caption | Inter | 400 | 11px | 1.5 |
| Code/data | SF Mono / monospace | 400 | 12px | 1.4 |

## Colors

| Token | Value | Usage |
|-------|-------|-------|
| --bg-page | #f6f5f4 | Page background (warm off-white) |
| --bg-surface | #ffffff | Cards, panels, dropdowns |
| --bg-surface-hover | #f9f8f7 | Hover state for surfaces |
| --bg-muted | #f0efee | Secondary backgrounds, zebra rows |
| --text-primary | rgba(0,0,0,0.94) | Headings, body text |
| --text-secondary | rgba(0,0,0,0.60) | Labels, captions, meta |
| --text-muted | rgba(0,0,0,0.38) | Disabled, placeholder |
| --line | rgba(0,0,0,0.08) | Borders, dividers |
| --line-strong | rgba(0,0,0,0.14) | Focus rings, active borders |
| --accent | #1a1a1a | Primary actions, selected states |
| --accent-hover | #333333 | Hover on accent elements |

## Status Colors

| Status | Background | Text | Border |
|--------|-----------|------|--------|
| Done/Completed | #e8f5e9 | #2e7d32 | — |
| Editing/In Progress | #e3f2fd | #1565c0 | — |
| Amendment/Revision | #fff3e0 | #e65100 | — |
| Overdue/Late | #ffebee | #c62828 | — |
| Checking/Review | #f3e5f5 | #6a1b9a | — |
| Pending/Default | #f5f5f5 | #616161 | — |

## Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| --space-xs | 4px | Icon-text gap, badge padding |
| --space-sm | 8px | Card padding, element gaps |
| --space-md | 16px | Section gaps, container padding |
| --space-lg | 24px | Section spacing, page margins |
| --space-xl | 32px | Major section divisions |
| --space-2xl | 48px | Page-level spacing |

## Layout

| Token | Value |
|-------|-------|
| --container-max | 1200px |
| --container-narrow | 800px |
| --content-max-width | 960px (inner content areas) |

## Border Radius

| Element | Radius |
|---------|--------|
| Cards | 8px |
| Buttons | 6px |
| Inputs/selects | 6px |
| Badges/pills | 12px (capsule) |
| Dropdowns | 8px |

## Shadows

| Level | Value | Usage |
|-------|-------|-------|
| Subtle | 0 1px 3px rgba(0,0,0,0.06) | Cards, surfaces |
| Elevated | 0 4px 12px rgba(0,0,0,0.08) | Dropdowns, modals |
| Strong | 0 8px 24px rgba(0,0,0,0.12) | Large modals |

## Buttons

| Variant | Background | Text | Border | Padding | Radius |
|---------|-----------|------|--------|---------|--------|
| Primary | --accent (#1a1a1a) | #fff | none | 10px 20px | 6px |
| Secondary | transparent | --accent | 1px solid --accent | 10px 20px | 6px |
| Ghost | transparent | --text-secondary | none | 6px 12px | 6px |
| Small | Primary style | — | — | 6px 12px | 4px |

## Form Controls

| Element | Height | Border | Radius | Focus |
|---------|--------|--------|--------|-------|
| Input | 36px | 1px solid --line | 6px | 2px solid --accent |
| Select | 36px | 1px solid --line | 6px | 2px solid --accent |
| Search | 36px | 1px solid --line | 20px (pill) | 2px solid --accent |

## Cards

```
.card {
  background: var(--bg-surface);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: var(--space-md);
}
.card:hover {
  background: var(--bg-surface-hover);
}
```

## Navigation

- Sidebar: 240px wide, bg #fafaf9, border-right 1px solid --line
- Top bar: height 48px, bg --bg-surface, bottom border
- Breadcrumb: --text-secondary, 12px, / separator
- Active nav item: --accent bg (#1a1a1a), white text

## Responsive Breakpoints

| Breakpoint | Applies |
|-----------|---------|
| 0-767px | Mobile: stacked cards, full-width, hidden sidebar |
| 768-1023px | Tablet: sidebar collapsed, grid adjusts |
| 1024px+ | Desktop: full sidebar, table layouts |

## Information Density

- Max ~60 chars per line for readable text
- Data tables: zebra rows (alternating --bg-surface / --bg-muted)
- Card groups: 2-3 cards per row desktop, 1 per row mobile
- Empty states: centered, muted text, clear action
- Loading states: subtle skeleton or spinner, never blank white
