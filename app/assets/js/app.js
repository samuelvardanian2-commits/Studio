/* ==========================================================================
   app.js — the room itself.
   State lives in one object, the DOM is rebuilt from it, and the only thing
   that updates out of band is the token stream, which writes straight into
   the run it belongs to.
   ========================================================================== */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = MD.escape;

  var S = {
    settings: Store.settings(),
    chat: null,
    mode: 'chat',
    models: [],
    busy: false,
    aborts: [],
    picker: { slot: 0, anchor: null, cursor: 0, items: [] },
    stick: true
  };

  /* ── chrome helpers ───────────────────────────────────────────────── */
  function toast(msg, bad) {
    var t = document.createElement('div');
    t.className = 'toast' + (bad ? ' toast--bad' : '');
    t.textContent = msg;
    $('#toasts').appendChild(t);
    setTimeout(function () { t.remove(); }, bad ? 6000 : 2600);
  }

  function icon(name) {
    return '<svg class="ico" aria-hidden="true"><use href="#i-' + name + '"></use></svg>';
  }

  function theme(next) {
    var t = next || (document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    document.documentElement.dataset.theme = t;
    S.settings = Store.setSetting('theme', t);
    var use = $('#btn-theme .ico use');
    if (use) use.setAttribute('href', t === 'dark' ? '#i-moon' : '#i-sun');
  }

  function when(ts) {
    var d = new Date(ts), now = new Date();
    var day = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    if (ts >= day) return 'Today';
    if (ts >= day - 864e5) return 'Yesterday';
    if (ts >= day - 6 * 864e5) return 'Previous 7 days';
    return d.getFullYear() === now.getFullYear()
      ? d.toLocaleDateString(undefined, { month: 'long' })
      : String(d.getFullYear());
  }

  /* ── chats ────────────────────────────────────────────────────────── */
  function blankChat() {
    return {
      id: Store.uid(), title: 'New chat', createdAt: Date.now(), updatedAt: Date.now(),
      messages: [], models: S.models.slice(), mode: S.mode
    };
  }

  function newChat(focus) {
    S.chat = blankChat();
    renderAll();
    if (focus !== false) $('#composer-input').focus();
  }

  function openChat(id) {
    var c = Store.chat(id);
    if (!c) return;
    S.chat = c;
    if (c.models && c.models.length) S.models = c.models.slice();
    if (c.mode) setMode(c.mode, true);
    renderAll();
    closeRailOnMobile();
  }

  function persist(chat) {
    chat = chat || S.chat;
    if (!chat || !chat.messages.length) return;
    if (chat === S.chat) { chat.models = S.models.slice(); chat.mode = S.mode; }
    Store.upsert(chat);
    renderRail();
  }

  function history(upto) {
    var out = [];
    for (var i = 0; i < upto; i++) {
      var m = S.chat.messages[i];
      if (m.role === 'user') out.push({ role: 'user', content: m.content });
      else {
        var r = m.runs[m.pick || 0];
        if (r && r.text) out.push({ role: 'assistant', content: r.text });
      }
    }
    return out;
  }

  /* ── rail ─────────────────────────────────────────────────────────── */
  function renderRail() {
    var q = ($('#chat-search').value || '').toLowerCase().trim();
    var list = Store.chats().filter(function (c) {
      if (!q) return true;
      if (c.title.toLowerCase().indexOf(q) >= 0) return true;
      return c.messages.some(function (m) {
        return m.role === 'user' && m.content.toLowerCase().indexOf(q) >= 0;
      });
    });

    var host = $('#chats');
    if (!list.length) {
      host.innerHTML = '<p class="chats__empty">' + (q ? 'Nothing matches.' : 'No conversations yet.') + '</p>';
      return;
    }

    var html = '', group = '';
    list.forEach(function (c) {
      var g = when(c.updatedAt);
      if (g !== group) { group = g; html += '<div class="chats__group">' + esc(g) + '</div>'; }
      html += '<div class="chat-item' + (S.chat && S.chat.id === c.id ? ' is-on' : '') +
        '" data-open="' + c.id + '" role="button" tabindex="0">' +
        '<span class="chat-item__tick"></span>' +
        '<span class="chat-item__label">' + esc(c.title) + '</span>' +
        '<button class="chat-item__kill" data-kill="' + c.id + '" aria-label="Delete conversation">' +
        icon('trash') + '</button></div>';
    });
    host.innerHTML = html;
  }

  /* ── topbar models ────────────────────────────────────────────────── */
  function modelChip(ref, slot) {
    var p = Providers.split(ref).provider;
    return '<button class="mchip" data-slot="' + slot + '">' +
      '<span class="mchip__dot" style="background:' + (p ? p.dot : '#888') + '"></span>' +
      '<span class="mchip__name">' + esc(Providers.label(ref)) + '</span>' +
      (S.mode === 'compare' && S.models.length > 1
        ? '<span class="mchip__x" data-drop="' + slot + '" role="button" aria-label="Remove model">' +
          icon('x') + '</span>' : icon('chev')) +
      '</button>';
  }

  function renderModels() {
    var html = S.models.map(modelChip).join('');
    if (S.mode === 'compare' && S.models.length < 4) {
      html += '<button class="mchip mchip--add" data-slot="' + S.models.length + '">' +
        icon('plus') + '<span class="mchip__name">Add model</span></button>';
    }
    $('#topbar-models').innerHTML = html;

    var chips = [];
    if (S.settings.system) chips.push('<button class="mchip" data-open-tune><span class="mchip__dot" ' +
      'style="background:var(--ember)"></span><span class="mchip__name">System prompt set</span></button>');
    if (Math.abs(S.settings.temperature - 0.7) > 0.001) {
      chips.push('<button class="mchip" data-open-tune><span class="mchip__name mono">temp ' +
        S.settings.temperature + '</span></button>');
    }
    $('#composer-chips').innerHTML = chips.join('');
  }

  function setMode(mode, quiet) {
    S.mode = mode;
    $('#mode-chat').classList.toggle('is-on', mode === 'chat');
    $('#mode-compare').classList.toggle('is-on', mode === 'compare');
    $('#mode-chat').setAttribute('aria-selected', String(mode === 'chat'));
    $('#mode-compare').setAttribute('aria-selected', String(mode === 'compare'));
    document.body.classList.toggle('mode-compare', mode === 'compare');

    if (mode === 'compare' && S.models.length < 2) {
      var extra = suggestSecond();
      if (extra) S.models.push(extra);
    }
    if (mode === 'chat') S.models = S.models.slice(0, 1);
    Store.setSetting('models', S.models);
    if (!quiet) Store.setSetting('mode', mode);
    S.settings = Store.settings();
    renderModels();
    renderThread();
  }

  function suggestSecond() {
    var have = S.models[0];
    var pool = [];
    Providers.list.forEach(function (p) {
      if (!Store.key(p.id) && !p.keyless) return;
      var ids = Providers.models(p.id);
      if (ids.length) pool.push(p.id + '/' + ids[0]);
    });
    for (var i = 0; i < pool.length; i++) if (pool[i] !== have) return pool[i];
    return null;
  }

  /* ── thread ───────────────────────────────────────────────────────── */
  function runHTML(run, mi, ri, pick) {
    var p = Providers.split(run.ref).provider;
    var meta = [];
    if (run.ms) meta.push((run.ms / 1000).toFixed(1) + 's');
    if (run.usage && run.usage.out) meta.push(run.usage.out + ' tok');

    var acts = '<span class="run__acts">';
    if (S.mode === 'compare') {
      acts += '<button class="act' + (pick ? ' is-done' : '') + '" data-act="pick" data-mi="' + mi +
        '" data-ri="' + ri + '" title="Carry this answer into the next turn">' + icon('pin') + '</button>';
    }
    acts += '<button class="act" data-act="copy" data-mi="' + mi + '" data-ri="' + ri +
      '" title="Copy">' + icon('copy') + '</button>' +
      '<button class="act" data-act="retry" data-mi="' + mi + '" data-ri="' + ri +
      '" title="Run again">' + icon('redo') + '</button></span>';

    var body;
    if (run.error) {
      body = '<div class="run__error">' + icon('warn') + '<div><b>That call failed.</b><br>' +
        '<code>' + esc(run.error) + '</code><br>' +
        '<button data-act="retry" data-mi="' + mi + '" data-ri="' + ri + '">Try again</button>' +
        '</div></div>';
    } else if (!run.text && !run.done) {
      body = '<div class="skeleton"><i></i><i></i><i></i></div>';
    } else {
      body = MD.render(run.text);
    }

    var think = '';
    if (run.thinking && S.settings.showThinking) {
      think = '<details class="thinking"><summary>' + icon('chev') + 'Reasoning</summary>' +
        '<div class="thinking__text">' + esc(run.thinking) + '</div></details>';
    }

    return '<article class="run' + (pick ? ' is-pick' : '') + '" data-mi="' + mi + '" data-ri="' + ri + '">' +
      '<header class="run__head">' +
      '<span class="run__dot" style="background:' + (p ? p.dot : '#888') + '"></span>' +
      '<span class="run__model">' + esc(Providers.label(run.ref)) + '</span>' +
      '<span class="run__meta">' + esc(meta.join(' · ')) + '</span>' + acts + '</header>' +
      '<div class="run__think">' + think + '</div>' +
      '<div class="run__body md' + (run.live ? ' is-live' : '') + '">' + body + '</div></article>';
  }

  function turnHTML(m, mi) {
    if (m.role === 'user') {
      return '<div class="turn turn--user" data-mi="' + mi + '"><div class="bubble">' +
        esc(m.content) + '</div></div>';
    }
    var cols = Math.max(1, m.runs.length);
    return '<div class="turn turn--ai" data-mi="' + mi + '"><div class="runs" style="--cols:' + cols + '">' +
      m.runs.map(function (r, ri) { return runHTML(r, mi, ri, m.runs.length > 1 && (m.pick || 0) === ri); }).join('') +
      '</div></div>';
  }

  function renderThread() {
    var msgs = (S.chat && S.chat.messages) || [];
    $('#thread').innerHTML = msgs.map(turnHTML).join('');
    $('#hello').hidden = msgs.length > 0;
    $('#btn-export').style.visibility = msgs.length ? '' : 'hidden';
  }

  function renderAll() { renderRail(); renderModels(); renderThread(); scrollDown(true); }

  function scrollDown(force) {
    var sc = $('#scroller');
    if (force || S.stick) sc.scrollTop = sc.scrollHeight;
  }

  /* ── sending ──────────────────────────────────────────────────────── */
  function send(text) {
    text = (text || '').trim();
    if (!text || S.busy) return;
    if (!S.models.length) { openSettings(); return toast('Pick a model first.', true); }

    var missing = S.models.filter(function (ref) {
      var p = Providers.split(ref).provider;
      return p && !p.keyless && !Store.key(p.id);
    });
    if (missing.length === S.models.length) {
      openSettings();
      return toast('Add an API key to start.', true);
    }

    if (!S.chat) S.chat = blankChat();
    if (!S.chat.messages.length) S.chat.title = text.replace(/\s+/g, ' ').slice(0, 52);

    S.chat.messages.push({ id: Store.uid(), role: 'user', content: text });
    var ai = {
      id: Store.uid(), role: 'assistant', pick: 0,
      runs: S.models.map(function (ref) {
        return { ref: ref, text: '', thinking: '', live: true, done: false };
      })
    };
    S.chat.messages.push(ai);

    var input = $('#composer-input');
    input.value = ''; autosize(input); updateSend();
    S.stick = true;
    renderThread(); scrollDown(true); persist();

    var mi = S.chat.messages.length - 1;
    var hist = history(mi - 1).concat([{ role: 'user', content: text }]);
    fire(mi, hist);
  }

  function fire(mi, hist) {
    var chat = S.chat, msg = chat.messages[mi];
    setBusy(true);
    var jobs = msg.runs.map(function (run, ri) { return one(mi, ri, hist); });
    Promise.all(jobs).then(function () {
      setBusy(false);
      msg.runs.forEach(function (r) { r.live = false; r.done = true; });
      persist(chat);
    });
  }

  function one(mi, ri, hist) {
    var chat = S.chat, msg = chat.messages[mi], run = msg.runs[ri];
    var ctl = new AbortController();
    S.aborts.push(ctl);

    run.text = ''; run.thinking = ''; run.error = null; run.live = true; run.done = false;
    var t0 = performance.now(), timer = 0, last = 0;

    function node() {
      return S.chat === chat ? $('.run[data-mi="' + mi + '"][data-ri="' + ri + '"]') : null;
    }
    function paint() {
      timer = 0; last = Date.now();
      var n = node(); if (!n) return;
      var body = $('.run__body', n);
      body.innerHTML = MD.render(run.text);
      body.classList.toggle('is-live', !!run.live);
      if (run.thinking && S.settings.showThinking) {
        var t = $('.run__think', n);
        if (!$('.thinking', t)) {
          t.innerHTML = '<details class="thinking"><summary>' + icon('chev') +
            'Reasoning</summary><div class="thinking__text"></div></details>';
        }
        $('.thinking__text', t).textContent = run.thinking;
      }
      scrollDown();
    }
    function schedule() {
      if (timer) return;
      timer = setTimeout(paint, Math.max(0, 70 - (Date.now() - last)));
    }

    return Providers.run({
      ref: run.ref,
      messages: hist,
      system: S.settings.system,
      temperature: S.settings.temperature,
      maxTokens: S.settings.maxTokens,
      stream: S.settings.stream,
      signal: ctl.signal,
      onText: function (d) { run.text += d; schedule(); },
      onThink: function (d) { run.thinking += d; schedule(); }
    }).then(function (res) {
      run.usage = res.usage;
    }).catch(function (err) {
      if (err && err.name === 'AbortError') { run.text += run.text ? '\n\n_(stopped)_' : '_(stopped)_'; }
      else run.error = (err && err.message) || String(err);
    }).then(function () {
      clearTimeout(timer); timer = 0;
      run.ms = performance.now() - t0;
      run.live = false; run.done = true;
      var n = node();
      if (n) n.outerHTML = runHTML(run, mi, ri, msg.runs.length > 1 && (msg.pick || 0) === ri);
      scrollDown();
      persist(chat);
    });
  }

  function setBusy(on) {
    S.busy = on;
    $('#stopbar').hidden = !on;
    if (!on) S.aborts = [];
    updateSend();
  }

  function stop() {
    S.aborts.forEach(function (c) { try { c.abort(); } catch (e) {} });
    S.aborts = [];
    setBusy(false);
  }

  function retry(mi, ri) {
    if (S.busy) return toast('Still answering — stop that first.', true);
    var hist = history(mi);
    setBusy(true);
    one(mi, ri, hist).then(function () { setBusy(false); });
  }

  /* ── composer ─────────────────────────────────────────────────────── */
  function autosize(t) {
    t.style.height = 'auto';
    t.style.height = Math.min(t.scrollHeight, window.innerHeight * 0.38) + 'px';
  }

  function updateSend() {
    var v = $('#composer-input').value.trim();
    var btn = $('#btn-send');
    btn.disabled = !v || S.busy;
    btn.classList.toggle('is-hot', !!v && !S.busy);
    var n = $('#composer-input').value.length;
    $('#char-count').textContent = n > 600 ? n.toLocaleString() : '';
  }

  /* ── model picker ─────────────────────────────────────────────────── */
  function place(pop, anchor) {
    pop.hidden = false;
    var r = anchor.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
    var left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8);
    var top = r.bottom + 8;
    if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 8);
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
  }

  function pickerItems(q) {
    q = (q || '').toLowerCase();
    var items = [];
    /* providers you can actually call come first */
    var ordered = Providers.list.slice().sort(function (a, b) {
      var ka = a.keyless || Store.key(a.id) ? 0 : 1;
      var kb = b.keyless || Store.key(b.id) ? 0 : 1;
      return ka - kb;
    });
    ordered.forEach(function (p) {
      var ids = Providers.models(p.id);
      var locked = !p.keyless && !Store.key(p.id);
      items.push({ group: p, locked: locked });
      ids.forEach(function (id) {
        var ref = p.id + '/' + id;
        if (q && (p.name + ' ' + id).toLowerCase().indexOf(q) < 0) return;
        items.push({ ref: ref, id: id, p: p, locked: locked });
      });
    });
    // drop groups with no visible models when filtering
    return items.filter(function (it, i) {
      if (!it.group) return true;
      var next = items[i + 1];
      return next && !next.group;
    });
  }

  function renderPicker(q) {
    var items = pickerItems(q);
    S.picker.items = items.filter(function (i) { return !i.group; });
    var cur = S.models[S.picker.slot], n = -1;
    var html = items.map(function (it) {
      if (it.group) {
        var p = it.group;
        return '<div class="pop__group"><span style="color:' + p.dot + '">&#9679;</span>' + esc(p.name) +
          (it.locked ? ' — no key' : '') +
          '<button data-refresh="' + p.id + '">refresh</button></div>';
      }
      n++;
      return '<button class="opt' + (it.locked ? ' opt--locked' : '') + (n === S.picker.cursor ? ' is-cursor' : '') +
        '" data-ref="' + esc(it.ref) + '">' +
        '<span class="opt__dot" style="background:' + it.p.dot + '"></span>' +
        '<span class="opt__id">' + esc(it.id) + '</span>' +
        (it.ref === cur ? icon('check') : '') + '</button>';
    }).join('');

    $('#model-list').innerHTML = html ||
      '<p class="chats__empty">No match. Paste a model id below, or refresh a provider.</p>';
  }

  function openPicker(anchor, slot) {
    S.picker.slot = slot; S.picker.anchor = anchor; S.picker.cursor = 0;
    $('#model-search').value = '';
    renderPicker('');
    place($('#pop-models'), anchor);
    $('#model-search').focus();
  }

  function choose(ref) {
    var p = Providers.split(ref).provider;
    if (!p) return;
    if (S.models.indexOf(ref) >= 0 && S.models[S.picker.slot] !== ref && S.mode === 'compare') {
      return toast('Already in the comparison.', true);
    }
    S.models[S.picker.slot] = ref;
    S.models = S.models.filter(Boolean);
    Store.setSetting('models', S.models);
    $('#pop-models').hidden = true;
    renderModels();
    if (!p.keyless && !Store.key(p.id)) toast(p.name + ' has no key yet — add one in settings.', true);
  }

  /* ── settings ─────────────────────────────────────────────────────── */
  function renderProviders() {
    var bases = Store.bases();
    $('#providers').innerHTML = Providers.list.map(function (p) {
      var key = Store.key(p.id), n = Providers.models(p.id).length;
      var state = p.keyless ? 'local' : key ? 'key set' : 'no key';
      var cls = p.keyless ? '' : key ? ' is-ok' : '';
      return '<div class="prov" data-prov="' + p.id + '">' +
        '<div class="prov__top"><span class="prov__dot" style="background:' + p.dot + '"></span>' +
        '<span class="prov__name">' + esc(p.name) + '</span>' +
        '<span class="prov__count mono">' + n + ' models</span>' +
        '<span class="prov__state' + cls + '">' + state + '</span></div>' +
        (p.keyless ? '' :
          '<div class="prov__row"><input type="password" placeholder="Paste API key" ' +
          'autocomplete="off" spellcheck="false" data-key="' + p.id + '" value="' + esc(key) + '">' +
          '<button class="icon-btn" data-reveal="' + p.id + '" aria-label="Show key">' + icon('eye') + '</button>' +
          '<button class="btn btn--ghost" data-fetch="' + p.id + '">Models</button></div>') +
        '<p class="prov__hint">' + esc(p.hint) +
        (p.keyUrl ? ' <a href="' + p.keyUrl + '" target="_blank" rel="noopener">Get a key &#8599;</a>' : '') +
        '</p>' +
        '<details class="prov__adv"><summary>Advanced — base URL</summary>' +
        '<div class="prov__row"><input type="text" spellcheck="false" data-base="' + p.id + '" ' +
        'placeholder="' + esc(p.base) + '" value="' + esc(bases[p.id] || '') + '"></div></details>' +
        '</div>';
    }).join('');

    var kb = (Store.bytes() / 1024).toFixed(0);
    $('#storage-stat').textContent = Store.chats().length + ' chats · ' + kb + ' KB in this browser';
    $('#keys-warn').hidden = Object.keys(Store.keys()).length > 0;
  }

  function closeSettings() {
    $('#overlay').hidden = true;
    if (S.lastFocus && S.lastFocus.focus) S.lastFocus.focus();
    S.lastFocus = null;
  }

  function openSettings() {
    S.lastFocus = document.activeElement;
    renderProviders();
    $('#pref-stream').checked = S.settings.stream;
    $('#pref-thinking').checked = S.settings.showThinking;
    $('#pref-enter').checked = S.settings.enterSends;
    $('#overlay').hidden = false;
    var first = $('#providers input');
    if (first) first.focus();
  }

  /* ── export ───────────────────────────────────────────────────────── */
  function toMarkdown(chat) {
    var out = ['# ' + chat.title, '', '_' + new Date(chat.createdAt).toLocaleString() + '_', ''];
    chat.messages.forEach(function (m) {
      if (m.role === 'user') out.push('## You', '', m.content, '');
      else m.runs.forEach(function (r) {
        out.push('## ' + Providers.label(r.ref), '', r.error ? '> error: ' + r.error : r.text, '');
      });
    });
    return out.join('\n');
  }

  function download(name, text) {
    var url = URL.createObjectURL(new Blob([text], { type: 'text/markdown' }));
    var a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ── command palette ──────────────────────────────────────────────── */
  var CMDS = [
    { label: 'New chat', run: function () { newChat(); } },
    { label: 'Compare models side by side', run: function () { setMode('compare'); } },
    { label: 'Back to single chat', run: function () { setMode('chat'); } },
    { label: 'Keys & settings', run: openSettings },
    { label: 'Toggle theme', run: function () { theme(); } },
    {
      label: 'Export this conversation', run: function () {
        if (S.chat && S.chat.messages.length) download(S.chat.title.slice(0, 40) + '.md', toMarkdown(S.chat));
      }
    }
  ];

  function renderPalette(q) {
    q = (q || '').toLowerCase();
    var rows = [];
    CMDS.forEach(function (c) {
      if (c.label.toLowerCase().indexOf(q) >= 0) rows.push({ label: c.label, tag: 'command', run: c.run });
    });
    Store.chats().slice(0, 40).forEach(function (c) {
      if (c.title.toLowerCase().indexOf(q) >= 0) {
        rows.push({ label: c.title, tag: 'chat', run: function () { openChat(c.id); } });
      }
    });
    if (q) {
      Providers.list.forEach(function (p) {
        Providers.models(p.id).forEach(function (id) {
          if ((p.name + ' ' + id).toLowerCase().indexOf(q) >= 0 && rows.length < 60) {
            rows.push({
              label: id, tag: p.name, dot: p.dot,
              run: function () { S.picker.slot = 0; choose(p.id + '/' + id); }
            });
          }
        });
      });
    }
    S.palette = rows.slice(0, 40);
    $('#cmdk-list').innerHTML = S.palette.map(function (r, i) {
      return '<button class="opt' + (i === 0 ? ' is-cursor' : '') + '" data-cmd="' + i + '">' +
        (r.dot ? '<span class="opt__dot" style="background:' + r.dot + '"></span>' : '') +
        '<span class="opt__id">' + esc(r.label) + '</span>' +
        '<span class="opt__tag">' + esc(r.tag) + '</span></button>';
    }).join('') || '<p class="chats__empty">Nothing found.</p>';
  }

  function openPalette() {
    $('#palette').hidden = false;
    $('#cmdk-input').value = '';
    renderPalette('');
    $('#cmdk-input').focus();
  }

  function runPaletteRow(i) {
    var r = S.palette && S.palette[i];
    $('#palette').hidden = true;
    if (r) r.run();
  }

  function closeRailOnMobile() { $('#shell').classList.remove('is-open'); }

  /* ── wiring ───────────────────────────────────────────────────────── */
  function wire() {
    /* composer */
    var input = $('#composer-input');
    input.addEventListener('input', function () { autosize(input); updateSend(); });
    input.addEventListener('keydown', function (e) {
      var enter = e.key === 'Enter';
      if (enter && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(input.value); return; }
      if (enter && !e.shiftKey && S.settings.enterSends) { e.preventDefault(); send(input.value); }
    });
    $('#composer').addEventListener('submit', function (e) { e.preventDefault(); send(input.value); });
    $('#btn-stop').addEventListener('click', stop);

    /* scroll stickiness */
    $('#scroller').addEventListener('scroll', function () {
      var sc = $('#scroller');
      S.stick = sc.scrollHeight - sc.scrollTop - sc.clientHeight < 80;
    }, { passive: true });

    /* rail */
    $('#btn-new').addEventListener('click', function () { newChat(); });
    $('#chat-search').addEventListener('input', renderRail);
    $('#btn-collapse').addEventListener('click', function () {
      $('#shell').classList.toggle('is-collapsed');
      $('#shell').classList.remove('is-open');
      Store.setSetting('railCollapsed', $('#shell').classList.contains('is-collapsed'));
    });
    $('#btn-rail-open').addEventListener('click', function () {
      var sh = $('#shell');
      if (window.innerWidth <= 900) sh.classList.toggle('is-open');
      else { sh.classList.remove('is-collapsed'); Store.setSetting('railCollapsed', false); }
    });
    $('#chats').addEventListener('keydown', function (e) {
      var item = e.target.closest('[data-open]');
      if (!item || (e.key !== 'Enter' && e.key !== ' ')) return;
      e.preventDefault();
      openChat(item.dataset.open);
    });
    $('#chats').addEventListener('click', function (e) {
      var kill = e.target.closest('[data-kill]');
      if (kill) {
        e.stopPropagation();
        var id = kill.dataset.kill;
        Store.remove(id);
        if (S.chat && S.chat.id === id) newChat(false);
        return renderRail();
      }
      var open = e.target.closest('[data-open]');
      if (open) openChat(open.dataset.open);
    });

    /* modes + model chips */
    $('#mode-chat').addEventListener('click', function () { setMode('chat'); });
    $('#mode-compare').addEventListener('click', function () { setMode('compare'); });
    $('#topbar-models').addEventListener('click', function (e) {
      var drop = e.target.closest('[data-drop]');
      if (drop) {
        e.stopPropagation();
        S.models.splice(+drop.dataset.drop, 1);
        Store.setSetting('models', S.models);
        return renderModels();
      }
      var chip = e.target.closest('[data-slot]');
      if (chip) openPicker(chip, +chip.dataset.slot);
    });
    $('#composer-chips').addEventListener('click', function (e) {
      if (e.target.closest('[data-open-tune]')) place($('#pop-tune'), $('#btn-tune'));
    });

    /* picker */
    $('#model-search').addEventListener('input', function () {
      S.picker.cursor = 0; renderPicker(this.value);
    });
    $('#model-search').addEventListener('keydown', function (e) {
      var n = S.picker.items.length;
      if (e.key === 'ArrowDown') { e.preventDefault(); S.picker.cursor = (S.picker.cursor + 1) % n; renderPicker(this.value); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); S.picker.cursor = (S.picker.cursor - 1 + n) % n; renderPicker(this.value); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        var it = S.picker.items[S.picker.cursor];
        if (it) choose(it.ref);
      }
    });
    $('#model-list').addEventListener('click', function (e) {
      var r = e.target.closest('[data-refresh]');
      if (r) {
        var id = r.dataset.refresh;
        r.textContent = '…';
        return Providers.refresh(id).then(function (ids) {
          toast(ids.length + ' models from ' + Providers.get(id).name);
          renderPicker($('#model-search').value);
        }).catch(function (err) {
          toast(err.message, true); renderPicker($('#model-search').value);
        });
      }
      var opt = e.target.closest('[data-ref]');
      if (opt) choose(opt.dataset.ref);
    });
    function useCustom() {
      var v = $('#model-custom').value.trim();
      if (!v) return;
      /* "openai/gpt-x" names its provider; a bare id belongs to whichever
         provider this slot already points at. */
      var named = v.indexOf('/') > 0 && Providers.get(v.slice(0, v.indexOf('/')));
      var here = Providers.split(S.models[S.picker.slot] || '').provider;
      choose(named ? v : (here ? here.id : 'openrouter') + '/' + v);
      $('#model-custom').value = '';
    }
    $('#model-custom-go').addEventListener('click', useCustom);
    $('#model-custom').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); useCustom(); }
    });

    /* tuning */
    $('#btn-tune').addEventListener('click', function () {
      var pop = $('#pop-tune');
      if (!pop.hidden) { pop.hidden = true; return; }
      $('#tune-system').value = S.settings.system || '';
      $('#tune-temp').value = S.settings.temperature;
      $('#tune-temp-val').textContent = S.settings.temperature;
      $('#tune-max').value = S.settings.maxTokens;
      place(pop, this);
    });
    $('#tune-system').addEventListener('input', function () {
      S.settings = Store.setSetting('system', this.value); renderModels();
    });
    $('#tune-temp').addEventListener('input', function () {
      $('#tune-temp-val').textContent = this.value;
      S.settings = Store.setSetting('temperature', parseFloat(this.value)); renderModels();
    });
    $('#tune-max').addEventListener('change', function () {
      S.settings = Store.setSetting('maxTokens', parseInt(this.value, 10) || 4096);
    });

    /* thread actions */
    $('#thread').addEventListener('click', function (e) {
      var copyCode = e.target.closest('[data-copy]');
      if (copyCode) {
        var pre = copyCode.closest('.code').querySelector('code');
        navigator.clipboard.writeText(pre.textContent).then(function () {
          copyCode.innerHTML = '<svg class="ico"><use href="#i-check"></use></svg>Copied';
          setTimeout(function () {
            copyCode.innerHTML = '<svg class="ico"><use href="#i-copy"></use></svg>Copy';
          }, 1400);
        });
        return;
      }
      var act = e.target.closest('[data-act]');
      if (!act) return;
      var mi = +act.dataset.mi, ri = +act.dataset.ri;
      var run = S.chat.messages[mi].runs[ri];
      if (act.dataset.act === 'copy') {
        navigator.clipboard.writeText(run.text || '').then(function () { toast('Copied'); });
      } else if (act.dataset.act === 'retry') {
        retry(mi, ri);
      } else if (act.dataset.act === 'pick') {
        S.chat.messages[mi].pick = ri;
        persist(); renderThread();
      }
    });

    /* starters */
    $('#starters').addEventListener('click', function (e) {
      var b = e.target.closest('[data-p]');
      if (!b) return;
      $('#composer-input').value = b.dataset.p;
      autosize($('#composer-input')); updateSend();
      $('#composer-input').focus();
    });
    $('#hello-settings').addEventListener('click', openSettings);

    /* settings sheet */
    $('#btn-settings').addEventListener('click', openSettings);
    $('#btn-close-settings').addEventListener('click', closeSettings);
    $('#overlay').addEventListener('click', function (e) {
      if (e.target === this) closeSettings();
    });
    $('#providers').addEventListener('input', function (e) {
      var k = e.target.dataset.key, b = e.target.dataset.base;
      if (k) {
        Store.setKey(k, e.target.value);
        $('#keys-warn').hidden = Object.keys(Store.keys()).length > 0;
      }
      if (b) Store.setBase(b, e.target.value);
    });
    $('#providers').addEventListener('change', function (e) {
      var k = e.target.dataset.key;
      if (!k || !e.target.value.trim()) return;
      /* asking for the catalogue doubles as a check that the key works */
      var pill = $('.prov[data-prov="' + k + '"] .prov__state');
      if (pill) { pill.textContent = 'checking'; pill.className = 'prov__state'; }
      Providers.refresh(k).then(function (ids) {
        toast(ids.length + ' models from ' + Providers.get(k).name);
        renderProviders(); renderModels();
      }).catch(function (err) {
        toast(err.message, true);
        if (pill) { pill.textContent = 'rejected'; pill.className = 'prov__state is-bad'; }
      });
    });
    $('#providers').addEventListener('click', function (e) {
      var rev = e.target.closest('[data-reveal]');
      if (rev) {
        var inp = $('input[data-key="' + rev.dataset.reveal + '"]');
        inp.type = inp.type === 'password' ? 'text' : 'password';
        return;
      }
      var f = e.target.closest('[data-fetch]');
      if (f) {
        var id = f.dataset.fetch, old = f.textContent;
        f.textContent = '…';
        Providers.refresh(id).then(function (ids) {
          toast(ids.length + ' models from ' + Providers.get(id).name);
          renderProviders(); renderModels();
        }).catch(function (err) {
          toast(err.message, true); f.textContent = old;
        });
      }
    });
    $('#pref-stream').addEventListener('change', function () { S.settings = Store.setSetting('stream', this.checked); });
    $('#pref-thinking').addEventListener('change', function () {
      S.settings = Store.setSetting('showThinking', this.checked); renderThread();
    });
    $('#pref-enter').addEventListener('change', function () { S.settings = Store.setSetting('enterSends', this.checked); });
    $('#btn-export-all').addEventListener('click', function () {
      var all = Store.chats().map(toMarkdown).join('\n\n---\n\n');
      download('prism-chats.md', all || '# Nothing yet');
    });
    $('#btn-wipe').addEventListener('click', function () {
      if (!confirm('Erase every chat, key and setting stored by Prism in this browser?')) return;
      Store.wipe(); location.reload();
    });
    $('#btn-export').addEventListener('click', function () {
      if (S.chat && S.chat.messages.length) download(S.chat.title.slice(0, 40) + '.md', toMarkdown(S.chat));
    });
    $('#btn-theme').addEventListener('click', function () { theme(); });

    /* palette */
    $('#cmdk-input').addEventListener('input', function () { renderPalette(this.value); });
    $('#cmdk-input').addEventListener('keydown', function (e) {
      var rows = $$('#cmdk-list .opt'), at = rows.findIndex(function (r) { return r.classList.contains('is-cursor'); });
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!rows.length) return;
        rows[Math.max(at, 0)].classList.remove('is-cursor');
        var next = (at + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length;
        rows[next].classList.add('is-cursor');
        rows[next].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        runPaletteRow(at < 0 ? 0 : at);
      }
    });
    $('#cmdk-list').addEventListener('click', function (e) {
      var row = e.target.closest('[data-cmd]');
      if (row) runPaletteRow(+row.dataset.cmd);
    });
    $('#palette').addEventListener('click', function (e) { if (e.target === this) this.hidden = true; });

    /* global keys and dismissals */
    document.addEventListener('keydown', function (e) {
      var mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); }
      else if (mod && e.shiftKey && e.key.toLowerCase() === 'o') { e.preventDefault(); newChat(); }
      else if (e.key === 'Escape') {
        $('#pop-models').hidden = true; $('#pop-tune').hidden = true;
        $('#palette').hidden = true;
        if (!$('#overlay').hidden) closeSettings();
        closeRailOnMobile();
      }
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#pop-models') && !e.target.closest('[data-slot]')) $('#pop-models').hidden = true;
      if (!e.target.closest('#pop-tune') && !e.target.closest('#btn-tune') &&
          !e.target.closest('[data-open-tune]')) $('#pop-tune').hidden = true;
      if ($('#shell').classList.contains('is-open') && !e.target.closest('.rail') &&
          !e.target.closest('#btn-rail-open')) closeRailOnMobile();
    });
  }

  /* ── boot ─────────────────────────────────────────────────────────── */
  function boot() {
    theme(S.settings.theme);
    Store.onQuota = function () {
      Store.onQuota = null;   // once is enough
      toast('This browser will not store any more — export and delete old chats.', true);
    };
    S.models = (S.settings.models || []).filter(function (r) { return Providers.split(r).provider; });
    if (!S.models.length) S.models = ['anthropic/claude-sonnet-5'];
    if ($('#shell') && S.settings.railCollapsed) $('#shell').classList.add('is-collapsed');

    wire();
    setMode(S.settings.mode === 'compare' ? 'compare' : 'chat', true);

    var recent = Store.chats()[0];
    if (recent && recent.messages.length) openChat(recent.id); else newChat(false);

    renderAll();
    updateSend();

    if (!Object.keys(Store.keys()).length) {
      $('#keys-warn').hidden = false;
      setTimeout(function () { openSettings(); }, 400);
    }
    /* OpenRouter publishes its catalogue without a key, so the picker is
       never empty on a first run. Ollama is only probed when asked, since
       most machines are not running it and the failure is noisy. */
    if (!Providers.models('openrouter').length) Providers.refresh('openrouter').catch(function () {});
    autosize($('#composer-input'));
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
