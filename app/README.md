# Prism — every model, one room

One calm interface in front of every frontier model. You bring the keys, the
browser talks straight to the providers, and nothing passes through a server of
mine — because there is no server. Static HTML, CSS and JavaScript, **no build
step and no dependencies**, same as the site it sits next to.

```
app/index.html              markup and the icon sprite
app/assets/css/prism.css    tokens → shell → thread → composer → overlays
app/assets/js/store.js      localStorage: keys, chats, settings, catalogues
app/assets/js/markdown.js   Markdown renderer + syntax highlighter
app/assets/js/providers.js  one interface over three API shapes
app/assets/js/app.js        state, rendering, streaming, palette
app/proxy.py                optional CORS relay, standard library only
```

## Run it

```bash
python3 -m http.server 8000        # from the repository root
# then open http://localhost:8000/app/
```

Open it, paste one API key, start typing. It has to be served over `http://`
rather than opened as a file — a `file://` page has no origin, and the
providers refuse the call.

## What it does

- **Nine providers out of the box** — Anthropic, OpenAI, Google, OpenRouter,
  Groq, Mistral, DeepSeek, xAI, and Ollama running on your own machine.
  Anything else that speaks the OpenAI format works too: add it as a base URL
  override on any provider.
- **Compare mode** — one prompt, up to four models answering side by side in
  their own columns. Pin the answer you liked and the conversation carries that
  one forward, so you can bounce between models inside a single thread.
- **Streaming** with a live caret, latency and token count per answer, stop
  mid-flight, and re-run a single answer without re-running the others.
- **Reasoning blocks** when a model exposes them, folded away by default.
- **Model lists pulled from the provider.** The built-in list is a starting
  point that will age; *refresh* asks the provider what it actually serves
  today. Or paste any model id straight into the picker.
- **It negotiates the dialect for you.** Reasoning models reject
  `max_tokens` and want `max_completion_tokens`; some refuse a temperature
  outright. Rather than keep a table of which model wants what — wrong within a
  month — Prism reads the rejection, adjusts, retries, and remembers the
  correction for the rest of the session. You see an answer, not a 400.
- **Leaving a chat does not kill it.** Switch conversations mid-answer and the
  stream keeps writing into the one it started in; the finished answer is
  waiting when you come back.
- **Everything local** — conversations, keys and preferences live in this
  browser only. Export one chat or all of them as Markdown whenever.
- `⌘K` / `Ctrl+K` opens a palette for chats, models and commands.
  `⌘⇧O` starts a new chat. `Esc` closes whatever is open.

## About the keys

They are kept in `localStorage` and sent only to the provider whose call they
authorise. That is the honest trade for having no backend: anyone who can open
this browser profile can read them, and any extension you have installed can
too. So use keys scoped to this experiment, put a spending cap on them, and
don't do this on a shared machine. *Erase everything* in settings clears keys,
chats and preferences in one go.

If you want keys off the client entirely, that needs a small backend holding
them server-side with the browser calling your endpoint instead — a different
shape of project, and the provider layer here would barely change: one base URL
per provider, pointed at you.

## When the browser blocks a call

Some providers do not answer a browser's CORS preflight, and the call fails
before it leaves the machine. The error block says so when it happens. The fix
ships with the app:

```bash
python3 app/proxy.py            # 127.0.0.1:8787
```

It prints one base URL per provider. Paste the relevant one into
**Keys & settings → the provider → Advanced → base URL**. The relay copies your
auth headers through, streams the answer back unchanged, and stores nothing.
Anthropic, OpenAI, Google, OpenRouter and Groq generally work without it.

Ollama needs one thing: start it so it accepts calls from a browser page.

```bash
OLLAMA_ORIGINS='*' ollama serve
```

## Deploying it

It is static, so it goes anywhere the portfolio goes — Netlify, Vercel,
Cloudflare Pages, GitHub Pages, any bucket. Serve `app/` and you are done.
Each visitor supplies their own key and their own chat history stays in their
own browser, which means hosting it costs you nothing and exposes nothing.

## Making it yours

- **Accent.** `--ember` at the top of `prism.css`, one value, re-tints
  everything that marks a decision.
- **Providers.** The `LIST` array at the top of `providers.js` is the whole
  registry: id, colour, API shape, base URL, and a few seed model ids. Adding a
  provider that speaks the OpenAI format is one entry.
- **Starters.** The four cards on the empty screen are `data-p` attributes in
  `index.html`.
