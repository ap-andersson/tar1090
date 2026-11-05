// Airband / ATC audio player
//
// A start/stop button and a status box at the top of the map. The status
// box shows the stream's current title and lights up while someone is
// transmitting, which it tells by measuring the audio - so it works while
// muted, which is the point: see the traffic without having to hear it.
// Clicking the status box mutes and unmutes.
//
// The audio runs through Web Audio: element -> analyser -> gain -> soft
// clipper -> output. The analyser needs the signal whatever the volume, so mute and
// volume are the gain node's job rather than the element's - which is also
// what lets the volume go past 100%, with the soft clipper rounding off the
// peaks that would otherwise clip. That needs the stream to
// allow CORS (Icecast sends Access-Control-Allow-Origin: *) or to come from
// this page's own origin. When it doesn't, the player falls back to a plain
// element: it still plays, but cannot show activity.
//
// Configured by atcStreamUrl and friends in defaults.js / config.js. With no
// URL none of this runs and nothing is shown.
"use strict";

(function () {
    if (typeof atcStreamUrl != 'string' || !atcStreamUrl.trim())
        return;

    const STORE_KEY = 'atcPlayer';
    const POLL_MS = 3000;           // status JSON, for the title
    const LEVEL_MS = 100;           // activity meter
    const ACTIVE_HOLD_MS = 600;     // keeps the light on through short gaps
    const WATCHDOG_MS = 5000;       // a live stream whose clock stops has died
    const RETRY_MS = [2000, 5000, 10000, 30000];
    const MAX_VOLUME = 1.5;         // 150%; the plain-element fallback stops at 100%

    const streamUrl = atcStreamUrl.trim();
    let statusUrl = null;
    if (atcStatusUrl !== false) {
        try {
            statusUrl = atcStatusUrl
                ? new URL(atcStatusUrl, location.href).href
                : new URL('status-json.xsl', new URL(streamUrl, location.href)).href;
        } catch (e) {
            statusUrl = null;
        }
    }
    const mountName = (function () {
        try {
            return new URL(streamUrl, location.href).pathname.split('/').pop();
        } catch (e) {
            return '';
        }
    })();

    const player = document.getElementById('atc_player');
    const toggleBtn = document.getElementById('atc_toggle');
    const statusBtn = document.getElementById('atc_status');
    const titleEl = document.getElementById('atc_title');
    const volumeEl = document.getElementById('atc_volume');
    if (!player || !toggleBtn || !statusBtn || !titleEl || !volumeEl)
        return;

    // ---- persisted per viewer: volume and mute -------------------------
    let volume = 1;
    let muted = false;
    try {
        const saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
        if (typeof saved.volume == 'number')
            volume = Math.min(MAX_VOLUME, Math.max(0, saved.volume));
        muted = !!saved.muted;
    } catch (e) {
        // private window or blocked storage: defaults are fine
    }

    function save() {
        try {
            localStorage.setItem(STORE_KEY, JSON.stringify({ volume: volume, muted: muted }));
        } catch (e) {
        }
    }

    // ---- state -----------------------------------------------------------
    let wanted = false;             // the user has pressed start
    let state = 'stopped';          // stopped | connecting | playing | error
    // 'unknown' until the Web Audio path has played once, 'off' when the
    // stream doesn't allow CORS and the plain element has to be used
    let webAudio = 'unknown';
    // trying the plain element after the Web Audio one failed, to tell CORS
    // from a stream that is down
    let probingPlain = false;
    let title = null;
    let active = false;
    let lastActive = 0;
    let retry = 0;
    let retryTimer = null;
    let pollTimer = null;
    let levelTimer = null;
    let watchdogTimer = null;
    let lastClock = -1;

    // the element Web Audio listens to; crossOrigin so the analyser gets real
    // samples rather than silence
    const graphEl = new Audio();
    graphEl.crossOrigin = 'anonymous';
    graphEl.preload = 'none';
    // the fallback, played directly
    const plainEl = new Audio();
    plainEl.preload = 'none';

    let ctx = null;
    let analyser = null;
    let gain = null;
    let limiter = null;
    let samples = null;

    function currentEl() {
        return webAudio == 'off' ? plainEl : graphEl;
    }

    // Created on the first start, inside the click: browsers only let an
    // AudioContext make sound once the user has interacted with the page.
    function ensureGraph() {
        if (ctx || webAudio == 'off')
            return;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) {
            webAudio = 'off';
            return;
        }
        ctx = new AC();
        const source = ctx.createMediaElementSource(graphEl);
        analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        samples = new Float32Array(analyser.fftSize);
        gain = ctx.createGain();
        limiter = ctx.createWaveShaper();
        limiter.curve = softClipCurve();
        limiter.oversample = '2x';
        source.connect(analyser);
        analyser.connect(gain);
        gain.connect(limiter);
        limiter.connect(ctx.destination);
        applyVolume();
    }

    // Above 100% a loud transmission would clip. A fixed curve rather than a
    // compressor, which adds its own makeup gain and so changed the sound at
    // every volume: below 0.8 of full scale the curve is a straight line and
    // does nothing, above it the peaks bend smoothly towards 1 instead of
    // squaring off. A shaper only takes input in -1..1, so the gain feeds it
    // at half level and the curve maps that back up to the real signal.
    const SHAPER_IN = 0.5;
    function softClipCurve() {
        const n = 4097;
        const knee = 0.8;
        const curve = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            const x = (i / (n - 1) * 2 - 1) / SHAPER_IN;
            const a = Math.abs(x);
            const y = a <= knee ? a : knee + (1 - knee) * Math.tanh((a - knee) / (1 - knee));
            curve[i] = Math.sign(x) * y;
        }
        return curve;
    }

    function applyVolume() {
        if (gain)
            gain.gain.value = (muted ? 0 : volume) * SHAPER_IN;
        plainEl.volume = Math.min(1, volume);
        plainEl.muted = muted;
    }

    // ---- start / stop ----------------------------------------------------
    function start() {
        if (wanted)
            return;
        wanted = true;
        retry = 0;
        ensureGraph();
        connect();
        startPolling();
    }

    function stop() {
        wanted = false;
        clearTimeout(retryTimer);
        retryTimer = null;
        release(graphEl);
        release(plainEl);
        stopPolling();
        stopLevel();
        stopWatchdog();
        if (ctx && ctx.state == 'running')
            ctx.suspend();
        title = null;
        setActive(false);
        setState('stopped');
    }

    // stopping means dropping the connection, not pausing it: a paused live
    // stream would resume from a stale buffer
    function release(el) {
        el.pause();
        el.removeAttribute('src');
        el.load();
    }

    function connect() {
        if (!wanted)
            return;
        setState('connecting');
        if (ctx && ctx.state != 'running')
            ctx.resume();
        const el = currentEl();
        el.src = streamUrl;
        const p = el.play();
        if (p && p.catch) {
            p.catch(function (err) {
                // an autoplay refusal isn't the stream failing
                if (err && err.name == 'NotAllowedError') {
                    stop();
                    return;
                }
                failed(el);
            });
        }
    }

    function failed(el) {
        if (!wanted || el != currentEl())
            return;
        release(el);
        stopLevel();
        stopWatchdog();
        setActive(false);

        // The first failure on the Web Audio path might be CORS rather than
        // the stream being down. Try the plain element once: if that plays,
        // it was CORS, and the player stays on the plain element.
        if (el == graphEl && webAudio == 'unknown') {
            webAudio = 'off';
            probingPlain = true;
            connect();
            return;
        }
        if (el == plainEl && probingPlain) {
            // both failed, so it's the stream - go back to trying it properly
            probingPlain = false;
            webAudio = 'unknown';
        }

        setState('error');
        const wait = RETRY_MS[Math.min(retry, RETRY_MS.length - 1)];
        retry++;
        clearTimeout(retryTimer);
        retryTimer = setTimeout(connect, wait);
    }

    function onPlaying(el) {
        if (!wanted || el != currentEl())
            return;
        retry = 0;
        if (el == graphEl)
            webAudio = 'ok';
        probingPlain = false;
        player.classList.toggle('atc-no-level', webAudio == 'off');
        setState('playing');
        startLevel();
        startWatchdog();
    }

    [graphEl, plainEl].forEach(function (el) {
        el.addEventListener('playing', function () { onPlaying(el); });
        el.addEventListener('waiting', function () {
            if (wanted && el == currentEl() && state == 'playing')
                setState('connecting');
        });
        el.addEventListener('error', function () { failed(el); });
        el.addEventListener('ended', function () { failed(el); });
    });

    // A dropped stream doesn't always fire an event; the clock stopping does
    // show it.
    function startWatchdog() {
        stopWatchdog();
        lastClock = -1;
        watchdogTimer = setInterval(function () {
            const el = currentEl();
            if (state != 'playing')
                return;
            if (el.currentTime == lastClock) {
                failed(el);
                return;
            }
            lastClock = el.currentTime;
        }, WATCHDOG_MS);
    }

    function stopWatchdog() {
        clearInterval(watchdogTimer);
        watchdogTimer = null;
    }

    // ---- activity --------------------------------------------------------
    function startLevel() {
        stopLevel();
        if (webAudio != 'ok' || !analyser)
            return;
        levelTimer = setInterval(measure, LEVEL_MS);
    }

    function stopLevel() {
        clearInterval(levelTimer);
        levelTimer = null;
    }

    function measure() {
        // nobody is looking; the light can catch up when the page is back
        if (document.hidden)
            return;
        analyser.getFloatTimeDomainData(samples);
        let sum = 0;
        for (let i = 0; i < samples.length; i++)
            sum += samples[i] * samples[i];
        const rms = Math.sqrt(sum / samples.length);
        const now = performance.now();
        if (rms > atcActivityThreshold)
            lastActive = now;
        setActive(now - lastActive < ACTIVE_HOLD_MS);
    }

    function setActive(on) {
        if (on == active)
            return;
        active = on;
        player.classList.toggle('is-active', on);
    }

    // ---- title -----------------------------------------------------------
    function startPolling() {
        stopPolling();
        if (!statusUrl)
            return;
        poll();
        pollTimer = setInterval(poll, POLL_MS);
    }

    function stopPolling() {
        clearInterval(pollTimer);
        pollTimer = null;
    }

    function poll() {
        fetch(statusUrl, { cache: 'no-store' })
            .then(function (res) { return res.ok ? res.json() : null; })
            .then(function (data) {
                if (wanted)
                    setTitle(titleFrom(data));
            })
            .catch(function () {
                if (wanted)
                    setTitle(null);
            });
    }

    // Icecast lists one mount as an object and several as an array
    function titleFrom(data) {
        let sources = data && data.icestats && data.icestats.source;
        if (!sources)
            return null;
        if (!Array.isArray(sources))
            sources = [sources];
        let src = sources.find(function (s) {
            return s && typeof s.listenurl == 'string'
                && s.listenurl.split('?')[0].endsWith('/' + mountName);
        });
        if (!src && sources.length == 1)
            src = sources[0];
        if (!src)
            return null;
        const t = src.title || src.server_name;
        return t ? String(t) : null;
    }

    function setTitle(t) {
        if (t == title)
            return;
        title = t;
        render();
    }

    // ---- presentation ----------------------------------------------------
    function setState(s) {
        state = s;
        render();
    }

    function render() {
        player.dataset.state = state;
        player.classList.toggle('is-muted', muted);

        const icon = toggleBtn.firstElementChild;
        icon.className = 'fa-solid ' + (wanted ? 'fa-stop' : 'fa-play');
        toggleBtn.title = wanted ? 'Stop the airband audio' : 'Start the airband audio';

        let text = atcStreamName;
        if (state == 'error')
            text = 'No stream';
        else if (state == 'playing' && title)
            text = title;
        titleEl.textContent = text;

        statusBtn.title = (muted ? 'Unmute' : 'Mute')
            + (state == 'playing' && webAudio == 'off'
                ? ' (this stream does not allow the activity light)' : '');
        statusBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');

        updateMediaSession();
    }

    // lock-screen and notification controls, with the channel as the title
    function updateMediaSession() {
        if (!('mediaSession' in navigator))
            return;
        try {
            if (wanted && typeof MediaMetadata == 'function') {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: (state == 'playing' && title) ? title : atcStreamName,
                    artist: 'tar1090',
                });
            }
            navigator.mediaSession.playbackState = wanted ? 'playing' : 'none';
        } catch (e) {
        }
    }

    if ('mediaSession' in navigator) {
        const handlers = { play: start, pause: stop, stop: stop };
        Object.keys(handlers).forEach(function (action) {
            try {
                navigator.mediaSession.setActionHandler(action, handlers[action]);
            } catch (e) {
                // an action this browser doesn't know
            }
        });
    }

    // ---- wiring ----------------------------------------------------------
    toggleBtn.addEventListener('click', function () {
        if (wanted)
            stop();
        else
            start();
    });

    // works while stopped too, so the audio can be started muted
    statusBtn.addEventListener('click', function () {
        muted = !muted;
        applyVolume();
        save();
        render();
    });

    function volumeTitle() {
        volumeEl.title = 'Volume ' + Math.round(volume * 100) + '%';
    }

    volumeEl.max = String(MAX_VOLUME);
    volumeEl.value = String(volume);
    volumeTitle();
    volumeEl.addEventListener('input', function () {
        volume = Number(volumeEl.value);
        volumeTitle();
        applyVolume();
        save();
    });

    applyVolume();
    render();
    player.hidden = false;
})();
