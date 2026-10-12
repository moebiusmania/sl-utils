package qrcode

import (
	"encoding/json"
	"os"
	"testing"
)

// testdata/fixtures.json was generated with jsr:@libs/qrcode@3.1.0 using
// qrcode(input, { output: "svg", border: 4 }), the call the Deno app made.
func TestSVGMatchesOriginalLibrary(t *testing.T) {
	raw, err := os.ReadFile("testdata/fixtures.json")
	if err != nil {
		t.Fatal(err)
	}
	var fixtures []struct {
		Input string `json:"input"`
		SVG   string `json:"svg"`
	}
	if err := json.Unmarshal(raw, &fixtures); err != nil {
		t.Fatal(err)
	}
	for _, f := range fixtures {
		got, err := SVG(f.Input, 4)
		if err != nil {
			t.Errorf("SVG(%.40q): %v", f.Input, err)
			continue
		}
		if got != f.SVG {
			t.Errorf("SVG(%.40q) differs from the original library output", f.Input)
		}
	}
}

func TestSVGDataTooLong(t *testing.T) {
	long := make([]byte, 3000)
	for i := range long {
		long[i] = 'x'
	}
	if _, err := SVG(string(long), 4); err != ErrDataTooLong {
		t.Fatalf("expected ErrDataTooLong, got %v", err)
	}
}
