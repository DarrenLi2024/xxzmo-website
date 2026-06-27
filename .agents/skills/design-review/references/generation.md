# Generation Aesthetics Reference

This reference guides page generation in `/design-improve`. Adapted from Anthropic's DISTILLED_AESTHETICS_PROMPT with SpSk-specific extensions. Read this AFTER anti-slop.json (what to avoid) -- this tells you what to aspire to.

## Core Principle

You tend to converge toward generic, "on distribution" output. In frontend design, this creates what users call the "AI slop" aesthetic. Avoid this: make creative, distinctive frontends that surprise and delight. Every page should feel like it was designed for its specific context, not assembled from a template.

## Typography

Choose distinctive fonts, not generic defaults. A font choice is a design decision -- Inter, Roboto, Arial, and system fonts signal "didn't make a choice."

- Use at most 2 font families + optional mono
- Good starting points by context:
  - Startup/SaaS: Clash Display, Satoshi, Cabinet Grotesk, Plus Jakarta Sans
  - Editorial/Content: Instrument Serif, Newsreader, Fraunces, Literata
  - Technical/Docs: IBM Plex, Source Sans 3, Fira Code
  - Distinctive: Bricolage Grotesque, Obviously, DM Sans
- Avoid convergence on common AI choices (Space Grotesk is becoming overused outside code contexts)
- Playfair Display: acceptable for genuine editorial (long-form articles, magazine layouts), not for SaaS/landing hero text
- Pair by contrast, not conflict: serif + sans with similar x-height

## Color and Theme

Commit to a cohesive aesthetic with CSS variables for consistency. A dominant color with sharp accents outperforms timid, evenly-distributed palettes (60/30/10 rule).

- Draw from IDE themes, cultural aesthetics, nature, architecture for inspiration
- Avoid: purple gradients on white backgrounds, dark+gold, synthwave, gray-everything
- Vary between light and dark themes across projects -- do not always default to one
- Use color as hierarchy: primary actions saturated, secondary muted, backgrounds receding

## Motion

One well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions. Focus on high-impact moments.

- Prioritize CSS-only solutions for HTML pages
- Use proper easing: ease-out for entrances, ease-in for exits, never linear for UI
- Duration: 150-300ms for micro-interactions, 300-500ms for layout transitions
- Always include `prefers-reduced-motion` support
- Scroll-triggered reveals add perceived quality with minimal effort

## Backgrounds

Create atmosphere and depth rather than defaulting to solid colors.

- Layer CSS gradients for richness (radial + linear combinations)
- Use geometric patterns or contextual effects that match the overall aesthetic
- Subtle noise textures, gradient meshes, or radial gradients add visual interest
- Avoid flat white or flat dark with no texture -- it reads as unfinished

## Variation Enforcement

Each page you generate should have a distinct visual identity, not be interchangeable with any other page you have built.

- Vary between light and dark themes across generations
- Do not converge on the same font choices across projects
- If you notice you are reaching for the same patterns, deliberately choose something different
- The goal is a portfolio of distinct pages, not a series of variations on one theme

## Anti-Patterns (Do Not Generate)

- Overused font families: Inter, Roboto, Arial, system fonts
- Cliched color schemes: purple gradients, dark+gold, synthwave, gray-everything
- Predictable layouts: three-column icon grid, badge-hero-features-steps-testimonials-CTA skeleton
- Emoji as icons: use SVG icon libraries (Lucide, Phosphor, Heroicons)
- Cookie-cutter design with no context-specific character
