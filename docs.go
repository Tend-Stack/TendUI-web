package main

import (
	"bytes"
	"context"
	"html/template"
	"io"
	"log"
	"net/http"

	"github.com/Tend-Stack/TendUI/v2026/components"
	"github.com/a-h/templ"
)

type guide struct {
	Path, Title, Summary, File string
}

var guides = []guide{
	{"/docs", "Build something thoughtful.", "A practical guide to semantic interfaces with Go, templ, and optional HTMX.", "overview"},
	{"/docs/install", "From module to interface.", "Install TendUI, serve its embedded CSS, and render your first page.", "install"},
	{"/docs/html", "Start with HTML. Add your stack.", "Use TendUI with two static files and no build tools.", "html"},
	{"/docs/theming", "Make it feel like yours.", "Choose a color mode, compose appearance settings, or override the tokens.", "theming"},
	{"/docs/forms", "Forms that work with the browser.", "Native submission first. Validation and persistence belong to your application.", "forms"},
	{"/docs/htmx", "Enhance a working page.", "Use optional HTMX attributes with explicit full-page and fragment responses.", "htmx"},
	{"/docs/accessibility", "Good structure comes first.", "Names, focus, landmarks, feedback, and motion need deliberate care.", "accessibility"},
	{"/docs/deploy", "Ship a single binary.", "Embed the assets, build with Go, and let your platform handle routing and TLS.", "deploy"},
	{"/examples", "See the pieces work together.", "Runnable examples with native controls and application-owned Go handlers.", "examples"},
}

func registerDocs(mux *http.ServeMux) {
	for _, g := range guides {
		page := template.Must(template.ParseFS(assets, "content/"+g.File+".html"))
		mux.HandleFunc(g.Path, func(w http.ResponseWriter, r *http.Request) {
			if !readMethod(w, r) {
				return
			}
			var buf bytes.Buffer
			navigation := make([]components.NavItem, 0, len(guides)+1)
			labels := []string{"Introduction", "Installation", "HTML & CSS", "Appearance", "Forms & validation", "HTMX", "Accessibility", "Deployment", "Examples"}
			for i, entry := range guides {
				navigation = append(navigation, components.NavItem{Label: labels[i], Href: entry.Path, Current: entry.Path == g.Path})
			}
			navigation = append(navigation, components.NavItem{Label: "Component reference ↗", Href: "/catalog"})
			body := templ.ComponentFunc(func(ctx context.Context, w io.Writer) error {
				return page.ExecuteTemplate(w, "body", nil)
			})
			section := navigation[:len(navigation)-2] // Guides only; Examples and Components have their own header items.
			if err := documentationPage(g, navigation, section, themeAttribute(siteTheme(r)), body).Render(r.Context(), &buf); err != nil {
				log.Printf("documentation render: %v", err)
				http.Error(w, "Unable to render page", http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.Header().Set("Cache-Control", "public, max-age=0, must-revalidate")
			w.Header().Set("Vary", "Cookie") // The saved theme changes the markup.
			if r.Method != http.MethodHead {
				_, _ = w.Write(buf.Bytes())
			}
		})
	}
	mux.HandleFunc("/sitemap.xml", func(w http.ResponseWriter, r *http.Request) {
		if !readMethod(w, r) {
			return
		}
		w.Header().Set("Content-Type", "application/xml; charset=utf-8")
		if r.Method == http.MethodHead {
			return
		}
		_, _ = w.Write([]byte(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://tendui.com/</loc></url>`))
		for _, g := range guides {
			_, _ = w.Write([]byte("<url><loc>https://tendui.com" + g.Path + "</loc></url>"))
		}
		for _, path := range []string{"/catalog", "/playground", "/forms", "/dashboard", "/settings", "/workspace", "/interactions", "/editing", "/motion", "/patterns", "/wizard", "/uploads"} {
			_, _ = w.Write([]byte("<url><loc>https://tendui.com" + path + "</loc></url>"))
		}
		_, _ = w.Write([]byte("</urlset>"))
	})
}
