# Changelog

All notable changes to **Selection to Variables** are documented here.  
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [1.2.0] — 2026-05-17

### Added

- **Internationalization (i18n)** — UI and all plugin messages are now available in English, Brazilian Portuguese, and Spanish. Language is auto-detected from the browser/OS locale and can be changed manually via a selector in the header. The selected language persists between sessions.
- **About dialog** — New info button in the header opens a modal with plugin description, version, build date, and links to the creator's website, Linktree, and email. Links open in the system browser via `figma.openExternal`.
- **DTCG-aligned token naming** — Token paths now follow the [Design Tokens Community Group](https://design-tokens.github.io/community-group/) naming convention (e.g. `spacing/gap`, `border-radius`, `dimension/icon/width`).
- **3-step wizard UI** — Replaced single-screen layout with a guided Configure → Review → Create flow. Includes tab navigation (Variables, Text styles, Color styles, Effect styles) and step indicators.
- **Adaptive theme colors** — Dark mode uses `#f0c24a` (amber) as the accent color (~8:1 contrast ratio against dark text). Light mode keeps `#007a7a` (teal). All accent-dependent surfaces, text, and animations adapt accordingly.

### Fixed

- `paragraphSpacing` was always `0` for mixed-text segments (read from `getStyledTextSegments`); now correctly inherits `node.paragraphSpacing`.
- `postCollectionsData()` was not awaited in `createVariables`, silently swallowing errors. Now properly awaited.
- Color collision when applying styles: a matching candidate could overwrite fills on the wrong node.
- Sandbox crashes caused by spread syntax (`{...obj}`) and `null.addEventListener` in certain Figma sandboxes.
- Async Figma APIs (`setFillStyleIdAsync`, `setEffectStyleIdAsync`, `getLocalTextStylesAsync`, `getLocalPaintStylesAsync`, etc.) were called synchronously — now all use the correct async variants required for `dynamic-page` document access.

### Changed

- **Performance** — Variable-binding node traversal replaced `Array.find()` per-node (O(n²)) with pre-built `Map` lookups (`colorByRgbaKey`, `itemById`), reducing binding time on large selections.
- **Accessibility overhaul**:
  - Toast notifications: `role="status"` + `aria-live="polite"` + `aria-atomic="true"`.
  - Status text: `aria-live="polite"`.
  - Step indicators: `role="button"` + `tabindex="0"` + Enter/Space keyboard support + `aria-current="step"` on the active step + `aria-disabled` on locked steps.
  - Tab list: `role="tablist"`, tabs have `role="tab"` + `aria-selected` (synced on change) + `aria-controls`. Tab panels have `role="tabpanel"` + `aria-labelledby`. Arrow key (←/→/Home/End) navigation follows the ARIA Authoring Practices Guide.
  - Collapsible group headers: `role="button"` + `tabindex="0"` + `aria-expanded` + `aria-controls` + Enter/Space support.
  - Input name fields: `aria-label` on all card builders.
  - Decorative elements: `aria-hidden="true"` on color chips and status dot.
  - `<html lang>` attribute updates dynamically with locale changes.
  - Focus ring: replaced bare `outline: none` with a `box-shadow` visible indicator on all inputs, selects, and link cards (WCAG 2.4.7).
- `window.onmessage` assignment replaced with `window.addEventListener("message", …)`.
- All `console.log` statements removed from production bundles.
- Build process injects `PLUGIN_VERSION` and `PLUGIN_BUILD_DATE` as compile-time constants via esbuild `define`.

### Removed

- Dead `formatTypes` function and its `void formatTypes` suppress-hack in `ui.ts`.

---

## [1.0.0] — 2026-03-15

Initial community release.

- Scan Frames, Groups, and Sections to extract color, text, and size tokens.
- Create Figma variables (COLOR, STRING, FLOAT) and bind them back to selected nodes.
- Create text styles, color styles, and effect styles from scanned tokens.
- Export tokens as a DTCG-compatible JSON file.
- Persist collection name, mode name, and display preferences via `figma.clientStorage`.
- Auto-scan on selection change (debounced, opt-in).
- Semantic inference for token names based on node context (role, state, category).
