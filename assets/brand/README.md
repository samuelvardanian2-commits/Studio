# Vardanian Studio — logo

Three directions, one palette. Pick one and the rest can be deleted.

| Folder | Direction | Reads as |
|---|---|---|
| `vanishing-point/` | Monogram + wordmark | A **V** built from three receding chevrons — the corridor from the site's flythrough section, collapsed into a letter. |
| `editorial/` | Wordmark only | Instrument Serif set tight, split from `STUDIO` by an ember hairline. No symbol. |
| `aperture/` | Abstract symbol | A four-blade iris whose opening is a **square** — a camera stop and a viewport at once. |

## Files

Every folder carries the same set:

- `lockup.svg` — the primary horizontal lockup. Use this by default.
- `lockup-stacked.svg` — vertical, for square-ish spaces (avatars, stamps, merch).
- `lockup-mono.svg` — one colour, no ember. For embossing, single-colour print, faxes, laser cuts.
- `mark.svg` / `mark-mono.svg` — the symbol alone (not in `editorial/`, which has none).
- `favicon.svg` — the mark on an ink tile, drawn heavier so it survives 16px.

Type is converted to outlines, so nothing depends on a font being installed.

## Colour

The lockups use `currentColor` for the letterforms and mark, and a literal
`#FF5C28` for the ember accent. That means **one file works on both grounds** —
set `color` on any ancestor and the logo follows:

```html
<span style="color: var(--paper)"><!-- lockup.svg inlined --></span>
```

| Token | Value | Role |
|---|---|---|
| ink | `#08080A` | the ground |
| paper | `#F4F1EB` | the logo on ink |
| ember | `#FF5C28` | one accent per lockup, never more |

Ember is load-bearing precisely because it is rationed: the vanishing point in
`vanishing-point/`, the divider in `editorial/`, the focal dot in `aperture/`.
If it starts appearing twice in one lockup, the mark has lost its point.

## Clear space and minimum size

Clear space on all four sides is **the cap height of `VARDANIAN`** (for lockups)
or **25% of the mark height** (for the mark alone). Nothing crosses it.

| Asset | Minimum |
|---|---|
| `lockup.svg` | 150px wide (`editorial/` 170px — the serif hairlines go first) |
| `lockup-stacked.svg` | 90px wide |
| `mark.svg` | 24px |
| `favicon.svg` | 16px |

At 16px, `vanishing-point/` is at its limit and `editorial/` is past it: the
serif stem thins to under a pixel and only the ember rule stays legible. If
16px matters, `aperture/` is the strongest of the three.

## Rebuilding

Geometry and typesetting both live in `scripts/build_brand.py`:

```bash
pip install fonttools brotli
python3 scripts/build_brand.py
```

Fonts are fetched from Google Fonts into `scripts/.fontcache/` on first run
(gitignored). Editing a weight, a tracking value or a chevron angle there and
re-running regenerates every file consistently, which is the point — the SVGs
are build output, not hand-tuned artwork.

To export PNGs at any size:

```bash
pip install cairosvg
python3 -c "
import cairosvg
src = open('assets/brand/aperture/lockup.svg').read().replace('currentColor', '#F4F1EB')
cairosvg.svg2png(bytestring=src.encode(), write_to='lockup@2000.png', output_width=2000)
"
```
