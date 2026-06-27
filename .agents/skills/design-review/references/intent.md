# Intent & Originality Reference — Intent Specialist

## When Template is CORRECT (creativity would hurt)
- Forms, input screens, authentication flows
- Settings, preferences, admin panels
- Checkout flows, data tables, list views
- Documentation, error pages, email templates
- SaaS product interiors (consistency > personality)

## When Creativity is REQUIRED (template would fail)
- Landing pages, marketing sites
- Emotional/personal pages (memorials, celebrations)
- Portfolio, creative showcase (design IS the proof)
- Brand identity pages (about, mission, story)
- Hero sections, onboarding, 404 pages
- Product launch announcements, pricing pages

## The Spectrum
Most pages are 5-95% creativity. Settings = 5% personality (empty state illustrations). Landing = 80% creative. The RATIO must match the page type.

## AI Slop Detection — Specific Fingerprints

**Typography signals:**
- Inter/Roboto/Arial as primary font everywhere
- No meaningful hierarchy — sizes change but nothing feels authored
- Uniform font weights

**Color signals:**
- Purple-to-blue gradient in hero (traced to Tailwind demo defaults)
- Decorative rather than semantic color application
- No color system — colors applied ad hoc

**Layout signals:**
- Three-column icon grids ("features section")
- Uniform 16px border-radius everywhere
- Standardized 24px padding on everything
- Card-based layouts as default for all content

**Imagery signals:**
- 3D abstract faceless humans holding glowing orbs
- Stock photos of diverse groups in impossibly lit offices
- AI illustrations with "too smooth, too symmetrical, plastic quality"

**Copy signals:**
- "Build the future of [X]", "Your all-in-one platform", "Scale without limits"
- Hedging: "may help", "can potentially"
- Generic superlatives: "best-in-class", "cutting-edge"

**Motion signals:**
- Generic fade-in applied uniformly to all elements
- Buttons that snap instead of easing
- No micro-interactions, no hover states
- Missing prefers-reduced-motion

## Gold Standards by Page Type

### Emotional/Personal
- Photography feels "emotionally true" not technically perfect
- Color palette drawn from subject's personality
- Typography creates impact without competing with content
- Restraint over decoration — let one photo do the work
- Penalize: generic stock imagery, AI illustrations, template feel, corporate aesthetic

### Landing/Marketing
- Single-minded purpose — every element pushes one action
- Emotional connection through specificity (not "Build the future")
- References: Stripe (animated explanations), Linear (terminal precision), Apple (restraint)
- Penalize: vague headlines, purple gradient heroes, three-column icon grids, stock photos

### Dashboard/Data
- 5-second rule: main insight identifiable in 5 seconds
- Information density appropriate to the role
- 5-9 visuals per dashboard (fewer = insufficient, more = overload)
- Penalize: decorative charts, inconsistent scales, equal weight to all metrics

### Portfolio/Showcase
- The site IS the proof of skill — must match or exceed the work shown
- Case studies > thumbnail grids
- Negative space lets pieces breathe
- Penalize: template framework more visible than work, no narrative

### SaaS/Product
- Progressive disclosure — complexity revealed on demand
- Workflow-centered layout mirrors how users work
- Repeatable UX patterns (predictable navigation)
- Penalize: feature overload, custom nav that breaks expectations

## What Gives Design "Soul"

1. **Unreasonable quality in details** — FigJam's unfurling animation wasn't in a spec. Stripe's CEO changed typing delays from uniform to randomized.
2. **Personal artistic expression** — inspiration from a sunset, not Dribbble trends
3. **Cross-disciplinary inspiration** — video games, architecture, fashion, film
4. **Singular vision** — design by committee erodes soul
5. **Intrinsic motivation** — "at least one thing you ship will be unreasonably good"

## Human-Crafted vs AI/Template

| AI/Template | Human-Crafted |
|-------------|---------------|
| Inter/system defaults | Distinctive typeface with pairing rationale |
| Purple gradient presets | Custom color system with semantic naming |
| Static or gratuitous animation | Purposeful motion with natural easing |
| Flat white backgrounds | Layered depth — gradients, texture, grid overlays |
| Uniform spacing/radius | Varied spacing with clear hierarchy |
| Generic fade-in everywhere | One well-orchestrated page-load sequence |
| "Build the future" headlines | Specific, concrete value props |
| Stock photography | Original imagery with genuine emotion |

## Scoring Dimensions
1. **Purpose Alignment** — creativity/convention ratio appropriate for type?
2. **AI Slop Score** — how many known AI defaults present? (invert: 4 = no fingerprints)
3. **Emotional Coherence** — do all elements push the same story?
4. **Distinctiveness** — could this only belong to this brand/product?
