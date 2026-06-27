# Design Harness Reference — `.design/` Directory

The `.design/` directory is a project-level design system cache created by `/design-review`. It persists design decisions across reviews so specialists can enforce consistency.

## Directory Structure

```
.design/
├── system.json       # Design tokens (colors, spacing, typography, radii)
├── components.json   # Component patterns detected (buttons, cards, inputs, etc.)
├── rules.md          # Project design rules and established conventions
├── decisions.md      # Log of design decisions (why X was chosen over Y)
├── pages/            # Per-page review history
│   └── {slug}.md     # Previous review results for a specific page
└── validate/         # Validation state
    └── {slug}.md     # Previous validation results
```

## File Formats

### system.json

Extracted from CSS custom properties and computed styles:

```json
{
  "colors": {
    "primary": "#1a1a2e",
    "secondary": "#16213e",
    "accent": "#0f3460",
    "background": "#fafafa",
    "text": "#1a1a1a"
  },
  "typography": {
    "heading_font": "Inter",
    "body_font": "Inter",
    "base_size": "16px",
    "scale_ratio": 1.25
  },
  "spacing": {
    "base": "8px",
    "scale": [4, 8, 12, 16, 24, 32, 48, 64]
  },
  "radii": ["4px", "8px", "12px"],
  "shadows": ["0 1px 2px rgba(0,0,0,0.05)"]
}
```

### components.json

Component patterns detected across the page:

```json
{
  "button": {
    "variants": ["primary", "secondary", "ghost"],
    "sizes": ["sm", "md", "lg"],
    "border_radius": "8px"
  },
  "card": {
    "padding": "24px",
    "border_radius": "12px",
    "shadow": "0 1px 2px rgba(0,0,0,0.05)"
  },
  "input": {
    "height": "40px",
    "border_radius": "8px",
    "border_color": "#e2e8f0"
  }
}
```

### rules.md

Plain text design rules derived from the review:

```markdown
# Design Rules

- Primary buttons use filled background, secondary use outline
- Maximum 2 font families (heading + body)
- 8px spacing grid
- Cards use consistent 12px radius
- Dark mode uses zinc-900 background, not pure black
```

### pages/{slug}.md

Previous review results in structured format:

```markdown
# Page: dashboard
## Reviewed: 2026-03-30
## Verdict: CONDITIONAL (2.8/4.0)

### Scores
- Font: 3.0 | Color: 2.5 | Layout: 3.0 | Icons: 2.5
- Motion: 3.0 | Intent: 3.0 | Code/A11y: 2.5

### Top Fixes
1. Color contrast on secondary text (2.8:1, needs 4.5:1)
2. Missing focus indicators on card links
3. Inconsistent icon stroke widths (1.5px vs 2px)
```

## Lifecycle

1. **First review** (no `.design/`): Created automatically. Tokens extracted from CSS. Components detected from DOM patterns. Specialists review without consistency context.

2. **Subsequent reviews** (`.design/` exists): All specialists receive design system context. They check both domain quality AND consistency with established patterns. Deviations flagged as `[CONSISTENCY]` issues.

3. **Updates**: After each review, `system.json` and `components.json` are updated with any new patterns. `rules.md` gets new rules appended. Page review saved to `pages/`.

4. **Version control**: `.design/` should be committed to the repo. It represents the team's design decisions and evolves with the project.
