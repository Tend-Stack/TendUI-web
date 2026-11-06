package main

import (
	"net/http"
	"net/http/httptest"
	"regexp"
	"strings"
	"testing"
)

// Every surface renders the same SiteHeader with one current section.
func TestOneHeaderEverywhere(t *testing.T) {
	h := handler()
	current := regexp.MustCompile(`<nav class="site-nav"[\s\S]*?</nav>`)
	for _, tc := range []struct{ path, section string }{
		{"/", ""},
		{"/docs", `<a href="/docs" aria-current="page">Docs</a>`},
		{"/docs/install", `<a href="/docs" aria-current="page">Docs</a>`},
		{"/catalog", `<a href="/catalog" aria-current="page">Components</a>`},
		{"/catalog/button", `<a href="/catalog" aria-current="page">Components</a>`},
		{"/examples", `<summary data-current="true">`},
		{"/dashboard", `<summary data-current="true">`},
		{"/playground", `<a href="/playground" aria-current="page">Playground</a>`},
	} {
		w := httptest.NewRecorder()
		h.ServeHTTP(w, httptest.NewRequest("GET", tc.path, nil))
		body := w.Body.String()
		if w.Code != 200 {
			t.Fatalf("%s: %d", tc.path, w.Code)
		}
		if strings.Count(body, `<header class="site-header">`) != 1 || strings.Contains(body, `class="app-header"`) || strings.Contains(body, `class="masthead"`) {
			t.Errorf("%s: expected exactly one shared header", tc.path)
		}
		for _, label := range []string{">Docs</a>", ">Components</a>", "Examples", ">Playground</a>", `aria-label="TendUI home"`, `class="site-version"`, headerStylesheetURL} {
			if !strings.Contains(body, label) {
				t.Errorf("%s: header missing %s", tc.path, label)
			}
		}
		nav := current.FindString(body)
		if tc.section == "" {
			if strings.Contains(nav, "aria-current") || strings.Contains(nav, "data-current") {
				t.Errorf("%s: home marks no section", tc.path)
			}
		} else if !strings.Contains(nav, tc.section) {
			t.Errorf("%s: wrong current section", tc.path)
		}
		if strings.Contains(body, "<script") {
			t.Errorf("%s: unexpected script", tc.path)
		}
	}
}

func TestThemeIsSharedAndDefaultsDark(t *testing.T) {
	h := handler()
	for _, path := range []string{"/", "/docs", "/catalog", "/playground"} {
		for _, tc := range []struct{ cookie, want string }{{"", `data-theme="dark"`}, {"light", `data-theme="light"`}, {"dark", `data-theme="dark"`}} {
			r := httptest.NewRequest("GET", path, nil)
			if tc.cookie != "" {
				r.AddCookie(&http.Cookie{Name: "tendui_theme", Value: tc.cookie})
			}
			w := httptest.NewRecorder()
			h.ServeHTTP(w, r)
			if !strings.Contains(w.Body.String(), tc.want) {
				t.Errorf("%s with %q: want %s", path, tc.cookie, tc.want)
			}
		}
	}
	r := httptest.NewRequest("GET", "/docs", nil)
	r.AddCookie(&http.Cookie{Name: "tendui_theme", Value: "system"})
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if strings.Contains(w.Body.String(), "data-theme=") || w.Header().Get("Vary") != "Cookie" {
		t.Fatal("system theme follows the browser and responses vary by cookie")
	}
}

func TestThemeToggleReturnsToHostPages(t *testing.T) {
	h := handler()
	for _, path := range []string{"/", "/docs/install", "/catalog"} {
		r := httptest.NewRequest("POST", "https://tendui.com/api/theme/toggle", nil)
		r.Host = "tendui.com"
		r.Header.Set("Referer", "https://tendui.com"+path)
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		if w.Code != http.StatusSeeOther || w.Header().Get("Location") != path {
			t.Errorf("%s: got %d %q", path, w.Code, w.Header().Get("Location"))
		}
		if cookies := w.Result().Cookies(); len(cookies) != 1 || cookies[0].Value != "light" || !cookies[0].Secure {
			t.Errorf("%s: first toggle should save a secure light cookie", path)
		}
	}
}

func TestDocsGuidesMoveIntoCompactMenu(t *testing.T) {
	w := httptest.NewRecorder()
	handler().ServeHTTP(w, httptest.NewRequest("GET", "/docs/install", nil))
	body := w.Body.String()
	section := regexp.MustCompile(`<div class="site-sheet-section">[\s\S]*?</div>`).FindString(body)
	if !strings.Contains(section, `<a href="/docs/install" aria-current="page">Installation</a>`) || strings.Contains(section, "/catalog") || strings.Contains(section, `"/examples"`) {
		t.Fatalf("compact menu should list only guides: %s", section)
	}
}
