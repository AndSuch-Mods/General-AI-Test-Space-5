"""Apply a reviewed release delta only to the exact expected source files.

Before/after SHA-256 checks prevent applying offsets to a different revision.
The resulting ordinary source files are tested and committed on the staging branch.
"""
from pathlib import Path
import hashlib,json
ROOT=Path(__file__).resolve().parents[1]
ALLOWED={'src/data.js','src/app.js','src/engine.js','src/renderer.js','src/storage.js','index.html','styles.css','sw.js','update.html','release.json','package.json','tests/browser.py','tests/engine.test.js','tests/mobile.test.js','tests/live.py','tests/fixtures/sw-v1.js','README.md'}
sha=lambda text:hashlib.sha256(text.encode('utf-8')).hexdigest()
changes=[]
for patch in sorted((ROOT/'maintenance').glob('patch-*.json')):
 for item in json.loads(patch.read_text(encoding='utf-8')):
  assert item['path'] in ALLOWED,item['path']
  path=ROOT/item['path'];text=path.read_text(encoding='utf-8') if path.exists() else ''
  if sha(text)==item['after']:continue
  assert sha(text)==item['before'],'Source changed: '+item['path']
  for start,end,replacement in reversed(item['edits']):
   assert 0<=start<=end<=len(text),item['path']
   text=text[:start]+replacement+text[end:]
  assert sha(text)==item['after'],'Patch integrity failed: '+item['path']
  changes.append((path,text))
# Validate the entire patch set before changing any file.
for path,text in changes:
 path.parent.mkdir(parents=True,exist_ok=True);path.write_text(text,encoding='utf-8');print('Applied',path.relative_to(ROOT))
