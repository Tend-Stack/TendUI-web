# Maintaining tendui.com

These instructions are for contributors to the **TendUI website**. For the
component library, use [TendUI](https://github.com/Tend-Stack/TendUI).

[Back to the website README](../README.md)

## How the site is assembled

The documentation composes the library's `AppShell` and `Prose` components.
Guide content uses Go HTML templates. The homepage, guides, catalog and demos
share `site_header.templ` and the `tendui_theme` cookie, which defaults to dark.
The catalog and demos use the library's `site.HandlerWithOptions` handler.
All site assets are embedded; browser test tooling is development-only.

## Updating the library dependency

`library-version.json`, `go.mod`, `go.sum` and `vendor/` identify one exact
library release. From a clean library checkout, run:

```sh
python3 tools/vendor-library.py /path/to/TendUI
```

The helper uses already-downloaded dependencies, records the version and commit,
and removes its temporary proxy and cache. Commit the resulting manifest,
module metadata and vendor directory together. Never edit vendored library code
or ship a local `replace` directive. Component changes belong in
[TendUI](https://github.com/Tend-Stack/TendUI).

## Run

Requires Go 1.26 or newer. Use a patched compiler for deployment.

```sh
go run .
# Open http://localhost:8080
```

`PORT` defaults to `8080`. The server binds all interfaces, handles termination
signals gracefully, and exposes `GET /healthz` for health probes. Assets support
GET/HEAD and conditional requests. Unknown paths return 404.

```sh
go test -race ./...
go vet ./...
CGO_ENABLED=0 go build -trimpath -o tendui-web .
./tendui-web -version
```

## Tend deployment

Connect `https://github.com/Tend-Stack/TendUI-web`, branch `main`, in Tend.
Select the repository-root `Dockerfile`, container port **8080**, and HTTP health
path **/healthz**. No secrets, volumes, or additional services are required.
Enable GitHub push deployments in Tend; this repository does not call a deploy
hook. Tend owns routing, TLS, the public domain, and deployment status.

The image runs as a non-root user and contains only the static Go executable.
For a local container check:

```sh
docker build --build-arg VERSION="$(git describe --tags --long --dirty --always)" -t tendui-web .
docker run --rm -p 8080:8080 tendui-web
```

Version lines use `YEAR.RELEASE.FIX`, initially `2026.1.0`; Git tags use `v2026.1.0`.
Release/development builds should pass `git describe --tags --long --dirty` as
`VERSION` once tags exist. Before the first tag, `--always` provides the commit ID.

GitHub Actions tests the HTTP contract, runs vet, and builds the Dockerfile.
Tend may deploy independently of CI; check both statuses after publication.
The documentation and homepage include canonical metadata for tendui.com;
`/sitemap.xml` lists the primary documentation and example routes.

## Scope

The site includes the guides, component catalog, live previews, downloads,
examples, and playground. Sample mutations update bounded browser cookies and
do not create real accounts or projects.
Public product and source links point to the [TendUI library](https://github.com/Tend-Stack/TendUI).
There is no mailing-list form or unimplemented sign-up action.

MIT. See [LICENSE](../LICENSE).

The server adds `Cache-Control: no-transform` while preserving each route's cache
policy. This keeps proxies from rewriting versioned Go commands as email links
or injecting email-decoding scripts. Production smoke checks must inspect the
actual HTML through the public domain as well as the origin/container response.

For the fixed public host `tendui.com`, Tend terminates HTTPS before forwarding
HTTP to the container. The website adapts validated presentation URLs for the
shared demo handler and marks its cookies Secure. It preserves Origin-based
request protection and does not trust arbitrary forwarded headers. Localhost
HTTP development keeps its original behavior.

Documentation shell source is `docs.templ`; generated `docs_templ.go` is committed.
After editing the shell, use templ v0.3.1100 to run `templ generate -f docs.templ`.
Normal builds need only Go. Website styles use content-hashed URLs; the library
stylesheet URL is tied to the vendored revision. This prevents cached landing-page
CSS from being reused after a documentation deployment, even when an edge proxy
sets a longer browser cache lifetime.

