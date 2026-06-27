---
name: Design Review
description: Multi-agent visual design review with 7 specialist agents. Activates when discussing UI quality, visual review, design critique, or frontend evaluation.
---

# Design Review Skill

AI-powered design review using 7 independent specialist agents and a boss synthesizer. Each specialist evaluates one domain (typography, color, layout, icons, motion, intent/originality/UX/copy, code/a11y) against curated reference knowledge.

## When This Activates

- User asks about visual quality of a page or component
- User wants feedback on UI design decisions
- User is building frontend and wants a quality check
- Discussion involves design critique, review, or iteration

## How It Works

1. **Page Classification** — Haiku classifies page type (admin, landing, emotional, etc.) to set the design bar
2. **8 Specialists** — Dispatched in parallel with domain expertise from `references/`:
   - Font (typography quality, hierarchy, AI-overused fonts)
   - Color (palette cohesion, WCAG contrast, dark mode)
   - Layout (spacing, responsive, section rhythm)
   - Icon (library consistency, sizing, accessibility)
   - Motion (animation quality, performance, reduced-motion)
   - Intent & Originality & UX (purpose match, AI slop detection, user flow)
   - Copy (spelling, tone, placeholder text)
   - Code & A11y (semantic HTML, ARIA, focus management)
3. **Boss Synthesis** — Merges findings, computes weighted score, delivers SHIP/CONDITIONAL/BLOCK verdict

## Scoring

Weighted formula using `config/scoring.json`. Scale: 1.0-4.0.

Quick mode (`--quick`) uses 4 specialists with reduced weights (/13 instead of /16).

## Commands

- `/design-review` — Full 7-specialist review
- `/design-improve` — Build and iterate until SHIP verdict
- `/design-validate` — Functional validation via Playwright
- `/design` — Orchestrator routing to sub-commands

## References

Domain knowledge for specialists lives in `references/`:
- `typography.md` — Font quality, hierarchy, anti-patterns
- `color.md` — Palette, contrast, dark mode rules
- `layout.md` — Spacing, rhythm, responsive patterns
- `icons.md` — Library tiers, sizing, consistency
- `motion.md` — Duration, easing, performance
- `intent.md` — Creativity spectrum, AI slop fingerprints
- `visual-design-rules.md` — Hard design constraints
