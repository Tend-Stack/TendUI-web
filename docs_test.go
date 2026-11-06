package main

import (
	"net/http/httptest"
	"strings"
	"testing"
)

func TestDocumentationAndLiveExamples(t *testing.T) {
	h := handler()
	paths := []string{"/catalog", "/catalog/button", "/catalog/button/preview", "/catalog/button/example.templ", "/playground", "/settings", "/forms", "/editing", "/wizard", "/uploads", "/sitemap.xml", "/version"}
	for _, g := range guides {
		paths = append(paths, g.Path)
	}
	for _, path := range paths {
		t.Run(path, func(t *testing.T) {
			w := httptest.NewRecorder()
			h.ServeHTTP(w, httptest.NewRequest("GET", path, nil))
			if w.Code != 200 {
				t.Fatalf("GET %s: %d", path, w.Code)
			}
			if strings.Contains(w.Body.String(), "<script") {
				t.Fatal("public site must not bundle JavaScript")
			}
			if strings.HasPrefix(w.Header().Get("Content-Type"), "text/html") && strings.Count(w.Body.String(), "<main") != 1 {
				t.Fatal("expected exactly one main landmark")
			}
			if w.Header().Get("X-GothUI-Build") != version {
				t.Fatal("missing deployed build identity")
			}
			head := httptest.NewRecorder()
			h.ServeHTTP(head, httptest.NewRequest("HEAD", path, nil))
			if head.Code != 200 || head.Body.Len() != 0 {
				t.Fatalf("HEAD %s: %d, %d bytes", path, head.Code, head.Body.Len())
			}
		})
	}
}

func TestDocumentationUnknownPagesAndUnsafeMethods(t *testing.T) {
	h := handler()
	for _, path := range []string{"/docs/missing", "/docs/install/missing", "/examples/missing"} {
		w := httptest.NewRecorder()
		h.ServeHTTP(w, httptest.NewRequest("GET", path, nil))
		if w.Code != 404 {
			t.Errorf("%s returned %d", path, w.Code)
		}
	}
	for _, g := range guides {
		w := httptest.NewRecorder()
		h.ServeHTTP(w, httptest.NewRequest("POST", g.Path, nil))
		if w.Code != 405 {
			t.Errorf("POST %s returned %d", g.Path, w.Code)
		}
	}
}
