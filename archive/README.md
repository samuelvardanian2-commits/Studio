# Archive

Frozen versions of the site, kept for reference. Nothing here is served or built —
`index.html` at the repository root is always the live site.

| File | What it is |
| --- | --- |
| `samuel-vardanian-portfolio.html` | The personal portfolio as it stood before the Claho Studio rebrand (September 2026). Self-contained — CSS and JS are inlined, so it opens on its own with no build step. |

Media (`assets/video/hero.mp4`, `assets/frames/`, `assets/img/`) is referenced from
the shared `assets/` directory one level up rather than duplicated, so the archive
picks up whatever footage the repository holds.

Do not hand-edit these files. To restore a version, copy it back over `index.html`
and split the inlined `<style>` / `<script>` blocks back out into `assets/`.
