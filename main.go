// Command sl-utils serves the sl-utils website and APIs.
package main

import (
	"cmp"
	"crypto/sha256"
	"embed"
	"encoding/hex"
	"flag"
	"html/template"
	"io/fs"
	"log"
	"maps"
	"net/http"
	"os"
	"path"
	"strings"
	"sync"

	"github.com/moebiusmania/sl-utils/internal/api"
	"github.com/moebiusmania/sl-utils/internal/fragments"
	"github.com/moebiusmania/sl-utils/internal/views"
)

//go:embed web
var embedded embed.FS

func main() {
	dev := flag.Bool("dev", false, "development mode: read web/ from disk and reload templates on every request")
	addr := flag.String("addr", ":"+cmp.Or(os.Getenv("PORT"), "8080"), "listen address")
	flag.Parse()

	var web fs.FS = embedded
	if *dev {
		web = os.DirFS(".")
	}
	templatesFS, err := fs.Sub(web, "web/templates")
	if err != nil {
		log.Fatal(err)
	}
	staticFS, err := fs.Sub(web, "web/static")
	if err != nil {
		log.Fatal(err)
	}

	static := newStaticFiles(staticFS, *dev)
	funcs := template.FuncMap{"asset": static.url}
	maps.Copy(funcs, fragments.Funcs)
	v, err := views.New(templatesFS, funcs, *dev)
	if err != nil {
		log.Fatalf("parsing templates: %v", err)
	}

	mux := http.NewServeMux()
	api.Register(mux)
	fragments.Register(mux, v)
	registerPages(mux, v, static)

	log.Printf("listening on %s (dev=%v)", *addr, *dev)
	log.Fatal(http.ListenAndServe(*addr, trimTrailingSlash(mux)))
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

func registerPages(mux *http.ServeMux, v *views.Renderer, static *staticFiles) {
	page := func(name string) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			v.Page(w, http.StatusOK, name, nil)
		}
	}

	mux.HandleFunc("GET /{$}", func(w http.ResponseWriter, r *http.Request) {
		v.Page(w, http.StatusOK, "home", map[string]any{"Pages": pages, "Endpoints": endpoints})
	})
	for _, name := range []string{"password", "qr-code", "timer", "notes", "aes-256", "social-preview"} {
		mux.HandleFunc("GET /"+name, page(name))
	}

	// Files in web/static are served from the root; anything else is a 404 page.
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if (r.Method == http.MethodGet || r.Method == http.MethodHead) && static.serve(w, r) {
			return
		}
		v.Page(w, http.StatusNotFound, "not-found", nil)
	})
}

// staticFiles serves web/static with content-hash ETags, and versions the
// asset URLs used by the templates so browsers can cache them for good.
type staticFiles struct {
	fsys   fs.FS
	dev    bool
	mu     sync.Mutex
	hashes map[string]string
}

func newStaticFiles(fsys fs.FS, dev bool) *staticFiles {
	return &staticFiles{fsys: fsys, dev: dev, hashes: map[string]string{}}
}

func (s *staticFiles) hash(name string) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if h, ok := s.hashes[name]; ok && !s.dev {
		return h, nil
	}
	data, err := fs.ReadFile(s.fsys, name)
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256(data)
	h := hex.EncodeToString(sum[:8])
	s.hashes[name] = h
	return h, nil
}

// url returns the versioned URL of an asset, e.g. /styles.css?v=1a2b3c.
func (s *staticFiles) url(p string) (string, error) {
	h, err := s.hash(strings.TrimPrefix(p, "/"))
	if err != nil {
		return "", err
	}
	return p + "?v=" + h, nil
}

// serve writes the static file at the request path, if there is one.
func (s *staticFiles) serve(w http.ResponseWriter, r *http.Request) bool {
	name := strings.TrimPrefix(path.Clean(r.URL.Path), "/")
	if name == "" {
		return false
	}
	info, err := fs.Stat(s.fsys, name)
	if err != nil || info.IsDir() {
		return false
	}
	h, err := s.hash(name)
	if err != nil {
		return false
	}
	w.Header().Set("ETag", `"`+h+`"`)
	switch {
	case s.dev:
		w.Header().Set("Cache-Control", "no-cache")
	case r.URL.Query().Get("v") == h:
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	}
	http.ServeFileFS(w, r, s.fsys, name)
	return true
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
