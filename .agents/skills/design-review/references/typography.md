# Typography Reference — Font Specialist

## AI-Overused Fonts (Flag on Sight)

**Decorative/Script (worst offenders):**
- Dancing Script — #1 "AI cursive" font. Cheap at large sizes.
- Pacifico, Lobster, Great Vibes, Satisfy, Sacramento, Allura — same bucket.

**Serif (overused for "premium"):**
- Playfair Display — #1 AI "luxury" serif. Still well-made but signals "AI generated."
- Cormorant Garamond — becoming the second Playfair.
- Lora — decent but template-associated.

**Sans-serif (overused as defaults):**
- Inter — excellent font but "didn't make a choice" signal (Figma/Tailwind default).
- Poppins — geometric roundness reads as "startup template."
- Montserrat — overused to template-marker status.
- Nunito/Nunito Sans — on every AI SaaS landing page.
- Raleway — thin weight screams 2015 template.
- Open Sans — Google's old default. "Didn't try."

## Actually Good Google Fonts (Recommend)

**Sans:** DM Sans, Plus Jakarta Sans, Outfit, Figtree, Albert Sans, Instrument Sans, Geist (Vercel)
**Serif:** Instrument Serif, Newsreader, Fraunces, Literata, Source Serif 4
**Mono:** JetBrains Mono, Fira Code, Geist Mono, IBM Plex Mono

## Premium Fonts (The Gold Standard Bar)
Soehne (Stripe), Circular (Spotify/Airbnb), GT America/Walsheim, Untitled Sans (Linear), ABC Diatype

## Pairing Rules
- Max 2 families + optional mono. 3+ families needs strong justification.
- Contrast not conflict: pair different classifications (serif+sans) with similar x-height.
- One leads (display), one supports (body). Never compete.

## Hierarchy Rules

**Sizes per page type:**
- Product UI/Dashboard: 5-6 sizes
- Marketing/Landing: 6-8 sizes
- More than 8 distinct sizes = chaos (flag it)

**Weight distribution (the 4-weight system):**
- Regular (400) — body
- Medium (500) — labels, nav
- Semibold (600) — headings, card titles
- Bold (700) — hero only

**Line-height by size:**
- Display 36px+: 1.0-1.15
- Headings 24-36px: 1.15-1.3
- Body 16-18px: 1.5-1.65
- Small/caption: 1.4-1.5
- KEY: Line-height DECREASES as font size INCREASES

**Letter-spacing:**
- ALL CAPS: +0.05em to +0.1em (ALWAYS add tracking)
- Display 48px+: -0.02em to -0.04em (tighten)
- Body: 0 or -0.01em
- Small 12px: +0.01em

**Measure:** 45-75 characters per line. 65ch is ideal. Never exceed 80ch.

## Anti-Patterns (Flag These)

| Pattern | Signal |
|---------|--------|
| Playfair + Poppins/Montserrat | Template pairing |
| Dancing Script anywhere | AI default for "warmth" |
| Centered body text paragraphs | AI centers everything |
| All headings same size/weight | No hierarchy |
| Default line-height on display text | Should be 1.0-1.15 |
| No letter-spacing on ALL CAPS | Looks cramped and amateur |
| Hero text under 48px | AI makes heroes too small. Premium = 56-96px |
| 3+ font families | Over-designed |
| Light (300) weight body text | Poor legibility |

## What Premium Teams Do Differently
1. Custom or uncommon fonts
2. Fewer sizes, more whitespace
3. Negative letter-spacing on display text
4. Color/opacity as hierarchy (not just size)
5. Tabular numerals for data alignment
6. Optical sizing (lighter weight at large sizes)
