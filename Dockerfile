FROM golang:1.27.3-alpine AS build
WORKDIR /src
COPY go.mod ./
COPY main.go ./
COPY static ./static
ARG VERSION=2026.1.0-dev
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w -X main.version=${VERSION}" -o /gothui-web .

FROM scratch
COPY --from=build /gothui-web /gothui-web
USER 65532:65532
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["/gothui-web"]
