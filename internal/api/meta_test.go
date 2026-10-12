package api

import (
	"bytes"
	"encoding/json"
	"os"
	"testing"
)

// testdata/meta_fixtures.json holds the output of the original TypeScript
// extractMeta for tricky documents (entities, duplicate and integer-like
// keys, attribute quoting, relative URLs).
func TestExtractMetaMatchesOriginal(t *testing.T) {
	raw, err := os.ReadFile("testdata/meta_fixtures.json")
	if err != nil {
		t.Fatal(err)
	}
	var fixtures []struct {
		URL  string          `json:"url"`
		HTML string          `json:"html"`
		Meta json.RawMessage `json:"meta"`
	}
	if err := json.Unmarshal(raw, &fixtures); err != nil {
		t.Fatal(err)
	}
	for _, f := range fixtures {
		meta, err := ExtractMeta(f.HTML, f.URL)
		if err != nil {
			t.Errorf("%s: %v", f.URL, err)
			continue
		}
		var got bytes.Buffer
		if err := jsonEncoder(&got).Encode(meta); err != nil {
			t.Fatal(err)
		}
		var want bytes.Buffer
		if err := json.Compact(&want, f.Meta); err != nil {
			t.Fatal(err)
		}
		if g := bytes.TrimSpace(got.Bytes()); !bytes.Equal(g, want.Bytes()) {
			t.Errorf("%s:\n got %s\nwant %s", f.URL, g, want.Bytes())
		}
	}
}

func TestExtractMetaRejectsOutOfRangeCodePoint(t *testing.T) {
	if _, err := ExtractMeta("<head><title>&#x110000;</title></head>", "https://f.test/"); err == nil {
		t.Fatal("expected an error, like String.fromCodePoint throwing")
	}
}

func TestIsPrivateHost(t *testing.T) {
	for host, want := range map[string]bool{
		"localhost": true, "a.localhost": true, "printer.local": true,
		"db.internal": true, "[::1]": true, "[fd00::1]": true,
		"[::ffff:7f00:1]": true, "127.0.0.1": true, "10.1.2.3": true,
		"172.16.0.1": true, "172.32.0.1": false, "192.168.1.1": true,
		"169.254.1.1": true, "0.0.0.0": true, "example.com": false,
		"[2001:db8::1]": false, "8.8.8.8": false,
	} {
		if got := isPrivateHost(host); got != want {
			t.Errorf("isPrivateHost(%q) = %v, want %v", host, got, want)
		}
	}
}
