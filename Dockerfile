FROM golang:1.27.3-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
COPY vendor ./vendor
COPY main.go docs.go docs_templ.go assets.go brand.go ./
COPY static ./static
COPY content ./content
COPY library-version.json ./
ARG VERSION=2026.1.0-dev
RUN CGO_ENABLED=0 GOPROXY=off go build -mod=vendor -trimpath -ldflags="-s -w -X main.version=${VERSION}" -o /tendui-web .

FROM scratch
COPY --from=build /tendui-web /tendui-web
USER 65532:65532
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["/tendui-web"]
