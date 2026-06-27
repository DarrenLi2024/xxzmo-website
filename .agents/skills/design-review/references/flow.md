# Flow Navigation Reference -- Flow Audit Specialist

Agent-consumable knowledge for navigating multi-screen SPA flows, detecting screen transitions, and capturing screenshots at each stable state.

## 1. Screen Detection Heuristics

A "new screen" in a SPA means the user-visible content has meaningfully changed. Do NOT rely on `networkidle` -- SPAs with analytics, WebSockets, or chat widgets never reach network idle.

**Primary signal: Simple timed wait + snapshot**

After clicking a CTA or navigating, the safest approach is a simple wait then verify:

1. Wait 2 seconds via `browser_evaluate`:
```javascript
() => new Promise(resolve => setTimeout(() => resolve({ stable: true }), 2000))
```

2. Then call `browser_snapshot` — if it returns content, the page is usable.

**CRITICAL: Never let any `browser_evaluate` call block longer than 10 seconds.** If it doesn't return, abandon it and proceed. Pages with continuous mutations, WebSockets, or SPA route changes can orphan JS Promises and block the entire audit forever.

**Alternative: MutationObserver with hard cap (for pages that need more precision):**

```javascript
() => {
  return new Promise((resolve) => {
    const HARD_TIMEOUT = 5000;
    let timer = null;
    const hardTimer = setTimeout(() => {
      if (observer) observer.disconnect();
      resolve({ stable: true, waited: false, hardTimeout: true });
    }, HARD_TIMEOUT);
    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        clearTimeout(hardTimer);
        observer.disconnect();
        resolve({ stable: true, waited: true });
      }, 800); // 800ms of no mutations = stable
    });
    observer.observe(document.body, {
      childList: true, subtree: true, attributes: true, characterData: true
    });
    timer = setTimeout(() => {
      clearTimeout(hardTimer);
      observer.disconnect();
      resolve({ stable: true, waited: false });
    }, 2000);
  });
}
```

The `HARD_TIMEOUT` ensures the Promise always resolves even on pages with continuous mutations.

**Secondary signal: Font readiness**

After DOM stability, check fonts before capturing a screenshot:

```javascript
() => {
  return Promise.race([
    document.fonts.ready.then(() => ({ fontsReady: true })),
    new Promise(resolve => setTimeout(() => resolve({ fontsReady: false, timeout: true }), 5000))
  ]);
}
```

**Never use `networkidle`** -- it will hang on production SPAs with Google Analytics, Intercom, Hotjar, or any WebSocket connection.

## 2. Flow Intent Mapping

When the user provides `--flow "complete the onboarding"`, you must match that intent to visible CTAs at each step.

**CTA identification priority:**
1. Primary buttons (larger, higher contrast, prominent position) -- e.g., "Get Started", "Continue", "Next"
2. Links styled as buttons -- same visual weight as buttons
3. Navigation links matching the flow intent -- e.g., "Sign Up" in a nav bar
4. Form submit buttons -- "Submit", "Save", "Create Account"

**Matching strategy:**
- Read `browser_snapshot` accessibility tree for buttons, links, and form elements
- Match CTA text against the flow intent semantically -- "complete onboarding" matches "Get Started", "Continue", "Next Step"
- If multiple CTAs match, prefer: (a) the one below the fold in the main content area, (b) the one with larger visual prominence, (c) the one that appears to advance the flow (not "Skip" or "Later")
- If NO CTA matches the intent, check if you have reached a success state (Section 5) or a dead end (Section 4)

**At each step, report:**
```
Screen {N}: {name} -- clicking "{CTA text}" (ref: {element_ref})
```

## 3. SPA Navigation Patterns

SPAs change content without traditional page loads. Detect these patterns:

**pushState / replaceState navigation:**
- URL changes in the address bar but no page load event fires
- After clicking, check if URL changed via `browser_evaluate`:
  ```javascript
  window.location.href
  ```
- A URL change + DOM mutations = new screen

**In-page transitions (no URL change):**
- Tabs: content area changes but URL stays the same
- Wizard steps: step indicator advances, form content swaps
- Modals: overlay appears with new content
- Accordions: content expands/collapses
- These count as new screens IF the visible content is substantially different

**How to confirm a new screen loaded:**
1. Click the CTA
2. Wait 300ms (post-click settle time from config)
3. Run DOM stability check (Section 1)
4. Take a fresh `browser_snapshot`
5. Compare: new heading text? New URL? Substantially different content?
6. If yes -> new screen detected, capture screenshot
7. If no -> the click may not have triggered navigation. Try again or report dead end.

## 4. Dead End Detection

A dead end means the flow cannot proceed. Detect and handle gracefully:

**No matching CTAs:**
- `browser_snapshot` shows no buttons, links, or form submits that match the flow intent
- All visible CTAs are unrelated to the flow (e.g., social media links on a 404 page)

**Error pages:**
- HTTP 4xx/5xx status (check page content for error messages)
- "Page not found", "404", "Something went wrong", "Error"
- Blank pages or pages with only a header/footer

**Infinite redirect loops:**
- Same URL or same content appearing after navigation (compare to previous screen)
- Track visited URLs -- if you return to a previously visited URL, the flow is looping

**What to do at a dead end:**
1. Capture a screenshot of the dead-end state
2. Log the dead end in flow-state.json with `"dead_end": true` and reason
3. Set flow status to `"status": "dead_end"`
4. Report to user: `Dead end at Screen {N}: {reason}`

## 5. Success State Detection

A success state means the flow completed its goal. Detect these patterns:

**Confirmation messages:**
- Text containing: "Thank you", "Success", "Complete", "Confirmed", "All done", "Congratulations"
- Order/submission confirmation with a reference number
- Email confirmation messages ("Check your inbox")

**Post-flow redirects:**
- Redirect to dashboard, home page, or account page after completing a form flow
- URL changes to a known "done" path (e.g., `/dashboard`, `/welcome`, `/confirmation`)

**Visual indicators:**
- Checkmark icons or success illustrations
- Progress bar at 100%
- "Step X of X" showing final step completed

**What to do at success:**
1. Capture the success screen
2. Set flow status to `"status": "complete"`
3. Report: `Flow complete at Screen {N}: {success indicator}`

## 6. Cookie/Popup Handling

Many sites show interruptions that are NOT part of the flow. Handle them before proceeding:

**Cookie consent banners:**
- After initial `browser_navigate`, check the snapshot for cookie banner patterns
- Look for: "Accept", "Accept All", "I Agree", "Got it" buttons within a banner/dialog
- Click the accept button to dismiss
- If not found or click fails, proceed -- the user can dismiss manually in headed mode

**Promotional modals/overlays:**
- Dismiss buttons: "X", "Close", "No thanks", "Maybe later", "Skip"
- If the modal content matches the flow intent, treat it as a flow screen instead
- If unrelated, dismiss and continue

**Onboarding tooltips:**
- Often appear as step-by-step tours on first visit
- Dismiss via "Skip tour", "Got it", "Next" (if short) or click the backdrop
- These are NOT flow screens

**How to distinguish flow-relevant modals from interruptions:**
- Flow-relevant: content matches the user's flow intent (e.g., "Confirm your email" during onboarding)
- Interruption: content is about cookies, promotions, newsletters, app store downloads, chat widgets

## 7. Screenshot Timing

Capture screenshots only when the page is visually stable and complete.

**Capture sequence (in order):**
1. Wait for DOM stability (Section 1 -- MutationObserver, 800ms quiet)
2. Wait for fonts to load (Section 1 -- `document.fonts.ready`, 5s timeout)
3. Dismiss any popups/banners that appeared (Section 6)
4. Take screenshot via `browser_take_screenshot`

**Screenshot parameters:**
- Viewport: 1440x900 (from config `screenshot.viewport`)
- Format: PNG (from config `screenshot.format`)
- Full page: false (from config `screenshot.full_page`) -- capture only the viewport

**Naming:** `screen-{N}-{slug}.png` where N is the 1-indexed screen number and slug is generated per Section 8.

## 8. Slug Generation

Generate a URL-safe slug for each screen's screenshot filename.

**Priority order:**
1. First `<h1>` heading text from the page
2. First `<h2>` heading text (if no h1)
3. Last segment of the URL path (e.g., `/onboarding/company` -> `company`)
4. Fallback: `screen-{N}` (e.g., `screen-3`)

**Slugify rules:**
- Lowercase the text
- Replace spaces and underscores with hyphens
- Strip all characters that are not alphanumeric or hyphens
- Collapse consecutive hyphens into one
- Trim leading/trailing hyphens
- Truncate to 40 characters
- If truncation breaks mid-word, truncate at the last complete word

**Examples:**
- "Welcome to Fuse" -> `welcome-to-fuse`
- "Company Information" -> `company-information`
- "Step 3: Upload Documents" -> `step-3-upload-documents`
- "" (no heading, URL `/settings/billing`) -> `billing`
- "" (no heading, no URL change) -> `screen-4`

## 9. Animation Detection Between Screen States

Detect CSS transitions and JS-triggered animations during screen navigation. Static CSS analysis (reading source files) misses conditionally-applied animations and CSS-in-JS. Runtime detection via `browser_evaluate` catches what actually fires.

**Approach:** Inject listeners BEFORE clicking a CTA, capture state AFTER DOM stability resolves. Compare pre-click vs post-stable snapshots to identify which elements animated and how.

### 9a. Pre-click Animation State Capture

Inject via `browser_evaluate` BEFORE clicking a CTA to establish the baseline animation state:

```javascript
() => {
  const animations = document.getAnimations().map(a => ({
    element: a.effect?.target?.tagName + (a.effect?.target?.className ? '.' + a.effect.target.className.split(' ')[0] : ''),
    name: a.animationName || 'transition',
    duration: a.effect?.getTiming?.()?.duration || 0,
    state: a.playState
  }));
  const transitions = Array.from(document.querySelectorAll('*')).slice(0, 200).reduce((acc, el) => {
    const cs = getComputedStyle(el);
    if (cs.transitionProperty !== 'all' && cs.transitionProperty !== 'none' && cs.transitionDuration !== '0s') {
      acc.push({
        element: el.tagName + (el.className ? '.' + String(el.className).split(' ')[0] : ''),
        property: cs.transitionProperty,
        duration: cs.transitionDuration,
        timing: cs.transitionTimingFunction
      });
    }
    return acc;
  }, []);
  return { animations, transitions, timestamp: Date.now() };
}
```

### 9b. Post-stable Animation State Capture

Inject via `browser_evaluate` AFTER DOM stability resolves (Section 1). Uses the same structure as 9a:

```javascript
() => {
  const animations = document.getAnimations().map(a => ({
    element: a.effect?.target?.tagName + (a.effect?.target?.className ? '.' + a.effect.target.className.split(' ')[0] : ''),
    name: a.animationName || 'transition',
    duration: a.effect?.getTiming?.()?.duration || 0,
    state: a.playState
  }));
  const transitions = Array.from(document.querySelectorAll('*')).slice(0, 200).reduce((acc, el) => {
    const cs = getComputedStyle(el);
    if (cs.transitionProperty !== 'all' && cs.transitionProperty !== 'none' && cs.transitionDuration !== '0s') {
      acc.push({
        element: el.tagName + (el.className ? '.' + String(el.className).split(' ')[0] : ''),
        property: cs.transitionProperty,
        duration: cs.transitionDuration,
        timing: cs.transitionTimingFunction
      });
    }
    return acc;
  }, []);
  return { animations, transitions, timestamp: Date.now() };
}
```

**Diff comparison:** Compare the pre-click (9a) and post-stable (9b) results to identify:
- Elements that gained new animations (not in pre, present in post)
- Elements that lost animations (present in pre, not in post)
- Animations whose `playState` changed (e.g., `idle` to `running`)
- New transition declarations that appeared on the post-stable DOM

### 9c. Runtime Animation Event Listeners

Inject via `browser_evaluate` BEFORE clicking a CTA. These listeners capture every animation and transition event that fires during navigation:

```javascript
() => {
  window.__spsk_anim_events = [];
  const handler = (e) => window.__spsk_anim_events.push({
    type: e.type,
    element: e.target.tagName + (e.target.className ? '.' + String(e.target.className).split(' ')[0] : ''),
    animation: e.animationName || e.propertyName || '',
    elapsed: e.elapsedTime,
    timestamp: Date.now()
  });
  ['animationstart','animationend','transitionstart','transitionend','transitionrun'].forEach(
    evt => document.addEventListener(evt, handler, true)
  );
  return { listening: true };
}
```

Collect events after DOM stability resolves via `browser_evaluate`:

```javascript
window.__spsk_anim_events
```

**Why this hybrid approach:** The pre/post snapshot comparison (9a + 9b) catches CSS-declared transitions and their computed properties. The event listeners (9c) catch dynamically triggered animations (JS-driven, framework-managed, CSS-in-JS). Together they cover both static CSS and runtime behavior -- the hybrid approach recommended in PITFALLS.md Pitfall 6.

**Integration with design-audit:** The orchestrator runs 9c (install listeners) and 9a (capture baseline) before each CTA click. After DOM stability, it runs 9b (capture post-state) and collects 9c events. Animation data is stored per-screen in `flow-state.json` and passed to the Motion specialist for scoring.

### Duration Quality Assessment

Reference `config/flow-scoring.json` `animation.duration_ranges_ms` for thresholds:

| Category | Range (ms) | Examples |
|----------|-----------|----------|
| Micro-interaction | 150--300 | Button hover, toggle switch, checkbox |
| Layout change | 300--500 | Accordion expand, tab switch, sidebar |
| Page transition | 300--800 | Route change, modal open, full-page swap |
| Sluggish | >500 | Any single element animation over 500ms feels slow |

### Easing Quality Assessment

Reference `config/flow-scoring.json` `animation.easing_quality`:

| Quality | Easing | Notes |
|---------|--------|-------|
| Good | `ease-in-out`, `cubic-bezier(...)` | Feels natural, human-designed |
| Acceptable | `ease`, `ease-out` | Reasonable defaults |
| Poor | `linear` | Robotic, no character -- flag for UI elements (acceptable for progress bars) |

## 10. prefers-reduced-motion Compliance

Any page with CSS animations or transitions MUST include a `@media (prefers-reduced-motion: reduce)` rule. No animations = automatic pass. This is a WCAG 2.1 Level AAA requirement (2.3.3) and a Level AA best practice.

### Compliance Check

Inject via `browser_evaluate` to audit reduced-motion support:

```javascript
() => {
  const sheets = Array.from(document.styleSheets);
  let hasReducedMotion = false;
  let animationCount = 0;
  sheets.forEach(sheet => {
    try {
      Array.from(sheet.cssRules || []).forEach(rule => {
        if (rule.type === CSSRule.MEDIA_RULE && rule.conditionText?.includes('prefers-reduced-motion')) {
          hasReducedMotion = true;
        }
        if (rule.style) {
          if (rule.style.animationName && rule.style.animationName !== 'none') animationCount++;
          if (rule.style.transitionProperty && rule.style.transitionProperty !== 'none') animationCount++;
        }
      });
    } catch(e) { /* cross-origin stylesheet, skip */ }
  });
  const docAnimations = document.getAnimations().length;
  return {
    has_prefers_reduced_motion: hasReducedMotion,
    css_animation_count: animationCount,
    active_animations: docAnimations,
    compliant: hasReducedMotion || (animationCount === 0 && docAnimations === 0),
    verdict: hasReducedMotion ? 'PASS' : (animationCount > 0 || docAnimations > 0) ? 'FAIL -- animations without reduced-motion support' : 'PASS -- no animations detected'
  };
}
```

**Interpretation:**
- `compliant: true` + `has_prefers_reduced_motion: true` = PASS (animations exist and are handled)
- `compliant: true` + `has_prefers_reduced_motion: false` = PASS (no animations to handle)
- `compliant: false` = FAIL (animations exist but no `@media (prefers-reduced-motion)` rule found)

**Limitations:** Cross-origin stylesheets (e.g., Google Fonts, CDN-hosted CSS) throw security errors when accessed via `cssRules`. The script skips these silently. This means the check may miss `prefers-reduced-motion` rules in external stylesheets, but those are rarely where app-specific animation rules live.

**Integration:** Run this check once per screen after DOM stability. Store the result in `flow-state.json` per screen. A `FAIL` verdict should appear as an accessibility finding in the Motion specialist's output.

## 11. Cross-Screen Consistency Heuristics

Consistency analysis is a POST-PROCESSING pass that runs after ALL per-screen reviews complete. It is NOT a 9th specialist -- it reads the specialist findings from all screens and compares them. Results go into `flow-state.json` as a top-level `consistency` section.

Reference `config/flow-scoring.json` `consistency` for thresholds and severity levels.

### 11.1 Button Style Drift

Compare button descriptions from specialist findings across screens:
- **Properties:** border-radius, background-color, padding, font-weight, font-size, text-transform
- **Detection:** When Screen N uses rounded buttons (`border-radius: 8px`) but Screen M uses square (`border-radius: 0`), or primary button color changes between screens
- **Severity:** `mismatch` (different button styles for same action type), `drift` (minor variation like 1px radius difference)
- **Source:** Layout specialist and Intent specialist findings per screen

### 11.2 Color Palette Consistency

Compare dominant colors extracted by the Color specialist across screens:
- **Properties:** Primary, secondary, accent, background, text colors
- **Detection:** When a screen introduces accent colors not present on other screens, or background color shifts between pages. Uses Delta E (perceptual color distance) with threshold of 10 from config.
- **Severity:** `drift` (Delta E 5--10, subtle shift), `mismatch` (Delta E 10--25, noticeable difference), `conflict` (Delta E >25, completely different color)
- **Source:** Color specialist findings per screen

### 11.3 Spacing and Padding Patterns

Compare gap, margin, and padding values from the Layout specialist:
- **Properties:** Section padding, card gaps, content margins, grid gutters
- **Detection:** When section padding is 64px on one screen but 32px on another, or card gaps switch from 24px to 16px without apparent reason. Uses 4px tolerance from config.
- **Severity:** `drift` (within 4px tolerance, likely subpixel), `mismatch` (>4px difference in equivalent sections)
- **Source:** Layout specialist findings per screen

### 11.4 Typography Consistency

Compare font families, sizes, and line-heights from the Font specialist:
- **Properties:** font-family, font-size, line-height, font-weight for body text, headings, labels
- **Detection:** When body text is 16px on screens 1--3 but 14px on screen 4, or heading font-family changes between screens. Uses 2px font-size tolerance from config.
- **Severity:** `drift` (within 2px tolerance), `mismatch` (>2px size difference or different font-family for same element type)
- **Source:** Font specialist findings per screen

### 11.5 Component Variant Drift

Compare how repeated components are rendered across screens:
- **Components:** Cards, list items, navigation, headers, footers, form inputs, modals
- **Detection:** When the same card component uses different shadow depth, border, or padding on different screens. When nav styling changes between pages.
- **Severity:** `drift` (minor styling variation), `mismatch` (clearly different rendering of same component), `conflict` (contradictory patterns like card-with-border vs card-without-border)
- **Source:** All specialist findings that reference repeated components

### Consistency Scoring

Consistency findings reduce the overall flow score by up to 15% (configurable via `flow_score.consistency_penalty_weight` in `config/flow-scoring.json`).

**Penalty calculation:**
1. Count total consistency findings by severity: `critical` = 3 points, `issue` = 2 points, `warning` = 1 point
2. Normalize to a 0--1 penalty scale: `penalty = min(1.0, total_points / 20)`
3. Apply: `adjusted_flow_score = raw_flow_score * (1 - consistency_penalty_weight * penalty)`

**Example:** A flow with 2 `mismatch` issues (4 points) and 3 `drift` warnings (3 points) = 7 points. Penalty = 7/20 = 0.35. Adjustment = raw_score * (1 - 0.15 * 0.35) = raw_score * 0.9475 (about 5% reduction).

### Output Format

Consistency results are stored in `flow-state.json` under a top-level `consistency` key:

```json
{
  "consistency": {
    "findings": [
      {
        "check": "button_style",
        "severity": "mismatch",
        "screens": [1, 3],
        "detail": "Screen 1 uses rounded primary buttons (border-radius: 8px), Screen 3 uses square (border-radius: 0)",
        "recommendation": "Standardize button border-radius across all screens"
      }
    ],
    "summary": {
      "total_findings": 5,
      "by_severity": { "drift": 3, "mismatch": 2, "conflict": 0 },
      "penalty_points": 7,
      "penalty_factor": 0.35,
      "score_adjustment": -0.0525
    }
  }
}
```
