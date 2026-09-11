#!/usr/bin/env python3
"""
Optional CORS relay for Prism.

Some providers answer a browser's preflight with a shrug. This forwards the
call for you and adds the headers the browser wants. Standard library only.

    python3 proxy.py            # listens on 127.0.0.1:8787

Then, in Prism → Keys & settings → the provider → Advanced, set the base URL to
the line printed at startup, e.g.

    http://127.0.0.1:8787/anthropic/v1

The relay never stores, logs or inspects your key — it copies the auth headers
straight through and streams the answer back byte for byte.
"""

import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8787

UPSTREAM = {
    "anthropic":  "https://api.anthropic.com",
    "openai":     "https://api.openai.com",
    "google":     "https://generativelanguage.googleapis.com",
    "openrouter": "https://openrouter.ai",
    "groq":       "https://api.groq.com",
    "mistral":    "https://api.mistral.ai",
    "deepseek":   "https://api.deepseek.com",
    "xai":        "https://api.x.ai",
    "ollama":     "http://127.0.0.1:11434",
}

PASS_THROUGH = (
    "authorization", "x-api-key", "anthropic-version", "x-goog-api-key",
    "content-type", "accept", "http-referer", "x-title",
    "anthropic-dangerous-direct-browser-access",
)


class Relay(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "prism-relay"

    def log_message(self, fmt, *args):          # one tidy line per call
        sys.stderr.write("  %s %s\n" % (self.command, self.path))

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", self.headers.get("Origin", "*"))
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Max-Age", "86400")
        self.send_header("Vary", "Origin")

    def _fail(self, code, message):
        body = message.encode()
        self.send_response(code)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        self._forward(None)

    def do_POST(self):
        size = int(self.headers.get("Content-Length") or 0)
        self._forward(self.rfile.read(size) if size else b"")

    def _forward(self, payload):
        parts = self.path.lstrip("/").split("/", 1)
        name = parts[0]
        rest = parts[1] if len(parts) > 1 else ""
        base = UPSTREAM.get(name)
        if not base:
            return self._fail(404, '{"error":{"message":"unknown provider %r; try one of: %s"}}'
                              % (name, ", ".join(sorted(UPSTREAM))))

        headers = {k: v for k, v in self.headers.items() if k.lower() in PASS_THROUGH}
        req = Request(base + "/" + rest, data=payload, headers=headers, method=self.command)

        try:
            upstream = urlopen(req, timeout=600)
        except HTTPError as e:                   # forward the provider's own error verbatim
            body = e.read()
            self.send_response(e.code)
            self._cors()
            self.send_header("Content-Type", e.headers.get("Content-Type", "application/json"))
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        except URLError as e:
            return self._fail(502, '{"error":{"message":"relay could not reach %s: %s"}}' % (base, e.reason))

        self.send_response(upstream.status)
        self._cors()
        ctype = upstream.headers.get("Content-Type", "application/octet-stream")
        self.send_header("Content-Type", ctype)
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Transfer-Encoding", "chunked")
        self.end_headers()

        try:
            while True:
                chunk = upstream.read1(8192)     # read1 so SSE arrives token by token
                if not chunk:
                    break
                self.wfile.write(b"%X\r\n%s\r\n" % (len(chunk), chunk))
                self.wfile.flush()
            self.wfile.write(b"0\r\n\r\n")
        except (BrokenPipeError, ConnectionResetError):
            pass                                  # the tab navigated away mid-stream
        finally:
            upstream.close()


if __name__ == "__main__":
    print("Prism relay on http://127.0.0.1:%d — set a provider's base URL to:" % PORT)
    for name in sorted(UPSTREAM):
        suffix = "/v1beta" if name == "google" else "/v1"
        print("    %-11s http://127.0.0.1:%d/%s%s" % (name, PORT, name, suffix))
    print("\nCtrl-C to stop.\n")
    try:
        ThreadingHTTPServer(("127.0.0.1", PORT), Relay).serve_forever()
    except KeyboardInterrupt:
        print("\nstopped")
