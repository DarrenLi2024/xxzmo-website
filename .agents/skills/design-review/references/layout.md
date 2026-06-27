# Layout & Spacing Reference — Layout Specialist

## Spacing System (8px Grid)
- `4px` — minimum (tight icon padding)
- `8px` — base unit (compact UI, small gaps)
- `12px` — half-step (finer granularity)
- `16px` — standard padding, form fields, card padding mobile
- `24px` — section padding mobile, card padding desktop
- `32px` — gap between card groups
- `48px` — major section breaks
- `64-80px` — page-level section spacing

**Flag:** Any spacing value not a multiple of 4px (13px, 17px, 22px) unless optical correction.

## Section Rhythm — Breaking Monotony
- **Rule of 3:** No more than 3 identical cards/sections before introducing visual variation
- **Techniques:** Featured card spanning 2 columns, alternating row heights, full-width breaks between card groups, different background treatments per section
- **Internal consistency, external variety:** Within a card = consistent spacing. Between sections = increase spacing to show conceptual boundaries.

## The "Wall of Cards" Anti-Pattern
Flag: 5+ identical cards in a row with no visual break, size variation, or hierarchy.
Solutions: featured card (2-col span), alternating heights, visual break elements, masonry layout.

## Responsive Patterns (Beyond Breakpoints)
- `grid-template-columns: repeat(auto-fit, minmax(300px, 1fr))` — responsive without breakpoints
- `clamp()` for fluid sizing — `width: min(100%, 1200px)` replaces max-width combos
- Container queries for component-level responsiveness
- Content-driven breakpoints, not device-width breakpoints

## White Space by Page Type
| Type | Approach |
|------|----------|
| Marketing/landing | White space IS the design (60%+ empty) |
| SaaS dashboard | Dense content, generous group separation |
| Admin/data tables | Minimal white space is correct |
| Editorial | Generous margins, single focal point per section |

## Anti-Patterns to Flag
1. Arbitrary spacing values (not multiples of 4px)
2. 3+ identical consecutive sections with no visual break
3. Marketing-page spacing on a dashboard (wasted space)
4. Dashboard density on a landing page (cramped)
5. Only fixed pixel breakpoints, no fluid units
6. Missing max-width constraints on text (>80ch line length)
7. Inconsistent gaps between similar elements
