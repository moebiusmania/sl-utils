package api

import (
	"crypto/rand"
	"math"
	"math/big"
	"net/http"

	"github.com/moebiusmania/sl-utils/internal/jsutil"
)

// PasswordOptions selects the length and the character sets of a password.
type PasswordOptions struct {
	Length    int
	Numbers   bool
	Symbols   bool
	Lowercase bool
	Uppercase bool
}

const (
	defaultPasswordLength = 12
	// Lengths above this answer 500, as JavaScript did for lengths it could
	// not allocate, instead of exhausting the server's memory.
	maxPasswordLength = 1 << 20
)

// GeneratePassword picks Length random characters from the enabled sets,
// concatenated in the original order: lowercase, numbers, symbols, uppercase.
// With no set enabled it returns an empty string.
func GeneratePassword(o PasswordOptions) string {
	charset := ""
	if o.Lowercase {
		charset += "abcdefghijklmnopqrstuvwxyz"
	}
	if o.Numbers {
		charset += "0123456789"
	}
	if o.Symbols {
		charset += "!@#$%^&*()_+"
	}
	if o.Uppercase {
		charset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
	}
	if charset == "" || o.Length <= 0 {
		return ""
	}
	out := make([]byte, o.Length)
	limit := big.NewInt(int64(len(charset)))
	for i := range out {
		n, err := rand.Int(rand.Reader, limit)
		if err != nil {
			panic(err) // crypto/rand never fails on supported platforms
		}
		out[i] = charset[n.Int64()]
	}
	return string(out)
}

// Password generates a password. Every character set defaults to enabled
// and is only disabled by an explicit "false".
func Password(w http.ResponseWriter, r *http.Request) {
	q := r.URL.RawQuery
	enabled := func(name string) bool {
		v, _ := jsutil.SearchParam(q, name)
		return v != "false"
	}

	lengthParam, ok := jsutil.SearchParam(q, "length")
	if !ok || lengthParam == "" {
		lengthParam = "12"
	}
	length := jsutil.ParseInt(lengthParam)
	switch {
	case math.IsNaN(length) || length == 0:
		length = defaultPasswordLength
	case length < 0:
		length = 0
	case length > maxPasswordLength:
		internalError(w)
		return
	}

	password := GeneratePassword(PasswordOptions{
		Length:    int(length),
		Numbers:   enabled("numbers"),
		Symbols:   enabled("symbols"),
		Lowercase: enabled("lowercase"),
		Uppercase: enabled("uppercase"),
	})
	text(w, http.StatusOK, "text/plain", password)
}
