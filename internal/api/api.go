// Package api implements the public /api/* endpoints.
package api

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"

	"github.com/moebiusmania/sl-utils/internal/jsutil"
	"github.com/moebiusmania/sl-utils/internal/qrcode"
)

// Content type Deno used for string responses without an explicit one.
const defaultTextType = "text/plain;charset=UTF-8"

// Register mounts every endpoint on mux.
func Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/password", Password)
	mux.HandleFunc("GET /api/qr-code", QRCode)
	mux.HandleFunc("GET /api/mit-license", MITLicense)
	mux.HandleFunc("GET /api/meta", Meta)
	mux.HandleFunc("GET /api/{name}", Hello)
}

func text(w http.ResponseWriter, status int, contentType, body string) {
	w.Header().Set("Content-Type", contentType)
	w.WriteHeader(status)
	_, _ = w.Write([]byte(body))
}

func internalError(w http.ResponseWriter) {
	text(w, http.StatusInternalServerError, defaultTextType, "Internal server error")
}

// writeJSON matches Response.json: no HTML escaping, no trailing newline.
func writeJSON(w http.ResponseWriter, status int, v any) {
	var buf bytes.Buffer
	if err := jsonEncoder(&buf).Encode(v); err != nil {
		internalError(w)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(bytes.TrimSuffix(buf.Bytes(), []byte("\n")))
}

func jsonEncoder(w io.Writer) *json.Encoder {
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(false)
	return enc
}

// Hello greets the capitalized {name} path segment, decoded like the
// Fresh router did (decodeURI: reserved characters such as %2F stay encoded).
func Hello(w http.ResponseWriter, r *http.Request) {
	raw := strings.TrimPrefix(r.URL.EscapedPath(), "/api/")
	name, err := jsutil.DecodeURI(raw)
	if err != nil {
		internalError(w)
		return
	}
	first, size := utf8.DecodeRuneInString(name)
	if size > 0 {
		name = string(unicode.ToUpper(first)) + name[size:]
	}
	text(w, http.StatusOK, defaultTextType, "Hello, "+name+"!")
}

// QRCode renders the "url" query parameter as an SVG QR code.
func QRCode(w http.ResponseWriter, r *http.Request) {
	url, _ := jsutil.SearchParam(r.URL.RawQuery, "url")
	if url == "" {
		text(w, http.StatusBadRequest, defaultTextType,
			"URL is required: add '?url=<url> in the address bar'")
		return
	}
	svg, err := qrcode.SVG(url, 4)
	if err != nil {
		internalError(w)
		return
	}
	text(w, http.StatusOK, "image/svg+xml", svg)
}

// MITLicense returns the MIT license text for the current year.
func MITLicense(w http.ResponseWriter, _ *http.Request) {
	text(w, http.StatusOK, "text/plain", strings.Replace(mitLicense, "{year}",
		time.Now().Format("2006"), 1))
}

const mitLicense = `MIT License

Copyright (c) {year} Salvatore Laisa

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`
