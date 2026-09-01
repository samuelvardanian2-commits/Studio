# Flythrough frames

Drop the extracted sequence here as `frame_0001.jpg`, `frame_0002.jpg`, …

`assets/js/flythrough.js` probes for `frame_0001.jpg` on load. If it is there the
scroll section scrubs your footage; if it is not, it renders the procedural corridor
instead. Set `SEQ.count` in that file to the number of frames you actually extracted.

See `SEEDANCE.md` → "Scroll flythrough" for the prompts and the ffmpeg command.
