package main

import (
	"bytes"
	"crypto/sha256"
	"fmt"
)

// Versioned URLs ensure cached styles from an older deployment cannot be paired
// with new markup. The library's vendored revision identifies its embedded CSS.
func assetURL(name, source string) string {
	data := publishedAsset(source)
	return fmt.Sprintf("/assets/%s-%x.css", name, sha256.Sum256(data))
}

var siteStylesheetURL = assetURL("site", "static/site.css")
var docsStylesheetURL = assetURL("docs", "static/docs.css")
var libraryStylesheetURL = assetURL("gothui", "library-version.json")

// Resolve artwork references before hashing CSS or HTML so a brand update also
// changes the referring stylesheet URL. Friendly image URLs remain downloadable.
func publishedAsset(source string) []byte {
	data, err := assets.ReadFile(source)
	if err != nil {
		panic(err)
	}
	for name, asset := range brandAssets {
		data = bytes.ReplaceAll(data, []byte("/brand/"+name), []byte(asset.URL))
	}
	return data
}
