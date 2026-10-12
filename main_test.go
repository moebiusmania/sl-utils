package main

import (
	"html/template"
	"io/fs"
	"maps"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/moebiusmania/sl-utils/internal/fragments"
	"github.com/moebiusmania/sl-utils/internal/views"
)

func newTestServer(t *testing.T) http.Handler {
	t.Helper()
	templatesFS, _ := fs.Sub(embedded, "web/templates")
	staticFS, _ := fs.Sub(embedded, "web/static")
	static := newStaticFiles(staticFS, false)
	funcs := template.FuncMap{"asset": static.url}
	maps.Copy(funcs, fragments.Funcs)
	v, err := views.New(templatesFS, funcs, false)
	if err != nil {
		t.Fatal(err)
	}
	mux := http.NewServeMux()
	registerPages(mux, v, static)
	return trimTrailingSlash(mux)
}

func TestPages(t *testing.T) {
	srv := newTestServer(t)
	for path, want := range map[string]struct {
		status int
		title  string
	}{
		"/":                {200, "<title>sl-utils 🛠️</title>"},
		"/password":        {200, "<title>Password Generator - sl-utils 🛠️</title>"},
		"/password/":       {200, "<title>Password Generator - sl-utils 🛠️</title>"},
		"/qr-code":         {200, "<title>QR Code Generator - sl-utils 🛠️</title>"},
		"/timer":           {200, "<title>Countdown Timer - sl-utils 🛠️</title>"},
		"/notes":           {200, "<title>Notes - sl-utils 🛠️</title>"},
		"/aes-256":         {200, "<title>AES-256 Encrypt/Decrypt - sl-utils 🛠️</title>"},
		"/social-preview":  {200, "<title>Social Preview - sl-utils 🛠️</title>"},
		"/does-not-exist":  {404, "<title>404 - Page not found</title>"},
		"/api/does/not/be": {404, "<title>404 - Page not found</title>"},
	} {
		rec := httptest.NewRecorder()
		srv.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, path, nil))
		if rec.Code != want.status || !strings.Contains(rec.Body.String(), want.title) {
			t.Errorf("GET %s = %d, want %d with %s", path, rec.Code, want.status, want.title)
		}
	}
}

func TestStaticFiles(t *testing.T) {
	srv := newTestServer(t)
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/theme.js", nil))
	etag := rec.Header().Get("ETag")
	if rec.Code != 200 || etag == "" || !strings.Contains(rec.Body.String(), "sl-utils-theme") {
		t.Fatalf("GET /theme.js = %d etag %q", rec.Code, etag)
	}

	req := httptest.NewRequest(http.MethodGet, "/theme.js", nil)
	req.Header.Set("If-None-Match", etag)
	rec = httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotModified {
		t.Errorf("revalidation: got %d, want 304", rec.Code)
	}

	rec = httptest.NewRecorder()
	srv.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/theme.js?v="+strings.Trim(etag, `"`), nil))
	if !strings.Contains(rec.Header().Get("Cache-Control"), "immutable") {
		t.Errorf("versioned asset not cached: %q", rec.Header().Get("Cache-Control"))
	}
}
