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
| `U` | only show military planes | `toggleMilitary()` | keep (somewhere) |
| `H` | Home / Reset Map | `resetMap()` | keep (somewhere)  |
| `T` | All Tracks | `selectAllPlanes()` | keep (somewhere)  |
| `RP` | Replay | `showReplayBar()` | keep (somewhere)  |
| `#tempTrailsBar` | Trail seconds | new, from this branch's parent | keep (somewhere)  |

## 2. Map chrome — side button column (`#header_side`)

| Id | Title | Function | Verdict |
|----|-------|----------|---------|
| — | Toggle sidebar | `toggles['sidebar_visible']` | keep |
| — | Expand / shrink sidebar | width control | keep |
| — | Fullscreen | | drop |
| — | Settings cog | opens `#settings_infoblock` | keep |
| `L` | Toggle Labels | `toggleLabels()` | keep |
| `O` | Toggle Label Extensions | `toggleExtendedLabels()` | replace with a label field picker: choose fields AND their order |
| `K` | Toggle Track Labels | `toggleTrackLabels()` | keep |
| `B` | Toggle Map Brightness | `MapDim` | merge |
| `V` | Table: only aircraft in view | `toggleTableInView()` | keep |
| `M` | Toggle MultiSelect | `toggleMultiSelect()` | keep |
| `P` | Persistence mode | `togglePersistence()` | keep |
| `I` | Isolate: only selected | `toggleIsolation()` | keep |
| `R` | Follow a random plane | `followRandomPlane()` | keep |
| `F` | Follow | `toggleFollow()` | keep |

`B` and `V` are already `display: none` in the markup.

## 3. Sidebar (`#sidebar_container`)

| Surface | What it is | Verdict |
|---------|-----------|---------|
| Aircraft table (`#planesTable`) | sortable list of all tracked aircraft | keep |
| Tabs (`#tabs`) | jQuery UI tabs above the table | keep (rebuild without jQuery UI) |
| Search / filter box | callsign, hex, type, operator | keep |
| Altitude filter | min/max sliders | keep |
| Altitude colour legend (`#legend`) | | keep (modernize if easily done) |
| Counters | total aircraft, with positions, message rate, history | show in the bottom of main map |
| Version footer | web interface + decoder version | keep |
| Altimeter (`#infoblock_altimeter`) | QNH input, currently `hidden` | drop |
| MP3 player (`#mp3player`) | currently `hidden` | drop |
| Resize splitter (`#splitter`) | drag to resize sidebar | keep |
| "More Table Lines" toggle | | drop - one density, tuned to look good |

## 4. Selected-aircraft infoblock (`#selected_infoblock`)

Roughly 70 fields. Grouped — mark the group, not each field.

| Group | Fields | Verdict |
|-------|--------|---------|
| Identity | callsign, ICAO hex, registration, country, airline, db flags | keep |
| Type | ICAO type, long type, operator, type description | keep |
| Photo | thumbnail + copyright + link (planespotters / planespotting.be) | keep (remove setting to choose, always use planespotters) |
| Route | origin/destination via route API, squawk | keep |
| Primary telemetry | altitude (baro + geom), speed, track, vertical rate, position, distance, source | keep |
| Secondary telemetry | TAS/IAS/Mach, wind dir/speed, OAT/TAT, QNH, roll, track rate, true/mag heading, mag declination | keep |
| Nav state | nav altitude, nav heading, nav modes, MCP altitude | keep |
| Signal quality | NIC, NAC_p, NAC_v, SIL, NIC_baro, RC, ADS-B version, category | keep |
| Message counters | message count, RSSI, receiver id, position epoch | keep |
| History / trace controls | trace date, leg selector, trace time (`#history_collapse`) | keep |
| Close button | `#infoblock_close` | keep |

NOTE: This UI should be refreshed and the most important things summarized at the top, like other sites (ex flightradar etc). Not just a table with labels to the left and values to the right. 

## 5. Hover infoblock (`#highlighted_infoblock`)

| Surface | What it is | Verdict |
|---------|-----------|---------|
| Mouse-over summary card | callsign, registration, type, airline, route, altitude, speed, source, RSSI | drop |
| `enableMouseover` toggle | turns the whole thing off | drop |

## 6. Settings panel (`#settings_infoblock`) — 29 toggles

| Key | Label | Verdict |
|-----|-------|---------|
| `darkMode` | Dark Mode | drop (ONLY DARK, NO THEMES) |
| `darkerColors` | Darker Colors | drop |
| `MapDim` | Dim Map | keep (adjustable would be best, like 3 levels of darkening) |
| `ColoredPlanes` | Colored Planes | keep, if not colored by altitude, then always yellow |
| `ColoredTrails` | Colored Trails | keep, if not colored by altitude, then always yellow |
| `SiteCircles` | Distance Circles | keep |
| `altitudeChart` | Altitude Chart | keep, modernize if possible |
| `autoselect` | Auto-select plane | keep |
| `enableMouseover` | Enable mouse-over block | drop |
| `wideInfoblock` | Wide Infoblock | drop, one size fits all (or freely resizeable) |
| `moreTableLines1` | More Table Lines | drop - one density, tuned to look good |
| `lastLeg` | Last Leg only | keep |
| `labelsGeom` | Labels: geom. alt. (WGS84) | folds into the label field picker |
| `geomUseEGM` | Geom. alt.: WGS84 → EGM conversion (long load) | keep, advanced (loads a 2.7 MB lib) |
| `baroUseQNH` | Baro. alt.: correct for QNH | keep, advanced |
| `utcTimesLive` | Live track labels: UTC | keep/merge/drop (one unverisal setting to use UTC ir browser local time for ALL things) |
| `utcTimesHistoric` | Historic track labels: UTC | keep/merge/drop (one unverisal setting to use UTC ir browser local time for ALL things) |
| `windLabelsSlim` | Smaller wind labels | drop, one size fits all |
| `showLabelUnits` | Label units | ofc units should be labeled |
| `shareFilters` | Include Filters In URLs | yes, nice to be able to link |
| `planespottingAPI` | Pictures planespotting.be | drop |
| `planespottersAPI` | Pictures planespotters.net | always use this, does not need to be configurable in UI |
| `useRouteAPI` | Lookup route | keep |
| `updateLocation` | Update GPS location | keep - uses device GPS instead of receiver position |
| `webgl` | WebGL | keep, advanced - fails on some drivers, has a canvas fallback |
| `debugTracks` | Debug Tracks | drop from UI (console logging only, stays a URL param) |
| `debugAll` | Debug show all | drop from UI (dev aid, stays a URL param) |
| Icon scale slider | `#iconScaleSlider` | keep |
| User scale slider | `#userScaleSlider` | keep |
| Ground vehicles filter | `#groundvehicle_filter` | keep |
| Non-ICAO targets filter | `#blockedmlat_filter` | keep |
| Reset All Settings | button | keep |

## 7. Map overlays and panels

| Surface | What it is | Verdict |
|---------|-----------|---------|
| Layer switcher | `ol-layerswitcher`, all basemaps + overlays | keep |
| OpenAIP vector panel (`#openaip_vector_panel`) | per-category airspace filters + opacity | keep |
| Altitude chart (`#altitude_chart`) | altitude vs time for selected aircraft | keep |
| Replay bar (`#replayBar`) | date/time scrubbing through history | keep |
| Range outline / distance rings | drawn on the map | keep |
| Heatmap view | `?heatmap` mode | keep |
| Site marker | receiver location | keep |
| Error boxes | update error, timers paused, generic error, JS error | keep ofc? |
| Loader | startup progress bar | just a simple spinner is fine |

## 8. Mobile-specific (added on `ai-slop`)

| Surface | What it is | Verdict |
|---------|-----------|---------|
| Bottom sheet (`#mobile_summary`) | collapsed summary + expandable detail | keep (look and feel match that desktop version) |
| Sheet handle / drag | | keep |
| Expanded close button | | keep |
| Sidebar hidden on load at ≤600px | | keep |

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
| `G` | no-GPS only | drop |
| `j` | jump to a hex | |
| `D` `P` `J` `N` `?` | debug toggles (console only) | |

---

## Questions I can't answer from the code

1. **Sidebar or infoblock** — on desktop, do you read aircraft detail mainly in
   the sidebar table or in the selected-aircraft infoblock? The new layout
   should favour whichever one you actually live in.
   Answer: Mostly by clickin on plane and reading the infoblock.
2. **Phone use** — glancing at what's overhead right now, or real work
   (searching, filtering, reading trace history)? Changes how much has to fit.
   Answer: Mostly checking map and clicking on different ones. Simpler use.
3. **Anything missing** that you wish existed. Easier to design in now than bolt on.
   Answer: a label field picker - choose which fields show on map labels and in
   what order, replacing the `O` cycle-through-modes button.
