# Deadblock 1.4.0: real 3D

The game now runs on a WebGL 2 renderer using Three.js r180. Character artwork is real, lit 3D geometry, not pre-rendered sprites or a new concept sheet. The fixed orthographic camera looks down at 52 degrees so the front, side, and top surfaces remain visible without perspective size changes.

Play: https://andsuch-mods.github.io/General-AI-Test-Space-5/
Live model viewer: https://andsuch-mods.github.io/General-AI-Test-Space-5/models.html

## Models and rendering

`src/models3d.js` defines the survivor and six enemy classes. The models have 120–195 primary modeled pieces plus smaller surface-relief patches before batching, with chamfered surfaces, equipment, layered clothing, recessed facial features, attached horns, teeth, explosives, armor and open chain links. Fixed details are merged into animated body sections and instanced across the horde. The model viewer uses the same geometry and materials as gameplay. The approved sheet is a visual reference, not an automatically converted GLB asset or a promise of an exact match to generated art.

`src/renderer3d.js` renders the arena, defenses, characters, projectiles and effects. `src/camera3d.js` handles the orthographic projection and mapping touch/mouse directions to the simulation plane. The existing Canvas renderer remains in source for its map preview and weapon illustrations, but it no longer renders gameplay characters. The legacy character module remains as historical source with separate tests.

Rendering resolution is capped at 2.2 million pixels, with a lower quality mode and one directional shadow map. Models use no runtime image textures. Meshes are depth-tested and opaque; face details do not render through the head. Effects and health labels use an overlay, not character sprites. WebGL context loss pauses the run and saves it, and recovery leaves the game paused until Resume.

## Gameplay and saves

This release preserves the existing simulation, enemy statistics, collision footprints, seven maps including the one-ended runway, manual firing, inter-wave preparation, destructible structure walls, barrel chains, pickups and single-run autosave. It does not add new gameplay features or reset saved runs. Death and a confirmed new game still clear/replace the active run. Settings and best scores remain separate. Saves are local to the browser or installed Home Screen app and do not sync through GitHub.

The existing landscape gate and WebKit viewport handling remain. The standard camera shows approximately the same horizontal world span as 1.3, with the angled projection providing a deeper ground view. No camera rotation occurs during play.

## iPhone and offline installation

Open the play page in Safari, then Share, Add to Home Screen, and Open as Web App when offered. Install before starting the main run because Safari and the installed app may use separate storage. Load online until OFFLINE READY appears. The whole 3D engine is hosted and cached with the game, with no CDN dependency at play time. An existing installation can use `update.html` to update without clearing localStorage. Do not clear website data to force a refresh.

WebGL 2 is required. An initialization failure displays a recovery message without modifying the save. Automated desktop WebKit tests are not a substitute for testing frame rate, battery use, and touch feel on a physical iPhone.

## Verification

Run `npm test` for simulation, storage, geometry, camera, and model tests. The vendored engine does not require `npm install` to play or test. Run a static HTTP server from the repository root for development. Browser tests use Python Playwright and Chromium/WebKit; CI installs the pinned test version and captures gameplay/model screenshots. `tests/webgl.py` exercises all model directions, a dense horde, draw counts, graphics-context recovery, blood visibility, and weapon-resource disposal. `tests/browser.py` retains the gameplay, rotation, preparation, and offline-save checks. `tests/live.py` compares deployed bytes with the tested repository and opens the real Pages game.

## Third-party license

Three.js 0.180.0 is included in `vendor/`, pinned to r180, with its MIT license in `vendor/THREE-LICENSE.txt`. It is loaded locally rather than from a CDN. Original project code and art are not taken from Boxhead. Sean Cooper's Boxhead series inspired the gameplay; this remains an unofficial, single-player homage.
