/* ==========================================================================
   markdown.js — a small, safe Markdown renderer with syntax highlighting.
   No dependencies. Everything is escaped before it is written, and code is
   tokenised (not regex-replaced over HTML), so a stray "<span>" in a model's
   answer stays text rather than becoming markup.
   ========================================================================== */
(function (global) {
  'use strict';

  // parking sentinel: a private-use codepoint, so it cannot collide with output
  var NUL = String.fromCharCode(0xE000);

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ── languages ────────────────────────────────────────────────────── */
  var KEYWORDS = ('abstract as async await break case catch class const constructor continue ' +
    'debugger def default defer del delete do elif else enum except export extends finally fn for from func ' +
    'function if impl implements import in instanceof interface lambda let loop match module mut namespace new ' +
    'nonlocal not or package pass private protected pub public raise readonly require return self static struct ' +
    'super switch this throw throws trait try type typeof unless until use using var void while with yield and'
  ).split(' ');
  var LITERALS = 'true false null nil None True False undefined NaN Infinity nullptr'.split(' ');
  var KW = {}, LIT = {};
  KEYWORDS.forEach(function (k) { KW[k] = 1; });
  LITERALS.forEach(function (k) { LIT[k] = 1; });

  var HASH = 'py python sh bash zsh shell console yaml yml toml rb ruby r pl perl conf ini dockerfile make makefile nginx'.split(' ');
  var DASH = 'sql lua hs haskell elm ada'.split(' ');
  var MARKUP = 'html xml svg vue svelte markup'.split(' ');

  function family(lang) {
    lang = (lang || '').toLowerCase();
    return {
      hash: HASH.indexOf(lang) >= 0,
      dash: DASH.indexOf(lang) >= 0,
      markup: MARKUP.indexOf(lang) >= 0,
      slash: HASH.indexOf(lang) < 0 && DASH.indexOf(lang) < 0
    };
  }

  /* ── highlighter ──────────────────────────────────────────────────── */
  function highlight(code, lang) {
    var f = family(lang), out = [], i = 0, n = code.length, buf = '';

    function flush() { if (buf) { out.push(esc(buf)); buf = ''; } }
    function tok(cls, text) { flush(); out.push('<span class="tok-' + cls + '">' + esc(text) + '</span>'); }
    function eol(from) { var j = code.indexOf('\n', from); return j < 0 ? n : j; }
    function isWord(c) { return !!c && /[A-Za-z0-9_$]/.test(c); }

    while (i < n) {
      var c = code[i], c2 = code[i + 1], e, m;

      /* markup: <tag attr="value"> */
      if (f.markup && c === '<' && /[A-Za-z\/!?]/.test(c2 || '')) {
        var j = i + 1, closed = false;
        while (j < n) {
          if (code[j] === '"' || code[j] === "'") {
            var q = code[j++];
            while (j < n && code[j] !== q) j++;
          } else if (code[j] === '>') { j++; closed = true; break; }
          j++;
        }
        if (!closed) j = n;
        flush();
        out.push('<span class="tok-key">' + esc(code.slice(i, j))
          .replace(/(&quot;|&#39;)([\s\S]*?)\1/g, '<span class="tok-str">$1$2$1</span>') + '</span>');
        i = j; continue;
      }

      /* comments */
      if (f.slash && c === '/' && c2 === '*') {
        e = code.indexOf('*/', i + 2); e = e < 0 ? n : e + 2;
        tok('com', code.slice(i, e)); i = e; continue;
      }
      if (f.slash && c === '/' && c2 === '/') { e = eol(i); tok('com', code.slice(i, e)); i = e; continue; }
      if (f.hash && c === '#') { e = eol(i); tok('com', code.slice(i, e)); i = e; continue; }
      if (f.dash && c === '-' && c2 === '-') { e = eol(i); tok('com', code.slice(i, e)); i = e; continue; }

      /* strings — triple-quoted first */
      if ((c === '"' || c === "'") && code.slice(i, i + 3) === c + c + c) {
        e = code.indexOf(c + c + c, i + 3); e = e < 0 ? n : e + 3;
        tok('str', code.slice(i, e)); i = e; continue;
      }
      if (c === '"' || c === "'" || c === '`') {
        var k = i + 1;
        while (k < n) {
          if (code[k] === '\\') { k += 2; continue; }
          if (code[k] === c) { k++; break; }
          if (code[k] === '\n' && c !== '`') break;
          k++;
        }
        tok('str', code.slice(i, k)); i = k; continue;
      }

      /* numbers */
      if (/[0-9]/.test(c) && !isWord(code[i - 1])) {
        m = /^(0[xXbBoO][0-9a-fA-F_]+|[0-9][0-9_]*(\.[0-9_]+)?([eE][+-]?[0-9]+)?)/.exec(code.slice(i));
        if (m) { tok('num', m[0]); i += m[0].length; continue; }
      }

      /* identifiers */
      if (/[A-Za-z_$@]/.test(c)) {
        var w = /^[A-Za-z_$@][A-Za-z0-9_$]*/.exec(code.slice(i))[0];
        var after = i + w.length + code.slice(i + w.length).match(/^[ \t]*/)[0].length;
        if (KW[w]) tok('key', w);
        else if (LIT[w]) tok('lit', w);
        else if (code[after] === '(') tok('fn', w);
        else buf += w;
        i += w.length; continue;
      }

      buf += c; i++;
    }
    flush();
    return out.join('');
  }

  /* ── inline ───────────────────────────────────────────────────────── */
  function safeUrl(u) {
    u = String(u).trim();
    return /^(https?:|mailto:|tel:|#|\/|\.)/i.test(u) ? u : '';
  }

  function inline(text) {
    var out = esc(text), parked = [];

    // inline code is parked at once so no other rule can reach inside it
    out = out.replace(/`([^`\n]+)`/g, function (_, c) {
      parked.push('<code>' + c + '</code>');
      return NUL + 'I' + (parked.length - 1) + NUL;
    });

    out = out
      .replace(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g, function (m, alt, src) {
        var u = safeUrl(src);
        return u ? '<img src="' + u + '" alt="' + alt + '" loading="lazy">' : m;
      })
      .replace(/\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g, function (m, label, href) {
        var u = safeUrl(href);
        return u ? '<a href="' + u + '" target="_blank" rel="noopener noreferrer">' + label + '</a>' : m;
      })
      .replace(/(^|[\s(])((?:https?:\/\/)[^\s<>()]+)/g,
        '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>')
      .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*\w])\*([^*\n]+)\*/g, '$1<em>$2</em>')
      .replace(/(^|\s)__([^_]+)__/g, '$1<strong>$2</strong>')
      .replace(/(^|\s)_([^_\n]+)_(?=\s|$|[.,;:!?])/g, '$1<em>$2</em>')
      .replace(/~~([^~]+)~~/g, '<del>$1</del>');

    return out.replace(new RegExp(NUL + 'I(\\d+)' + NUL, 'g'), function (_, n) { return parked[+n]; });
  }

  /* ── blocks ───────────────────────────────────────────────────────── */
  function listBlock(lines, ordered) {
    var html = ordered ? '<ol>' : '<ul>', item = null;

    function close() {
      if (!item) return;
      var body = inline(item.text);
      if (item.kids.length) body += render(item.kids.join('\n'));
      html += '<li>' + body + '</li>';
      item = null;
    }

    lines.forEach(function (line) {
      var m = /^(\s*)(?:[-*+]|\d+[.)])\s+(.*)$/.exec(line);
      if (m && m[1].length < 2) { close(); item = { text: m[2], kids: [] }; }
      else if (item) item.kids.push(line.replace(/^ {1,4}/, ''));
    });
    close();
    return html + (ordered ? '</ol>' : '</ul>');
  }

  function tableBlock(rows) {
    function cells(r) {
      return r.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|')
        .map(function (c) { return c.trim(); });
    }
    var html = '<table><thead><tr>';
    cells(rows[0]).forEach(function (c) { html += '<th>' + inline(c) + '</th>'; });
    html += '</tr></thead><tbody>';
    rows.slice(2).forEach(function (r) {
      html += '<tr>';
      cells(r).forEach(function (c) { html += '<td>' + inline(c) + '</td>'; });
      html += '</tr>';
    });
    return html + '</tbody></table>';
  }

  function render(src) {
    src = String(src == null ? '' : src).replace(/\r\n?/g, '\n');

    /* park fenced code first — nothing inside it is Markdown */
    var blocks = [];
    src = src.replace(/```([^\n`]*)\n?([\s\S]*?)(?:```|$)/g, function (_, info, body) {
      blocks.push({ lang: (info || '').trim().split(/\s+/)[0], code: body.replace(/\n$/, '') });
      return '\n' + NUL + 'B' + (blocks.length - 1) + NUL + '\n';
    });

    var lines = src.split('\n'), html = '', i = 0;
    var parkRe = new RegExp('^' + NUL + 'B(\\d+)' + NUL + '$');
    var stopRe = new RegExp('^(#{1,6}\\s|\\s*>|\\s*[-*+]\\s|\\s*\\d+[.)]\\s|' + NUL + 'B)');

    while (i < lines.length) {
      var line = lines[i];
      if (!line.trim()) { i++; continue; }

      var park = parkRe.exec(line.trim());
      if (park) {
        var b = blocks[+park[1]];
        html += '<div class="code"><div class="code__head"><span>' + esc(b.lang || 'text') + '</span>' +
          '<button class="code__copy" type="button" data-copy>' +
          '<svg class="ico" aria-hidden="true"><use href="#i-copy"></use></svg>Copy</button></div>' +
          '<pre><code>' + highlight(b.code, b.lang) + '</code></pre></div>';
        i++; continue;
      }

      var h = /^(#{1,6})\s+(.*)$/.exec(line);
      if (h) {
        var lvl = Math.min(h[1].length, 4);
        html += '<h' + lvl + '>' + inline(h[2]) + '</h' + lvl + '>';
        i++; continue;
      }

      if (/^\s*([-*_])\s*\1\s*\1[\s\-*_]*$/.test(line)) { html += '<hr>'; i++; continue; }

      if (/^\s*>/.test(line)) {
        var q = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) { q.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
        html += '<blockquote>' + render(q.join('\n')) + '</blockquote>';
        continue;
      }

      if (/^\s*\|.*\|\s*$/.test(line) && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[i + 1] || '')) {
        var rows = [];
        while (i < lines.length && /\|/.test(lines[i]) && lines[i].trim()) { rows.push(lines[i]); i++; }
        html += tableBlock(rows);
        continue;
      }

      var li = /^(\s*)(?:([-*+])|(\d+)[.)])\s+/.exec(line);
      if (li) {
        var ordered = !!li[3], group = [];
        while (i < lines.length && (/^\s*(?:[-*+]|\d+[.)])\s+/.test(lines[i]) ||
              (group.length && /^\s{1,6}\S/.test(lines[i])))) { group.push(lines[i]); i++; }
        html += listBlock(group, ordered);
        continue;
      }

      var para = [];
      while (i < lines.length && lines[i].trim() && !stopRe.test(lines[i])) { para.push(lines[i]); i++; }
      if (para.length) html += '<p>' + inline(para.join('\n')).replace(/\n/g, '<br>') + '</p>';
      else i++;
    }

    return html;
  }

  global.MD = { render: render, escape: esc, highlight: highlight };
})(window);
