"""Apply a checksummed source delta to the isolated staging branch only."""
import base64, hashlib, json, zlib
from pathlib import Path
root=Path(__file__).resolve().parents[1]
encoded=''.join((root/f'maintenance/release-12-{i}.b64').read_text().strip() for i in range(4))
raw=zlib.decompress(base64.b64decode(encoded,validate=True))
assert hashlib.sha256(raw).hexdigest()=='d286396c82421a71562a473bf3333158b32354676d971503b2e6d5abc55fff65', 'Transfer checksum mismatch'
changes=json.loads(raw)
outputs=[]
for change in changes:
 path=(root/change['path']).resolve()
 assert path.is_relative_to(root) and '.git' not in path.relative_to(root).parts
 old=path.read_text() if path.exists() else ''
 digest=hashlib.sha256(old.encode()).hexdigest()
 if digest==change['after']:
  continue
 assert (digest==change['before'] if change['before'] else not path.exists()), 'Base changed: '+change['path']
 for start,end,text in reversed(change['edits']):
  old=old[:start]+text+old[end:]
 assert hashlib.sha256(old.encode()).hexdigest()==change['after'], 'Output mismatch: '+change['path']
 outputs.append((path,old))
for path,text in outputs:
 path.parent.mkdir(parents=True,exist_ok=True)
 path.write_text(text)
 print('Applied',path.relative_to(root))
