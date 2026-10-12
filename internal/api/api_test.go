package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func get(t *testing.T, target string) *httptest.ResponseRecorder {
	t.Helper()
	mux := http.NewServeMux()
	Register(mux)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, target, nil))
	return rec
}

func TestHello(t *testing.T) {
	for target, want := range map[string]string{
		"/api/hello":         "Hello, Hello!",
		"/api/%C3%A9lan":     "Hello, \u00c9lan!",
		"/api/a%2Fb":         "Hello, A%2Fb!",
		"/api/x%3Fy":         "Hello, X%3Fy!",
		"/api/%40":           "Hello, %40!",
		"/api/caf%C3%A9%20x": "Hello, Caf\u00e9 x!",
	} {
		rec := get(t, target)
		if rec.Code != 200 || rec.Body.String() != want {
			t.Errorf("GET %s = %d %q, want %q", target, rec.Code, rec.Body.String(), want)
		}
	}
}

func TestPasswordLength(t *testing.T) {
	for query, want := range map[string]int{
		"":             12,
		"length=20":    20,
		"length=0":     12,
		"length=-3":    0,
		"length=abc":   12,
		"length=0x10":  16,
		"length=%207x": 7,
		"length=":      12,
	} {
		rec := get(t, "/api/password?"+query)
		if rec.Code != 200 || len(rec.Body.String()) != want {
			t.Errorf("?%s: got %d %q, want length %d", query, rec.Code, rec.Body.String(), want)
		}
		if ct := rec.Header().Get("Content-Type"); ct != "text/plain" {
			t.Errorf("?%s: content type %q", query, ct)
		}
	}
	if rec := get(t, "/api/password?length=99999999999"); rec.Code != 500 {
		t.Errorf("huge length: got %d, want 500", rec.Code)
	}
}

func TestPasswordCharsets(t *testing.T) {
	rec := get(t, "/api/password?length=200&numbers=false&symbols=false&uppercase=false")
	if strings.Trim(rec.Body.String(), "abcdefghijklmnopqrstuvwxyz") != "" {
		t.Errorf("expected lowercase only, got %q", rec.Body.String())
	}
	// Only an explicit "false" disables a set
	rec = get(t, "/api/password?length=500&numbers=0")
	if !strings.ContainsAny(rec.Body.String(), "0123456789") {
		t.Errorf("expected digits, got %q", rec.Body.String())
	}
	rec = get(t, "/api/password?numbers=false&symbols=false&uppercase=false&lowercase=false")
	if rec.Body.String() != "" {
		t.Errorf("expected an empty password, got %q", rec.Body.String())
	}
}

func TestQRCode(t *testing.T) {
	for _, target := range []string{"/api/qr-code", "/api/qr-code?url="} {
		rec := get(t, target)
		if rec.Code != 400 || rec.Body.String() != "URL is required: add '?url=<url> in the address bar'" {
			t.Errorf("GET %s = %d %q", target, rec.Code, rec.Body.String())
		}
	}
	rec := get(t, "/api/qr-code?url=https%3A%2F%2Fexample.com")
	if rec.Code != 200 || rec.Header().Get("Content-Type") != "image/svg+xml" ||
		!strings.HasPrefix(rec.Body.String(), `<?xml version="1.0" encoding="UTF-8"?><svg`) {
		t.Errorf("unexpected QR response: %d %q", rec.Code, rec.Body.String()[:min(80, rec.Body.Len())])
	}
}

func TestMetaValidation(t *testing.T) {
	for target, want := range map[string]string{
		"/api/meta":                               `{"error":"URL is required: add '?url=<url>' in the address bar"}`,
		"/api/meta?url=notaurl":                   `{"error":"Invalid URL"}`,
		"/api/meta?url=ftp://example.com":         `{"error":"Only http and https URLs are supported"}`,
		"/api/meta?url=http://2130706433/":        `{"error":"Private or local addresses are not allowed"}`,
		"/api/meta?url=http://0x7f.1/":            `{"error":"Private or local addresses are not allowed"}`,
		"/api/meta?url=http://[0:0:0:0:0:0:0:1]/": `{"error":"Private or local addresses are not allowed"}`,
	} {
		rec := get(t, target)
		if rec.Code != 400 || rec.Body.String() != want {
			t.Errorf("GET %s = %d %s", target, rec.Code, rec.Body.String())
		}
	}
}
