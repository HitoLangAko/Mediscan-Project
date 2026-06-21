# MediScan Vault — Design System

/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4 */

> **Platform:** Expo SDK 54 · React Native 0.81 · TypeScript  
> **Genre:** modern-minimal health — trustworthy, clinical-but-friendly  
> **Theme:** custom studied-DNA from Figma MediScan (`rQEenGFR4OO0bqPJPMdJf7`)  
> **Canonical tokens:** [`tokens.css`](tokens.css) · **Runtime mirror:** [`src/theme/tokens.ts`](src/theme/tokens.ts)

---

## 1. Design philosophy

MediScan Vault helps families **organize medicines safely offline**. The UI must feel:

- **Calm and medical** — teal/green palette, generous whitespace, no alarmist drama unless status warrants it
- **Action-oriented** — Quick Scan is always one tap away
- **Honest** — never invent metrics, testimonials, or verification claims; use real vault counts or placeholders (`—`)
- **Accessible** — 44px min touch targets, visible focus (where applicable on web), high-contrast status colors

This is **not** a prescription tool. Safety disclaimers appear on scan results, helpdesk answers, and medicine details.

---

## 2. Color system

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-brand` | `#118779` | Primary buttons, links, active tab |
| `--color-brand-deep` | `#156860` | Icons, headers, logo, pressed states |
| `--color-brand-light` | `#E8F5F3` | Hero cards, chip backgrounds |
| `--color-success` | `#309653` | Verified status |
| `--color-warning` | `#DC8D11` | Needs verification, expiring soon |
| `--color-danger` | `#CC3E3C` | Expired, low confidence |
| `--color-text` | `#3C3939` | Body copy |
| `--color-text-muted` | `#6B7472` | Secondary labels |
| `--color-paper` | `#F4F7F6` | App background |
| `--color-card` | `#FFFFFF` | Cards, inputs |

### Status semantics

| Status | When | Badge colors |
|--------|------|--------------|
| **Verified** | Confidence ≥ 70%, label/box/barcode match, not expired | success / successSoft |
| **Needs Verification** | Pill-only, low confidence, incomplete OCR | warning / warningSoft |
| **Expired** | Past expiration date | danger / dangerSoft |
| **Expiring Soon** | Within configured window (UI-only until reminders wired) | warning / warningSoft |
| **Low Confidence** | Confidence &lt; 40% | danger / dangerSoft |

Logic lives in [`src/services/status.ts`](src/services/status.ts) — UI reflects `ScanStatus` from services, does not re-derive.

---

## 3. Typography

| Role | Font | RN key | Usage |
|------|------|--------|-------|
| Display | Poppins 700 | `fonts.display` | Screen titles, hero headlines |
| Display medium | Poppins 600 | `fonts.displayMedium` | Section headers |
| Body | Inter 400 | `fonts.body` | Paragraphs, list subtitles |
| Body semibold | Inter 600 | `fonts.bodySemibold` | Labels, button text |
| Body bold | Inter 700 | `fonts.bodyBold` | Emphasis |

### Scale (from `fontSizes`)

- `xs` 12 · `sm` 14 · `base` 16 · `md` 18 · `lg` 22 · `xl` 28 · `2xl` 32 · `display` 40

**Hero headlines:** ≤ 7 words when you write copy. Longer headlines use `xl` or `2xl`, not `display`.

---

## 4. Spacing, radii, elevation

- **Spacing:** 4pt scale — use `spacing.md` (16), `spacing.lg` (24) as defaults
- **Radii:** cards `radius.lg` (16), buttons/inputs `radius.md` (12), chips/badges `radius.pill`
- **Elevation:** `elevation.sm` for cards, `elevation.md` for floating elements — use RN shadow props from tokens

---

## 5. Consuming tokens in React Native

```tsx
import { useTheme } from '../theme/ThemeProvider';

function Example() {
  const { colors, fonts, fontSizes, spacing, radius } = useTheme();
  return (
    <Text style={{ color: colors.text, fontFamily: fonts.body, fontSize: fontSizes.base }}>
      Hello
    </Text>
  );
}
```

**Rules:**

1. Never hard-code hex colors in screen files — use `useTheme()` or import from `src/theme/tokens.ts`
2. Keep `tokens.css` and `src/theme/tokens.ts` in sync when adding tokens
3. Legacy imports from `src/theme.ts` still work (`colors.primary` → brand teal)

---

## 6. Component library

Import from [`src/components/index.ts`](src/components/index.ts).

| Component | Purpose |
|-----------|---------|
| `Screen` | Safe-area scroll container with paper background |
| `AppBar` | Top bar: back, menu, logo, title, actions |
| `Button` | Primary/secondary/ghost/danger + loading/disabled |
| `Card` | White bordered surface |
| `StatusBadge` | Verified / Needs Verification / Expired / Expiring Soon |
| `StatCard` | Dashboard metric tile |
| `FeatureTile` | Tappable row with icon (scan types, settings rows) |
| `MedicineListItem` | Vault/recent scan list row |
| `SearchBar` | Search input + optional filter |
| `FilterChips` | Horizontal status/category chips |
| `ConfidenceMeter` | Progress bar for scan confidence % |
| `EmptyState` | Placeholder / zero-data state |
| `CustomTabBar` | Bottom nav (Home · Scan · Vault · Reminders · Profile) |

### Button states (required for interactive components)

`Button` implements: default · pressed · disabled · loading. When extending components, also support: `:focus-visible` equivalent via `accessibilityState`, error, success.

---

## 7. Iconography

1. **Tab bar & generic UI:** `@expo/vector-icons` / Ionicons (already wired in `CustomTabBar`)
2. **Brand logo:** `assets/brand/logo.png` (Image) or `logo.svg` (future: react-native-svg-transformer)
3. **Custom Figma icons:** `assets/brand/icons/*.svg` — see [`assets/brand/manifest.json`](assets/brand/manifest.json)

Prefer Ionicons for scaffold speed; swap to brand SVGs for pixel-perfect match when implementing a screen.

---

## 8. Motion

- Animate **opacity** and **transform** only
- Durations: `duration.fast` 120ms · `duration.normal` 200ms · `duration.slow` 320ms
- Respect `AccessibilityInfo.isReduceMotionEnabled()` — collapse to instant or ≤150ms opacity fade
- No bounce/overshoot on UI state changes

---

## 9. Layout patterns

- **Screen structure:** `Screen` → optional `AppBar` → content sections separated by `spacing.lg`
- **Lists:** `MedicineListItem` with 12px gap; section headers use `fontSizes.lg` + "View all" link in `colors.brand`
- **Dashboard stats:** row of `StatCard` with `flexDirection: 'row'`, `gap: spacing.sm`
- **Bottom tabs:** always visible on tab screens; stack screens hide tabs automatically

---

## 10. Assets

| Asset | Path | Figma node |
|-------|------|------------|
| Logo PNG | `assets/brand/logo.png` | `11:27` |
| Logo SVG | `assets/brand/logo.svg` | `11:27` |
| Wordmark | `assets/brand/wordmark.svg` | `1:16` |
| Tab/status icons | `assets/brand/icons/` | `8:135` |

App icon/splash use brand teal `#118779` (see `app.config.js`).

---

## 11. Safety & copy rules

- Never claim "100% accurate" or invent user counts
- Always include disclaimer on AI/helpdesk: *"Not diagnosis or prescribing — confirm with label, pharmacist, or doctor"*
- Pill-only scans must show **Needs Verification** warning (see `safetyWarningFor` in status service)
- Use `ConfidenceMeter` with real `confidenceScore` from `ScanResult` — no fabricated percentages

---

## 12. How to implement a screen (agent checklist)

When asked: *"Look at FRONTEND_PLAN.md, DESIGN.md, tokens.css — implement X screen"*

1. **Read** the screen section in [`FRONTEND_PLAN.md`](FRONTEND_PLAN.md) — note `[wired]` vs `[mock]` data sources
2. **Open** the existing stub in `src/screens/<area>/<Screen>.tsx`
3. **Import** shared components from `src/components`
4. **Use** `useTheme()` for all colors, fonts, spacing — cross-check names in `tokens.css`
5. **Wire services** listed in FRONTEND_PLAN — do not modify service signatures unless explicitly required
6. **Navigation:** use typed routes from `src/navigation/types.ts`; `navigation.navigate('ScanResult', { scanResult })` etc.
7. **States:** implement loading, empty, error, success per FRONTEND_PLAN acceptance criteria
8. **Reference:** match layout to `docs/design_reference/ui_sample/<n>.jpg` and Figma node `1:2`
9. **Run** `npm run typecheck` before finishing
10. **Do not** delete or rewrite `src/services/*` unless the plan says so

---

## 13. Stack constraints (Expo / RN)

| Allowed | Not allowed in RN |
|---------|-------------------|
| `StyleSheet` / inline styles with theme tokens | Tailwind CSS, plain CSS files at runtime |
| `@expo/vector-icons`, `react-native-svg` | DOM elements, `<div>`, CSS variables in components |
| `expo-linear-gradient` | framer-motion, GSAP |
| `expo-camera`, `expo-image-picker` | next/image, react-dom |
| `@react-navigation/*` | expo-router (not installed) |
| `AsyncStorage` for local persistence | localStorage |

---

## 14. Exports (token formats)

**CSS (documentation):** [`tokens.css`](tokens.css)  
**React Native:** [`src/theme/tokens.ts`](src/theme/tokens.ts)  
**Legacy shim:** [`src/theme.ts`](src/theme.ts)

When adding a token, add to both CSS and TS files with the same semantic name.

---

## Provenance

- Visual DNA: Figma MediScan file + `docs/design_reference/ui_sample/` (8 screens)
- Hallmark discipline adapted for React Native (no web-only patterns)
- Pre-flight preserved: QVAC services, vault storage, medicine matcher untouched
