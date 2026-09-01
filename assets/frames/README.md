# Flythrough frames

Drop the extracted sequence here as `frame_0001.jpg`, `frame_0002.jpg`, …

`assets/js/flythrough.js` probes for `frame_0001.jpg` on load. If it is there the
scroll section scrubs your footage; if it is not, it renders the procedural corridor
instead.

The frame count is worked out automatically — nothing to configure, and re-rendering
at a different length needs no code change. Frames must be contiguous from `0001`.

See `SEEDANCE.md` → "Scroll flythrough" for the prompts and the ffmpeg command.
