"""Install the approved art assets without replacing gameplay or saved-run code."""
from pathlib import Path
import hashlib, json
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/'assets'
SOURCE=ASSETS/'icon-approved.webp'
EXPECTED='d5658a55325afb2dc3b29e1d623ea0f67450e602c6727ed2bec6a180cf45e6b4'
parts=[ASSETS/f'icon-transfer-{i}.part' for i in range(4)]
if not SOURCE.exists():
    data=b''.join(p.read_bytes() for p in parts)
    if hashlib.sha256(data).hexdigest()!=EXPECTED:
        raise ValueError('Approved icon transfer failed its checksum')
    SOURCE.write_bytes(data)
if hashlib.sha256(SOURCE.read_bytes()).hexdigest()!=EXPECTED:
    raise ValueError('The source icon is not the approved second image')
with Image.open(SOURCE) as image:
    image=image.convert('RGB')
    if image.size!=(512,512):raise ValueError('Unexpected icon size')
    for size in [180,192,512]:
        image.resize((size,size),Image.Resampling.LANCZOS).save(ASSETS/f'icon-{size}-v1.3.png',optimize=True)
    image.save(ROOT/'icon.png',optimize=True)
for part in parts:
    if part.exists():part.unlink()

p=ROOT/'src/renderer.js';s=p.read_text()
s=s.replace("import {headFeatures} from './model.js';","import {drawCharacter} from './characters.js';")
a=s.index('    actor(e, player = false)');b=s.index('    wall(w, map)',a)
s=s[:a]+"""    actor(e, player = false) {
        drawCharacter(this.c,e,{player,weapon:this.state.weapon,blood:this.settings.blood!==false,time:this.time});
    }
"""+s[b:];p.write_text(s)
p=ROOT/'src/data.js';s=p.read_text().replace("VERSION = '1.2.0'","VERSION = '1.3.0'")
for old,new in [('Shambler','Standard zombie'),('Runner','Fast zombie'),('Brute','Heavy zombie'),('Cinder','Demon zombie'),('Bloater','Suicide bomber zombie'),('The warden','Heavy demon zombie')]:
    s=s.replace("name:'"+old+"'","name:'"+new+"'")
p.write_text(s)
p=ROOT/'index.html';s=p.read_text().replace('v1.2.0','v1.3.0')
s=s.replace('<link rel="icon" type="image/svg+xml" href="./icon.svg">','<link rel="icon" type="image/png" sizes="192x192" href="./assets/icon-192-v1.3.png">')
s=s.replace('<link rel="apple-touch-icon" href="./icon.png">','<link rel="apple-touch-icon" sizes="180x180" href="./assets/icon-180-v1.3.png">')
p.write_text(s)
p=ROOT/'manifest.webmanifest';d=json.loads(p.read_text());d['icons']=[
    {'src':f'./assets/icon-{size}-v1.3.png','sizes':f'{size}x{size}','type':'image/png','purpose':'any'} for size in [192,512]]
p.write_text(json.dumps(d,indent=2)+'\n')
p=ROOT/'sw.js';s=p.read_text().replace("CACHE=PREFIX+'1.2.0'","CACHE=PREFIX+'1.3.0'")
if "'./src/characters.js'" not in s:s=s.replace("'./src/model.js'","'./src/characters.js','./src/model.js'")
if "'./assets/icon-180-v1.3.png'" not in s:s=s.replace("'./icon.png'","'./icon.png','./assets/icon-180-v1.3.png','./assets/icon-192-v1.3.png','./assets/icon-512-v1.3.png'")
p.write_text(s)
p=ROOT/'release.json';d=json.loads(p.read_text());d.update(version='1.3.0',characterArt='voxel-concrete',modelTypes=7,icon='approved-second');p.write_text(json.dumps(d,separators=(',',':'))+'\n')
p=ROOT/'package.json';p.write_text(p.read_text().replace('1.2.0','1.3.0'))
# Existing tests are release-specific; keep their assertions on the shipped version.
for name in ['tests/browser.py','tests/live.py']:
    p=ROOT/name;p.write_text(p.read_text().replace('1.2.0','1.3.0'))
p=ROOT/'tests/live.py';s=p.read_text()
s=s.replace("FILES=['index.html'","FILES=['src/characters.js','assets/icon-180-v1.3.png','assets/icon-192-v1.3.png','assets/icon-512-v1.3.png','index.html'")
s=s.replace("'15 live assets match repository'","'live code and icon assets match repository'")
p.write_text(s)
p=ROOT/'README.md';s=p.read_text()
if '## 1.3.0 art update' not in s:
    s+="""

## 1.3.0 art update

The player and all six enemy types now use original voxel models based on the approved character sheet. The survivor wears olive gear with light blood marks. The bomber has a visible explosive vest; the heavy demon has a wider silhouette, armor and chains. Enemy abilities, stats, colliders, save schema, maps, preparation, manual fire and landscape handling are unchanged.

Faces and equipment are projected in model space with back-face culling. Eyes are drawn on the head's front surface, not over the back of the skull. Overlapping horn segments attach directly to the head. Character sprites are cached at 32 directions and four gait poses, with a bounded 256-entry cache. The blood setting also controls character stains.

The second approved survivor/demon image supplies the iPhone Home Screen icon. Versioned 180, 192 and 512 pixel PNGs are generated from `assets/icon-approved.webp`. Run `python scripts/release_art.py` with Pillow to regenerate them. The source SHA-256 is checked before processing. The game does not load remote art or fonts.

Existing saves remain in the same storage slot. Loading 1.3.0 does not start a new run. Home Screen launchers can retain an old icon independently of the game's cache; do not clear website data to update the artwork.
"""
p.write_text(s)
print('Art release prepared. Gameplay, storage, viewport and map code preserved.')
