# Web and GitHub brand assets

Selected from the operator-provided Tend UI Gopher Brand Kit. Originals stay
outside the repositories. SVGs were checked for scripts, event handlers,
external references and raster wrappers. Supplied files are copied unchanged;
geometry, colors and wordmark text are preserved. No web fonts,
image-generation service or client-side JavaScript are required.

| Asset | Format | Use |
| --- | --- | --- |
| `/brand/logo-dark.svg`, `/brand/logo-light.svg` | True SVG, 800 × 220 viewBox | README lockups and downloadable artwork |
| `/brand/favicon.svg` | True SVG, 64 × 64 viewBox | Browser icon and small documentation brand mark |
| `/brand/mascot.svg` | True SVG, 512 × 512 viewBox | Homepage gopher with arch |
| `/brand/mascot-guide.svg` | True SVG, 512 × 512 viewBox | Small documentation companion without arch |
| `/brand/og-image.png` | PNG, 1200 × 630 | Open Graph and large social cards |
| `/brand/github-social-preview.png` | PNG, 1280 × 640 | GitHub repository social preview upload |

The vectors are 1–6 KB each and have explicit dimensions to avoid layout shifts.
The shared header pairs the new kit’s gopher SVG with a readable HTML Tend UI
wordmark. Full compact lockups remain available for README use and download.
The social PNGs are supplied publication-sized illustrations, not SVG wrappers;
they are only fetched by sharing clients or explicit downloads. The website
uses versioned asset URLs. The friendly URLs above remain available for downloads.
`brand-assets.json` records the selected kit filenames and prepared byte counts.

## GitHub

README logos are committed in both repositories. The supplied social-preview
file is ready at `static/brand/github-social-preview.png`. GitHub's repository
social-preview setting requires a separate upload; source publication alone does
not change that setting. The application boards are references, not shipped UI:
we do not publish their example star/fork counts or implied metrics.

## Visual use

Use the lavender accent for navigation and actions; cyan identifies the gopher.
The homepage uses the arch mascot as a companion to the working UI sample, while
docs use a smaller decorative guide. Keep examples, code and controls prominent.
