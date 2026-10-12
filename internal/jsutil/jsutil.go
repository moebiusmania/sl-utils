// Package jsutil reproduces the few JavaScript built-ins whose exact
// behavior the public APIs relied on when they ran on Deno (parseInt,
// String.prototype.trim, URLSearchParams.get, decodeURI), so responses stay
// byte-for-byte the same after the port.
package jsutil

import (
	"errors"
	"math"
	"strings"
	"unicode/utf8"
)

// IsSpace reports whether r is matched by the JavaScript \s class
// (WhiteSpace and LineTerminator code points).
func IsSpace(r rune) bool {
	switch r {
	case '\t', '\n', '\v', '\f', '\r', ' ', '\u00a0', '\u1680', '\u2028',
		'\u2029', '\u202f', '\u205f', '\u3000', '\ufeff':
		return true
	}
	return r >= '\u2000' && r <= '\u200a'
}

// SpaceClass is IsSpace as a character class body for Go regexps, to use
// where the original JavaScript regexps used \s.
const SpaceClass = `\t\n\v\f\r \x{a0}\x{1680}\x{2000}-\x{200a}\x{2028}\x{2029}\x{202f}\x{205f}\x{3000}\x{feff}`

// Trim mirrors String.prototype.trim.
func Trim(s string) string {
	return strings.TrimFunc(s, IsSpace)
}

// ParseInt mirrors the global parseInt(s) with no radix: leading whitespace
// and an optional sign are skipped, a 0x/0X prefix switches to base 16, and
// parsing stops at the first invalid digit. It returns NaN when no digit is
// found.
func ParseInt(s string) float64 {
	s = strings.TrimLeftFunc(s, IsSpace)
	sign := 1.0
	if s != "" && (s[0] == '+' || s[0] == '-') {
		if s[0] == '-' {
			sign = -1
		}
		s = s[1:]
	}
	radix := 10.0
	if len(s) >= 2 && s[0] == '0' && (s[1] == 'x' || s[1] == 'X') {
		radix = 16
		s = s[2:]
	}
	n, digits := 0.0, 0
	for _, c := range s {
		d := digitValue(c)
		if d < 0 || float64(d) >= radix {
			break
		}
		n = n*radix + float64(d)
		digits++
	}
	if digits == 0 {
		return math.NaN()
	}
	return sign * n
}

func digitValue(c rune) int {
	switch {
	case c >= '0' && c <= '9':
		return int(c - '0')
	case c >= 'a' && c <= 'z':
		return int(c-'a') + 10
	case c >= 'A' && c <= 'Z':
		return int(c-'A') + 10
	}
	return -1
}

// SearchParam mirrors new URLSearchParams(rawQuery).get(name): it returns
// the first value for name and whether it was present. Unlike url.ParseQuery
// it never drops a pair because of a malformed percent escape.
func SearchParam(rawQuery, name string) (string, bool) {
	for pair := range strings.SplitSeq(rawQuery, "&") {
		if pair == "" {
			continue
		}
		key, value, _ := strings.Cut(pair, "=")
		if percentDecode(strings.ReplaceAll(key, "+", " ")) == name {
			return percentDecode(strings.ReplaceAll(value, "+", " ")), true
		}
	}
	return "", false
}

// percentDecode decodes %XX escapes, leaving malformed ones as they are, and
// turns invalid UTF-8 into U+FFFD like the WHATWG URL standard does.
func percentDecode(s string) string {
	if !strings.Contains(s, "%") {
		return s
	}
	out := make([]byte, 0, len(s))
	for i := 0; i < len(s); i++ {
		if s[i] == '%' && i+2 < len(s) && isHex(s[i+1]) && isHex(s[i+2]) {
			out = append(out, unhex(s[i+1])<<4|unhex(s[i+2]))
			i += 2
			continue
		}
		out = append(out, s[i])
	}
	return strings.ToValidUTF8(string(out), "\ufffd")
}

// ErrURIMalformed is returned by DecodeURI where JavaScript throws URIError.
var ErrURIMalformed = errors.New("URI malformed")

// DecodeURI mirrors the global decodeURI: escapes are decoded except those
// producing one of the reserved characters ;/?:@&=+$,# which stay encoded.
func DecodeURI(s string) (string, error) {
	var b strings.Builder
	for i := 0; i < len(s); i++ {
		if s[i] != '%' {
			b.WriteByte(s[i])
			continue
		}
		first, ok := hexByte(s, i)
		if !ok {
			return "", ErrURIMalformed
		}
		if first < 0x80 {
			if strings.IndexByte(";/?:@&=+$,#", first) >= 0 {
				b.WriteString(s[i : i+3])
			} else {
				b.WriteByte(first)
			}
			i += 2
			continue
		}
		n := utf8SequenceLength(first)
		if n == 0 {
			return "", ErrURIMalformed
		}
		seq := []byte{first}
		j := i + 3
		for k := 1; k < n; k++ {
			c, ok := hexByte(s, j)
			if !ok || c&0xC0 != 0x80 {
				return "", ErrURIMalformed
			}
			seq = append(seq, c)
			j += 3
		}
		r, size := utf8.DecodeRune(seq)
		if r == utf8.RuneError && size <= 1 {
			return "", ErrURIMalformed
		}
		b.Write(seq)
		i = j - 1
	}
	return b.String(), nil
}

func utf8SequenceLength(b byte) int {
	switch {
	case b&0xE0 == 0xC0:
		return 2
	case b&0xF0 == 0xE0:
		return 3
	case b&0xF8 == 0xF0:
		return 4
	}
	return 0
}

func hexByte(s string, i int) (byte, bool) {
	if i+2 >= len(s) || s[i] != '%' || !isHex(s[i+1]) || !isHex(s[i+2]) {
		return 0, false
	}
	return unhex(s[i+1])<<4 | unhex(s[i+2]), true
}

func isHex(c byte) bool {
	return (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') ||
		(c >= 'A' && c <= 'F')
}

func unhex(c byte) byte {
	switch {
	case c >= '0' && c <= '9':
		return c - '0'
	case c >= 'a' && c <= 'f':
		return c - 'a' + 10
	}
	return c - 'A' + 10
}
