// Package inertia is a minimal server-side adapter for the Inertia.js v3
// protocol: full HTML on first visit (server-rendered through an SSR
// endpoint when available), JSON page objects on Inertia visits.
package inertia

import (
	"bytes"
	"encoding/json"
	"fmt"
	"html/template"
	"io"
	"log"
	"net/http"
	"strings"
	"sync/atomic"
	"time"
)

// Props are the page props passed to the page component.
type Props map[string]any

// Page is the Inertia page object.
type Page struct {
	Component string `json:"component"`
	Props     Props  `json:"props"`
	URL       string `json:"url"`
	Version   string `json:"version"`
}

// TemplateData is passed to the root template.
type TemplateData struct {
	// Head holds the server-rendered <head> tags (title, meta).
	Head template.HTML
	// Assets holds the stylesheet and script tags of the client bundle.
	Assets template.HTML
	// Body holds the page object and the app root element.
	Body template.HTML
}

// Config configures an Inertia renderer.
type Config struct {
	// Template is the root HTML template, executed with TemplateData.
	Template *template.Template
	// Version identifies the client assets; clients with a different
	// version are sent a full page reload.
	Version string
	// Assets returns the asset tags to include in the page.
	Assets func() template.HTML
	// SSRURL is the endpoint that renders a page object to {head, body}.
	// Rendering falls back to client-side only when it is empty or failing.
	SSRURL string
	// FallbackHead is used as Head when the page is not server-rendered.
	FallbackHead template.HTML
	// RewriteSSRHead, when set, rewrites the server-rendered head tags.
	RewriteSSRHead func(string) string
}

// Inertia renders pages.
type Inertia struct {
	cfg       Config
	client    *http.Client
	ssrFailed atomic.Bool
}

// New returns a renderer for cfg.
func New(cfg Config) *Inertia {
	return &Inertia{cfg: cfg, client: &http.Client{Timeout: 5 * time.Second}}
}

// Render responds with the given page component and props.
func (i *Inertia) Render(w http.ResponseWriter, r *http.Request, component string, props Props, status int) {
	if props == nil {
		props = Props{}
	}
	if _, ok := props["errors"]; !ok {
		props["errors"] = map[string]any{}
	}
	page := Page{Component: component, Props: props, URL: r.URL.RequestURI(), Version: i.cfg.Version}

	w.Header().Add("Vary", "X-Inertia")
	if r.Header.Get("X-Inertia") == "true" {
		if r.Method == http.MethodGet && r.Header.Get("X-Inertia-Version") != i.cfg.Version {
			w.Header().Set("X-Inertia-Location", page.URL)
			w.WriteHeader(http.StatusConflict)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Inertia", "true")
		w.WriteHeader(status)
		_ = json.NewEncoder(w).Encode(page)
		return
	}

	pageJSON, err := json.Marshal(page)
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	data := TemplateData{Assets: i.cfg.Assets()}
	if head, body, ok := i.ssr(pageJSON); ok {
		data.Head, data.Body = head, body
	} else {
		data.Head = i.cfg.FallbackHead
		// json.Marshal escapes <, > and &, so the JSON is safe inside <script>
		data.Body = template.HTML(`<script data-page="app" type="application/json">` +
			string(pageJSON) + `</script><div id="app"></div>`)
	}

	var buf bytes.Buffer
	if err := i.cfg.Template.Execute(&buf, data); err != nil {
		log.Printf("inertia: render template: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(status)
	_, _ = w.Write(buf.Bytes())
}

// ssr asks the SSR endpoint to render the page object.
func (i *Inertia) ssr(pageJSON []byte) (template.HTML, template.HTML, bool) {
	if i.cfg.SSRURL == "" {
		return "", "", false
	}
	head, body, err := i.callSSR(pageJSON)
	if err != nil {
		// Log the first failure of a streak only, to avoid flooding logs
		// while the SSR server is down.
		if !i.ssrFailed.Swap(true) {
			log.Printf("inertia: SSR unavailable, rendering client-side: %v", err)
		}
		return "", "", false
	}
	if i.ssrFailed.Swap(false) {
		log.Printf("inertia: SSR available again")
	}
	return head, body, true
}

func (i *Inertia) callSSR(pageJSON []byte) (template.HTML, template.HTML, error) {
	res, err := i.client.Post(i.cfg.SSRURL, "application/json", bytes.NewReader(pageJSON))
	if err != nil {
		return "", "", err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		msg, _ := io.ReadAll(io.LimitReader(res.Body, 2048))
		return "", "", fmt.Errorf("status %d: %s", res.StatusCode, msg)
	}
	var result struct {
		Head []string `json:"head"`
		Body string   `json:"body"`
	}
	if err := json.NewDecoder(res.Body).Decode(&result); err != nil {
		return "", "", err
	}
	if result.Body == "" {
		return "", "", fmt.Errorf("empty SSR body")
	}
	head := strings.Join(result.Head, "")
	if i.cfg.RewriteSSRHead != nil {
		head = i.cfg.RewriteSSRHead(head)
	}
	return template.HTML(head), template.HTML(result.Body), nil
}
