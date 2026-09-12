# Deadblock: Last stand

An original, single-player Boxhead-inspired survival game, made for a browser and an iPhone Home Screen web app.

**Play:** https://andsuch-mods.github.io/General-AI-Test-Space-5/

## What's in it

Four original arenas, three difficulty levels, endless escalating waves, six enemy types, and a warden every fifth wave. Eight guns span the unlimited-ammo pistol, SMG, shotgun, carbine, flamethrower, piercing rail rifle, rocket launcher, and minigun. An armory between waves sells weapons, six upgrade tracks, ammunition, healing, grenades, explosive barrels, mines, barricades, and sentry turrets. Kill chains increase score and award permanent bonuses for the current run.

This is newly written code with original procedural artwork and synthesized audio. It is not an official Boxhead release, an exact replica of every original level, or an emulated Flash game. It does not include multiplayer.

## Install on iPhone

Open the play link in Safari. Choose Share, Add to Home Screen, enable Open as Web App when offered, and Add. Launch from the icon. Landscape gives a wider view; portrait also works. Install before beginning a long run, because Safari and the installed app may not share storage. Wait for OFFLINE READY on the menu before relying on offline play.

## Controls

| Action | Touch | Keyboard and mouse |
| --- | --- | --- |
| Move | Left stick | WASD or arrow keys |
| Aim and fire | Right stick | Mouse and left button; Space also fires |
| Auto fire | Toggle in upper right | Same toggle |
| Change gun | Tap gun in weapon strip | 1–8, Q/E |
| Dash | Dash button | Shift |
| Grenade | Frag button | G |
| Place defense | Selected defense button | B |
| Cycle defense | Circular arrow | T |
| Pause | Pause button | Escape or P |

Auto fire starts enabled. Manual aim overrides it. Your explosions can hurt you. Walls block shots and blasts. Mines do not damage the player.

## One save, one life

The complete active run is saved locally every second and on pause, purchases, wave transitions, and page hiding. Continue restores the current wave, player, enemies, projectiles, defenses, currency, weapons, ammo, upgrades, and random state. No time advances while the app is closed.

Starting a new run replaces the previous save after confirmation. Death deletes the run save immediately. High scores and settings are separate and remain. Another open window cannot overwrite or resurrect a run after it has been taken over or cleared.

There is no account, server, or cloud save. Use the same browser or installed app. Clearing website data, private browsing cleanup, device storage eviction, or uninstalling may remove progress. An abrupt process kill can lose the fraction of a second since the last successful save. The app displays a warning when storage is unavailable; no browser can guarantee persistence when the operating system removes its data.

## Local development and tests

No runtime dependencies, build tool, or paid services are needed. Node.js is only needed for tests.

```sh
npm test
python3 -m http.server 8000
```

Open http://localhost:8000. For browser tests:

```sh
python -m pip install playwright==1.62.0
python -m playwright install --with-deps chromium webkit
python tests/browser.py
```

The GitHub verification workflow runs unit tests plus Chromium and WebKit browser tests, saves screenshots, and publishes the source as an artifact. Test hooks require both a local hostname and the `?test=1` query; they are not exposed on GitHub Pages. Browser emulation is not a substitute for a physical iPhone test.

Files in the repository root can be served directly by GitHub Pages. `.nojekyll` prevents Jekyll processing. The service worker only manages caches prefixed `deadblock-survival-` and waits for old windows to close before activating an update. Increase its cache version whenever shipping changed assets.

## Inspiration and references

Sean Cooper created the Boxhead series. More Rooms supplied the central inspiration: blocky characters, escalating hordes, weapon progression, kill chains, fireball enemies, and selectable difficulty. The Zombie Wars added defensive placements between waves. This version combines those ideas with a credit-based armory, touch aiming, and single-run persistence rather than copying original source, sounds, or levels.

- Original sponsor's series history: https://www.crazymonkeygames.com/series/Boxhead-Series.php
- Apple's iPhone web-app instructions: https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios
- Playwright CI documentation: https://playwright.dev/python/docs/ci

No ads, analytics, remote fonts, or third-party game assets are loaded.
