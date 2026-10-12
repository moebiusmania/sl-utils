// Command sl-utils serves the sl-utils website and APIs.
package main

import (
	"cmp"
	"crypto/sha256"
	"embed"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/moebiusmania/sl-utils/internal/api"
	"github.com/moebiusmania/sl-utils/internal/inertia"
)

//go:embed templates/app.html
var templates embed.FS

const (
	staticDir = "static"
	clientDir = "dist/client"
	appEntry  = "frontend/app.ts"
)

func main() {
	dev := flag.Bool("dev", false, "development mode: proxy assets and SSR to the Vite dev server")
	addr := flag.String("addr", ":"+cmp.Or(os.Getenv("PORT"), "8080"), "listen address")
	viteURL := flag.String("vite", "http://127.0.0.1:5173", "Vite dev server URL (with -dev)")
	ssrURL := flag.String("ssr", cmp.Or(os.Getenv("SSR_URL"), "http://127.0.0.1:13714/render"),
		"Inertia SSR render endpoint, empty to disable SSR")
	flag.Parse()

	mux := http.NewServeMux()
	api.Register(mux)
	var handler http.Handler = mux

	cfg := inertia.Config{
		Template:     template.Must(template.ParseFS(templates, "templates/app.html")),
		FallbackHead: "<title>sl-utils 🛠️</title>",
		SSRURL:       *ssrURL,
	}
	if *dev {
		vite, err := url.Parse(*viteURL)
		if err != nil {
			log.Fatalf("invalid -vite URL: %v", err)
		}
		cfg.Version = "dev"
		cfg.SSRURL = vite.JoinPath("/__inertia_ssr").String()
		// Vite links dev stylesheets with its own origin; serve them through
		// the proxy instead, so the page also works from other devices.
		cfg.RewriteSSRHead = strings.NewReplacer(`href="`+strings.TrimSuffix(vite.String(), "/")+`/`, `href="/`).Replace
		tags := template.HTML(`<script type="module" src="/@vite/client"></script>` +
			`<script type="module" src="/` + appEntry + `"></script>`)
		cfg.Assets = func() template.HTML { return tags }
		proxy := viteProxy(vite)
		for _, prefix := range []string{"/@vite/", "/@id/", "/@fs/", "/node_modules/", "/frontend/"} {
			mux.Handle(prefix, proxy)
		}
		handler = withViteHMR(mux, proxy)
	} else {
		version, tags, err := manifestAssets()
		if err != nil {
			log.Fatalf("reading the client build (run `npm run build` first): %v", err)
		}
		cfg.Version = version
		cfg.Assets = func() template.HTML { return tags }
		assets := http.StripPrefix("/assets/", http.FileServer(http.Dir(filepath.Join(clientDir, "assets"))))
		mux.Handle("GET /assets/", immutable(assets))
	}

	registerPages(mux, inertia.New(cfg))

	log.Printf("listening on %s (dev=%v)", *addr, *dev)
	log.Fatal(http.ListenAndServe(*addr, trimTrailingSlash(handler)))
}

var pages = []map[string]string{
	{"path": "/password", "title": "Password Generator", "description": "Generate secure passwords with customizable options"},
	{"path": "/qr-code", "title": "QR Code Generator", "description": "Generate QR codes for a given URL"},
	{"path": "/timer", "title": "Countdown Timer", "description": "A simple countdown timer with minutes and seconds"},
	{"path": "/notes", "title": "Simple notepad", "description": "Full-page editable notes saved in your browser"},
	{"path": "/aes-256", "title": "AES-256 Encrypt/Decrypt", "description": "Encrypt/decrypt text with AES-256 in your browser"},
	{"path": "/social-preview", "title": "Social Preview", "description": "Preview how a link looks when shared on social networks"},
}

var endpoints = []map[string]string{
	{"endpoint": "/api/password", "methods": "GET", "description": "Generate a random password"},
	{"endpoint": "/api/qr-code", "methods": "GET", "description": "Create a QR code for a given URL"},
	{"endpoint": "/api/mit-license", "methods": "GET", "description": "Precompiled MIT License text"},
	{"endpoint": "/api/meta", "methods": "GET", "description": "Extract the sharing metadata of a given URL"},
}

func registerPages(mux *http.ServeMux, app *inertia.Inertia) {
	render := func(component string) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			app.Render(w, r, component, nil, http.StatusOK)
		}
	}

	mux.HandleFunc("GET /{$}", func(w http.ResponseWriter, r *http.Request) {
		app.Render(w, r, "Home", inertia.Props{"pages": pages, "endpoints": endpoints}, http.StatusOK)
	})
	mux.HandleFunc("GET /password", render("Password"))
	mux.HandleFunc("GET /qr-code", render("QRCode"))
	mux.HandleFunc("GET /timer", render("Timer"))
	mux.HandleFunc("GET /notes", render("Notes"))
	mux.HandleFunc("GET /aes-256", render("Aes256"))
	mux.HandleFunc("GET /social-preview", render("SocialPreview"))

	// Files in static/ are served from the root; anything else is a 404 page.
	static := http.FileServer(http.Dir(staticDir))
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet || r.Method == http.MethodHead {
			name := filepath.Join(staticDir, filepath.FromSlash(path.Clean(r.URL.Path)))
			if info, err := os.Stat(name); err == nil && !info.IsDir() {
				static.ServeHTTP(w, r)
				return
			}
		}
		app.Render(w, r, "NotFound", nil, http.StatusNotFound)
	})
}

// trimTrailingSlash serves /page/ like /page, as Fresh did.
func trimTrailingSlash(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if p := r.URL.Path; len(p) > 1 && strings.HasSuffix(p, "/") {
			r2 := r.Clone(r.Context())
			r2.URL.Path = strings.TrimRight(p, "/")
			if r2.URL.Path == "" {
				r2.URL.Path = "/"
			}
			r2.URL.RawPath = ""
			if raw := r.URL.RawPath; raw != "" {
				r2.URL.RawPath = strings.TrimRight(raw, "/")
			}
			r = r2
		}
		next.ServeHTTP(w, r)
	})
}

func immutable(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		next.ServeHTTP(w, r)
	})
}

func viteProxy(target *url.URL) *httputil.ReverseProxy {
	return &httputil.ReverseProxy{Rewrite: func(r *httputil.ProxyRequest) {
		r.SetURL(target)
	}}
}

// withViteHMR routes the Vite HMR websocket, which the Vite client opens on
// the page origin, to the dev server.
func withViteHMR(next, proxy http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.EqualFold(r.Header.Get("Upgrade"), "websocket") &&
			strings.Contains(r.Header.Get("Sec-WebSocket-Protocol"), "vite-hmr") {
			proxy.ServeHTTP(w, r)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// manifestAssets returns the asset version and tags of the production
// client build, from the Vite manifest.
func manifestAssets() (string, template.HTML, error) {
	raw, err := os.ReadFile(filepath.Join(clientDir, ".vite", "manifest.json"))
	if err != nil {
		return "", "", err
	}
	type chunk struct {
		File    string   `json:"file"`
		CSS     []string `json:"css"`
		Imports []string `json:"imports"`
	}
	var manifest map[string]chunk
	if err := json.Unmarshal(raw, &manifest); err != nil {
		return "", "", err
	}
	entry, ok := manifest[appEntry]
	if !ok {
		return "", "", fmt.Errorf("%s missing from the manifest", appEntry)
	}

	var tags strings.Builder
	for _, css := range entry.CSS {
		fmt.Fprintf(&tags, `<link rel="stylesheet" href="/%s" />`, template.HTMLEscapeString(css))
	}
	fmt.Fprintf(&tags, `<script type="module" src="/%s"></script>`, template.HTMLEscapeString(entry.File))
	for _, name := range entry.Imports {
		fmt.Fprintf(&tags, `<link rel="modulepreload" href="/%s" />`, template.HTMLEscapeString(manifest[name].File))
	}

	sum := sha256.Sum256(raw)
	return hex.EncodeToString(sum[:8]), template.HTML(tags.String()), nil
}
