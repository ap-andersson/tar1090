# Dev tooling

## devserver.py

Serves `html/` from the working tree and proxies data endpoints to a running
tar1090 backend, so frontend edits appear on browser reload instead of needing
a container restart.

    python3 dev/devserver.py                    # http://localhost:8090
    python3 dev/devserver.py --upstream http://pi.local --port 9000

Defaults to the ultrafeeder container on `http://localhost:8088`.

Served locally (edit, then F5):

    index.html, style.css, script.js, layers.js, planeObject.js, libs/, images/, ...

Proxied to the backend:

    data/, chunks/, db-<version>/, globe_history/, re-api/, graphs1090/, ...

Two things the container's install step does are reproduced so the local copy
behaves like the deployed one:

- `databaseFolder` in index.html is rewritten to the versioned db directory the
  backend actually serves (read from the backend at startup).
- config.js gets the backend's appended settings block (the `TAR1090_*`
  environment overrides, including any API keys) glued on. It is fetched from
  the backend at startup and never written to disk.

Cache-Control is `no-store` on everything, so a plain reload always picks up
the current file. No cachebust hashes, unlike the deployed copy.

## Testing the phone layout without a phone

The phone layout is chosen by `isMobile()`, which compares the viewport width
against `mobileBreakpoint` (600). Chrome will not always let a window get that
narrow, so the breakpoint is overridable:

    http://localhost:8090/?mobileWidth=900

Everything that used to be a `max-width: 600px` media query is now keyed off
`.is-mobile-layout`, the class `applyLayoutMode()` puts on `<html>`, so CSS
follows the same decision and `?mobileWidth` moves both together. Touch target
sizing is the deliberate exception - it keys off `pointer: coarse` as well as
width, because that genuinely is about the input device rather than the layout.

A caveat worth knowing: a real phone also has `onMobile` true (user-agent) and
`pointer: coarse`. `?mobileWidth` does not fake those, so a handful of branches
still only run on a device.

## UI-INVENTORY.md

Every user-facing surface in the frontend, for deciding what the UI refresh
carries over. Fill in the Verdict column.
