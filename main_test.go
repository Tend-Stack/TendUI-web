package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestPublicRoutes(t *testing.T) {
	h := handler()
	for _, tc := range []struct {
		path, contentType, contains string
	}{
		{"/", "text/html", "Website coming soon"},
		{"/site.css", "text/css", "prefers-reduced-motion"},
		{"/favicon.svg", "image/svg+xml", "<svg"},
		{"/robots.txt", "text/plain", "Allow: /"},
		{"/healthz", "text/plain", "ok\n"},
	} {
		t.Run(tc.path, func(t *testing.T) {
			t.Parallel()
			get := httptest.NewRecorder()
			h.ServeHTTP(get, httptest.NewRequest(http.MethodGet, tc.path, nil))
			if get.Code != http.StatusOK || !strings.HasPrefix(get.Header().Get("Content-Type"), tc.contentType) || !strings.Contains(get.Body.String(), tc.contains) {
				t.Fatalf("unexpected GET: %d %v %s", get.Code, get.Header(), get.Body.String())
			}
			if !strings.Contains(get.Header().Get("Content-Security-Policy"), "default-src 'none'") {
				t.Fatal("missing restrictive content policy")
			}
			head := httptest.NewRecorder()
			h.ServeHTTP(head, httptest.NewRequest(http.MethodHead, tc.path, nil))
			if head.Code != http.StatusOK || head.Body.Len() != 0 {
				t.Fatalf("unexpected HEAD: %d, %d bytes", head.Code, head.Body.Len())
			}
			post := httptest.NewRecorder()
			h.ServeHTTP(post, httptest.NewRequest(http.MethodPost, tc.path, nil))
			if post.Code != http.StatusMethodNotAllowed || post.Header().Get("Allow") != "GET, HEAD" {
				t.Fatalf("unexpected POST: %d %v", post.Code, post.Header())
			}
			if tc.path == "/healthz" {
				return
			}
			etag := get.Header().Get("ETag")
			if etag == "" || etag != head.Header().Get("ETag") {
				t.Fatal("missing or inconsistent asset ETag")
			}
			req := httptest.NewRequest(http.MethodGet, tc.path, nil)
			req.Header.Set("If-None-Match", etag)
			cached := httptest.NewRecorder()
			h.ServeHTTP(cached, req)
			if cached.Code != http.StatusNotModified || cached.Body.Len() != 0 {
				t.Fatalf("unexpected conditional GET: %d", cached.Code)
			}
		})
	}
}

func TestUnknownPathsDoNotServeHomepageOrPrivateFiles(t *testing.T) {
	h := handler()
	for _, path := range []string{"/missing", "/index.html", "/static/", "/.git/config", "/main.go", "/healthz/extra"} {
		w := httptest.NewRecorder()
		h.ServeHTTP(w, httptest.NewRequest(http.MethodGet, path, nil))
		if w.Code != http.StatusNotFound {
			t.Errorf("%s: got %d, want 404", path, w.Code)
		}
	}
}
