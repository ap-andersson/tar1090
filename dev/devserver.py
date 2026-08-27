#!/usr/bin/env python3
"""Dev server for tar1090 UI work.

Serves html/ straight from the working tree and proxies everything else
(data/, chunks/, the aircraft db, globe_history/, ...) to a running
tar1090 backend - by default the ultrafeeder container on :8088.

The point is to edit html/*.{css,js,html} and just reload the browser,
instead of restarting the container to re-run its install/cachebust step.

Two things the container does to the files at install time are reproduced
here so the local copy behaves like the deployed one:

  * index.html's `databaseFolder` is pointed at the versioned db directory
    the backend actually serves (db-3.14.1714 or whatever it is today).
  * config.js gets the backend's appended settings block (the
    TAR1090_* environment overrides) glued onto the end. It is read from
    the backend at startup, so no API keys are stored in the repo.

Usage:
    python3 dev/devserver.py                     # :8090 -> localhost:8088
    python3 dev/devserver.py --port 9000 --upstream http://pi.local
"""

import argparse
import os
import re
import sys
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

CONFIG_APPEND_MARKER = "// The following configuration directives produced via"

# Text types we may need to patch; everything else is passed through as bytes.
CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".map": "application/json",
    ".geojson": "application/json",
    ".zst": "application/octet-stream",
}


def fetch(url, timeout=15):
    with urllib.request.urlopen(url, timeout=timeout) as r:
        return r.read()


def probe_upstream(upstream):
    """Read the backend's index.html/config.js for the bits we must mirror."""
    db_folder = None
    config_append = ""

    try:
        index = fetch(upstream + "/").decode("utf-8", "replace")
        m = re.search(r'databaseFolder\s*=\s*"([^"]+)"', index)
        if m:
            db_folder = m.group(1)
    except Exception as e:
        print(f"  ! could not read {upstream}/ : {e}")

    try:
        config = fetch(upstream + "/config.js").decode("utf-8", "replace")
        idx = config.find(CONFIG_APPEND_MARKER)
        if idx != -1:
            config_append = config[idx:]
    except Exception as e:
        print(f"  ! could not read {upstream}/config.js : {e}")

    return db_folder, config_append


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "tar1090-devserver"

    # set by main()
    root = ""
    upstream = ""
    db_folder = None
    config_append = ""

    def log_message(self, fmt, *args):
        if self.server_quiet and "200" in (args[1] if len(args) > 1 else ""):
            return
        sys.stderr.write("  %s\n" % (fmt % args))

    @property
    def server_quiet(self):
        return getattr(type(self), "quiet", False)

    def do_GET(self):
        self.handle_request(body=True)

    def do_HEAD(self):
        self.handle_request(body=False)

    def handle_request(self, body):
        path = self.path.split("?", 1)[0]
        rel = path.lstrip("/") or "index.html"
        if rel.endswith("/"):
            rel += "index.html"

        local = os.path.normpath(os.path.join(self.root, rel))
        # refuse to escape the served root
        if not local.startswith(os.path.realpath(self.root)):
            self.send_error(403)
            return

        if os.path.isfile(local):
            self.serve_local(local, rel, body)
        else:
            self.proxy(body)

    def serve_local(self, local, rel, body):
        with open(local, "rb") as f:
            data = f.read()

        base = os.path.basename(rel)
        if base == "index.html" and self.db_folder:
            text = data.decode("utf-8", "replace")
            text = re.sub(
                r'(databaseFolder\s*=\s*")[^"]+(")',
                lambda m: m.group(1) + self.db_folder + m.group(2),
                text,
            )
            data = text.encode("utf-8")
        elif base == "config.js" and self.config_append:
            data = data.rstrip() + b"\n\n" + self.config_append.encode("utf-8")

        ext = os.path.splitext(local)[1].lower()
        self.send_response(200)
        self.send_header("Content-Type", CONTENT_TYPES.get(ext, "application/octet-stream"))
        self.send_header("Content-Length", str(len(data)))
        # always reload from the working tree, never from the browser cache
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.end_headers()
        if body:
            self.wfile.write(data)

    def proxy(self, body, attempt=0):
        url = self.upstream + self.path
        req = urllib.request.Request(url, method="GET")
        for h in ("Accept", "Accept-Encoding", "Range", "If-None-Match"):
            if h in self.headers:
                req.add_header(h, self.headers[h])
        try:
            with urllib.request.urlopen(req, timeout=20) as up:
                data = up.read()
                self.send_response(up.status)
                for h in ("Content-Type", "Content-Encoding", "Content-Range"):
                    if up.headers.get(h):
                        self.send_header(h, up.headers[h])
                self.send_header("Content-Length", str(len(data)))
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                if body:
                    self.wfile.write(data)
        except urllib.error.HTTPError as e:
            data = e.read() or b""
            self.send_response(e.code)
            self.send_header("Content-Type", e.headers.get("Content-Type", "text/plain"))
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            if body:
                self.wfile.write(data)
        except Exception as e:
            # The aircraft database fires dozens of parallel requests; a
            # single-process proxy drops one occasionally, which surfaces as a
            # confusing 502 in the page's console. One retry covers it.
            if attempt == 0:
                return self.proxy(body, attempt=1)
            msg = f"devserver: upstream {url} failed: {e}\n".encode()
            self.send_response(502)
            self.send_header("Content-Type", "text/plain")
            self.send_header("Content-Length", str(len(msg)))
            self.end_headers()
            if body:
                self.wfile.write(msg)


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--port", type=int, default=8090)
    ap.add_argument("--upstream", default="http://localhost:8088",
                    help="running tar1090 backend to proxy data from")
    ap.add_argument("--root", default=os.path.join(os.path.dirname(here), "html"),
                    help="directory to serve the frontend from")
    ap.add_argument("--quiet", action="store_true", help="only log errors")
    args = ap.parse_args()

    root = os.path.realpath(args.root)
    upstream = args.upstream.rstrip("/")

    if not os.path.isfile(os.path.join(root, "index.html")):
        sys.exit(f"no index.html in {root}")

    print(f"tar1090 devserver")
    print(f"  serving  {root}")
    print(f"  upstream {upstream}")
    db_folder, config_append = probe_upstream(upstream)
    print(f"  db dir   {db_folder or 'unknown (registrations/types may not resolve)'}")
    print(f"  config   {'+' + str(len(config_append)) + ' bytes appended by backend' if config_append else 'local only'}")

    Handler.root = root
    Handler.upstream = upstream
    Handler.db_folder = db_folder
    Handler.config_append = config_append
    Handler.quiet = args.quiet

    srv = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"\n  http://localhost:{args.port}/   (Ctrl-C to stop)\n")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped")


if __name__ == "__main__":
    main()
