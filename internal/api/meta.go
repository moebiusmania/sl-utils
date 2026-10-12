package api

import (
	"bytes"
	"cmp"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/moebiusmania/sl-utils/internal/jsutil"
	whatwg "github.com/nlnwa/whatwg-url/url"
)

// MetaPreview is the sharing metadata extracted from a page.
type MetaPreview struct {
	URL         string      `json:"url"`
	Title       string      `json:"title"`
	Description string      `json:"description"`
	Image       string      `json:"image"`
	SiteName    string      `json:"siteName"`
	Favicon     string      `json:"favicon"`
	ThemeColor  string      `json:"themeColor"`
	TwitterCard string      `json:"twitterCard"`
	TwitterSite string      `json:"twitterSite"`
	Tags        *orderedMap `json:"tags"`
}

const (
	metaMaxBytes = 1_000_000
	metaTimeout  = 8 * time.Second
	// Many sites only serve meta tags to known link-preview bots
	metaUserAgent = "Mozilla/5.0 (compatible; sl-utils-preview/1.0; +https://sl-utils.moebiusmania.deno.net) facebookexternalhit/1.1 Twitterbot/1.0"
)

var entities = map[string]string{
	"amp":  "&",
	"lt":   "<",
	"gt":   ">",
	"quot": `"`,
	"apos": "'",
	"nbsp": "\u00a0",
}

var (
	entityRe    = regexp.MustCompile(`(?i)&(#x[0-9a-f]+|#\d+|[a-z]+);`)
	attributeRe = regexp.MustCompile(fmt.Sprintf(
		`([^%[1]s=/>]+)[%[1]s]*=[%[1]s]*(?:"([^"]*)"|'([^']*)'|([^%[1]s>]+))`,
		jsutil.SpaceClass))
	headEndRe = regexp.MustCompile(fmt.Sprintf(`(?i)</head[%s]*>`, jsutil.SpaceClass))
	metaTagRe = regexp.MustCompile(`(?i)<meta\b[^>]*>`)
	linkTagRe = regexp.MustCompile(`(?i)<link\b[^>]*>`)
	titleRe   = regexp.MustCompile(`(?is)<title[^>]*>(.*?)</title>`)

	privateHostRes = []*regexp.Regexp{
		regexp.MustCompile(`^(0|10|127)\.`),
		regexp.MustCompile(`^169\.254\.`),
		regexp.MustCompile(`^172\.(1[6-9]|2\d|3[01])\.`),
		regexp.MustCompile(`^192\.168\.`),
	}
	privateIPv6Re = regexp.MustCompile(`^(::1?$|fc|fd|fe80:|::ffff:)`)
)

// errCodePoint stands for the RangeError String.fromCodePoint throws.
var errCodePoint = errors.New("invalid code point")

func decodeEntities(value string) (string, error) {
	var err error
	out := entityRe.ReplaceAllStringFunc(value, func(match string) string {
		code := match[1 : len(match)-1]
		if code[0] == '#' {
			var n float64
			if code[1] == 'x' || code[1] == 'X' {
				n = parseDigits(code[2:], 16)
			} else {
				n = parseDigits(code[1:], 10)
			}
			if n > utf8.MaxRune {
				err = errCodePoint
				return match
			}
			r := rune(n)
			if !utf8.ValidRune(r) { // lone surrogate: not representable in Go
				r = utf8.RuneError
			}
			return string(r)
		}
		if s, ok := entities[strings.ToLower(code)]; ok {
			return s
		}
		return match
	})
	return out, err
}

// parseDigits parses digits already validated by entityRe as a float, so
// huge values overflow to a large number instead of wrapping.
func parseDigits(s string, base float64) float64 {
	n := 0.0
	for _, c := range strings.ToLower(s) {
		d := float64(c - '0')
		if c >= 'a' {
			d = float64(c-'a') + 10
		}
		n = n*base + d
	}
	return n
}

func parseAttributes(tag string) (map[string]string, error) {
	attrs := map[string]string{}
	for _, m := range attributeRe.FindAllStringSubmatchIndex(tag, -1) {
		value := ""
		for g := 2; g <= 4; g++ {
			if m[2*g] >= 0 {
				value = tag[m[2*g]:m[2*g+1]]
				break
			}
		}
		decoded, err := decodeEntities(value)
		if err != nil {
			return nil, err
		}
		attrs[strings.ToLower(tag[m[2]:m[3]])] = decoded
	}
	return attrs, nil
}

// firstAttr mirrors `attrs.a ?? attrs.b ?? ...`.
func firstAttr(attrs map[string]string, names ...string) (string, bool) {
	for _, n := range names {
		if v, ok := attrs[n]; ok {
			return v, true
		}
	}
	return "", false
}

// inherited lists the lowercase Object.prototype members, which the
// original `key in tags` checks treated as already present.
func inherited(key string) bool {
	return key == "constructor" || key == "__proto__"
}

func isPrivateHost(hostname string) bool {
	host := strings.ToLower(strings.TrimSuffix(strings.TrimPrefix(hostname, "["), "]"))
	if host == "localhost" || strings.HasSuffix(host, ".localhost") ||
		strings.HasSuffix(host, ".local") || strings.HasSuffix(host, ".internal") {
		return true
	}
	if strings.Contains(host, ":") && privateIPv6Re.MatchString(host) {
		return true
	}
	for _, re := range privateHostRes {
		if re.MatchString(host) {
			return true
		}
	}
	return false
}

// readHead reads the body until </head> shows up or about metaMaxBytes were
// read, decoding it like a streaming TextDecoder that is never flushed.
func readHead(body io.Reader) string {
	var data []byte
	chunk := make([]byte, 16*1024)
	for len(data) < metaMaxBytes {
		n, err := body.Read(chunk)
		data = append(data, chunk[:n]...)
		if n > 0 && headEndRe.Match(data) {
			break
		}
		if err != nil {
			break
		}
	}
	data = bytes.TrimPrefix(data, []byte("\xef\xbb\xbf"))
	// Drop a trailing incomplete sequence the decoder would still be holding
	for i := 1; i <= 3 && i <= len(data); i++ {
		c := data[len(data)-i]
		if c < 0x80 {
			break
		}
		if c >= 0xC0 {
			if !utf8.FullRune(data[len(data)-i:]) {
				data = data[:len(data)-i]
			}
			break
		}
	}
	return strings.ToValidUTF8(string(data), "\ufffd")
}

// ExtractMeta collects the sharing metadata from the <head> of html.
func ExtractMeta(html, pageURL string) (*MetaPreview, error) {
	head := html
	if loc := headEndRe.FindStringIndex(html); loc != nil {
		head = html[:loc[0]]
	}

	tags := newOrderedMap()
	for _, tag := range metaTagRe.FindAllString(head, -1) {
		attrs, err := parseAttributes(tag)
		if err != nil {
			return nil, err
		}
		key, _ := firstAttr(attrs, "property", "name", "itemprop")
		key = strings.ToLower(key)
		content, hasContent := attrs["content"]
		if key != "" && hasContent && !tags.has(key) && !inherited(key) {
			tags.set(key, jsutil.Trim(content))
		}
	}

	links := map[string]string{}
	for _, tag := range linkTagRe.FindAllString(head, -1) {
		attrs, err := parseAttributes(tag)
		if err != nil {
			return nil, err
		}
		rel := strings.ToLower(attrs["rel"])
		if _, seen := links[rel]; rel != "" && attrs["href"] != "" && !seen && !inherited(rel) {
			links[rel] = attrs["href"]
		}
	}

	htmlTitle := ""
	if m := titleRe.FindStringSubmatch(head); m != nil {
		decoded, err := decodeEntities(m[1])
		if err != nil {
			return nil, err
		}
		htmlTitle = jsutil.Trim(decoded)
	}

	resolve := func(value string) string {
		if value == "" {
			return ""
		}
		u, err := whatwg.ParseRef(pageURL, value)
		if err != nil {
			return ""
		}
		return u.Href(false)
	}
	or := func(values ...string) string {
		for _, v := range values {
			if v != "" {
				return v
			}
		}
		return ""
	}
	tag := tags.get

	if htmlTitle != "" {
		tags.set("<title>", htmlTitle)
	}
	return &MetaPreview{
		URL:         or(resolve(or(tag("og:url"), links["canonical"])), pageURL),
		Title:       or(tag("og:title"), tag("twitter:title"), htmlTitle),
		Description: or(tag("og:description"), tag("twitter:description"), tag("description")),
		Image: resolve(or(tag("og:image"), tag("og:image:url"),
			tag("og:image:secure_url"), tag("twitter:image"), tag("twitter:image:src"))),
		SiteName:    or(tag("og:site_name"), tag("application-name")),
		Favicon:     resolve(or(links["icon"], links["shortcut icon"], links["apple-touch-icon"], "/favicon.ico")),
		ThemeColor:  tag("theme-color"),
		TwitterCard: tag("twitter:card"),
		TwitterSite: tag("twitter:site"),
		Tags:        tags,
	}, nil
}

func metaError(w http.ResponseWriter, message string, status int) {
	writeJSON(w, status, map[string]string{"error": message})
}

var metaClient = &http.Client{
	CheckRedirect: func(_ *http.Request, via []*http.Request) error {
		if len(via) >= 20 { // fetch's redirect limit
			return errors.New("too many redirects")
		}
		return nil
	},
}

// Meta fetches the page at the "url" query parameter and returns its
// sharing metadata.
func Meta(w http.ResponseWriter, r *http.Request) {
	input, _ := jsutil.SearchParam(r.URL.RawQuery, "url")
	if input == "" {
		metaError(w, "URL is required: add '?url=<url>' in the address bar", 400)
		return
	}

	target, err := whatwg.Parse(input)
	if err != nil {
		metaError(w, "Invalid URL", 400)
		return
	}
	if p := target.Protocol(); p != "http:" && p != "https:" {
		metaError(w, "Only http and https URLs are supported", 400)
		return
	}
	if isPrivateHost(target.Hostname()) {
		metaError(w, "Private or local addresses are not allowed", 400)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), metaTimeout)
	defer cancel()
	fail := func() {
		if errors.Is(ctx.Err(), context.DeadlineExceeded) {
			metaError(w, "The page took too long to respond", 502)
		} else {
			metaError(w, "Could not fetch the page", 502)
		}
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "/", nil)
	if err != nil {
		fail()
		return
	}
	req.URL = requestURL(target)
	req.Host = req.URL.Host
	req.Header.Set("User-Agent", metaUserAgent)
	req.Header.Set("Accept", "text/html,application/xhtml+xml")

	res, err := metaClient.Do(req)
	if err != nil {
		fail()
		return
	}
	defer res.Body.Close()

	if res.StatusCode < 200 || res.StatusCode > 299 {
		metaError(w, fmt.Sprintf("The page responded with %d", res.StatusCode), 502)
		return
	}
	contentType := strings.Join(res.Header.Values("Content-Type"), ", ")
	if !strings.Contains(contentType, "html") {
		if contentType == "" {
			contentType = "unknown type"
		}
		metaError(w, fmt.Sprintf("Not an HTML page (%s)", contentType), 422)
		return
	}

	html := readHead(res.Body)
	if ctx.Err() != nil {
		fail()
		return
	}
	pageURL := target.Href(true)
	final := res.Request.URL
	finalString := final.String()
	if final.Opaque != "" { // the request built by requestURL, not redirected
		finalString = final.Scheme + "://" + final.Host + final.Opaque
		if final.RawQuery != "" {
			finalString += "?" + final.RawQuery
		}
	}
	if final, err := whatwg.Parse(finalString); err == nil {
		pageURL = final.Href(true)
	}
	meta, err := ExtractMeta(html, pageURL)
	if err != nil {
		fail()
		return
	}
	writeJSON(w, http.StatusOK, meta)
}

// requestURL converts a WHATWG URL to the URL to fetch. Its path and query
// are sent exactly as serialized, as fetch did, even when url.Parse would
// reject them (e.g. a stray "%" in the path).
func requestURL(u *whatwg.Url) *url.URL {
	out := &url.URL{
		Scheme:   strings.TrimSuffix(u.Protocol(), ":"),
		Host:     u.Host(),
		Opaque:   u.Pathname(),
		RawQuery: strings.TrimPrefix(u.Search(), "?"),
	}
	if u.Username() != "" || u.Password() != "" {
		out.User = url.UserPassword(u.Username(), u.Password())
	}
	return out
}

// orderedMap is a string map that serializes like a JavaScript object:
// integer-like keys first in ascending order, then the others in insertion
// order.
type orderedMap struct {
	keys   []string
	values map[string]string
}

func newOrderedMap() *orderedMap {
	return &orderedMap{values: map[string]string{}}
}

func (m *orderedMap) has(key string) bool {
	_, ok := m.values[key]
	return ok
}

func (m *orderedMap) get(key string) string {
	return m.values[key]
}

func (m *orderedMap) set(key, value string) {
	if !m.has(key) {
		m.keys = append(m.keys, key)
	}
	m.values[key] = value
}

func arrayIndex(key string) (uint64, bool) {
	n, err := strconv.ParseUint(key, 10, 32)
	if err != nil || n == 1<<32-1 || strconv.FormatUint(n, 10) != key {
		return 0, false
	}
	return n, true
}

func (m *orderedMap) MarshalJSON() ([]byte, error) {
	var indexes, others []string
	for _, k := range m.keys {
		if _, ok := arrayIndex(k); ok {
			indexes = append(indexes, k)
		} else {
			others = append(others, k)
		}
	}
	slices.SortFunc(indexes, func(a, b string) int {
		x, _ := arrayIndex(a)
		y, _ := arrayIndex(b)
		return cmp.Compare(x, y)
	})

	var buf bytes.Buffer
	buf.WriteByte('{')
	for i, k := range append(indexes, others...) {
		if i > 0 {
			buf.WriteByte(',')
		}
		writeJSONString(&buf, k)
		buf.WriteByte(':')
		writeJSONString(&buf, m.values[k])
	}
	buf.WriteByte('}')
	return buf.Bytes(), nil
}

func writeJSONString(buf *bytes.Buffer, s string) {
	var tmp bytes.Buffer
	enc := jsonEncoder(&tmp)
	_ = enc.Encode(s)
	buf.Write(bytes.TrimSuffix(tmp.Bytes(), []byte("\n")))
}
