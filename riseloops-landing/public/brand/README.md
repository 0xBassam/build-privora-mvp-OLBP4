# RiseLoops Logo Assets

Vector logo system for RiseLoops, built from the approved concept: a geometric
"R" mark merged with a segmented loop, in the Privora brand palette
(`#181A53`, `#24265F`, `#60BFAC`, `#96D4C8`, `#FFFFFF`).

## Files

- `logo-primary.svg` — symbol + "RiseLoops" wordmark, navy on transparent.
  Use on **light backgrounds**.
- `logo-primary-dark.svg` — same lockup, white on transparent. Use on
  **dark backgrounds** (this is what the site's navy-themed navbar/footer
  would use if the full lockup is needed there instead of the symbol alone).
- `logo-symbol.svg` — symbol only, navy. Use on light backgrounds.
- `logo-symbol-dark.svg` — symbol only, white. Use on dark backgrounds —
  this is what the live site's navbar and footer use, since both sit on the
  dark navy theme.
- `logo-monochrome.svg` — single-color version. Shapes use `fill="currentColor"`
  with tonal opacity steps, so it recolors via CSS `color` (defaults to
  `#181A53` via an inline `style` on the root `<svg>`). Use wherever only one
  ink/print color is available.

All wordmark SVGs embed the site's actual display typeface (Space Grotesk
Bold, WOFF2, base64) directly in the file via `@font-face`, so they render
correctly wherever they're opened — no external font dependency.

## Favicons

Generated from the symbol on a rounded dark tile (`#14153F`), high-contrast
at small sizes:

- `../favicon.png` — 32×32
- `../favicon-192.png` — 192×192
- `../apple-touch-icon.png` — 180×180

Wired up in `app/layout.tsx` via the Next.js `metadata.icons` field.

## Usage in the site

- `components/Navbar.tsx` and `components/Footer.tsx` use
  `logo-symbol-dark.svg` next to the existing "RiseLoops" text wordmark
  (already set in the brand display font via Tailwind), rather than the
  full lockup SVG, so the mark stays crisp at the small nav/footer size and
  the surrounding text stays real, selectable HTML rather than an image.
