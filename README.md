# Samuel Vardanian — portfolio

A dark-cinematic single-page portfolio. Static HTML, CSS and JavaScript with **no
build step and no dependencies** — open `index.html` and it runs. Deploys as-is to
Netlify, Vercel, Cloudflare Pages, GitHub Pages or any bucket.

```
index.html              the page — all copy lives in the marked CONTENT BLOCK
assets/css/style.css    tokens, components, responsive, reduced-motion
assets/js/main.js       preloader, nav, reveals, counters, clock, magnetic link
assets/video/hero.mp4   ← your Seedance film goes here (see SEEDANCE.md)
assets/img/hero-poster.jpg  ← optional still for slow connections
scripts/build_preview.py    inlines everything into dist/preview.html
SEEDANCE.md             ready-to-run Seedance 2.5 prompts for the hero film
```

## Run it

```bash
python3 -m http.server 8000    # then open http://localhost:8000
```

## Drop in the hero film

Render one of the prompts in `SEEDANCE.md`, save it to `assets/video/hero.mp4`, done —
the markup already points there. Until that file exists the hero shows an animated
gradient plate rather than a black box, so the page is never broken mid-build. Same for
`assets/img/hero-poster.jpg`, which is optional.

## Make it yours

Everything editable sits between the `CONTENT BLOCK` markers in `index.html`:
name, role line, six projects, four capabilities, four process steps, four stats,
the about copy, the quote, and the email address.

Two more things worth knowing:

- **Project stills.** The six work cards use CSS gradient placeholders (`.fig--1`
  … `.fig--6` in the stylesheet) dressed with corner ticks and timecodes so they read
  as film stills. To use real stills, drop images into `assets/img/` and replace the
  `background-image` on each `.fig--N .proj__frame` rule with `url(...)`.
- **Accent colour.** One token, `--ember`, at the top of the stylesheet. It is used
  sparingly on purpose — eyebrows, the availability dot, hover states, focus rings.
  Changing that single value re-tints the whole site coherently.

## Notes on the build

- **Accessible by default** — skip link, visible focus rings, `aria-expanded` on the
  menu, Escape to close, 44px minimum touch targets, text contrast above 4.5:1.
- **`prefers-reduced-motion` is fully honoured** — the preloader is removed entirely,
  the parallax and magnetic cursor are disabled, and every reveal renders in its
  final state rather than animating.
- **Degrades cleanly** — with JavaScript off the page is complete and readable; JS
  only adds motion. Reveal animations are IntersectionObserver-based with a
  no-observer fallback that simply shows everything.
- **The footer clock reads the visitor's own timezone** via `Intl`, so it is correct
  for whoever is looking at it rather than hardcoded to one city.

## Preview build

`python3 scripts/build_preview.py` inlines the CSS and JS into `dist/preview.html`
for hosts that want a single self-contained file. `index.html` stays the source of
truth — never hand-edit the generated file.
