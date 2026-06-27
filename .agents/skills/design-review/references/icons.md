# Icon Reference — Icon Specialist

## Library Quality Tiers
| Library | Icons | Styles | Best For |
|---------|-------|--------|----------|
| **Lucide** | 800+ | Stroke (2px) | shadcn/ui projects, clean UI |
| **Phosphor** | 9,000+ | 6 weights (thin->fill+duotone) | Most versatile, varied needs |
| **Heroicons** | 316 | 4 styles (outline/solid/mini/micro) | Tailwind projects, minimal set |
| **Tabler** | 5,900+ | Stroke (2px on 24px grid) | Data-heavy dashboards |
| **Custom SVG** | N/A | Custom | Brand-critical products |

## Sizing Rules
| Text Size | Icon Size | Ratio |
|-----------|-----------|-------|
| 14-16px (body) | 16-20px | 1.15-1.25x |
| 18-24px (headings) | 20-24px | ~1.1x |
| 32px+ (display) | 24-32px | ~0.8-1x |

**Touch targets:** Minimum 44x44px (Apple) / 48x48dp (Material). Visual icon can be 20-24px with padding filling the target.

## Filled vs Outline
- **Outline:** Navigation bars, secondary actions, list prefixes, unselected states
- **Filled:** Active/selected states, primary CTAs, small sizes (<20px where fill aids legibility)
- Convention: filled = selected, outline = unselected (iOS pattern)

## Stroke Width Consistency
- Pick ONE stroke width for the whole project (1.5px or 2px)
- Lucide = 2px, Heroicons outline = 1.5px — DO NOT MIX
- All internal details, curves, angles must use same weight

## Anti-Patterns to Flag
1. **Mixed icon libraries** — different stroke weights, corner radii, visual styles
2. **Emoji as functional icons** — can't style, renders differently per OS, breaks consistency
3. **Inconsistent sizing** — 16px icon next to 24px icon in the same row
4. **Missing touch targets** — interactive icons under 44x44px
5. **Icon-only buttons without aria-label** — screen readers can't read them
6. **Malformed SVGs** — paths that render as unrecognizable shapes
7. **Decorative icons everywhere** — icons next to every list item "because it looks nice"
8. **Mixed filled/outline** in same context without meaning (filled should mean "active")

## The Litmus Test
Desaturate the UI to grayscale and squint. If icons feel like the same family with similar visual weight -> designed. If some are heavier, sharper, or more detailed -> stock/mixed.
