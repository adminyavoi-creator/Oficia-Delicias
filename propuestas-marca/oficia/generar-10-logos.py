from pathlib import Path
from html import escape

P = Path(__file__).parent
CORAL = '#D35E69'
PLUM = '#512D37'
LIGHT = '#FFE7E9'

marks = [
    ('Portal', 'Una entrada abierta a tu espacio', '''<path d="M24 78V45c0-19 15-34 36-34s36 15 36 34v33"/><path d="M41 78V52h38v26"/><path d="M52 78V63h16v15"/>'''),
    ('O esencial', 'La inicial como espacio propio', '''<circle cx="60" cy="60" r="39"/><path d="M60 39v41M60 60h23"/><circle cx="60" cy="60" r="5" fill="CORAL" stroke="none"/>'''),
    ('Puerta abierta', 'Acceso fácil, sin complicaciones', '''<path d="M27 92V24h54v68"/><path d="M81 25l17 12v43L81 91"/><path d="M43 58h35"/><path d="M64 44l14 14-14 14"/>'''),
    ('Plano', 'Varias salas, una plataforma', '''<rect x="20" y="20" width="80" height="80" rx="13"/><path d="M60 20v47M20 59h26M60 77h40"/><path d="M33 76h14"/><circle cx="76" cy="43" r="7" fill="CORAL" stroke="none"/>'''),
    ('Ubicación', 'Encuentra tu lugar cercano', '''<path d="M60 105s-34-31-34-55a34 34 0 0 1 68 0c0 24-34 55-34 55z"/><path d="M42 59h36M47 59v15M73 59v15"/><circle cx="60" cy="43" r="8"/>'''),
    ('Mesa lista', 'Equipamiento desde el primer minuto', '''<path d="M19 45h82M29 45v47M91 45v47"/><path d="M44 45V25h32v20"/><path d="M39 79h42"/><circle cx="60" cy="23" r="5" fill="CORAL" stroke="none"/>'''),
    ('Tiempo flexible', 'Desde una hora hasta semanas', '''<circle cx="60" cy="60" r="40"/><path d="M60 33v27l18 13"/><path d="M28 90h64"/><circle cx="60" cy="60" r="5" fill="CORAL" stroke="none"/>'''),
    ('Ventanas', 'Espacios luminosos y profesionales', '''<rect x="22" y="17" width="76" height="86" rx="9"/><path d="M60 17v86M22 58h76"/><path d="M39 36h6M76 36h6M39 77h6"/><rect x="72" y="68" width="16" height="20" rx="2" fill="CORAL" stroke="none"/>'''),
    ('Red de espacios', 'Conecta oficinas y personas', '''<circle cx="31" cy="36" r="11"/><circle cx="89" cy="36" r="11"/><circle cx="60" cy="87" r="11"/><path d="M42 36h36M36 46l19 31M84 46L65 77"/>'''),
    ('Sello listo', 'La señal de un espacio preparado', '''<path d="M25 30h70v60H25z"/><path d="M25 47h70"/><path d="M43 69l12 12 24-25"/><path d="M43 20v19M77 20v19"/>'''),
]

def mark_svg(raw):
    # Las figuras pequeñas de acento usan coral sólido; el resto es ciruela.
    return raw.replace('CORAL', CORAL)

pieces = ['''<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1940" viewBox="0 0 1800 1940" role="img" aria-label="Diez propuestas de logotipo para Oficia">
<defs><filter id="shadow" x="-20%" y="-30%" width="140%" height="170%"><feDropShadow dx="0" dy="10" stdDeviation="15" flood-color="#512D37" flood-opacity=".09"/></filter></defs>
<rect width="1800" height="1940" fill="#FFF9F8"/>
<rect width="1800" height="240" fill="#512D37"/>
<text x="90" y="75" font-family="Arial,Helvetica,sans-serif" font-size="23" font-weight="700" letter-spacing="5" fill="#FFC9CD">EXPLORACIÓN DE LOGOTIPO</text>
<text x="90" y="164" font-family="Arial,Helvetica,sans-serif" font-size="84" font-weight="800" letter-spacing="-5" fill="#FFFFFF">Oficia</text>
<text x="700" y="154" font-family="Arial,Helvetica,sans-serif" font-size="30" fill="#F5DDE0">10 símbolos · una misma identidad de color</text>
''']
for idx, (title, desc, paths) in enumerate(marks, 1):
    col = (idx-1) % 2
    row = (idx-1) // 2
    x = 70 + col*850
    y = 278 + row*304
    pieces.append(f'''<g transform="translate({x} {y})">
<rect width="810" height="270" rx="31" fill="#FFFFFF" filter="url(#shadow)"/>
<rect x="30" y="33" width="184" height="184" rx="48" fill="{LIGHT}"/>
<g transform="translate(61 64) scale(1.02)" fill="none" stroke="{PLUM}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">{mark_svg(paths)}</g>
<text x="252" y="74" font-family="Arial,Helvetica,sans-serif" font-size="19" font-weight="800" letter-spacing="3" fill="{CORAL}">{idx:02d} · {escape(title.upper())}</text>
<text x="249" y="145" font-family="Arial,Helvetica,sans-serif" font-size="58" font-weight="800" letter-spacing="-3" fill="{PLUM}">Oficia</text>
<text x="252" y="183" font-family="Arial,Helvetica,sans-serif" font-size="21" fill="#806F73">{escape(desc)}</text>
<rect x="252" y="205" width="58" height="6" rx="3" fill="{CORAL}"/>
</g>''')

pieces.append('''<text x="90" y="1870" font-family="Arial,Helvetica,sans-serif" font-size="23" font-weight="700" fill="#512D37">Paleta común</text>
<circle cx="280" cy="1863" r="16" fill="#D35E69"/><circle cx="325" cy="1863" r="16" fill="#512D37"/><circle cx="370" cy="1863" r="16" fill="#FFE7E9"/>
<text x="412" y="1870" font-family="Arial,Helvetica,sans-serif" font-size="19" fill="#806F73">Coral · Ciruela · Rosa claro</text>
<text x="1420" y="1870" font-family="Arial,Helvetica,sans-serif" font-size="19" fill="#806F73">OFICIA · DELICIAS, CHIHUAHUA</text>
</svg>''')
(P/'oficia-10-logotipos.svg').write_text(''.join(pieces), encoding='utf-8')
