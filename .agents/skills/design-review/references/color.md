# Color & Contrast Reference — Color Specialist

## WCAG Contrast Requirements

| Level | Normal Text (<24px) | Large Text (>=24px or >=18.66px bold) | UI Components |
|-------|-------------------|--------------------------------------|---------------|
| AA | **4.5:1** | **3:1** | **3:1** |
| AAA | **7:1** | **4.5:1** | N/A |

Common failures:
- `#999` on `#FFF` = 2.85:1 (FAILS) — placeholder text
- `#6B7280` (gray-500) on `#111827` (gray-900) = 4.27:1 (barely AA)
- `#b8a68e` on `#1a1410` = ~3.2:1 (FAILS AA for body text)
- Brand color buttons with white text — many blues/greens fail

## AI Palette Anti-Patterns (Flag on Sight)

1. **"Synthwave SaaS"** — Deep purple bg + neon purple/pink accents + white text
   - `bg: #0F0A1F, accent: #A855F7` — every AI landing page 2023-2025

2. **"Dark Mode with Gold"** — Near-black + amber/gold accent
   - `bg: #0A0A0A, accent: #F59E0B` — looks like crypto exchange

3. **"Oversaturated Gradient Buttons"** — Full-saturation gradients on every CTA
   - `linear-gradient(135deg, #EC4899, #8B5CF6)` — fights with content

4. **"Gray Everything"** — All surfaces different grays, no warmth, no personality

5. **"Too Many Primaries"** — 4-5 saturated colors used with equal weight

## 60/30/10 Rule
- 60% = Background + surfaces (2-3 shades)
- 30% = Text + borders + secondary (2-3 shades)
- 10% = Primary accent + semantic colors

## Dark Mode Rules

1. **Never pure `#000000` background** — use `#0A0A0B` to `#1A1A1F`
2. **Never pure `#FFFFFF` text** — use `#E0E0E0` to `#EEEEEE`
3. **Reduce accent saturation 10-20%** vs light mode
4. **Elevation = lightness, not shadow** (shadows invisible on dark)
   - Level 0: `#121214`, Level 1: `#1C1C20`, Level 2: `#252529`, Level 3: `#2E2E33`
5. **Tint your darks** — cool/professional: blue tint, warm/personal: warm tint
6. **Borders: `rgba(255,255,255,0.08)` to `0.12`**

## Light Mode Rules

| Product Type | Background | Temperature |
|-------------|-----------|-------------|
| Developer tools | Cool `#F8FAFC` | Cool |
| Consumer social | Warm `#FAF9F6` | Warm |
| Enterprise SaaS | Neutral `#FAFAFA` | Neutral |
| Fintech | Cool `#F0F4F8` | Cool |
| Creative tools | Pure `#FFFFFF` | Neutral |
| Health/wellness | Warm cream `#FDF8F0` | Warm |

## Color-Mood Mapping

| Color | Mood | Good For | Avoid When |
|-------|------|----------|------------|
| Blue | Trust, stability | Fintech, enterprise | Wanting warmth |
| Green | Growth, success | Finance, health | Error states |
| Red | Urgency, passion | CTAs, errors, food | Non-alarming contexts |
| Purple | Creativity, luxury | Creative tools | Avoiding "AI startup" cliche |
| Orange | Energy, warmth | Consumer, community | Corporate |
| Teal | Calm, sophisticated | Health tech, premium | High energy needed |
| Neutral | Professional, minimal | Dev tools, docs | Emotional engagement needed |

## Gradient Rules

- **2-3 color stops max.** More = circus.
- **Analogous colors only** (adjacent on wheel) unless specific brand reason.
- **Add middle stop** to prevent muddy gray zone between saturated colors.
- **Dark mode:** reduce gradient opacity to 10-30%.
- **One gradient element per view.** If buttons AND cards AND headers have gradients, nothing has hierarchy.

## What "Designed" Palettes Have
- Intentional constraint (1-2 accent hues max)
- Tinted neutrals (grays are warm or cool, never pure)
- Consistent saturation level across colors
- Clear hierarchy (one color draws eye, rest recedes)
- Contextual appropriateness
