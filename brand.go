package main

import (
	"crypto/sha256"
	"fmt"
	"mime"
	"path"
)

type brandAsset struct{ Name, URL, ContentType string }

var brandAssets = loadBrandAssets()

func loadBrandAssets() map[string]brandAsset {
	entries, err := assets.ReadDir("static/brand")
	if err != nil {
		panic(err)
	}
	result := make(map[string]brandAsset, len(entries))
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		data, err := assets.ReadFile("static/brand/" + name)
		if err != nil {
			panic(err)
		}
		ext := path.Ext(name)
		result[name] = brandAsset{name, fmt.Sprintf("/brand/%s-%x%s", name[:len(name)-len(ext)], sha256.Sum256(data), ext), mime.TypeByExtension(ext)}
	}
	return result
}

func brandURL(name string) string {
	asset, ok := brandAssets[name]
	if !ok {
		panic("missing brand asset: " + name)
	}
	return asset.URL
}
