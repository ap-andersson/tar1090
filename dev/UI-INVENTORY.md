# UI inventory — mark up before the refresh starts

Every user-facing surface in the frontend, so we can decide what the new UI
carries over. Fill in the **Verdict** column and nothing else is needed from you.

Verdicts:

- `keep`   — I use this, it must survive
- `merge`  — useful but shouldn't be its own thing; fold it somewhere sensible
- `drop`   — I have never used this
- `?`      — not sure, ask me again later

Desktop is the primary target, phone must work well too.

---

## 1. Map chrome — top button row (`#header_top`)

| Id | Title | Function | Verdict |
|----|-------|----------|---------|
| `U` | only show military planes | `toggleMilitary()` | |
| `H` | Home / Reset Map | `resetMap()` | |
| `T` | All Tracks | `selectAllPlanes()` | |
| `RP` | Replay | `showReplayBar()` | |
| `#tempTrailsBar` | Trail seconds | new, from this branch's parent | |

## 2. Map chrome — side button column (`#header_side`)

| Id | Title | Function | Verdict |
|----|-------|----------|---------|
| — | Toggle sidebar | `toggles['sidebar_visible']` | |
| — | Expand / shrink sidebar | width control | |
| — | Fullscreen | | |
| — | Settings cog | opens `#settings_infoblock` | |
| `L` | Toggle Labels | `toggleLabels()` | |
| `O` | Toggle Label Extensions | `toggleExtendedLabels()` | |
| `K` | Toggle Track Labels | `toggleTrackLabels()` | |
| `B` | Toggle Map Brightness | `MapDim` | |
| `V` | Table: only aircraft in view | `toggleTableInView()` | |
| `M` | Toggle MultiSelect | `toggleMultiSelect()` | |
| `P` | Persistence mode | `togglePersistence()` | |
| `I` | Isolate: only selected | `toggleIsolation()` | |
| `R` | Follow a random plane | `followRandomPlane()` | |
| `F` | Follow | `toggleFollow()` | |

`B` and `V` are already `display: none` in the markup.

## 3. Sidebar (`#sidebar_container`)

| Surface | What it is | Verdict |
|---------|-----------|---------|
| Aircraft table (`#planesTable`) | sortable list of all tracked aircraft | |
| Tabs (`#tabs`) | jQuery UI tabs above the table | |
| Search / filter box | callsign, hex, type, operator | |
| Altitude filter | min/max sliders | |
| Altitude colour legend (`#legend`) | | |
| Counters | total aircraft, with positions, message rate, history | |
| Version footer | web interface + decoder version | |
| Altimeter (`#infoblock_altimeter`) | QNH input, currently `hidden` | |
| MP3 player (`#mp3player`) | currently `hidden` | |
| Resize splitter (`#splitter`) | drag to resize sidebar | |
| "More Table Lines" toggle | | |

## 4. Selected-aircraft infoblock (`#selected_infoblock`)

Roughly 70 fields. Grouped — mark the group, not each field.

| Group | Fields | Verdict |
|-------|--------|---------|
| Identity | callsign, ICAO hex, registration, country, airline, db flags | |
| Type | ICAO type, long type, operator, type description | |
| Photo | thumbnail + copyright + link (planespotters / planespotting.be) | |
| Route | origin/destination via route API, squawk | |
| Primary telemetry | altitude (baro + geom), speed, track, vertical rate, position, distance, source | |
| Secondary telemetry | TAS/IAS/Mach, wind dir/speed, OAT/TAT, QNH, roll, track rate, true/mag heading, mag declination | |
| Nav state | nav altitude, nav heading, nav modes, MCP altitude | |
| Signal quality | NIC, NAC_p, NAC_v, SIL, NIC_baro, RC, ADS-B version, category | |
| Message counters | message count, RSSI, receiver id, position epoch | |
| History / trace controls | trace date, leg selector, trace time (`#history_collapse`) | |
| Close button | `#infoblock_close` | |

## 5. Hover infoblock (`#highlighted_infoblock`)

| Surface | What it is | Verdict |
|---------|-----------|---------|
| Mouse-over summary card | callsign, registration, type, airline, route, altitude, speed, source, RSSI | |
| `enableMouseover` toggle | turns the whole thing off | |

## 6. Settings panel (`#settings_infoblock`) — 29 toggles

| Key | Label | Verdict |
|-----|-------|---------|
| `darkMode` | Dark Mode | |
| `darkerColors` | Darker Colors | |
| `MapDim` | Dim Map | |
| `ColoredPlanes` | Colored Planes | |
| `ColoredTrails` | Colored Trails | |
| `SiteCircles` | Distance Circles | |
| `altitudeChart` | Altitude Chart | |
| `autoselect` | Auto-select plane | |
| `enableMouseover` | Enable mouse-over block | |
| `wideInfoblock` | Wide Infoblock | |
| `moreTableLines1` | More Table Lines | |
| `lastLeg` | Last Leg only | |
| `labelsGeom` | Labels: geom. alt. (WGS84) | |
| `geomUseEGM` | Geom. alt.: WGS84 → EGM conversion (long load) | |
| `baroUseQNH` | Baro. alt.: correct for QNH | |
| `utcTimesLive` | Live track labels: UTC | |
| `utcTimesHistoric` | Historic track labels: UTC | |
| `windLabelsSlim` | Smaller wind labels | |
| `showLabelUnits` | Label units | |
| `shareFilters` | Include Filters In URLs | |
| `planespottingAPI` | Pictures planespotting.be | |
| `planespottersAPI` | Pictures planespotters.net | |
| `useRouteAPI` | Lookup route | |
| `updateLocation` | Update GPS location | |
| `webgl` | WebGL | |
| `debugTracks` | Debug Tracks | |
| `debugAll` | Debug show all | |
| Icon scale slider | `#iconScaleSlider` | |
| User scale slider | `#userScaleSlider` | |
| Ground vehicles filter | `#groundvehicle_filter` | |
| Non-ICAO targets filter | `#blockedmlat_filter` | |
| Reset All Settings | button | |

## 7. Map overlays and panels

| Surface | What it is | Verdict |
|---------|-----------|---------|
| Layer switcher | `ol-layerswitcher`, all basemaps + overlays | |
| OpenAIP vector panel (`#openaip_vector_panel`) | per-category airspace filters + opacity | |
| Altitude chart (`#altitude_chart`) | altitude vs time for selected aircraft | |
| Replay bar (`#replayBar`) | date/time scrubbing through history | |
| Range outline / distance rings | drawn on the map | |
| Heatmap view | `?heatmap` mode | |
| Site marker | receiver location | |
| Error boxes | update error, timers paused, generic error, JS error | |
| Loader | startup progress bar | |

## 8. Mobile-specific (added on `ai-slop`)

| Surface | What it is | Verdict |
|---------|-----------|---------|
| Bottom sheet (`#mobile_summary`) | collapsed summary + expandable detail | |
| Sheet handle / drag | | |
| Expanded close button | | |
| Sidebar hidden on load at ≤600px | | |

## 9. Keyboard shortcuts

Desktop-only, but they define what "fast access" means — worth knowing which
you actually use, since those are the ones that need a visible control too.

| Keys | Action | Verdict |
|------|--------|---------|
| `c` / `Esc` | deselect all | |
| `q` `e` / `-` `+` | zoom out / in | |
| `w` `a` `s` `d` / arrows | pan | |
| `h` | reset map | |
| `H` | show/hide all buttons | |
| `t` | all tracks | |
| `u` | military only | |
| `i` | isolate selected | |
| `m` | multiselect | |
| `f` | follow | |
| `r` | random plane | |
| `R` | force refetch | |
| `p` | persistence | |
| `l` `o` `k` | labels / extensions / track labels | |
| `v` | table in view | |
| `Y` | replay bar | |
| `G` | no-GPS only | |
| `j` | jump to a hex | |
| `D` `P` `J` `N` `?` | debug toggles (console only) | |

---

## Questions I can't answer from the code

1. **Sidebar or infoblock** — on desktop, do you read aircraft detail mainly in
   the sidebar table or in the selected-aircraft infoblock? The new layout
   should favour whichever one you actually live in.
2. **Phone use** — glancing at what's overhead right now, or real work
   (searching, filtering, reading trace history)? Changes how much has to fit.
3. **Anything missing** that you wish existed. Easier to design in now than bolt on.
