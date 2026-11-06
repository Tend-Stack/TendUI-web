// GothUI-Web serves the coming-soon website from a single binary.
package main

import (
	"bytes"
	"context"
	"crypto/sha256"
	"embed"
	"errors"
	"flag"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"
)

//go:embed static/*
var assets embed.FS

var version = "2026.1.0-dev"

func main() {
	showVersion := flag.Bool("version", false, "print build version and exit")
	flag.Parse()
	if *showVersion {
		fmt.Println(version)
		return
	}
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	n, err := strconv.Atoi(port)
	if err != nil || n < 1 || n > 65535 {
		log.Fatal("PORT must be an integer between 1 and 65535")
	}
	server := &http.Server{
		Addr: net.JoinHostPort("", port), Handler: handler(),
		ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 10 * time.Second,
		WriteTimeout: 15 * time.Second, IdleTimeout: 60 * time.Second,
		MaxHeaderBytes: 16 << 10,
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	done := make(chan struct{})
	go func() {
		defer close(done)
		<-ctx.Done()
		shutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := server.Shutdown(shutdown); err != nil {
			log.Printf("shutdown: %v", err)
		}
	}()
	log.Printf("GothUI-Web %s listening on %s", version, server.Addr)
	if err := server.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
	<-done
}

func handler() http.Handler {
	mux := http.NewServeMux()
	for _, asset := range []struct{ route, file, contentType string }{
		{"/", "index.html", "text/html; charset=utf-8"},
		{"/site.css", "site.css", "text/css; charset=utf-8"},
		{"/favicon.svg", "favicon.svg", "image/svg+xml"},
		{"/robots.txt", "robots.txt", "text/plain; charset=utf-8"},
	} {
		data, err := assets.ReadFile("static/" + asset.file)
		if err != nil {
			panic(err)
		}
		etag := fmt.Sprintf(`"%x"`, sha256.Sum256(data))
		mux.HandleFunc(asset.route, func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path != asset.route {
				http.NotFound(w, r)
				return
			}
			if !readMethod(w, r) {
				return
			}
			w.Header().Set("Content-Type", asset.contentType)
			w.Header().Set("Cache-Control", "public, max-age=0, must-revalidate")
			w.Header().Set("ETag", etag)
			http.ServeContent(w, r, asset.file, time.Time{}, bytes.NewReader(data))
		})
	}
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		if !readMethod(w, r) {
			return
		}
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store")
		if r.Method == http.MethodGet {
			_, _ = w.Write([]byte("ok\n"))
		}
	})
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Security-Policy", "default-src 'none'; style-src 'self'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		mux.ServeHTTP(w, r)
	})
}

func readMethod(w http.ResponseWriter, r *http.Request) bool {
	if r.Method == http.MethodGet || r.Method == http.MethodHead {
		return true
	}
	w.Header().Set("Allow", "GET, HEAD")
	http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	return false
}
