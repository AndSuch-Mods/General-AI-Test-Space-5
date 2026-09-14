# Deadblock 1.2.0

An original single-player, Boxhead-inspired survival game for iPhone and desktop. The game is hosted at https://andsuch-mods.github.io/General-AI-Test-Space-5/ .

## This update

- Landscape-only play. The manifest requests landscape and the game attempts the browser orientation lock. Where the browser rejects it, a rotate prompt blocks play and saves/pauses the run. Returning to landscape keeps the run paused until Resume is pressed, and viewport sizing follows Safari's visible area.
- Faces use head-local geometry, with rear-facing eyes culled and horns attached to the head's rotated top surface.
- New games begin in preparation. Between rounds: Armory, Exit shop, Preparation, Start wave. Prep has no time limit or enemy spawns. Walk, aim, dash, and place defenses; gunfire/grenades are disabled until combat starts. The single save includes the preparation phase.
- A dedicated DEFENSES shop tab contains structure walls (400 HP each), barrels, mines and turrets. Walls and barrels snap to a 40-unit grid to create connected lines. Up to 64 defenses are supported. Zombies route around them where possible and break through if blocked.
- Dead runway adds a long airstrip with every enemy type entering from the west end only. The west spawn segment avoids the side walls.
- The standard camera shows approximately 10% more width and height than 1.1, without adding a zoom setting.

### Retained from 1.1

- Manual player aiming and firing only. The auto-fire switch and targeting behavior are removed. Sentry turrets still aim independently.
- A compact, translucent bottom row: dash, frag, selected defense, current gun, and More. The row does not grow as weapons are purchased.
- More pauses the game and opens the weapon/deployable selector. Closing it resumes the fight.
- Seven arenas, including Dead runway, The gauntlet and Red rite, with actual north/south/east/west spawn restrictions shown in each preview.
- Arenas are now 2160 by 1520 world units, up from 1440 by 1000. The camera also shows a wider area. Character size, weapon ranges, enemy abilities and movement speed are unchanged.
- Block characters, horned red devils and bosses, and distinct weapon illustrations.
- Health, ammunition, grenades, barrels, mines, barricades and rare turret pickups.

This is not the original Flash game. It does not include the original assets, co-op or deathmatch. More elaborate interactive scenery remains future work.

## iPhone

Play in landscape. Native orientation locking depends on the browser; the rotate-and-pause guard is always used when a touch device switches to portrait. No installation can promise to override an operating-system rotation restriction.

Open the game in Safari and use Share, then Add to Home Screen. Launch from that icon for your main run. Use the left stick to move and drag the right stick to aim and shoot. Release it to stop firing. The buttons throw a frag, dash, or deploy the selected defense. More opens the rest of your equipment. During prep, the right stick only aims, and the selected defense button places the previewed item. Open Shop to buy more, then Exit shop to keep preparing. Start wave begins the countdown.

Use the same Safari or installed-app context to continue a run. Their storage may be separate. This game has no cloud save.

## Updating an existing installation

Open the game while online. It downloads the complete new cache without refreshing an active run. Pause, then close and reopen or reload once to use the new version. The lobby should show 1.2.0, and AUTO FIRE should be gone. The update page at `update.html` also checks installation once the old worker has refreshed.

Do not clear website data to update: that removes the save. Existing 1.1 runs keep their geometry and progress. Existing 1.0 runs migrate their positions into the larger arena while retaining the run ID, wave, health, purchases, ammunition and credits.

## One save slot

The run autosaves every second, on pause and when switching apps. A new game asks before replacing it. Death clears the run, but settings and personal best records remain. Browser storage cleanup can still remove local saves. The app pauses in the background, so enemies do not advance while it is hidden.

## Desktop controls

WASD or arrows move. Mouse aims; click or Space fires. Q/E or 1–8 selects a gun. Shift dashes. G throws a grenade. B deploys the selected defense. M opens More. P or Escape pauses.

## Development

No runtime dependencies. Serve the repository over HTTP, not a file URL:

```sh
python3 -m http.server 8000
npm test
```

Local test hooks require `?test=1` on localhost or 127.0.0.1 and are never exposed on GitHub Pages. Browser tests exercise mobile layouts, movement, firing, loadout selection, purchases, save restoration, death, an old service-worker upgrade and offline navigation under the Pages subpath. `tests/live.py` checks that published assets match the repository and that the public game starts and resumes in a mobile-sized WebKit browser. A physical iPhone still needs playtesting for comfort and performance.

Run `npm test` for simulation and geometry tests. `tests/browser.py` checks touch controls, preparation, orientation recovery, save restoration and cache updates in Chromium and WebKit. `tests/live.py` verifies the deployed assets byte-for-byte and exercises the production Pages site in mobile WebKit. Production does not expose test hooks.


## 1.3.0 art update

The player and all six enemy types now use original voxel models based on the approved character sheet. The survivor wears olive gear with light blood marks. The bomber has a visible explosive vest; the heavy demon has a wider silhouette, armor and chains. Enemy abilities, stats, colliders, save schema, maps, preparation, manual fire and landscape handling are unchanged.

Faces and equipment are projected in model space with back-face culling. Eyes are drawn on the head's front surface, not over the back of the skull. Overlapping horn segments attach directly to the head. Character sprites are cached at 32 directions and four gait poses, with a bounded 768-entry cache. The blood setting also controls character stains.

The second approved survivor/demon image supplies the iPhone Home Screen icon. Versioned 180, 192 and 512 pixel PNGs are generated from `assets/icon-approved.webp`. Run `python scripts/release_art.py` with Pillow to regenerate them. The source SHA-256 is checked before processing. The game does not load remote art or fonts.

Existing saves remain in the same storage slot. Loading 1.3.0 does not start a new run. Home Screen launchers can retain an old icon independently of the game's cache; do not clear website data to update the artwork.
