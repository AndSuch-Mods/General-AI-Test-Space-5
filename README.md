# Deadblock 1.1.0

An original single-player, Boxhead-inspired survival game for iPhone and desktop. The game is hosted at https://andsuch-mods.github.io/General-AI-Test-Space-5/ .

## This update

- Manual player aiming and firing only. The auto-fire switch and targeting behavior are removed. Sentry turrets still aim independently.
- A compact, translucent bottom row: dash, frag, selected defense, current gun, and More. The row does not grow as weapons are purchased.
- More pauses the game and opens the weapon/deployable selector. Closing it resumes the fight.
- Six arenas, including The gauntlet and Red rite, with actual north/south/east/west spawn restrictions shown in each preview.
- Arenas are now 2160 by 1520 world units, up from 1440 by 1000. The camera also shows a wider area. Character size, weapon ranges, enemy abilities and movement speed are unchanged.
- Block characters, horned red devils and bosses, and distinct weapon illustrations.
- Health, ammunition, grenades, barrels, mines, barricades and rare turret pickups.

This is not the original Flash game. It does not include the original assets, co-op or deathmatch. More elaborate interactive scenery remains future work.

## iPhone

Open the game in Safari and use Share, then Add to Home Screen. Launch from that icon for your main run. Use the left stick to move and drag the right stick to aim and shoot. Release it to stop firing. The buttons throw a frag, dash, or deploy the selected defense. More opens the rest of your equipment.

Use the same Safari or installed-app context to continue a run. Their storage may be separate. This game has no cloud save.

## Updating an existing installation

Open the game while online. It downloads the complete new cache without refreshing an active run. Pause, then close and reopen or reload once to use the new version. The lobby should show 1.1.0, and AUTO FIRE should be gone. The update page at `update.html` also checks installation once the old worker has refreshed.

Do not clear website data to update: that removes the save. Existing 1.0 runs migrate their positions into the larger arena while retaining the run ID, wave, health, purchases, ammunition and credits.

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
