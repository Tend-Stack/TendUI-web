package main

import (
	"crypto/sha256"
	"fmt"
)

// Versioned URLs ensure cached styles from an older deployment cannot be paired
// with new markup. The library's vendored revision identifies its embedded CSS.
func assetURL(name, source string) string {
	data, err := assets.ReadFile(source)
	if err != nil {
		panic(err)
	}
	return fmt.Sprintf("/assets/%s-%x.css", name, sha256.Sum256(data))
}

var siteStylesheetURL = assetURL("site", "static/site.css")
var docsStylesheetURL = assetURL("docs", "static/docs.css")
var libraryStylesheetURL = assetURL("gothui", "library-version.json")
