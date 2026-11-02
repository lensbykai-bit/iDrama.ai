"""Check that the wallet hero is actually painted, beyond a nonblank navigation bar."""
import struct, sys, zlib
data = open(sys.argv[1], 'rb').read()
assert data[:8] == b'\x89PNG\r\n\x1a\n'
pos = 8
compressed = bytearray()
while pos < len(data):
    size = struct.unpack_from('>I', data, pos)[0]
    kind = data[pos+4:pos+8]
    payload = data[pos+8:pos+8+size]
    if kind == b'IHDR':
        width, height, depth, color, _, _, interlace = struct.unpack('>IIBBBBB', payload)
    elif kind == b'IDAT':
        compressed.extend(payload)
    pos += size + 12
assert depth == 8 and color in (2, 6) and interlace == 0
channels = 4 if color == 6 else 3
stride = width * channels
raw = zlib.decompress(compressed)
prev = bytearray(stride)
offset = 0
painted = total = 0
for y in range(height):
    mode = raw[offset]
    offset += 1
    row = bytearray(raw[offset:offset+stride])
    offset += stride
    for i in range(stride):
        left = row[i-channels] if i >= channels else 0
        above = prev[i]
        upperleft = prev[i-channels] if i >= channels else 0
        if mode == 1: row[i] = (row[i] + left) & 255
        elif mode == 2: row[i] = (row[i] + above) & 255
        elif mode == 3: row[i] = (row[i] + (left + above)//2) & 255
        elif mode == 4:
            p = left + above - upperleft
            distances = (abs(p-left), abs(p-above), abs(p-upperleft))
            predictor = (left, above, upperleft)[distances.index(min(distances))]
            row[i] = (row[i] + predictor) & 255
        else: assert mode == 0
    if height * .08 < y < height * .45:
        for x in range(0, stride, channels):
            r, g, b = row[x:x+3]
            painted += r > 120 and r > g * 1.25 and b > g * 1.15
            total += 1
    prev = row
print('Wallet hero pixels:', painted, '/', total)
assert painted > total * .01, 'Wallet body is not visibly rendered'
