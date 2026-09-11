/* ==========================================================================
   store.js — everything persists in localStorage, nothing leaves the device.
   Namespaced under prism.v1 so it never collides with anything else served
   from the same origin.
   ========================================================================== */
(function (global) {
  'use strict';

  var NS = 'prism.v1.';
  var mem = {};                 // fallback when localStorage is unavailable
  var ok = (function () {
    try { localStorage.setItem(NS + 'probe', '1'); localStorage.removeItem(NS + 'probe'); return true; }
    catch (e) { return false; }
  })();

  function read(key, fallback) {
    try {
      var raw = ok ? localStorage.getItem(NS + key) : mem[key];
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  }

  function write(key, value) {
    var raw = JSON.stringify(value);
    try {
      if (ok) localStorage.setItem(NS + key, raw); else mem[key] = raw;
    } catch (e) {
      mem[key] = raw;                 // quota exceeded: keep the session alive,
      if (Store.onQuota) Store.onQuota(key);   // but say so rather than losing it quietly
    }
    return value;
  }

  var DEFAULTS = {
    theme: 'dark',
    system: '',
    temperature: 0.7,
    maxTokens: 4096,
    stream: true,
    showThinking: true,
    enterSends: true,
    mode: 'chat',
    models: ['anthropic/claude-sonnet-5'],
    railCollapsed: false
  };

  var Store = {
    available: ok,
    onQuota: null,        // set by the app: browser storage is full

    /* ── settings ─────────────────────────────────────────────── */
    settings: function () {
      var s = read('settings', {});
      for (var k in DEFAULTS) if (!(k in s)) s[k] = DEFAULTS[k];
      return s;
    },
    setSetting: function (key, value) {
      var s = this.settings(); s[key] = value; write('settings', s); return s;
    },

    /* ── keys ─────────────────────────────────────────────────── */
    keys: function () { return read('keys', {}); },
    key: function (provider) { return (read('keys', {})[provider] || '').trim(); },
    setKey: function (provider, value) {
      var k = read('keys', {});
      if (value) k[provider] = value.trim(); else delete k[provider];
      return write('keys', k);
    },

    /* ── per-provider base URL overrides (proxies, gateways) ──── */
    bases: function () { return read('bases', {}); },
    setBase: function (provider, value) {
      var b = read('bases', {});
      if (value) b[provider] = value.replace(/\/+$/, ''); else delete b[provider];
      return write('bases', b);
    },

    /* ── model catalogues fetched from providers ──────────────── */
    catalog: function () { return read('catalog', {}); },
    setCatalog: function (provider, ids) {
      var c = read('catalog', {}); c[provider] = ids; return write('catalog', c);
    },

    /* ── conversations ────────────────────────────────────────── */
    chats: function () { return read('chats', []); },
    saveChats: function (list) { return write('chats', list); },
    chat: function (id) {
      var list = this.chats();
      for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
      return null;
    },
    upsert: function (chat) {
      var list = this.chats(), found = false;
      chat.updatedAt = Date.now();
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === chat.id) { list[i] = chat; found = true; break; }
      }
      if (!found) list.unshift(chat);
      list.sort(function (a, b) { return b.updatedAt - a.updatedAt; });
      return write('chats', list);
    },
    remove: function (id) {
      return write('chats', this.chats().filter(function (c) { return c.id !== id; }));
    },

    /* ── housekeeping ─────────────────────────────────────────── */
    bytes: function () {
      var n = 0;
      try {
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k.indexOf(NS) === 0) n += k.length + (localStorage.getItem(k) || '').length;
        }
      } catch (e) {}
      return n;
    },
    wipe: function () {
      try {
        var doomed = [];
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k.indexOf(NS) === 0) doomed.push(k);
        }
        doomed.forEach(function (k) { localStorage.removeItem(k); });
      } catch (e) {}
      mem = {};
    },

    uid: function () {
      return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }
  };

  global.Store = Store;
})(window);
