// Package views renders the HTML templates in web/templates: full pages
// wrapped in the layout, and fragments for htmx requests.
package views

import (
	"bytes"
	"fmt"
	"html/template"
	"io/fs"
	"log"
	"net/http"
	"path"
	"regexp"
	"strings"
	"sync"
)

// Renderer executes the templates of a file system.
type Renderer struct {
	fsys  fs.FS
	funcs template.FuncMap
	// reload reparses the templates on every render (development).
	reload bool

	mu    sync.Mutex
	pages map[string]*template.Template
}

// New parses the templates of fsys, which holds layout.html, partials/*.html
// and pages/*.html.
func New(fsys fs.FS, funcs template.FuncMap, reload bool) (*Renderer, error) {
	r := &Renderer{fsys: fsys, funcs: funcs, reload: reload}
	pages, err := r.parse()
	if err != nil {
		return nil, err
	}
	r.pages = pages
	return r, nil
}

// Each page is parsed together with the layout and the partials, so pages
// can define the same blocks (title, content...).
func (r *Renderer) parse() (map[string]*template.Template, error) {
	base := template.New("").Funcs(r.funcs)
	shared, err := fs.Glob(r.fsys, "partials/*.html")
	if err != nil {
		return nil, err
	}
	for _, name := range append([]string{"layout.html"}, shared...) {
		if err := parseFile(base, r.fsys, name); err != nil {
			return nil, err
		}
	}

	files, err := fs.Glob(r.fsys, "pages/*.html")
	if err != nil {
		return nil, err
	}
	pages := map[string]*template.Template{}
	for _, name := range files {
		t, err := base.Clone()
		if err != nil {
			return nil, err
		}
		if err := parseFile(t, r.fsys, name); err != nil {
			return nil, err
		}
		pages[strings.TrimSuffix(path.Base(name), ".html")] = t
	}
	return pages, nil
}

// Line breaks and indentation between tags or actions only format the
// templates: drop them, like JSX and Vue templates do, so the markup
// matches what the previous versions rendered.
var formatting = regexp.MustCompile(`(>|}})[ \t]*\n\s*(<|{{)`)

func parseFile(t *template.Template, fsys fs.FS, name string) error {
	src, err := fs.ReadFile(fsys, name)
	if err != nil {
		return err
	}
	if _, err := t.Parse(formatting.ReplaceAllString(string(src), "$1$2")); err != nil {
		return fmt.Errorf("%s: %w", name, err)
	}
	return nil
}

func (r *Renderer) lookup(page string) (*template.Template, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.reload {
		pages, err := r.parse()
		if err != nil {
			return nil, err
		}
		r.pages = pages
	}
	t, ok := r.pages[page]
	if !ok {
		return nil, fmt.Errorf("unknown page %q", page)
	}
	return t, nil
}

// Page renders pages/<page>.html inside the layout.
func (r *Renderer) Page(w http.ResponseWriter, status int, page string, data any) {
	r.render(w, status, page, "layout", data)
}

// Fragment renders the named template defined by pages/<page>.html, for htmx.
func (r *Renderer) Fragment(w http.ResponseWriter, status int, page, name string, data any) {
	r.render(w, status, page, name, data)
}

func (r *Renderer) render(w http.ResponseWriter, status int, page, name string, data any) {
	t, err := r.lookup(page)
	var buf bytes.Buffer
	if err == nil {
		err = t.ExecuteTemplate(&buf, name, data)
	}
	if err != nil {
		log.Printf("views: render %s/%s: %v", page, name, err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(status)
	_, _ = w.Write(buf.Bytes())
}
