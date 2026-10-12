package inertia

import (
	"encoding/json"
	"html/template"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func newTestInertia(ssrURL string) *Inertia {
	return New(Config{
		Template:     template.Must(template.New("app").Parse(`<head>{{.Head}}{{.Assets}}</head><body>{{.Body}}</body>`)),
		Version:      "v1",
		Assets:       func() template.HTML { return `<script src="/app.js"></script>` },
		SSRURL:       ssrURL,
		FallbackHead: "<title>fallback</title>",
	})
}

func render(i *Inertia, req *http.Request) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	i.Render(rec, req, "Home", Props{"answer": 42}, http.StatusOK)
	return rec
}

func TestClientSideFallback(t *testing.T) {
	rec := render(newTestInertia(""), httptest.NewRequest("GET", "/?a=<b>", nil))
	body := rec.Body.String()
	want := `<head><title>fallback</title><script src="/app.js"></script></head><body><script data-page="app" type="application/json">` +
		`{"component":"Home","props":{"answer":42,"errors":{}},"url":"/?a=` + "\\u003cb\\u003e" + `","version":"v1"}</script><div id="app"></div></body>`
	if body != want {
		t.Errorf("got  %s\nwant %s", body, want)
	}
}

func TestServerSideRendering(t *testing.T) {
	ssr := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var page Page
		_ = json.NewDecoder(r.Body).Decode(&page)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"head": []string{"<title>" + page.Component + "</title>"},
			"body": `<div id="app">rendered</div>`,
		})
	}))
	defer ssr.Close()
	body := render(newTestInertia(ssr.URL), httptest.NewRequest("GET", "/", nil)).Body.String()
	if !strings.Contains(body, "<head><title>Home</title>") || !strings.Contains(body, `<div id="app">rendered</div>`) {
		t.Errorf("unexpected SSR page: %s", body)
	}
}

func TestInertiaVisit(t *testing.T) {
	req := httptest.NewRequest("GET", "/x", nil)
	req.Header.Set("X-Inertia", "true")
	req.Header.Set("X-Inertia-Version", "v1")
	rec := render(newTestInertia(""), req)
	if rec.Header().Get("X-Inertia") != "true" || rec.Header().Get("Vary") != "X-Inertia" {
		t.Errorf("missing Inertia headers: %v", rec.Header())
	}
	var page Page
	if err := json.Unmarshal(rec.Body.Bytes(), &page); err != nil || page.Component != "Home" || page.URL != "/x" {
		t.Errorf("unexpected page %+v (%v)", page, err)
	}

	req.Header.Set("X-Inertia-Version", "old")
	rec = render(newTestInertia(""), req)
	if rec.Code != http.StatusConflict || rec.Header().Get("X-Inertia-Location") != "/x" {
		t.Errorf("stale version: got %d %v", rec.Code, rec.Header())
	}
}
