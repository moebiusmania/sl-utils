// Package qrcode is a Go port of the SVG output of jsr:@libs/qrcode@3.1.0
// (itself based on Nayuki's QR Code generator), kept line-for-line close to
// the original so the generated SVG is byte-identical.
package qrcode

import (
	"errors"
	"fmt"
	"regexp"
	"strings"
)

// ErrDataTooLong is returned when the content does not fit in a version 40
// QR code.
var ErrDataTooLong = errors.New("data too long")

// SVG renders content as a QR code SVG with the given quiet-zone border,
// using the library defaults: MEDIUM error correction (boosted when it fits),
// white light modules and black dark modules.
func SVG(content string, border int) (string, error) {
	qr, err := encode(segmentsFrom(content), medium)
	if err != nil {
		return "", err
	}
	if border < 0 {
		border = 0
	}
	size := qr.size + border*2
	paths := []string{}
	for y := 0; y < qr.size; y++ {
		for x := 0; x < qr.size; x++ {
			if qr.get(x, y) {
				paths = append(paths, fmt.Sprintf("M%d,%dh1v1h-1z", x+border, y+border))
			}
		}
	}
	return fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 %d %d" stroke="none"><rect width="100%%" height="100%%" fill="white"/><path d="%s" fill="black"/></svg>`,
		size, size, strings.Join(paths, " ")), nil
}

type ecl struct {
	eccPerBlock [41]int
	eccBlocks   [41]int
	format      int
}

var (
	medium = &ecl{
		eccPerBlock: [41]int{0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28},
		eccBlocks:   [41]int{0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49},
		format:      0,
	}
	quartile = &ecl{
		eccPerBlock: [41]int{0, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30},
		eccBlocks:   [41]int{0, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68},
		format:      3,
	}
	high = &ecl{
		eccPerBlock: [41]int{0, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30},
		eccBlocks:   [41]int{0, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81},
		format:      2,
	}
)

const versionMax = 40

// Positions of alignment patterns for each version number.
var alignments = [41][]int{
	{}, {}, {6, 18}, {6, 22}, {6, 26}, {6, 30}, {6, 34}, {6, 22, 38},
	{6, 24, 42}, {6, 26, 46}, {6, 28, 50}, {6, 30, 54}, {6, 32, 58},
	{6, 34, 62}, {6, 26, 46, 66}, {6, 26, 48, 70}, {6, 26, 50, 74},
	{6, 30, 54, 78}, {6, 30, 56, 82}, {6, 30, 58, 86}, {6, 34, 62, 90},
	{6, 28, 50, 72, 94}, {6, 26, 50, 74, 98}, {6, 30, 54, 78, 102},
	{6, 28, 54, 80, 106}, {6, 32, 58, 84, 110}, {6, 30, 58, 86, 114},
	{6, 34, 62, 90, 118}, {6, 26, 50, 74, 98, 122}, {6, 30, 54, 78, 102, 126},
	{6, 26, 52, 78, 104, 130}, {6, 30, 56, 82, 108, 134},
	{6, 34, 60, 86, 112, 138}, {6, 30, 58, 86, 114, 142},
	{6, 34, 62, 90, 118, 146}, {6, 30, 54, 78, 102, 126, 150},
	{6, 24, 50, 76, 102, 128, 154}, {6, 28, 54, 80, 106, 132, 158},
	{6, 32, 58, 84, 110, 136, 162}, {6, 26, 54, 82, 110, 138, 166},
	{6, 30, 58, 86, 114, 142, 170},
}

// Number of data bits that fit in each version, after function modules.
var dataBits = [41]int{
	0, 208, 359, 567, 807, 1079, 1383, 1568, 1936, 2336, 2768, 3232, 3728,
	4256, 4651, 5243, 5867, 6523, 7211, 7931, 8683, 9252, 10068, 10916, 11796,
	12708, 13652, 14628, 15371, 16411, 17483, 18587, 19723, 20891, 22091,
	23008, 24272, 25568, 26896, 28256, 29648,
}

// For use in penalty score, when evaluating which mask is best.
var penaltyWeights = [4]int{3, 3, 40, 10}

func capacity(version int, level *ecl) int {
	return 8 * (dataBits[version]/8 - level.eccPerBlock[version]*level.eccBlocks[version])
}

type code struct {
	version   int
	size      int
	ecl       *ecl
	mask      int
	modules   [][]bool
	functions [][]bool
}

// encode picks the smallest version that fits, boosts the error correction
// level when possible, then builds the symbol with the best mask.
func encode(segments []segment, level *ecl) (*code, error) {
	version, used := 1, 0
	for ; ; version++ {
		used = 0
		tooLong := false
		for _, s := range segments {
			width := s.width(version)
			if s.length >= 1<<width {
				tooLong = true
			}
			used += 4 + width + len(s.bits)
		}
		if !tooLong && used <= capacity(version, level) {
			break
		}
		if version >= versionMax {
			return nil, ErrDataTooLong
		}
	}

	// Increase the error correction level while the data still fits
	boosted := level
	for _, l := range []*ecl{medium, quartile, high} {
		if used <= capacity(version, l) {
			boosted = l
		}
	}

	// Concatenate all segments to create the data bit string
	bits := []int{}
	for _, s := range segments {
		bits = appendBits(bits, 4, s.mode)
		bits = appendBits(bits, s.width(version), s.length)
		bits = append(bits, s.bits...)
	}

	// Add terminator and pad up to a byte. Like the original, padding is
	// computed with the requested level, not the boosted one; the extra pad
	// bytes are dropped when splitting into blocks.
	limit := capacity(version, level)
	bits = appendBits(bits, min(4, limit-len(bits)), 0)
	bits = appendBits(bits, (8-len(bits)%8)%8, 0)
	for padding := 0xEC; len(bits) < limit; padding ^= 0xEC ^ 0x11 {
		bits = appendBits(bits, 8, padding)
	}

	// Pack bits into bytes in big endian
	data := make([]int, (len(bits)+7)/8)
	for i, b := range bits {
		data[i>>3] |= b << (7 - (i & 7))
	}

	return newCode(version, boosted, data), nil
}

func newCode(version int, level *ecl, data []int) *code {
	q := &code{version: version, size: version*4 + 17, ecl: level}
	q.modules = make([][]bool, q.size)
	q.functions = make([][]bool, q.size)
	for i := range q.modules {
		q.modules[i] = make([]bool, q.size)
		q.functions[i] = make([]bool, q.size)
	}
	q.drawPatterns()
	q.drawData(q.interleave(data))
	best, minPenalty := 0, -1
	for i := range 8 {
		q.applyMask(i)
		q.drawFormat(i)
		penalty := q.penalty()
		if minPenalty < 0 || penalty < minPenalty {
			best, minPenalty = i, penalty
		}
		q.applyMask(i)
	}
	q.mask = best
	q.applyMask(best)
	q.drawFormat(best)
	q.functions = nil
	return q
}

func (q *code) set(x, y int, color bool) {
	q.modules[y][x] = color
	q.functions[y][x] = true
}

func (q *code) get(x, y int) bool {
	return x >= 0 && x < q.size && y >= 0 && y < q.size && q.modules[y][x]
}

func (q *code) drawPatterns() {
	// Draw horizontal and vertical timing patterns
	for i := 0; i < q.size; i++ {
		q.set(6, i, i%2 == 0)
		q.set(i, 6, i%2 == 0)
	}

	// Draw 3 finder patterns (all corners except bottom right)
	q.drawFinder(3, 3)
	q.drawFinder(q.size-4, 3)
	q.drawFinder(3, q.size-4)

	// Draw alignment patterns (except on the three finder corners)
	a := alignments[q.version]
	last := len(a) - 1
	for i := range a {
		for j := range a {
			if !((i == 0 && j == 0) || (i == 0 && j == last) || (i == last && j == 0)) {
				q.drawAlignment(a[i], a[j])
			}
		}
	}

	// Draw configuration data
	q.drawFormat(0)
	q.drawVersion()
}

func (q *code) drawFinder(ox, oy int) {
	for dy := -4; dy <= 4; dy++ {
		for dx := -4; dx <= 4; dx++ {
			d := max(abs(dx), abs(dy))
			x, y := ox+dx, oy+dy
			if x >= 0 && x < q.size && y >= 0 && y < q.size {
				q.set(x, y, d != 2 && d != 4)
			}
		}
	}
}

func (q *code) drawAlignment(x, y int) {
	for dy := -2; dy <= 2; dy++ {
		for dx := -2; dx <= 2; dx++ {
			q.set(x+dx, y+dy, max(abs(dx), abs(dy)) != 1)
		}
	}
}

func (q *code) drawFormat(mask int) {
	// Calculate error correction code and pack bits
	data := q.ecl.format<<3 | mask
	rem := data
	for range 10 {
		rem = (rem << 1) ^ ((rem >> 9) * 0x537)
	}
	bits := (data<<10 | rem) ^ 0x5412

	// Draw first copy
	for i := 0; i <= 5; i++ {
		q.set(8, i, bit(bits, i))
	}
	q.set(8, 7, bit(bits, 6))
	q.set(8, 8, bit(bits, 7))
	q.set(7, 8, bit(bits, 8))
	for i := 9; i < 15; i++ {
		q.set(14-i, 8, bit(bits, i))
	}

	// Draw second copy
	for i := range 8 {
		q.set(q.size-1-i, 8, bit(bits, i))
	}
	for i := 8; i < 15; i++ {
		q.set(8, q.size-15+i, bit(bits, i))
	}
	q.set(8, q.size-8, true)
}

func (q *code) drawVersion() {
	if q.version < 7 {
		return
	}
	rem := q.version
	for range 12 {
		rem = (rem << 1) ^ ((rem >> 11) * 0x1F25)
	}
	bits := q.version<<12 | rem
	for i := range 18 {
		color := bit(bits, i)
		a, b := q.size-11+i%3, i/3
		q.set(a, b, color)
		q.set(b, a, color)
	}
}

// interleave splits data into blocks, appends the ECC of each block and
// interleaves the bytes of all blocks.
func (q *code) interleave(data []int) []int {
	blocks := q.ecl.eccBlocks[q.version]
	eccLength := q.ecl.eccPerBlock[q.version]
	codewords := dataBits[q.version] / 8
	shortBlocks := blocks - codewords%blocks
	shortLength := codewords / blocks

	all := [][]int{}
	divisor := reedSolomonDivisor(eccLength)
	for i, k := 0, 0; i < blocks; i++ {
		n := shortLength - eccLength
		if i >= shortBlocks {
			n++
		}
		block := append([]int{}, data[k:min(k+n, len(data))]...)
		k += len(block)
		remainder := reedSolomonRemainder(block, divisor)
		if i < shortBlocks {
			block = append(block, 0)
		}
		all = append(all, append(block, remainder...))
	}

	result := []int{}
	for i := range all[0] {
		for j, block := range all {
			if i != shortLength-eccLength || j >= shortBlocks {
				result = append(result, block[i])
			}
		}
	}
	return result
}

func (q *code) drawData(data []int) {
	i := 0
	for h := q.size - 1; h >= 1; h -= 2 {
		if h == 6 {
			h = 5
		}
		for v := 0; v < q.size; v++ {
			for j := range 2 {
				x := h - j
				y := v
				if (h+1)&2 == 0 {
					y = q.size - 1 - v
				}
				if !q.functions[y][x] && i < len(data)*8 {
					q.modules[y][x] = bit(data[i>>3], 7-(i&7))
					i++
				}
			}
		}
	}
}

func (q *code) applyMask(mask int) {
	for y := 0; y < q.size; y++ {
		for x := 0; x < q.size; x++ {
			var invert bool
			switch mask {
			case 0:
				invert = (x+y)%2 == 0
			case 1:
				invert = y%2 == 0
			case 2:
				invert = x%3 == 0
			case 3:
				invert = (x+y)%3 == 0
			case 4:
				invert = (x/3+y/2)%2 == 0
			case 5:
				invert = x*y%2+x*y%3 == 0
			case 6:
				invert = (x*y%2+x*y%3)%2 == 0
			case 7:
				invert = ((x+y)%2+x*y%3)%2 == 0
			}
			if invert && !q.functions[y][x] {
				q.modules[y][x] = !q.modules[y][x]
			}
		}
	}
}

func (q *code) penalty() int {
	result := 0
	line := func(at func(i int) bool) {
		color := false
		run := 0
		history := make([]int, 7)
		for i := 0; i < q.size; i++ {
			if at(i) == color {
				run++
				if run == 5 {
					result += penaltyWeights[0]
				} else if run > 5 {
					result++
				}
			} else {
				q.penaltyRegister(run, history)
				if !color {
					result += penaltyPatterns(history) * penaltyWeights[2]
				}
				color = at(i)
				run = 1
			}
		}
		result += q.penaltyCount(run, color, history) * penaltyWeights[2]
	}

	// Adjacent modules in row/column having same color, and finder-like patterns
	for y := 0; y < q.size; y++ {
		line(func(x int) bool { return q.modules[y][x] })
	}
	for x := 0; x < q.size; x++ {
		line(func(y int) bool { return q.modules[y][x] })
	}

	// 2*2 blocks of modules having same color
	for y := 0; y < q.size-1; y++ {
		for x := 0; x < q.size-1; x++ {
			c := q.modules[y][x]
			if c == q.modules[y][x+1] && c == q.modules[y+1][x] && c == q.modules[y+1][x+1] {
				result += penaltyWeights[1]
			}
		}
	}

	// Balance of dark and light modules
	dark := 0
	for _, row := range q.modules {
		for _, c := range row {
			if c {
				dark++
			}
		}
	}
	total := q.size * q.size
	k := (abs(dark*20-total*10)+total-1)/total - 1
	return result + k*penaltyWeights[3]
}

// penaltyPatterns can only be called right after a light run is added, and
// returns either 0, 1, or 2.
func penaltyPatterns(history []int) int {
	n := history[1]
	core := n > 0 && history[2] == n && history[3] == n*3 && history[4] == n && history[5] == n
	result := 0
	if core && history[0] >= n*4 && history[6] >= n {
		result++
	}
	if core && history[6] >= n*4 && history[0] >= n {
		result++
	}
	return result
}

// penaltyCount must be called at the end of a line of modules.
func (q *code) penaltyCount(run int, color bool, history []int) int {
	if color {
		q.penaltyRegister(run, history)
		run = 0
	}
	run += q.size
	q.penaltyRegister(run, history)
	return penaltyPatterns(history)
}

// penaltyRegister pushes run to the front of history and drops the last one.
func (q *code) penaltyRegister(run int, history []int) {
	if history[0] == 0 {
		run += q.size
	}
	copy(history[1:], history[:len(history)-1])
	history[0] = run
}

type segment struct {
	mode   int
	widths [3]int
	length int
	bits   []int
}

func (s segment) width(version int) int {
	return s.widths[(version+7)/17]
}

var (
	numericRe      = regexp.MustCompile(`^[0-9]*$`)
	alphanumericRe = regexp.MustCompile(`^[A-Z0-9 $%*+./:-]*$`)
)

const alphanumericCharset = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:"

// segmentsFrom picks a single numeric, alphanumeric or byte segment.
func segmentsFrom(content string) []segment {
	switch {
	case content == "":
		return nil
	case numericRe.MatchString(content):
		bits := []int{}
		for i := 0; i < len(content); {
			n := min(len(content)-i, 3)
			value := 0
			for _, c := range content[i : i+n] {
				value = value*10 + int(c-'0')
			}
			bits = appendBits(bits, n*3+1, value)
			i += n
		}
		return []segment{{mode: 0x1, widths: [3]int{10, 12, 14}, length: len(content), bits: bits}}
	case alphanumericRe.MatchString(content):
		bits := []int{}
		i := 0
		for ; i+2 <= len(content); i += 2 {
			value := strings.IndexByte(alphanumericCharset, content[i])*45 +
				strings.IndexByte(alphanumericCharset, content[i+1])
			bits = appendBits(bits, 11, value)
		}
		if i < len(content) {
			bits = appendBits(bits, 6, strings.IndexByte(alphanumericCharset, content[i]))
		}
		return []segment{{mode: 0x2, widths: [3]int{9, 11, 13}, length: len(content), bits: bits}}
	default:
		// TextEncoder replaces lone surrogates with U+FFFD, as Go does when
		// a string is valid UTF-8 already.
		data := []byte(strings.ToValidUTF8(content, "\ufffd"))
		bits := []int{}
		for _, b := range data {
			bits = appendBits(bits, 8, int(b))
		}
		return []segment{{mode: 0x4, widths: [3]int{8, 16, 16}, length: len(data), bits: bits}}
	}
}

func reedSolomonDivisor(degree int) []int {
	result := make([]int, degree)
	result[degree-1] = 1
	root := 1
	for range degree {
		for j := range result {
			result[j] = reedSolomonProduct(result[j], root)
			if j+1 < len(result) {
				result[j] ^= result[j+1]
			}
		}
		root = reedSolomonProduct(root, 0x02)
	}
	return result
}

func reedSolomonRemainder(data, divisor []int) []int {
	result := make([]int, len(divisor))
	for _, n := range data {
		factor := n ^ result[0]
		result = append(result[1:], 0)
		for i, coefficient := range divisor {
			result[i] ^= reedSolomonProduct(coefficient, factor)
		}
	}
	return result
}

// reedSolomonProduct multiplies two field elements modulo GF(2^8/0x11D).
func reedSolomonProduct(a, b int) int {
	r := 0
	for i := 7; i >= 0; i-- {
		r = (r << 1) ^ ((r >> 7) * 0x11D)
		r ^= ((b >> i) & 1) * a
	}
	return r
}

func bit(x, i int) bool {
	return (x>>i)&1 != 0
}

func appendBits(bits []int, length, value int) []int {
	for i := length - 1; i >= 0; i-- {
		bits = append(bits, (value>>i)&1)
	}
	return bits
}

func abs(n int) int {
	if n < 0 {
		return -n
	}
	return n
}
