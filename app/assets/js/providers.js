/* ==========================================================================
   providers.js — one interface, every API.

   Three shapes cover the whole field:
     openai   — /chat/completions, SSE deltas   (OpenAI, Groq, Mistral,
                DeepSeek, xAI, OpenRouter, Ollama, anything compatible)
     anthropic— /messages, typed SSE events
     google   — :streamGenerateContent?alt=sse

   Requests go from the browser straight to the provider. No server, no relay.
   ========================================================================== */
(function (global) {
  'use strict';

  var LIST = [
    {
      id: 'anthropic', name: 'Anthropic', dot: '#D97757', kind: 'anthropic',
      base: 'https://api.anthropic.com/v1',
      keyUrl: 'https://console.anthropic.com/settings/keys',
      hint: 'Claude. Keys start with sk-ant-.',
      seeds: ['claude-opus-5', 'claude-sonnet-5', 'claude-fable-5-1', 'claude-haiku-4-5-20251001']
    },
    {
      id: 'openai', name: 'OpenAI', dot: '#10A37F', kind: 'openai',
      base: 'https://api.openai.com/v1',
      keyUrl: 'https://platform.openai.com/api-keys',
      hint: 'GPT and o-series. Keys start with sk-.',
      seeds: ['gpt-5', 'gpt-5-mini', 'gpt-4.1', 'gpt-4o', 'gpt-4o-mini', 'o3']
    },
    {
      id: 'google', name: 'Google', dot: '#4285F4', kind: 'google',
      base: 'https://generativelanguage.googleapis.com/v1beta',
      keyUrl: 'https://aistudio.google.com/apikey',
      hint: 'Gemini, via AI Studio. Generous free tier.',
      seeds: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash']
    },
    {
      id: 'openrouter', name: 'OpenRouter', dot: '#8B7CF6', kind: 'openai',
      base: 'https://openrouter.ai/api/v1',
      keyUrl: 'https://openrouter.ai/keys',
      hint: 'One key, hundreds of models from every lab. The easy way in.',
      seeds: [], publicModels: true
    },
    {
      id: 'groq', name: 'Groq', dot: '#F55036', kind: 'openai',
      base: 'https://api.groq.com/openai/v1',
      keyUrl: 'https://console.groq.com/keys',
      hint: 'Open models, absurdly fast.',
      seeds: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant']
    },
    {
      id: 'mistral', name: 'Mistral', dot: '#FA520F', kind: 'openai',
      base: 'https://api.mistral.ai/v1',
      keyUrl: 'https://console.mistral.ai/api-keys',
      hint: 'Mistral and Codestral.',
      seeds: ['mistral-large-latest', 'mistral-small-latest', 'codestral-latest']
    },
    {
      id: 'deepseek', name: 'DeepSeek', dot: '#4D6BFE', kind: 'openai',
      base: 'https://api.deepseek.com/v1',
      keyUrl: 'https://platform.deepseek.com/api_keys',
      hint: 'Cheap, strong at reasoning and code.',
      seeds: ['deepseek-chat', 'deepseek-reasoner']
    },
    {
      id: 'xai', name: 'xAI', dot: '#C8C8C8', kind: 'openai',
      base: 'https://api.x.ai/v1',
      keyUrl: 'https://console.x.ai',
      hint: 'Grok.',
      seeds: ['grok-4', 'grok-3', 'grok-3-mini']
    },
    {
      id: 'ollama', name: 'Ollama (local)', dot: '#22C55E', kind: 'openai',
      base: 'http://localhost:11434/v1', keyless: true, publicModels: true,
      keyUrl: 'https://ollama.com/download',
      hint: 'Models on your own machine. Start it with OLLAMA_ORIGINS=* so the browser may call it.',
      seeds: []
    }
  ];

  var BY_ID = {};
  LIST.forEach(function (p) { BY_ID[p.id] = p; });

  function get(id) { return BY_ID[id] || null; }

  function baseOf(p) { return (Store.bases()[p.id] || p.base).replace(/\/+$/, ''); }

  /* "anthropic/claude-sonnet-5" → { provider, model } — first slash wins, so
     OpenRouter ids like "openrouter/meta-llama/llama-3-70b" survive intact. */
  function split(ref) {
    var i = String(ref || '').indexOf('/');
    if (i < 0) return { provider: null, model: ref };
    return { provider: get(ref.slice(0, i)), model: ref.slice(i + 1) };
  }

  function label(ref) {
    var s = split(ref);
    return s.model || ref;
  }

  function models(id) {
    var p = get(id); if (!p) return [];
    var cached = Store.catalog()[id];
    if (cached && cached.length) return cached;
    return p.seeds || [];
  }

  /* ── low level ────────────────────────────────────────────────────── */
  function headers(p, key) {
    var h = { 'Content-Type': 'application/json' };
    if (p.kind === 'anthropic') {
      h['x-api-key'] = key;
      h['anthropic-version'] = '2023-06-01';
      h['anthropic-dangerous-direct-browser-access'] = 'true';
    } else if (p.kind === 'google') {
      h['x-goog-api-key'] = key;
    } else if (key) {
      h['Authorization'] = 'Bearer ' + key;
    }
    if (p.id === 'openrouter') {
      h['HTTP-Referer'] = location.origin;
      h['X-Title'] = 'Prism';
    }
    return h;
  }

  function friendly(err, p) {
    var msg = (err && err.message) || String(err);
    if (err && err.name === 'AbortError') return null;
    if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) {
      return 'Could not reach ' + p.name + '. Either the network is down, or the browser blocked ' +
        'the call (CORS). Run proxy.py and point this provider at it under Advanced in settings.';
    }
    return msg;
  }

  function explain(status, text, p) {
    var detail = text;
    try {
      var j = JSON.parse(text);
      detail = (j.error && (j.error.message || j.error.type)) || j.message ||
               (j[0] && j[0].error && j[0].error.message) || text;
    } catch (e) {}
    var extra = status === 401 ? ' — the key looks wrong or expired.'
              : status === 402 ? ' — the account is out of credit.'
              : status === 404 ? ' — that model id does not exist on this provider.'
              : status === 429 ? ' — rate limited, wait a moment.' : '';
    return new Error(p.name + ' ' + status + extra + (detail ? ' ' + String(detail).slice(0, 400) : ''));
  }

  async function fail(res, p) {
    var text = '';
    try { text = await res.text(); } catch (e) {}
    throw explain(res.status, text, p);
  }

  /* Providers disagree about their own dialect: reasoning models want
     max_completion_tokens instead of max_tokens, some refuse a temperature
     at all, some choke on stream_options. Rather than keep a table of which
     model wants what — which would be wrong within a month — read the
     rejection, adjust, and retry. What worked is remembered per model so the
     correction is paid for once per session. */
  var QUIRKS = {};

  function quirked(ref, body) {
    var q = QUIRKS[ref];
    if (!q) return body;
    if (q.maxCompletion && 'max_tokens' in body) {
      body.max_completion_tokens = body.max_tokens;
      delete body.max_tokens;
    }
    if (q.noTemperature) delete body.temperature;
    if (q.noStreamOptions) delete body.stream_options;
    return body;
  }

  function adapt(ref, body, text) {
    var t = String(text).toLowerCase(), q = QUIRKS[ref] || (QUIRKS[ref] = {});
    if ('max_tokens' in body && t.indexOf('max_completion_tokens') >= 0) { q.maxCompletion = true; }
    else if ('temperature' in body && t.indexOf('temperature') >= 0 &&
             /unsupported|not support|only the default|does not support/.test(t)) { q.noTemperature = true; }
    else if (body.stream_options && t.indexOf('stream_options') >= 0) { q.noStreamOptions = true; }
    else return null;
    return quirked(ref, body);
  }

  async function post(p, ref, key, url, body, signal) {
    for (var attempt = 0; ; attempt++) {
      var res;
      try {
        res = await fetch(url, {
          method: 'POST', headers: headers(p, key),
          body: JSON.stringify(quirked(ref, body)), signal: signal
        });
      } catch (e) {
        var f = friendly(e, p);
        if (f === null) throw e;
        throw new Error(f);
      }
      if (res.ok) return res;

      var text = '';
      try { text = await res.text(); } catch (e) {}
      var fixed = res.status === 400 && attempt < 3 ? adapt(ref, body, text) : null;
      if (!fixed) throw explain(res.status, text, p);
      body = fixed;
    }
  }

  /* Reads an SSE body line by line without buffering the whole response. */
  async function* sse(res) {
    var reader = res.body.getReader(), dec = new TextDecoder(), buf = '';
    for (;;) {
      var chunk = await reader.read();
      if (chunk.done) break;
      buf += dec.decode(chunk.value, { stream: true });
      var nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        var line = buf.slice(0, nl).replace(/\r$/, '');
        buf = buf.slice(nl + 1);
        if (line) yield line;
      }
    }
    if (buf.trim()) yield buf.trim();
  }

  /* ── request bodies ───────────────────────────────────────────────── */
  function bodyOpenAI(p, o) {
    var msgs = [];
    if (o.system) msgs.push({ role: 'system', content: o.system });
    o.messages.forEach(function (m) { msgs.push({ role: m.role, content: m.content }); });
    var body = {
      model: o.model, messages: msgs, stream: !!o.stream,
      temperature: o.temperature, max_tokens: o.maxTokens
    };
    if (o.stream && /^(openai|groq|openrouter|xai)$/.test(p.id)) {
      body.stream_options = { include_usage: true };
    }
    return body;
  }

  /* Anthropic and Google both require strictly alternating roles; an errored
     turn can leave two user messages back to back, so fold them together. */
  function merge(messages) {
    var out = [];
    messages.forEach(function (m) {
      var last = out[out.length - 1];
      if (last && last.role === m.role) last.content += '\n\n' + m.content;
      else out.push({ role: m.role, content: m.content });
    });
    return out;
  }

  function bodyAnthropic(p, o) {
    return {
      model: o.model,
      system: o.system || undefined,
      messages: merge(o.messages).map(function (m) {
        return { role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content };
      }),
      stream: !!o.stream,
      temperature: Math.min(o.temperature, 1),
      max_tokens: o.maxTokens || 4096
    };
  }

  function bodyGoogle(p, o) {
    return {
      contents: merge(o.messages).map(function (m) {
        return { role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] };
      }),
      systemInstruction: o.system ? { parts: [{ text: o.system }] } : undefined,
      generationConfig: { temperature: o.temperature, maxOutputTokens: o.maxTokens }
    };
  }

  function endpoint(p, o) {
    var b = baseOf(p);
    if (p.kind === 'anthropic') return b + '/messages';
    if (p.kind === 'google') {
      return b + '/models/' + encodeURIComponent(o.model) +
        (o.stream ? ':streamGenerateContent?alt=sse' : ':generateContent');
    }
    return b + '/chat/completions';
  }

  /* ── the one call the app makes ───────────────────────────────────── */
  /* run({ ref, messages, system, temperature, maxTokens, stream, signal,
           onText(delta), onThink(delta) }) → { text, thinking, usage } */
  async function run(o) {
    var s = split(o.ref), p = s.provider;
    if (!p) throw new Error('Unknown provider in "' + o.ref + '".');

    var key = Store.key(p.id);
    if (!key && !p.keyless) throw new Error('No API key for ' + p.name + '. Add one in settings.');

    var opts = {
      model: s.model, messages: o.messages, system: o.system,
      temperature: typeof o.temperature === 'number' ? o.temperature : 0.7,
      maxTokens: o.maxTokens || 4096, stream: o.stream !== false
    };
    var body = p.kind === 'anthropic' ? bodyAnthropic(p, opts)
             : p.kind === 'google' ? bodyGoogle(p, opts)
             : bodyOpenAI(p, opts);

    var res = await post(p, o.ref, key, endpoint(p, opts), body, o.signal);

    var text = '', thinking = '', usage = null;
    function pushText(d) { if (d) { text += d; o.onText && o.onText(d); } }
    function pushThink(d) { if (d) { thinking += d; o.onThink && o.onThink(d); } }

    /* non-streaming */
    if (!opts.stream) {
      var j = await res.json();
      if (p.kind === 'anthropic') {
        (j.content || []).forEach(function (b) {
          if (b.type === 'text') pushText(b.text);
          if (b.type === 'thinking') pushThink(b.thinking);
        });
        usage = j.usage && { in: j.usage.input_tokens, out: j.usage.output_tokens };
      } else if (p.kind === 'google') {
        var cand = (j.candidates || [])[0];
        ((cand && cand.content && cand.content.parts) || []).forEach(function (part) {
          if (part.text) pushText(part.text);
        });
        usage = j.usageMetadata &&
          { in: j.usageMetadata.promptTokenCount, out: j.usageMetadata.candidatesTokenCount };
      } else {
        var ch = (j.choices || [])[0];
        if (ch && ch.message) {
          pushThink(ch.message.reasoning_content || ch.message.reasoning || '');
          pushText(ch.message.content || '');
        }
        usage = j.usage && { in: j.usage.prompt_tokens, out: j.usage.completion_tokens };
      }
      return { text: text, thinking: thinking, usage: usage };
    }

    /* streaming */
    for await (var line of sse(res)) {
      if (line.indexOf('data:') !== 0) continue;
      var data = line.slice(5).trim();
      if (!data || data === '[DONE]') continue;

      var evt;
      try { evt = JSON.parse(data); } catch (e) { continue; }

      if (p.kind === 'anthropic') {
        if (evt.type === 'content_block_delta' && evt.delta) {
          if (evt.delta.type === 'thinking_delta') pushThink(evt.delta.thinking);
          else pushText(evt.delta.text || '');
        } else if (evt.type === 'message_start' && evt.message && evt.message.usage) {
          usage = { in: evt.message.usage.input_tokens, out: 0 };
        } else if (evt.type === 'message_delta' && evt.usage) {
          usage = { in: (usage && usage.in) || 0, out: evt.usage.output_tokens };
        } else if (evt.type === 'error') {
          throw new Error(p.name + ': ' + ((evt.error && evt.error.message) || 'stream error'));
        }
      } else if (p.kind === 'google') {
        var c = (evt.candidates || [])[0];
        ((c && c.content && c.content.parts) || []).forEach(function (part) {
          if (part.text) (part.thought ? pushThink : pushText)(part.text);
        });
        if (evt.usageMetadata) {
          usage = { in: evt.usageMetadata.promptTokenCount, out: evt.usageMetadata.candidatesTokenCount };
        }
      } else {
        if (evt.error) throw new Error(p.name + ': ' + (evt.error.message || 'stream error'));
        var d = ((evt.choices || [])[0] || {}).delta || {};
        pushThink(d.reasoning_content || d.reasoning || '');
        pushText(typeof d.content === 'string' ? d.content : '');
        if (evt.usage) usage = { in: evt.usage.prompt_tokens, out: evt.usage.completion_tokens };
      }
    }

    return { text: text, thinking: thinking, usage: usage };
  }

  /* ── catalogue ────────────────────────────────────────────────────── */
  async function refresh(id) {
    var p = get(id); if (!p) return [];
    var key = Store.key(id);
    if (!key && !p.keyless && !p.publicModels) throw new Error('Add a key first.');

    var b = baseOf(p);
    var url = p.kind === 'google' ? b + '/models?pageSize=200' : b + '/models';
    var res;
    try {
      res = await fetch(url, { headers: headers(p, key) });
    } catch (e) {
      var f = friendly(e, p); throw new Error(f || 'aborted');
    }
    if (!res.ok) await fail(res, p);

    var j = await res.json(), ids = [];
    if (p.kind === 'google') {
      (j.models || []).forEach(function (m) {
        var methods = m.supportedGenerationMethods || m.supportedActions || [];
        if (!methods.length || methods.indexOf('generateContent') >= 0) {
          ids.push(String(m.name || '').replace(/^models\//, ''));
        }
      });
    } else {
      (j.data || j.models || []).forEach(function (m) {
        var mid = m.id || m.name;
        if (mid && !/embed|whisper|tts|moderation|dall-e|image|rerank|guard/i.test(mid)) ids.push(mid);
      });
    }

    ids = ids.filter(Boolean).sort();
    Store.setCatalog(id, ids);
    return ids;
  }

  global.Providers = {
    list: LIST, get: get, split: split, label: label,
    models: models, refresh: refresh, run: run, baseOf: baseOf
  };
})(window);
