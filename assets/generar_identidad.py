"""Genera la identidad vectorial y el ícono PNG de Marco Oficia sin librerías externas."""
from pathlib import Path
import math
import struct
import zlib

HERE = Path(__file__).parent
CORAL = (211, 94, 105)
PINK = (255, 231, 233)
WHITE = (255, 255, 255)

symbol = '''<rect x="0" y="0" width="200" height="200" rx="43" fill="#D35E69"/>
<rect x="18" y="18" width="164" height="164" rx="34" fill="none" stroke="white" stroke-width="11"/>
<path d="M94 24v92M24 106h49M94 143h82" fill="none" stroke="white" stroke-width="11" stroke-linecap="round"/>
<circle cx="139" cy="66" r="15" fill="#FFE7E9"/>'''

(HERE / 'marco-oficia-icono.svg').write_text(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 200 200" role="img" aria-label="Ícono de Oficia, plano de espacios">' + symbol + '</svg>',
    encoding='utf-8',
)
(HERE / 'marco-oficia-logo.svg').write_text(
    '''<svg xmlns="http://www.w3.org/2000/svg" width="940" height="280" viewBox="0 0 940 280" role="img" aria-label="Oficia, tu espacio a tu hora">
    <rect width="940" height="280" rx="28" fill="white"/>
    <g transform="translate(30 30) scale(1.1)">''' + symbol + '''</g>
    <path d="M237 54H852q32 0 32 32v129q0 31-31 31H246" fill="none" stroke="#D35E69" stroke-width="9" stroke-linecap="round"/>
    <text x="272" y="166" font-family="Arial,Helvetica,sans-serif" font-size="115" font-weight="800" letter-spacing="-5" fill="#512D37">Oficia</text>
    <text x="282" y="213" font-family="Arial,Helvetica,sans-serif" font-size="22" font-weight="800" letter-spacing="2" fill="#B54753">TU ESPACIO, A TU HORA.</text>
    </svg>''',
    encoding='utf-8',
)

def clamp(v):
    return max(0.0, min(1.0, v))

def rounded_box(x, y, left, top, right, bottom, radius):
    cx = (left + right) / 2
    cy = (top + bottom) / 2
    hx = (right - left) / 2 - radius
    hy = (bottom - top) / 2 - radius
    qx, qy = abs(x - cx) - hx, abs(y - cy) - hy
    return math.hypot(max(qx, 0), max(qy, 0)) + min(max(qx, qy), 0) - radius

def segment(x, y, x1, y1, x2, y2):
    vx, vy = x2 - x1, y2 - y1
    t = clamp(((x - x1) * vx + (y - y1) * vy) / (vx * vx + vy * vy))
    return math.hypot(x - x1 - t * vx, y - y1 - t * vy)

def mix(base, top, alpha):
    return tuple(round(base[i] * (1 - alpha) + top[i] * alpha) for i in range(3))

def png_chunk(kind, data):
    return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data) & 0xffffffff)

def render_png(size, path):
    pixels = bytearray()
    smooth = 200 / size
    for iy in range(size):
        pixels.append(0)
        y = (iy + .5) * 200 / size
        for ix in range(size):
            x = (ix + .5) * 200 / size
            # El coral llena el lienzo: Android aplica su propia máscara adaptativa.
            color = CORAL
            outer = rounded_box(x, y, 18, 18, 182, 182, 34)
            inner = rounded_box(x, y, 23.5, 23.5, 176.5, 176.5, 28.5)
            border = min(abs(outer), abs(inner)) if outer * inner < 0 else 100
            wall_dist = min(
                segment(x, y, 94, 24, 94, 116),
                segment(x, y, 24, 106, 73, 106),
                segment(x, y, 94, 143, 176, 143),
            )
            white_alpha = max(clamp((5.5 - border) / smooth + .5), clamp((5.5 - wall_dist) / smooth + .5))
            color = mix(color, WHITE, white_alpha)
            circle_dist = math.hypot(x - 139, y - 66)
            color = mix(color, PINK, clamp((15 - circle_dist) / smooth + .5))
            pixels.extend(color)
    header = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)
    path.write_bytes(b'\x89PNG\r\n\x1a\n' + png_chunk(b'IHDR', header) + png_chunk(b'IDAT', zlib.compress(bytes(pixels), 9)) + png_chunk(b'IEND', b''))

render_png(1024, HERE / 'icon.png')

def render_adaptive(size, path):
    pixels = bytearray()
    smooth = 200 / size
    for iy in range(size):
        pixels.append(0)
        y = (iy + .5) * 200 / size
        for ix in range(size):
            x = (ix + .5) * 200 / size
            outer = rounded_box(x, y, 34, 34, 166, 166, 27)
            inner = rounded_box(x, y, 39, 39, 161, 161, 22)
            border = min(abs(outer), abs(inner)) if outer * inner < 0 else 100
            wall = min(
                segment(x, y, 94, 39, 94, 110),
                segment(x, y, 39, 103, 73, 103),
                segment(x, y, 94, 135, 161, 135),
            )
            white_alpha = max(clamp((5 - border) / smooth + .5), clamp((5 - wall) / smooth + .5))
            circle_alpha = clamp((12 - math.hypot(x - 132, y - 69)) / smooth + .5)
            if circle_alpha > 0:
                pixels.extend((*PINK, round(255 * circle_alpha)))
            else:
                pixels.extend((*WHITE, round(255 * white_alpha)))
    header = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    path.write_bytes(b'\x89PNG\r\n\x1a\n' + png_chunk(b'IHDR', header) + png_chunk(b'IDAT', zlib.compress(bytes(pixels), 9)) + png_chunk(b'IEND', b''))

render_adaptive(1024, HERE / 'adaptive-icon.png')
