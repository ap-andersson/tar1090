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

## UI-INVENTORY.md

Every user-facing surface in the frontend, for deciding what the UI refresh
carries over. Fill in the Verdict column.
