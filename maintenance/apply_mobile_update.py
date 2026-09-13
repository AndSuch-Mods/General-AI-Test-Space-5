"""Apply ordered release deltas with before/after hashes before writing any file."""
from pathlib import Path
import hashlib,json
ROOT=Path(__file__).resolve().parents[1]
ALLOWED={'src/data.js','src/app.js','src/engine.js','src/renderer.js','src/storage.js','index.html','styles.css','sw.js','update.html','release.json','package.json','tests/browser.py','tests/engine.test.js','tests/mobile.test.js','tests/live.py','tests/fixtures/sw-v1.js','README.md'}
sha=lambda text:hashlib.sha256(text.encode('utf-8')).hexdigest()
changes={}
for patch in sorted((ROOT/'maintenance').glob('patch-*.json')):
 for item in json.loads(patch.read_text(encoding='utf-8')):
  assert item['path'] in ALLOWED,item['path']
  path=ROOT/item['path']
  text=changes.get(path,path.read_text(encoding='utf-8') if path.exists() else '')
  if sha(text)==item['after']:continue
  assert sha(text)==item['before'],'Source changed: '+item['path']
  for start,end,replacement in reversed(item['edits']):
   assert 0<=start<=end<=len(text),item['path']
   text=text[:start]+replacement+text[end:]
  assert sha(text)==item['after'],'Patch integrity failed: '+item['path']
  changes[path]=text
for path,text in changes.items():
 path.parent.mkdir(parents=True,exist_ok=True);path.write_text(text,encoding='utf-8');print('Applied',path.relative_to(ROOT))
