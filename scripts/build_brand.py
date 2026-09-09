#!/usr/bin/env python3
"""Build the Vardanian Studio logo files.

    pip install fonttools brotli
    python3 scripts/build_brand.py

Writes outlined SVGs to assets/brand/. Type is converted to paths, so the files
carry no font dependency. Fonts are fetched from Google Fonts into a local cache
on first run.

The marks use `currentColor` for the primary form and the ember accent as a
literal hex, so one file works on both ink and paper backgrounds: set `color`
on any ancestor element and the logo follows it.
"""
import math
import os
import re
import urllib.request

from fontTools.misc.transform import Transform
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, "scripts", ".fontcache")
OUT = os.path.join(ROOT, "assets", "brand")
EMBER = "#FF5C28"
INK = "#08080A"
PAPER = "#F4F1EB"

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0 Safari/537.36")
FONTS = {
    "instrument-serif": "Instrument+Serif",
    "inter-500": "Inter:wght@500",
    "inter-600": "Inter:wght@600",
    "jbmono-500": "JetBrains+Mono:wght@500",
}


def fetch_fonts():
    """Download the latin subset of each face and cache it as TTF."""
    os.makedirs(CACHE, exist_ok=True)
    for name, family in FONTS.items():
        dest = os.path.join(CACHE, name + ".ttf")
        if os.path.exists(dest):
            continue
        css_url = f"https://fonts.googleapis.com/css2?family={family}&display=swap"
        req = urllib.request.Request(css_url, headers={"User-Agent": UA})
        css = urllib.request.urlopen(req).read().decode()
        # the last @font-face block is the latin subset; earlier ones are
        # cyrillic / greek / vietnamese and lack the glyphs we need
        url = [u for u in re.findall(r"https://[^)]+\.woff2", css)][-1]
        raw = urllib.request.urlopen(url).read()
        tmp = dest + ".woff2"
        with open(tmp, "wb") as fh:
            fh.write(raw)
        font = TTFont(tmp)
        font.flavor = None
        font.save(dest)
        os.remove(tmp)
        print("cached", name)


# ── type ────────────────────────────────────────────────────────────────
class Face:
    def __init__(self, filename):
        self.tt = TTFont(os.path.join(CACHE, filename))
        self.gs = self.tt.getGlyphSet()
        self.cmap = self.tt.getBestCmap()
        self.upm = self.tt["head"].unitsPerEm
        cap = getattr(self.tt["OS/2"], "sCapHeight", 0) or 0
        self.cap = cap if cap else self.upm * 0.70

    def set(self, s, cap_height, tracking=0.0, x=0.0, baseline=0.0):
        """Outline a string. tracking is in em. Returns dict(d, x0,y0,x1,y1, adv)."""
        sc = cap_height / self.cap
        track = tracking * self.upm * sc
        cx, parts = x, []
        bx0 = by0 = 1e9; bx1 = by1 = -1e9
        for ch in s:
            gname = self.cmap.get(ord(ch))
            if gname is None:
                raise KeyError(f"no glyph for {ch!r}")
            g = self.gs[gname]
            t = Transform(sc, 0, 0, -sc, cx, baseline)
            sp = SVGPathPen(self.gs, ntos=lambda v: f"{v:.2f}")
            g.draw(TransformPen(sp, t))
            d = sp.getCommands()
            if d.strip():
                parts.append(d)
            bp = BoundsPen(self.gs)
            g.draw(TransformPen(bp, t))
            if bp.bounds:
                x0, y0, x1, y1 = bp.bounds
                bx0, by0, bx1, by1 = min(bx0, x0), min(by0, y0), max(bx1, x1), max(by1, y1)
            cx += g.width * sc + track
        adv = cx - x - (track if s else 0)
        if bx0 > bx1:
            bx0 = bx1 = x; by0 = by1 = baseline
        return dict(d=" ".join(parts), x0=bx0, y0=by0, x1=bx1, y1=by1, adv=adv)

fetch_fonts()

SERIF = Face("instrument-serif.ttf")
SANS_SB = Face("inter-600.ttf")
SANS_M = Face("inter-500.ttf")
MONO = Face("jbmono-500.ttf")

# ── concept A: the vanishing point (nested chevrons) ────────────────────
def chevron_path(cx, apex_y, top_y, t, w):
    """Filled chevron. t = dx/dy slope, w = stroke weight, miter apex."""
    hw = (apex_y - top_y) * t
    A = (cx - hw, top_y); B = (cx, apex_y); C = (cx + hw, top_y)
    L = math.hypot(hw, apex_y - top_y)
    n = (-(apex_y - top_y) / L, hw / L)          # outward normal, left arm
    d = w / 2.0
    sin_t = (apex_y - top_y) / L                 # sin of half-angle at apex
    miter = d / sin_t
    pts = [
        (A[0] + d * n[0], A[1] + d * n[1]),
        (B[0], B[1] + miter),
        (C[0] - d * n[0], C[1] + d * n[1]),
        (C[0] + d * n[0], C[1] - d * n[1]),
        (B[0], B[1] - miter),
        (A[0] - d * n[0], A[1] - d * n[1]),
    ]
    dstr = "M " + " L ".join(f"{p[0]:.2f},{p[1]:.2f}" for p in pts) + " Z"
    x0 = min(p[0] for p in pts); x1 = max(p[0] for p in pts)
    y0 = min(p[1] for p in pts); y1 = max(p[1] for p in pts)
    return dstr, (x0, y0, x1, y1)

# ── concept C: the aperture (4-blade iris, square opening) ──────────────
def rot90(p, c=(0.0, 0.0)):
    return (c[0] - (p[1] - c[1]), c[1] + (p[0] - c[0]))

def blade_path(P, Q, w):
    dx, dy = Q[0] - P[0], Q[1] - P[1]
    L = math.hypot(dx, dy)
    nx, ny = -dy / L * w / 2, dx / L * w / 2
    pts = [(P[0] + nx, P[1] + ny), (Q[0] + nx, Q[1] + ny),
           (Q[0] - nx, Q[1] - ny), (P[0] - nx, P[1] - ny)]
    return "M " + " L ".join(f"{p[0]:.2f},{p[1]:.2f}" for p in pts) + " Z"

def ring_path(cx, cy, R, w):
    ro, ri = R + w / 2, R - w / 2
    return (f"M {cx-ro:.2f},{cy:.2f} A {ro:.2f},{ro:.2f} 0 1 0 {cx+ro:.2f},{cy:.2f} "
            f"A {ro:.2f},{ro:.2f} 0 1 0 {cx-ro:.2f},{cy:.2f} Z "
            f"M {cx-ri:.2f},{cy:.2f} A {ri:.2f},{ri:.2f} 0 1 1 {cx+ri:.2f},{cy:.2f} "
            f"A {ri:.2f},{ri:.2f} 0 1 1 {cx-ri:.2f},{cy:.2f} Z")

def aperture(cx, cy, R, w, span_deg=140.0, blades=4):
    """Pinwheel iris: each blade runs from the ring to the far corner only."""
    step = 360.0 / blades
    half = span_deg / 2.0
    start = -half                          # puts the opening square square-on to the axes
    P0 = (cx + R * math.cos(math.radians(start)), cy + R * math.sin(math.radians(start)))
    Q0 = (cx + R * math.cos(math.radians(start + span_deg)),
          cy + R * math.sin(math.radians(start + span_deg)))
    # trim: blade stops at the opening corner nearest Q (pinwheel)
    mid = ((P0[0] + Q0[0]) / 2, (P0[1] + Q0[1]) / 2)
    inr = math.hypot(mid[0] - cx, mid[1] - cy)          # opening inradius
    ux, uy = (Q0[0] - P0[0]), (Q0[1] - P0[1])
    L = math.hypot(ux, uy); ux, uy = ux / L, uy / L
    corner = (mid[0] + ux * inr, mid[1] + uy * inr)      # square corner on this edge
    P, Q = P0, corner
    out = []
    for _ in range(blades):
        out.append(blade_path(P, Q, w))
        P, Q = rot90(P, (cx, cy)), rot90(Q, (cx, cy))
    return out, inr

# ── svg writing ─────────────────────────────────────────────────────────
def svg(path, vb, body, title):
    x0, y0, x1, y1 = vb
    w, h = x1 - x0, y1 - y0
    doc = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0:.2f} {y0:.2f} {w:.2f} {h:.2f}" '
           f'width="{w:.2f}" height="{h:.2f}" fill="none" role="img" aria-label="{title}">\n'
           f'  <title>{title}</title>\n{body}\n</svg>\n')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(doc)
    return doc



def union(*boxes):
    xs0 = min(b[0] for b in boxes); ys0 = min(b[1] for b in boxes)
    xs1 = max(b[2] for b in boxes); ys1 = max(b[3] for b in boxes)
    return (xs0, ys0, xs1, ys1)

def shift(d, dx, dy):
    """Translate markup by wrapping it in a group instead of re-parsing numbers."""
    return '<g transform="translate(%.2f,%.2f)">%s</g>' % (dx, dy, d)

def pel(d, fill="currentColor", opacity=None):
    op = '' if opacity is None else ' opacity="%s"' % opacity
    return '<path d="%s" fill="%s"%s/>' % (d, fill, op)

# ─────────────────────────────────────────────────────────────────────────
# MARK A — the vanishing point
# ─────────────────────────────────────────────────────────────────────────
A_T = 0.52
A_SPEC = [(96, 14, 9.0), (70, 14, 6.5), (48, 14, 4.5)]   # apex_y, top_y, weight

def mark_a(spec=A_SPEC, accent=EMBER, dim=0.5):
    paths, boxes = [], []
    for i, (ay, ty, w) in enumerate(spec):
        d, bb = chevron_path(0, ay, ty, A_T, w)
        boxes.append(bb)
        last = (i == len(spec) - 1)
        if last:
            paths.append(f'<path d="{d}" fill="{accent}"/>')
        else:
            op = "" if i == 0 else f' opacity="{dim}"'
            paths.append(f'<path d="{d}" fill="currentColor"{op}/>')
    return "\n".join("  " + p for p in paths), union(*boxes)

# ─────────────────────────────────────────────────────────────────────────
# MARK C — the aperture
# ─────────────────────────────────────────────────────────────────────────
def mark_c(R=44.0, w=8.0, dot=4.6, accent=EMBER):
    blades, inr = aperture(0, 0, R, w)
    out = [f'<path d="{ring_path(0,0,R,w)}" fill="currentColor" fill-rule="evenodd"/>']
    out += [f'<path d="{b}" fill="currentColor"/>' for b in blades]
    if dot:
        out.append(f'<circle cx="0" cy="0" r="{dot}" fill="{accent}"/>')
    ext = R + w / 2
    return "\n".join("  " + p for p in out), (-ext, -ext, ext, ext)

# ─────────────────────────────────────────────────────────────────────────
# lockups
# ─────────────────────────────────────────────────────────────────────────
CAP = 100.0

def two_line_block(face1, t1, face2, t2, cap2=44.0, tr1=0.085, tr2=0.42, drop=78.0, dim=0.55):
    w1 = face1.set(t1, CAP, tr1, 0, 0)
    w2 = face2.set(t2, cap2, tr2, 0, drop)
    dx = w1["x0"] - w2["x0"]                      # optical left alignment
    body = ("  " + pel(w1["d"]) + "\n  "
            + shift(pel(w2["d"], opacity=dim), dx, 0))
    box = (w1["x0"], -CAP, max(w1["x1"], w2["x1"] + dx), drop)
    return body, box

def horizontal(markfn, block, gap_ratio=0.32, mark_fill=1.0):
    mbody, mbox = markfn()
    tbody, tbox = block
    th = tbox[3] - tbox[1]
    mh = mbox[3] - mbox[1]
    s = (th * mark_fill) / mh
    gap = th * gap_ratio
    # place mark: left edge at 0, vertically centred on the text block
    mx = -mbox[0] * s
    my = (tbox[1] + tbox[3]) / 2 - ((mbox[1] + mbox[3]) / 2) * s
    mark_g = f'<g transform="translate({mx:.2f},{my:.2f}) scale({s:.4f})">\n{mbody}\n  </g>'
    tx = (mbox[2] - mbox[0]) * s + gap - tbox[0]
    text_g = f'<g transform="translate({tx:.2f},0)">\n{tbody}\n  </g>'
    box = (0, min(tbox[1], my + mbox[1] * s), tx + tbox[2], max(tbox[3], my + mbox[3] * s))
    return f"  {mark_g}\n  {text_g}", box

def stacked(markfn, block, gap_ratio=0.36, mark_h=190.0):
    mbody, mbox = markfn()
    tbody, tbox = block
    s = mark_h / (mbox[3] - mbox[1])
    tw = tbox[2] - tbox[0]
    mw = (mbox[2] - mbox[0]) * s
    W = max(tw, mw)
    mx = (W - mw) / 2 - mbox[0] * s
    my = -CAP - CAP * gap_ratio - mbox[3] * s    # mark bottom clears the cap line
    tdx = (W - tw) / 2 - tbox[0]
    body = (f'  <g transform="translate({mx:.2f},{my:.2f}) scale({s:.4f})">\n{mbody}\n  </g>\n'
            f'  <g transform="translate({tdx:.2f},0)">\n{tbody}\n  </g>')
    return body, (0, my + mbox[1] * s, W, tbox[3])

def tile(mbody, mbox, fill_ratio=0.62, bg=INK, fg=PAPER, size=100.0, rx=22.0):
    mw, mh = mbox[2] - mbox[0], mbox[3] - mbox[1]
    s = size * fill_ratio / max(mw, mh)
    cx = size / 2 - ((mbox[0] + mbox[2]) / 2) * s
    cy = size / 2 - ((mbox[1] + mbox[3]) / 2) * s
    return (f'  <rect width="{size}" height="{size}" rx="{rx}" fill="{bg}"/>\n'
            f'  <g transform="translate({cx:.2f},{cy:.2f}) scale({s:.4f})" color="{fg}">\n{mbody}\n  </g>')

def mono(body):
    return body.replace(EMBER, "currentColor")

# ─────────────────────────────────────────────────────────────────────────
files = {}
def emit(name, box, body, title):
    path = os.path.join(OUT, name)
    files[name] = svg(path, box, body, title)

# ── A ───────────────────────────────────────────────────────────────────
blockA = two_line_block(SANS_SB, "VARDANIAN", SANS_M, "STUDIO", 44, 0.085, 0.42)
bA, boxA = horizontal(mark_a, blockA, 0.32, 1.0)
emit("vanishing-point/lockup.svg", boxA, bA, "Vardanian Studio")
emit("vanishing-point/lockup-mono.svg", boxA, mono(bA), "Vardanian Studio")
bAs, boxAs = stacked(mark_a, blockA, 0.40, 205)
emit("vanishing-point/lockup-stacked.svg", boxAs, bAs, "Vardanian Studio")
mbA, mboxA = mark_a()
emit("vanishing-point/mark.svg", mboxA, mbA, "Vardanian Studio mark")
emit("vanishing-point/mark-mono.svg", mboxA, mono(mbA), "Vardanian Studio mark")
fav_a, fav_a_box = mark_a([(96, 14, 16.0), (48, 14, 11.0)])
emit("vanishing-point/favicon.svg", (0, 0, 100, 100), tile(fav_a, fav_a_box, 0.66), "Vardanian Studio")

# ── B ───────────────────────────────────────────────────────────────────
ser = SERIF.set("Vardanian", CAP, -0.004, 0, 0)
mon = MONO.set("STUDIO", 42, 0.40, 0, -29)
rule_x = ser["x1"] + 44
rule_w, rule_h = 3.2, 122.0
mon_dx = rule_x + rule_w + 44 - mon["x0"]
bB = ("  " + pel(ser["d"]) + "\n"
      + '  <rect x="%.2f" y="%.2f" width="%s" height="%s" fill="%s"/>\n' % (rule_x, -CAP/2 - rule_h/2, rule_w, rule_h, EMBER)
      + "  " + shift(pel(mon["d"], opacity=0.62), mon_dx, 0))
boxB = (ser["x0"], min(ser["y0"], -CAP/2 - rule_h/2), mon["x1"] + mon_dx,
        max(ser["y1"], -CAP/2 + rule_h/2))
emit("editorial/lockup.svg", boxB, bB, "Vardanian Studio")
emit("editorial/lockup-mono.svg", boxB,
     bB.replace(f'fill="{EMBER}"', 'fill="currentColor" opacity="0.9"'), "Vardanian Studio")

mon2 = MONO.set("STUDIO", 40, 0.46, 0, 112)
W_B = max(ser["x1"] - ser["x0"], mon2["x1"] - mon2["x0"])
sdx = (W_B - (ser["x1"] - ser["x0"])) / 2 - ser["x0"]
mdx = (W_B - (mon2["x1"] - mon2["x0"])) / 2 - mon2["x0"]
bBs = ("  " + shift(pel(ser["d"]), sdx, 0) + "\n"
       + '  <rect x="0" y="36" width="%.2f" height="2.6" fill="%s"/>\n' % (W_B, EMBER)
       + "  " + shift(pel(mon2["d"], opacity=0.62), mdx, 0))
emit("editorial/lockup-stacked.svg", (0, ser["y0"], W_B, 112), bBs, "Vardanian Studio")

v = SERIF.set("V", 100, 0, 0, 0)
vbox = (v["x0"], v["y0"], v["x1"], v["y1"])
vw = v["x1"] - v["x0"]
fav_b = ("  " + pel(v["d"]) + "\n"
         + '  <rect x="%.2f" y="18" width="%.2f" height="7" fill="%s"/>' % (v["x0"], vw, EMBER))
fav_b_box = (v["x0"], v["y0"], v["x1"], 25.0)
emit("editorial/favicon.svg", (0, 0, 100, 100),
     tile(fav_b, fav_b_box, 0.66), "Vardanian Studio")

# ── C ───────────────────────────────────────────────────────────────────
blockC = two_line_block(SANS_M, "VARDANIAN", MONO, "STUDIO", 40, 0.20, 0.46, 76, 0.6)
bC, boxC = horizontal(mark_c, blockC, 0.34, 1.0)
emit("aperture/lockup.svg", boxC, bC, "Vardanian Studio")
emit("aperture/lockup-mono.svg", boxC, mono(bC), "Vardanian Studio")
bCs, boxCs = stacked(mark_c, blockC, 0.40, 228)
emit("aperture/lockup-stacked.svg", boxCs, bCs, "Vardanian Studio")
mbC, mboxC = mark_c()
emit("aperture/mark.svg", mboxC, mbC, "Vardanian Studio mark")
emit("aperture/mark-mono.svg", mboxC, mono(mbC), "Vardanian Studio mark")
fav_c, fav_c_box = mark_c(R=42, w=11.0, dot=5.6)
emit("aperture/favicon.svg", (0, 0, 100, 100), tile(fav_c, fav_c_box, 0.66), "Vardanian Studio")

for k in sorted(files):
    print(f"{k:42s} {len(files[k]):6d} bytes")
