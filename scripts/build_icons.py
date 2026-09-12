"""Build original, opaque, mask-safe PNG app icons without third-party packages."""
from pathlib import Path
import struct
import zlib

RECTS=[(0,0,512,512,'344534'),(82,422,430,446,'273626'),(144,342,228,426,'25312b'),(268,342,352,426,'25312b'),(118,220,392,354,'ae4930'),(92,236,142,342,'813b2b'),(370,236,420,342,'813b2b'),(160,96,344,252,'c5c9a7'),(344,96,372,274,'899879'),(160,74,344,96,'dce0bc'),(180,146,220,177,'344534'),(280,146,320,177,'344534'),(200,210,294,227,'798366'),(221,282,331,310,'efd6a0'),(300,306,326,340,'efd6a0'),(100,390,128,404,'ac6b44'),(384,86,412,100,'ac6b44')]
def chunk(name,data):
    return struct.pack('>I',len(data))+name+data+struct.pack('>I',zlib.crc32(name+data)&0xffffffff)
def png(size):
    pixels=bytearray(size*size*3)
    for x0,y0,x1,y1,color in RECTS:
        rgb=bytes.fromhex(color)
        for y in range(round(y0*size/512),round(y1*size/512)):
            for x in range(round(x0*size/512),round(x1*size/512)):
                index=(y*size+x)*3
                pixels[index:index+3]=rgb
    raw=b''.join(b'\0'+pixels[y*size*3:(y+1)*size*3] for y in range(size))
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',size,size,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(raw,9))+chunk(b'IEND',b'')
if __name__=='__main__':
    folder=Path(__file__).resolve().parent.parent/'icons'
    folder.mkdir(exist_ok=True)
    for size,name in [(180,'apple-touch-icon.png'),(192,'icon-192.png'),(512,'icon-512.png')]:
        path=folder/name
        path.write_bytes(png(size))
        print(f'{path.name}: {size}x{size}, {path.stat().st_size} bytes')
