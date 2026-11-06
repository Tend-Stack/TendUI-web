# TendUI Web

<img src="static/brand/mascot.svg" alt="TendUI" width="112">

The documentation and examples website for [TendUI](https://github.com/Tend-Stack/TendUI):
beautiful interfaces with no frontend build pipeline. Pure CSS and semantic HTML
work with any stack; first-class Go and templ support embeds the stylesheet
inside your Go binary.

The documentation composes TendUI’s typed `AppShell` and `Prose` components
with its embedded semantic stylesheet. Guide content uses Go HTML templates;
the landing page keeps its own hero styling. Every page, including the mounted
catalog and demos, renders one shared `SiteHeader` (`site_header.templ`) and
reads the same `tendui_theme` cookie, which defaults to dark. Catalogs and demos
share TendUI’s example handler through `site.HandlerWithOptions`. All assets are embedded. No Node, npm, JavaScript,
external fonts, tracking, database, or runtime downloads are required to build or
serve it. The test-only browser suite is separate from the shipped application.

Documentation lives under `/docs`, the searchable 37-component reference under
`/catalog`, application examples under `/examples`, and native state/appearance
controls under `/playground`. The public canonical origin is https://tendui.com.

The library and templ runtime are vendored at the exact revision recorded in
`library-version.json`. Docker builds use `GOPROXY=off` and require no module-registry access. To refresh from a clean library checkout, run
`python3 tools/vendor-library.py /path/to/TendUI`. This uses the local Go module
cache for already-downloaded dependencies, records a tag or exact pseudo-version,
and removes its temporary proxy and cache. Commit the resulting module metadata,
manifest, and vendor directory together. No local `replace` ships in the repo.

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
Links point to the project repositories; access follows their GitHub visibility.
There is no mailing-list form or unimplemented sign-up action.

MIT. See [LICENSE](LICENSE).

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

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, review and MIT + DCO sign-off.
Report vulnerabilities privately using [SECURITY.md](SECURITY.md); community
participation follows [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
