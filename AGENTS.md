# Working on TendUI-web

This repository is the Go website at https://tendui.com. It consumes the TendUI
library; it is not the library source. Read relevant code and tests before editing,
preserve unrelated work, and follow [CONTRIBUTING.md](CONTRIBUTING.md).

## Structure

- `main.go` wires the HTTP server, embedded assets and mounted library demos.
- `docs.go` registers guides, navigation and the sitemap. Guide bodies live in
  `content/*.html` as Go HTML templates with a `body` definition.
- `docs.templ` renders the documentation shell. `site_header.templ` is shared by
  home, docs, catalog and demos; preserve that single header and theme behavior.
- `static/` contains website CSS and brand assets. Preserve content-hashed asset
  URLs, favicon coverage, canonical URLs and existing cache/security headers.
- `library-version.json`, `go.mod`, `go.sum` and `vendor/` record one exact library
  dependency. Do not hand-edit vendor or ship local module replacements.
- Library changes belong in `Tend-Stack/TendUI`. To update an authorized dependency
  from a clean library checkout, use `python3 tools/vendor-library.py /path/to/TendUI`
  and commit all resulting metadata and vendor changes together.

## Repository identity

- Present this repository as the source for **tendui.com**, with website-specific
  README artwork and contributor instructions distinct from the component library.
- Public product, installation and source links must point to
  `https://github.com/Tend-Stack/TendUI`. Reserve links to this repository for
  clearly labeled website-maintainer instructions, issues and deployment setup.
- Route component and library API changes to TendUI; keep the README focused on
  running, maintaining and contributing to this website.

## Product rules

- Use TendUI components and semantic HTML. Keep the public site usable without
  JavaScript; do not add frontend build tools, remote fonts or runtime downloads.
- The browser test suite may use Node/npm; building and serving the site need Go
  only. Read `go.mod` for Go and templ versions.
- Use the installed library API, not guessed props or examples from a newer tag.
  Keep installation instructions pinned and accurate; do not silently upgrade.
- Preserve native forms/links, focus, labels, theme cookies, reduced motion and
  narrow-screen layouts. Keep the shared header and 1920px maximum consistent.
- Demos are bounded examples, not production account creation or persistence.
  Do not weaken origin validation or cookie protections to make a demo pass.
- Keep public documentation free of private infrastructure, credentials and local
  workstation paths. Retain asset provenance and license notices.

## Commands and validation

Run from the repository root:

```sh
go run .                 # local server; PORT defaults to 8080
go test -race ./...
go vet ./...
```

For template edits, use the generator matching `go.mod`, run `templ fmt .` and
`templ generate`, and commit `.templ` and `_templ.go` together. Never hand-edit
generated output. Normal builds use the committed output and vendored modules.

For new guides, update `docs.go` and its navigation labels together; the sitemap
uses the guide registry. Add the route to the existing browser guide audit in
`tests/browser/site.spec.js`. HTTP tests already exercise each registered guide.
Check links and code samples, mobile containment and keyboard navigation.

Use focused checks while editing and CI for full verification. Follow
[CONTRIBUTING.md](CONTRIBUTING.md) for browser tooling. Store task artifacts under
ignored `tests/results/`; remove only owned disposable output and keep concise
failure evidence. Do not create duplicate environments or discard unrelated work.

## Delivery

- Submit focused PRs to GitHub `Tend-Stack/TendUI-web` main. MIT + DCO applies;
  human contributors review and authorize their own sign-offs. Never fabricate
  someone else's identity, certification or test results.
- A push to main can trigger Tend deployment. Publish only within the user's
  authorized scope, preserve active work and existing data, and verify CI and
  deployment separately. Do not add deployment credentials to this repository.
- Settings in `.github/settings/` are prepared configurations, not proof that
  GitHub rules or a Project are active.
- Verify changed routes through the public domain after an authorized deployment;
  check actual served content, not only a successful build status.
- Report what changed, tests actually run, live verification when applicable,
  and remaining limitations. Do not claim a deployed result from a local test.
