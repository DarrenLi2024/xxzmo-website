# Animation & Motion Reference — Motion Specialist

## Duration Guidelines
| Context | Duration | Easing |
|---------|----------|--------|
| Hover states | 150-200ms | ease-out |
| Button press | 100-150ms | ease-out |
| Tooltip appear | 150ms | ease-out |
| Dropdown open | 200-250ms | ease-out |
| Modal open | 250-350ms | cubic-bezier(0.16, 1, 0.3, 1) |
| Page transition | 200-400ms | ease-in-out |
| Scroll reveal | 300-500ms | cubic-bezier(0.16, 1, 0.3, 1) |
| Complex full-screen | up to 375ms | ease-in-out |

**Rule:** Never exceed 500ms for UI interactions. 3-second budget for entire interaction.

## Premium Easing Curves
- Smooth entrance: `cubic-bezier(0.16, 1, 0.3, 1)` (fast start, gentle settle)
- Smooth exit: `cubic-bezier(0.7, 0, 0.84, 0)` (gentle start, fast end)
- Bounce settle: `cubic-bezier(0.34, 1.56, 0.64, 1)` (overshoots then settles)
- Never: `linear` on UI elements (feels robotic)

## Performance Tiers
| Tier | Properties | Impact |
|------|-----------|--------|
| S-tier (GPU only) | `transform`, `opacity` | Never blocks main thread |
| A-tier (paint only) | `background-color`, `color`, `box-shadow`, `filter` | Triggers paint, not layout |
| F-tier (AVOID) | `width`, `height`, `margin`, `padding`, `top`, `left` | Full layout recalculation |

## When Animation Adds Value
- State feedback (button press, toggle, loading)
- Spatial orientation (slide-in panels, expanding modals)
- Attention direction (notification pulse)
- Perceived performance (skeleton screens, staggered lists)

## Anti-Patterns to Flag
1. `transition: all` — must specify exact properties
2. Animating width/height/margin/padding/top/left — use transform instead
3. Missing `@media (prefers-reduced-motion: no-preference)` wrapper
4. `will-change` on more than 5 elements simultaneously
5. `animate-bounce` or `animate-pulse` on primary UI elements
6. Autoplay animations with no user trigger
7. Infinite setInterval creating DOM elements without cleanup/visibility check
8. Duration >500ms for hover/click interactions
9. Linear easing on UI transitions
10. Transform clobbering: `@keyframes` using `transform: scale()` overwrites static `transform: rotate()` — use separate CSS properties
11. Duplicate `animation` declarations (second overrides first silently)
12. Scroll-triggered animations that re-trigger on every scroll direction change

## The Value Test
Remove the animation. Does the user lose information or context? If not, it's decorative noise.
