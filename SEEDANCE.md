# Hero film — Seedance 2.5 prompts

Three options for `assets/video/hero.mp4`. Generate **A** first; **B** and **C** are
alternates in the same grade so any of them drops straight in.

> **Prefix note.** The stock style prefix assumes a cast (skin detail, acting beats).
> A hero plate for this site is one backlit figure or none at all, so the prefix below
> is adapted: performance language is kept where a silhouette earns it and dropped
> where there is no face. Everything else is verbatim.

---

## Asset registry

| Tag | Definition |
|---|---|
| `@figure` | Lone human-scale silhouette, 1.85m, long dark coat, no visible face, backlit throughout |
| `@hall` | Vast empty interior — concrete, high windows, standing haze, no signage, no furniture |
| `@gate` | Super-macro film-projector gate: sprockets, pressure plate, moving 35mm frame line |

---

## Style prefix — prepend verbatim to every prompt

```
Style: 8K cinematic. Photorealistic — no 3D render, no game engine, no game-cutscene aesthetic.
Cinematography: naturalistic master cinematography.
Lighting: Natural light only — contre-jour backlight, camera on shadow side, atmospheric haze. Key light from sky and windows only.
Color: 60:30:10 — dominant / secondary / accent.
Camera: Physical cine lens. 180° shutter motion blur.
Physics: Gravity and inertia respected — mass has real weight, correct contact shadows. No floating props.
Composition: Rule of thirds + golden ratio.
Continuity: Environment, haze density and light direction identical across every cut. No identity drift.
Technical: 24fps smooth motion. 8K detail. No jitter.
Audio: Environmental SFX only. No music. No subtitles.
```

---

## HERO A — "Contre-jour" (recommended)

```
[STYLE PREFIX]

SUBJECT — @figure (matches input 100%), a lone human-scale silhouette, 1.85m, long dark
coat, face never legible — always backlit, always turned away or in profile-shadow.
No other people. WB 4300K. MULTISHOT — the beat is arrival into an enormous empty room.

LOCATION — @hall is a STYLE REFERENCE ONLY, not a fixed keyframe. Vast derelict concrete
interior, ceiling out of frame, tall industrial windows down one wall throwing hard shafts
through standing haze. The model may freely extend the world; the figure moves through
space and is NOT pinned to the input frame. Do not reproduce the reference 1:1.

ACTION — a slow, unhurried walk toward a source of warm light that is never fully revealed.
SHOT 1 (0:00–0:05) — Wide. @figure enters from frame left in deep silhouette, walking
  slowly across the light shafts; dust turns visibly in the beams as the body passes
  through them. Hard cut.
SHOT 2 (0:05–0:10) — Closer, from behind, over the shoulder at hip height. Coat hem and
  shoulders catch a thin ember rim. Haze thickens toward the far light source. Hard cut.
SHOT 3 (0:10–0:15) — Back to the opening wide, identical framing, identical haze density,
  @figure at the same mark as frame one, still walking. Hard cut.

CAMERA — SHOT 1: locked-off wide, 32mm, camera on the shadow side, no move — the room does
  the work. SHOT 2: 50mm, slow dolly-in on rails, eye-level dropped to hip height so the
  ceiling reads as infinite. SHOT 3: return to the SHOT 1 lens, position and height exactly,
  so the last frame can cut back to the first invisibly.

STYLE — Dominant near-black concrete and shadow 60% / Secondary cold blue window light,
deep indigo haze 30% / Accent warm ember orange rim and distant practical 10%. WB 4300K:
cold daylight through the windows, one warm practical far off-screen right.

CONSTRAINTS — 16:9. NO slow-motion. NO camera shake. Face NEVER legible — no eyes, no
features, silhouette only. No text, no signage, no logos, no captions anywhere in frame.
No lens flare across the centre of frame — the middle third stays clean and dark so
overlaid type stays readable. First frame and last frame must match in framing, haze
density and light direction for a seamless loop. NO eye glow.
```

---

## HERO B — "Empty room" (no cast)

```
[STYLE PREFIX]

SUBJECT — No people. The subject is the air itself: standing haze, drifting dust, and the
slow travel of a single shaft of light across a concrete wall. WB 4300K. MULTISHOT — the
beat is a room breathing while nobody is in it.

LOCATION — @hall is a STYLE REFERENCE ONLY, not a fixed keyframe. Vast empty concrete
interior, tall windows out of frame throwing one hard shaft. The model may freely extend
the world. Do not reproduce the reference 1:1.

ACTION — nothing "happens"; the light moves and the dust answers it.
SHOT 1 (0:00–0:06) — Wide on a bare concrete wall, one hard light shaft falling across it
  at a steep angle. Dust turns slowly through the beam. Hard cut.
SHOT 2 (0:06–0:11) — Super-macro on airborne dust particles crossing the beam, shallow
  focus, particles drifting in and out of the focal plane. Hard cut.
SHOT 3 (0:11–0:15) — Return to the SHOT 1 wide, identical framing, the shaft in the same
  position as frame one. Hard cut.

CAMERA — SHOT 1: locked-off, 40mm, dead level. SHOT 2: 100mm macro, tiny handheld float,
  no shake. SHOT 3: SHOT 1 lens and position exactly, for the loop.

STYLE — Dominant black and raw concrete 60% / Secondary cold blue-grey daylight 30% /
Accent warm ember bounce at the base of the wall 10%. WB 4300K.

CONSTRAINTS — 16:9. NO slow-motion. NO people, no props, no text, no signage. Centre third
of frame stays dark and low-detail for overlaid type. First and last frame must match for a
seamless loop. NO eye glow.
```

---

## HERO C — "The gate" (macro mechanism)

```
[STYLE PREFIX]

SUBJECT — @gate (matches input 100%): the gate of a working 35mm film projector in
super-macro — sprocket teeth, pressure plate, the frame line stepping past the aperture.
No people. WB 3200K. MULTISHOT — the beat is a machine doing the oldest trick in cinema.

LOCATION — Dark projection booth, the only light is the lamp behind the gate spilling
through the film. STYLE REFERENCE ONLY — the model may extend the booth freely.

ACTION — one full mechanical cycle, repeating.
SHOT 1 (0:00–0:05) — Super-macro on sprocket teeth engaging perforations, film stepping
  frame by frame with real mechanical weight. Hard cut.
SHOT 2 (0:05–0:10) — Macro past the gate into the lamp: the beam blooms through the
  emulsion, grain and dust visible inside the light. Hard cut.
SHOT 3 (0:10–0:15) — Return to SHOT 1 framing exactly, same sprocket phase as frame one.
  Hard cut.

CAMERA — SHOT 1: 100mm macro, locked-off, extreme shallow focus. SHOT 2: same lens, tiny
  push toward the lamp. SHOT 3: SHOT 1 exactly, for the loop.

STYLE — Dominant black booth and metal 60% / Secondary warm tungsten lamp bloom 30% /
Accent cold blue edge on the machined parts 10%. WB 3200K.

CONSTRAINTS — 16:9. NO slow-motion. Mechanism must move with correct mechanical weight and
inertia — no floating, no smearing. No text, no logos, no brand marks on the machine.
First and last frame must match sprocket phase for a seamless loop. NO eye glow.
```

---

## Export and drop-in

1. Render **16:9, 1920×1080** (2560×1440 if you want retina headroom).
2. Encode H.264 MP4, **no audio track**, CRF ~24. Target under ~6 MB — it is a background
   plate behind type, not the deliverable. Trim on a matching frame so the loop is invisible.
3. Save as `assets/video/hero.mp4`.
4. Optional: export one frame as `assets/img/hero-poster.jpg` (quality 70). It is what
   shows on slow connections before the film arrives.

Nothing else to change. The markup already points at both paths, and the page falls back
to the animated gradient — not a black box — for as long as either file is missing.
