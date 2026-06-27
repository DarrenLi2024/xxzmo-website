---
paths:
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/*.svelte"
  - "**/*.css"
  - "**/*.scss"
  - "**/*.html"
description: Hard design rules that prevent common visual quality failures. Objective, checkable constraints — not taste.
---

# Visual Design Rules

## Self-Evaluation Ban

Never say "looks great", "looks good", or praise your own visual output. You cannot
honestly self-assess visual quality (Anthropic's own research confirms this). Instead:
- Describe what you see factually
- Note things you're uncertain about
- Recommend running `/design-review` for real evaluation

## Icons

- Lucide icons only (unless the project already uses another library)
- Every icon-only button needs `aria-label`
- Consistent icon sizes within a section — don't mix `w-4` with `w-5` in the same nav
- No emoji as functional icons. No inline SVG blobs when a named icon exists.

## Color & Contrast

- No hardcoded hex/rgb in components — use CSS variables or Tailwind tokens
- Text must be readable: dark on light or light on dark. Never mid-tone on mid-tone.
- One accent color per context. Destructive actions use the destructive variant.

## Typography

- Max 3 font sizes per view. Max 2 font weights per component.
- Headings convey meaning alone — no mandatory subtitles.

## Spacing

- Tailwind spacing scale only — no arbitrary `[13px]` values
- Consistent gaps within the same layout context
- Generous padding on interactive elements (min `px-3 py-2` for buttons)

## States (Non-Negotiable)

Every interactive component handles: loading, empty, error, hover/focus, disabled.
"No data" is not an empty state. Write something contextual.

## Animations

- Don't claim animations work without visual verification
- CSS transitions under 200ms for micro-interactions
- Never `animate-bounce` or `animate-pulse` on primary UI elements

## Before Finishing Any UI Work

1. Any hardcoded colors? Fix them.
2. All icons from the same library? Check.
3. Loading/empty/error states present? Add them.
4. Text readable on its background? Verify.
5. Works on mobile? Add responsive breakpoints.
