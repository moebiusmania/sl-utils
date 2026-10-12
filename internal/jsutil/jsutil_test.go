package jsutil

import (
	"math"
	"testing"
)

func TestParseInt(t *testing.T) {
	for in, want := range map[string]float64{
		"12": 12, " 7x": 7, "-3": -3, "+5": 5, "0x10": 16, "0X1f": 31,
		"1e3": 1, "\u00a0 42": 42, "08": 8,
	} {
		if got := ParseInt(in); got != want {
			t.Errorf("ParseInt(%q) = %v, want %v", in, got, want)
		}
	}
	for _, in := range []string{"", "abc", "0x", "-", " "} {
		if got := ParseInt(in); !math.IsNaN(got) {
			t.Errorf("ParseInt(%q) = %v, want NaN", in, got)
		}
	}
}

func TestSearchParam(t *testing.T) {
	q := "a=1&url=https://x.test/a%zz&b=c+d&b=2&e=%E2%9C%93"
	for name, want := range map[string]string{
		"a": "1", "url": "https://x.test/a%zz", "b": "c d", "e": "\u2713",
	} {
		if got, ok := SearchParam(q, name); !ok || got != want {
			t.Errorf("SearchParam(%q) = %q, %v, want %q", name, got, ok, want)
		}
	}
	if _, ok := SearchParam(q, "missing"); ok {
		t.Error("missing parameter reported as present")
	}
}

func TestDecodeURI(t *testing.T) {
	for in, want := range map[string]string{
		"%C3%A9lan": "\u00e9lan", "a%2Fb": "a%2Fb", "%23x": "%23x", "%41": "A",
	} {
		if got, err := DecodeURI(in); err != nil || got != want {
			t.Errorf("DecodeURI(%q) = %q, %v, want %q", in, got, err, want)
		}
	}
	for _, in := range []string{"%E0%A4%A", "%zz", "%C3", "%ED%A0%80"} {
		if _, err := DecodeURI(in); err == nil {
			t.Errorf("DecodeURI(%q): expected an error", in)
		}
	}
}

func TestTrim(t *testing.T) {
	if got := Trim("\ufeff\u00a0 x \u2028"); got != "x" {
		t.Errorf("Trim = %q", got)
	}
}
