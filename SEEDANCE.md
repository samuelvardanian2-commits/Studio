# Seedance 2.5 prompts

Two different jobs, two different structures:

- **[Hero film](#hero-film)** — the looping plate behind the name. Cuts are fine.
- **[Scroll flythrough](#scroll-flythrough)** — the 3D scroll section. **Cuts are fatal.**

---

# Hero film

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


---

# Scroll flythrough

The `.fly` section maps scroll position to a frame index. Scroll down, the camera
moves through space. That is where the "3D" comes from — the parallax is real, baked
in by a real camera move, not faked with CSS layers.

Until you drop frames in, the section runs a procedural corridor of film frames on
canvas, so it already works. These prompts replace it with your footage.

### The one rule that matters

**One unbroken take. No cuts.** A cut in the source becomes a jump-cut mid-scroll and
the illusion dies instantly. This is the opposite of the hero prompts above, which use
hard cuts on purpose — so do not reuse those here.

Four more that decide whether it works:

1. **Constant velocity.** Seedance likes to ease in and out. You do not want that —
   scroll position maps linearly to time, so any easing reads as the page stuttering.
   Say *constant speed, no acceleration, no easing* and say it in CONSTRAINTS too.
2. **The camera is the only thing moving.** A person walking through frame makes the
   scrub look like you are scrubbing a person, not flying through a space.
3. **No fades, no dips to black, no flares across centre frame.** Type sits over the
   middle third — keep it dark and low-detail.
4. **Forward travel beats everything else** for depth. Orbit is the strong second.

---

## FLY A — "The corridor" (recommended)

```
[STYLE PREFIX]

SUBJECT — No people. The subject is the movement itself: a continuous forward
travelling shot through a vast dark interior hung with suspended rectangular panels,
like film frames held in the air. WB 4300K. SINGLE UNBROKEN TAKE — no cuts.

LOCATION — Enormous unlit hall, no visible floor or ceiling, standing haze. Suspended
matte panels of varying size recede into darkness on both sides and above. STYLE
REFERENCE ONLY — the model extends the space indefinitely forward. Do not reproduce
the reference 1:1.

ACTION — the camera travels forward at one unchanging speed for the entire duration,
passing between and through the suspended panels. Nothing else in the scene moves.
0:00–0:05 — panels resolve out of the far darkness and begin to pass the lens.
0:05–0:10 — density increases; panels sweep past frame edges left, right and overhead.
0:10–0:15 — the corridor opens out; a warm light source grows ahead but never arrives.

CAMERA — one continuous forward dolly on a straight line, 35mm, camera height fixed,
no pan, no tilt, no roll, no stop. Constant speed from first frame to last.

STYLE — Dominant black and deep shadow 60% / Secondary cold indigo haze 30% /
Accent warm ember edge-light catching the panel edges 10%. WB 4300K.

CONSTRAINTS — 16:9. ONE CONTINUOUS TAKE — absolutely no cuts, no dissolves, no fades,
no dips to black. CONSTANT SPEED — no acceleration, no deceleration, no ease-in,
no ease-out. NO slow-motion. NO people, no text, no logos. Centre third of frame stays
dark and uncluttered for overlaid type. No lens flare across centre frame. NO eye glow.
```

## FLY B — "The orbit"

Scroll rotates the subject. Strong when you want one hero object rather than a journey.

```
[STYLE PREFIX]

SUBJECT — A single monolithic object at centre: a matte black rectangular slab,
human-scale ratio, standing upright in an empty space. No people. WB 4000K.
SINGLE UNBROKEN TAKE — no cuts.

LOCATION — Featureless dark void with a ground plane barely implied by contact shadow
and a low haze. STYLE REFERENCE ONLY; the model extends the space.

ACTION — the camera orbits the object through a full 360° at one unchanging speed.
The object itself never moves or rotates. Light rakes across its face as the angle
changes, which is the entire event.
0:00–0:05 — first third of the orbit, key light behind, object nearly in silhouette.
0:05–0:10 — second third, the face turns into the light and surface detail resolves.
0:10–0:15 — final third, returning to the exact starting angle for a seamless loop.

CAMERA — one continuous 360° orbit, 50mm, fixed height, fixed radius, subject locked
dead centre of frame throughout. Constant angular speed.

STYLE — Dominant black void 60% / Secondary cold rim light 30% / Accent warm ember
kicker on one edge 10%. WB 4000K.

CONSTRAINTS — 16:9. ONE CONTINUOUS TAKE — no cuts, no fades. CONSTANT angular speed —
no ease. Subject stays centred and the same size in frame for the whole orbit. Last
frame must match first frame exactly. NO people, no text, no logos. NO eye glow.
```

## FLY C — "The rise"

```
[STYLE PREFIX]

SUBJECT — No people. A continuous vertical camera rise from ground level to high
above a vast dark structure, revealing its scale. WB 4300K. SINGLE UNBROKEN TAKE.

LOCATION — Immense dark architectural structure, concrete and steel, extending beyond
frame in every direction, low haze pooling at the base. STYLE REFERENCE ONLY.

ACTION — the camera rises vertically at one unchanging speed for the entire duration.
0:00–0:05 — ground level, detail close and legible, haze thick.
0:05–0:10 — climbing past structure; scale begins to register.
0:10–0:15 — high above; the structure reads as a single enormous form.

CAMERA — one continuous vertical crane/drone rise, 28mm, lens held level with the
horizon throughout, no tilt, no pan, no rotation. Constant speed.

STYLE — Dominant near-black concrete 60% / Secondary cold blue haze 30% / Accent warm
ember practicals scattered through the structure 10%. WB 4300K.

CONSTRAINTS — 16:9. ONE CONTINUOUS TAKE — no cuts, no fades. CONSTANT rise speed —
no ease-in or ease-out. NO people, no text, no signage. Centre third stays dark for
overlaid type. NO eye glow.
```

---

## Getting it into the page

Scrub from a **canvas image sequence, not a `<video>` element** — iOS Safari will not
scrub video smoothly, it seeks in keyframe jumps and the effect falls apart on exactly
the devices where it matters most. The rig already does this; you just supply frames.

```bash
mkdir -p assets/frames
ffmpeg -i flythrough.mp4 -vf "fps=18,scale=1280:-2" -q:v 7 assets/frames/frame_%04d.jpg
```

That is the whole job — **there is nothing to configure.** The section finds
`frame_0001.jpg`, works out how many frames follow, switches backends and drops
the procedural corridor. Re-render at a different length and it just picks up the
new count; you never edit a number.

It finds the count by doubling until a frame 404s, then binary-searching the gap —
about 16 requests for a 180-frame sequence. Frames have to be contiguous from
`0001`, which is what the ffmpeg command above produces. If you would rather skip
the probe, set `count` to a number in the `SEQ` block at the top of
`assets/js/flythrough.js` and it is used as-is.

**Watch the weight.** This technique is genuinely heavy: 180 frames at 1280px is
roughly 9 MB. Budget guide —

| Frames | fps | Width | Rough total | Feels |
|---|---|---|---|---|
| 120 | 12 | 1280 | ~6 MB | Slightly steppy on fast scroll |
| 180 | 18 | 1280 | ~9 MB | Smooth — the sweet spot |
| 240 | 24 | 1600 | ~20 MB | Silky, too heavy for most sites |

Generate **10 seconds** and extract at 18fps for 180 frames. Frames load
progressively and the rig draws the nearest one it already has, so the section is
usable before the whole sequence has arrived.
