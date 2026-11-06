package main

import (
	"net/http"
	"strings"

	"github.com/Tend-Stack/TendUI/v2026/components"
	"github.com/Tend-Stack/TendUI/v2026/examples/site"
	"github.com/a-h/templ"
)

// defaultTheme is the first-visit appearance on every surface of the site.
const defaultTheme = components.ThemeDark

func within(path, section string) bool {
	return path == section || strings.HasPrefix(path, section+"/")
}

// siteNavigation keeps one set of labels and one current-section rule for
// the landing page, documentation and the mounted example site.
func siteNavigation(active string) []components.SiteHeaderItem {
	return []components.SiteHeaderItem{
		{Label: "Docs", Href: "/docs", Current: within(active, "/docs")},
		{Label: "Components", Href: "/catalog", Current: within(active, "/catalog")},
		{
			Label: "Examples", Href: "/examples", AllLabel: "All examples",
			Current: active == "/examples" || site.IsExamplePath(active),
			Groups:  site.ExampleNavigation(active),
			Note:    "Runnable pages with native controls and Go handlers.",
		},
		{Label: "Playground", Href: "/playground", Current: active == "/playground"},
	}
}

// siteTheme reads the cookie the shared theme toggle saves. It matches the
// example site's rules so no page changes appearance on navigation.
func siteTheme(r *http.Request) components.Theme {
	if cookie, err := r.Cookie("tendui_theme"); err == nil {
		switch cookie.Value {
		case "light":
			return components.ThemeLight
		case "dark":
			return components.ThemeDark
		case "system":
			return components.ThemeSystem
		}
	}
	return defaultTheme
}

// themeAttribute returns the root data-theme value; system follows the browser.
func themeAttribute(theme components.Theme) string {
	if theme == components.ThemeLight || theme == components.ThemeDark {
		return string(theme)
	}
	return ""
}

// hostPage reports pages this site serves outside the example handler, so the
// theme toggle can return to them.
func hostPage(path string) bool {
	if path == "/" {
		return true
	}
	for _, g := range guides {
		if g.Path == path {
			return true
		}
	}
	return false
}

func demoOptions() site.Options {
	return site.Options{
		Header:       func(active string) templ.Component { return siteHeader(active, nil) },
		DefaultTheme: defaultTheme,
		HostPage:     hostPage,
		Head:         headerStylesheet(),
	}
}
