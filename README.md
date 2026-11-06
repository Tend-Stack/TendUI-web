# GothUI Web

The coming-soon website for [GothUI](https://github.com/Tend-Stack/GothUI):
semantic CSS and typed templ components, embedded in your Go binary.

This standalone website uses original HTML/CSS and a standard-library Go server.
All assets are embedded. No Node, npm, JavaScript, external fonts, tracking,
database, or runtime downloads. The interface study uses a native disclosure.

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
CGO_ENABLED=0 go build -trimpath -o gothui-web .
./gothui-web -version
```

## Tend deployment

Connect `https://github.com/Tend-Stack/GothUI-Web`, branch `main`, in Tend.
Select the repository-root `Dockerfile`, container port **8080**, and HTTP health
path **/healthz**. No secrets, volumes, or additional services are required.
Enable GitHub push deployments in Tend; this repository does not call a deploy
hook. Tend owns routing, TLS, the public domain, and deployment status.

The image runs as a non-root user and contains only the static Go executable.
For a local container check:

```sh
docker build --build-arg VERSION="$(git describe --tags --long --dirty --always)" -t gothui-web .
docker run --rm -p 8080:8080 gothui-web
```

Version lines use `YEAR.RELEASE.FIX`, initially `2026.1.0`; Git tags use `v2026.1.0`.
Release/development builds should pass `git describe --tags --long --dirty` as
`VERSION` once tags exist. Before the first tag, `--always` provides the commit ID.

GitHub Actions tests the HTTP contract, runs vet, and builds the Dockerfile.
Tend may deploy independently of CI; check both statuses after publication.
Add domain-specific canonical and social URLs when the final domain is assigned.

## Scope

This is a coming-soon page, not the future docs or component playground.
Links point to the project repositories; access follows their GitHub visibility.
There is no mailing-list form or unimplemented sign-up action.

MIT. See [LICENSE](LICENSE).
