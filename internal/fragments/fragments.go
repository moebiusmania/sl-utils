// Package fragments serves the HTML fragments the pages request with htmx.
package fragments

import (
	"html/template"
	"net/http"
	"regexp"
	"slices"
	"strings"
	"unicode/utf16"

	"github.com/moebiusmania/sl-utils/internal/api"
	"github.com/moebiusmania/sl-utils/internal/jsutil"
	"github.com/moebiusmania/sl-utils/internal/qrcode"
	"github.com/moebiusmania/sl-utils/internal/views"
	whatwg "github.com/nlnwa/whatwg-url/url"
)

// Register mounts the fragment endpoints on mux.
func Register(mux *http.ServeMux, v *views.Renderer) {
	mux.HandleFunc("GET /password/generate", func(w http.ResponseWriter, r *http.Request) {
		password, err := api.PasswordFromQuery(r.URL.RawQuery)
		if err != nil {
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		v.Fragment(w, http.StatusOK, "password", "result", password)
	})

	mux.HandleFunc("GET /qr-code/generate", func(w http.ResponseWriter, r *http.Request) {
		url, _ := jsutil.SearchParam(r.URL.RawQuery, "url")
		if url == "" {
			plainError(w, "URL is required: add '?url=<url> in the address bar'", http.StatusBadRequest)
			return
		}
		svg, err := qrcode.SVG(url, 4)
		if err != nil {
			plainError(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		v.Fragment(w, http.StatusOK, "qr-code", "result", map[string]any{
			// Same data URL the page built in the browser before
			"Src": template.URL("data:image/svg+xml;charset=utf-8," + jsutil.EncodeURIComponent(svg)),
			"URL": url,
		})
	})

	mux.HandleFunc("GET /social-preview/fetch", func(w http.ResponseWriter, r *http.Request) {
		url, _ := jsutil.SearchParam(r.URL.RawQuery, "url")
		meta, err := api.FetchMeta(r.Context(), url)
		if err != nil {
			plainError(w, err.Message, err.Status)
			return
		}
		v.Fragment(w, http.StatusOK, "social-preview", "results", NewSocialView(meta))
	})
}

// plainError answers a failed htmx request: the page shows the message.
func plainError(w http.ResponseWriter, message string, status int) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.WriteHeader(status)
	_, _ = w.Write([]byte(message))
}

// Funcs are the template functions the fragments use.
var Funcs = template.FuncMap{
	"truncate": Truncate,
	"image": func(src, class string) PreviewImage {
		return PreviewImage{Src: template.URL(src), Class: class}
	},
	// Image URLs come from the previewed page: keep them as they are, as
	// the browser did (an <img> never runs a javascript: URL).
	"rawURL": func(s string) template.URL { return template.URL(s) },
}

// PreviewImage is an image of a preview card, with its CSS class.
type PreviewImage struct {
	Src   template.URL
	Class string
}

// SocialView is the data of the social previews fragment.
type SocialView struct {
	Meta   *api.MetaPreview
	Host   string
	Origin string
	Crumbs string
	Tags   []TagRow
}

// TagRow is a row of the detected tags table.
type TagRow struct {
	Key     string
	Value   string
	Present bool
}

var importantTags = []string{
	"<title>",
	"description",
	"og:title",
	"og:description",
	"og:image",
	"og:url",
	"og:type",
	"og:site_name",
	"twitter:card",
	"twitter:title",
	"twitter:description",
	"twitter:image",
}

var socialTagRe = regexp.MustCompile(`^(og|twitter|article|fb):`)

// NewSocialView prepares meta for the previews.
func NewSocialView(meta *api.MetaPreview) *SocialView {
	view := &SocialView{Meta: meta, Host: HostOf(meta.URL)}

	if u, err := whatwg.Parse(meta.URL); err == nil {
		view.Origin = origin(u)
		var crumbs []string
		for segment := range strings.SplitSeq(u.Pathname(), "/") {
			if segment != "" {
				crumbs = append(crumbs, segment)
			}
		}
		view.Crumbs = strings.Join(crumbs, " › ")
	}

	var others []string
	for _, key := range meta.Tags.Keys() {
		if !slices.Contains(importantTags, key) && socialTagRe.MatchString(key) {
			others = append(others, key)
		}
	}
	slices.SortFunc(others, compareUTF16)
	for _, key := range append(slices.Clone(importantTags), others...) {
		value, ok := meta.Tags.Lookup(key)
		view.Tags = append(view.Tags, TagRow{Key: key, Value: value, Present: ok})
	}
	return view
}

// origin mirrors URL.prototype.origin.
func origin(u *whatwg.Url) string {
	switch u.Scheme() {
	case "ftp", "http", "https", "ws", "wss":
		return u.Protocol() + "//" + u.Host()
	}
	return "null"
}

// HostOf returns the hostname of url without "www.", or url itself when it
// is not a valid URL.
func HostOf(url string) string {
	u, err := whatwg.Parse(url)
	if err != nil {
		return url
	}
	return strings.TrimPrefix(u.Hostname(), "www.")
}

// Truncate shortens text to max UTF-16 code units, ending with an
// ellipsis, like the JavaScript version did.
func Truncate(text string, max int) string {
	units := utf16.Encode([]rune(text))
	if len(units) <= max {
		return text
	}
	cut := string(utf16.Decode(units[:max-1]))
	return strings.TrimRightFunc(cut, jsutil.IsSpace) + "…"
}

// compareUTF16 orders strings like Array.prototype.sort does by default.
func compareUTF16(a, b string) int {
	return slices.Compare(utf16.Encode([]rune(a)), utf16.Encode([]rune(b)))
}
