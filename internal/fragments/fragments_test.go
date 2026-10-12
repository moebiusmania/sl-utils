package fragments

import (
	"html/template"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/moebiusmania/sl-utils/internal/views"
)

func newMux(t *testing.T) *http.ServeMux {
	t.Helper()
	funcs := template.FuncMap{"asset": func(p string) string { return p }}
	for k, f := range Funcs {
		funcs[k] = f
	}
	v, err := views.New(os.DirFS("../../web/templates"), funcs, false)
	if err != nil {
		t.Fatal(err)
	}
	mux := http.NewServeMux()
	Register(mux, v)
	return mux
}

func get(mux *http.ServeMux, target string) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, target, nil))
	return rec
}

func TestPasswordFragment(t *testing.T) {
	rec := get(newMux(t), "/password/generate?length=30&numbers=false&symbols=false&uppercase=false&lowercase=true")
	body := rec.Body.String()
	start := strings.Index(body, `<code class="output-text">`) + len(`<code class="output-text">`)
	end := strings.Index(body, "</code>")
	if rec.Code != 200 || start < len(`<code class="output-text">`) || end-start != 30 {
		t.Fatalf("unexpected fragment: %d %s", rec.Code, body)
	}
	if strings.Trim(body[start:end], "abcdefghijklmnopqrstuvwxyz") != "" {
		t.Errorf("expected lowercase only, got %q", body[start:end])
	}
	if !strings.HasPrefix(body, `<div class="result"><span class="form-label">Generated password</span>`) {
		t.Errorf("unexpected markup: %s", body)
	}
}

func TestQRCodeFragment(t *testing.T) {
	mux := newMux(t)
	rec := get(mux, "/qr-code/generate?url=https%3A%2F%2Fexample.com")
	if rec.Code != 200 || !strings.Contains(rec.Body.String(),
		// html/template writes "+" as an entity: the attribute value is the same
		`<img src="data:image/svg&#43;xml;charset=utf-8,%3C%3Fxml%20version%3D%221.0%22`) ||
		!strings.Contains(rec.Body.String(), `Scan to visit <span class="code-span" x-text="url">https://example.com</span>`) {
		t.Errorf("unexpected fragment: %d %s", rec.Code, rec.Body.String())
	}
	rec = get(mux, "/qr-code/generate?url=")
	if rec.Code != 400 || rec.Body.String() != "URL is required: add '?url=<url> in the address bar'" {
		t.Errorf("missing url: %d %q", rec.Code, rec.Body.String())
	}
}

func TestSocialPreviewErrors(t *testing.T) {
	mux := newMux(t)
	for target, want := range map[string]string{
		"/social-preview/fetch?url=notaurl":          "Invalid URL",
		"/social-preview/fetch?url=http://localhost": "Private or local addresses are not allowed",
	} {
		rec := get(mux, target)
		if rec.Code != 400 || rec.Body.String() != want {
			t.Errorf("GET %s = %d %q, want 400 %q", target, rec.Code, rec.Body.String(), want)
		}
	}
}

func TestTruncate(t *testing.T) {
	for _, c := range []struct {
		text string
		max  int
		want string
	}{
		{"short", 10, "short"},
		{"exactly10!", 10, "exactly10!"},
		{"hello world, this is long", 10, "hello wor…"},
		{"hello    world", 9, "hello…"},
		// 🛠 counts as two UTF-16 units, like String.prototype.length
		{"ab🛠cdefgh", 5, "ab🛠…"},
		{"ab🛠cdefgh", 4, "ab�…"},
	} {
		if got := Truncate(c.text, c.max); got != c.want {
			t.Errorf("Truncate(%q, %d) = %q, want %q", c.text, c.max, got, c.want)
		}
	}
}

func TestHostOf(t *testing.T) {
	for in, want := range map[string]string{
		"https://www.example.com/a": "example.com",
		"http://sub.www.test:8080/": "sub.www.test",
		"not a url":                 "not a url",
	} {
		if got := HostOf(in); got != want {
			t.Errorf("HostOf(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestCompareUTF16(t *testing.T) {
	// U+FF5E sorts before U+1F600 in UTF-16, after it in UTF-8
	if compareUTF16("～", "\U0001f600") <= 0 {
		t.Error("expected UTF-16 code unit order")
	}
}
