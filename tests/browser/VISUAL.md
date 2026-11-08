# Website visual baselines

The visual suite covers the first viewport of home, documentation, catalog and
playground in light and dark themes at 1920 × 1080 and 390 × 844. Its 16 approved
PNGs live in `baselines/desktop/` and `baselines/mobile/`. These bounded captures
protect the shared header, typography, page hierarchy and responsive layout;
they do not replace the behavioral, accessibility or below-the-fold checks in
`site.spec.js`.

## Canonical environment

GitHub Actions on Ubuntu 24.04 is the capture authority. `package-lock.json` pins
Playwright and its Chromium version. Both viewport projects use Chromium for
image comparison; the existing behavior suite also exercises mobile WebKit.
The site keeps its real system fonts. CI records OS, browser and font information
in `environment.txt` so runner updates can be distinguished from source changes.
OS images and font packages can change: review environment changes rather than
increasing tolerance to hide them.

A desktop negative control hides the home-page heading and requires the screenshot
matcher to reject the result with a pixel-difference error. It is skipped only
while the initial baseline is missing; the normal page checks still fail then.

Each test uses a fresh browser context and explicit theme cookie, locale, timezone,
scale and reduced-motion preference. It waits for fonts and images, disables
animations, hides the caret, and compares viewport screenshots. At most 100 pixels
may differ, with a per-pixel color threshold of 0.1. Do not raise these thresholds
to accept layout changes. CI repeats the suite twice to check capture stability.

## Run and review

Build the website binary from the repository root, then use the existing locked
development-only browser tools:

```sh
go build -mod=vendor -o tests/results/browser/site .
cd tests/browser
npm ci --ignore-scripts
npx playwright install --with-deps chromium
npm run test:visual
```

Missing baselines and changed images **fail**. Normal runs cannot update approved
images (`updateSnapshots: 'none'`). CI retains actual, expected and difference
images, traces, results, capture environment and candidate PNGs in
`website-visual-evidence` for seven days. No visual tooling ships with the site.

For an intentional change:

1. Open a PR describing the affected page/state and why its appearance should change.
2. Download `website-visual-evidence` from that PR's exact commit. Inspect candidates
   and difference images at desktop and mobile sizes. Check light and dark themes,
   text wrapping, clipping, header alignment and visible focus behavior separately.
3. Copy only reviewed `candidates/<project>/<page>-<theme>.png` files into matching
   `tests/browser/baselines/<project>/` paths. Never copy the entire artifact into Git.
4. Commit the selected images with the source change and record the capture run,
   source revision, reviewer and reason in the PR. Obtain human review before merge.
5. Require both repeated comparisons to pass. A blank or broken page is never an
   acceptable replacement simply because it makes CI green.

For initial establishment, review all 16 images before merging. A local screenshot
from a different OS is useful for diagnosis but is not an approved CI baseline.
Remove disposable downloaded artifacts after review; retain concise provenance
under ignored `tests/results/` and the approved PNGs in Git.
