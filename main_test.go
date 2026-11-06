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
		{"/", "text/html", "Start building"},
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

func TestProxyPreservesCodeAndCachePolicy(t *testing.T) {
	h := handler()
	for _, path := range []string{"/", "/docs/install", "/catalog/button", "/playground", "/site.css", "/missing"} {
		for _, method := range []string{"GET", "HEAD"} {
			w := httptest.NewRecorder()
			h.ServeHTTP(w, httptest.NewRequest(method, path, nil))
			response := w.Result()
			cache := strings.Join(response.Header.Values("Cache-Control"), ",")
			if !strings.Contains(cache, "no-transform") {
				t.Errorf("%s %s: proxy can transform response: %q", method, path, cache)
			}
			if path == "/docs/install" || path == "/site.css" {
				if !strings.Contains(cache, "must-revalidate") {
					t.Errorf("%s: lost cache policy", path)
				}
			}
			if method == "GET" && path == "/docs/install" && !strings.Contains(w.Body.String(), "GothUI/v2026@v2026.1.0") {
				t.Fatal("release installation command missing")
			}
		}
	}
}

func TestThemeBehindPublicTLSProxy(t *testing.T) {
	h := handler()
	for _, hx := range []bool{false, true} {
		r := httptest.NewRequest("POST", "http://gothui.com/api/theme/toggle", nil)
		r.Header.Set("Origin", "https://gothui.com")
		r.Header.Set("Referer", "https://gothui.com/playground?theme=dark&state=disabled")
		if hx {
			r.Header.Set("HX-Request", "true")
		}
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		location, status := w.Header().Get("Location"), 303
		if hx {
			location, status = w.Header().Get("HX-Redirect"), 200
		}
		if w.Code != status || location != "/playground?state=disabled" {
			t.Fatalf("proxy navigation: status=%d location=%q", w.Code, location)
		}
		cookies := w.Result().Cookies()
		if len(cookies) != 1 || cookies[0].Value != "light" || !cookies[0].Secure || !cookies[0].HttpOnly {
			t.Fatal("proxy lost theme or secure cookie policy")
		}
		if r.Header.Get("Referer") != "https://gothui.com/playground?theme=dark&state=disabled" {
			t.Fatal("original request mutated")
		}
	}
	for _, ref := range []string{"https://evil.example/playground", "http://gothui.com/playground", "https://gothui.com:8443/playground", "https://user@gothui.com/playground"} {
		r := httptest.NewRequest("POST", "http://gothui.com/api/theme/toggle", nil)
		r.Header.Set("Referer", ref)
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		if w.Header().Get("Location") != "/" {
			t.Errorf("accepted foreign origin %s", ref)
		}
	}
	r := httptest.NewRequest("POST", "http://gothui.com/api/theme/toggle", nil)
	r.Header.Set("Origin", "https://evil.example")
	r.Header.Set("Referer", "https://gothui.com/playground")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code != http.StatusForbidden || len(w.Result().Cookies()) != 0 {
		t.Fatal("proxy bypassed cross-origin protection")
	}
}
