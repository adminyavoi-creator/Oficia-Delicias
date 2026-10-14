from pathlib import Path

OUT = Path(__file__).parent / 'plano-5'
OUT.mkdir(exist_ok=True)

CORAL = '#D35E69'
DEEP = '#B54753'
PLUM = '#512D37'
PINK = '#FFE7E9'
CREAM = '#FFF9F8'

options = [
    ('01', 'La O es el plano', 'El símbolo sustituye la primera letra; nombre e ícono se leen como una sola marca.'),
    ('02', 'Bloque y nombre', 'El plano conserva su forma y una línea continúa hacia el nombre.'),
    ('03', 'Marco Oficia', 'La planta rodea el nombre como si fuera un espacio abierto.'),
    ('04', 'Sello vertical', 'Un emblema compacto para la app, con el nombre integrado debajo.'),
    ('05', 'Monograma OF', 'Las divisiones interiores sugieren una F dentro de la O del plano.'),
]

def icon(i, x=0, y=0, size=200):
    scale = size / 200
    backgrounds = [CORAL, PLUM, CORAL, PINK, CORAL]
    wall = ['#FFFFFF', '#FFFFFF', '#FFFFFF', DEEP, '#FFFFFF'][i]
    bg = backgrounds[i]
    outer = f'<rect width="200" height="200" rx="46" fill="{bg}"/>'
    if i == 3:
        outer += f'<rect x="5" y="5" width="190" height="190" rx="42" fill="none" stroke="{DEEP}" stroke-width="6"/>'
    # Las paredes ocupan casi todo el ícono; margen exterior de 22 px.
    walls = f'''<rect x="25" y="25" width="150" height="150" rx="21" fill="none" stroke="{wall}" stroke-width="12"/>
    <path d="M100 25v83M25 102h52M100 137h75" fill="none" stroke="{wall}" stroke-width="12" stroke-linecap="round"/>
    <circle cx="137" cy="66" r="12" fill="{PINK if i != 3 else CORAL}"/>'''
    if i == 0:
        # Se ensancha la sala derecha para que el círculo pueda crecer sin tocar los muros.
        walls = f'''<rect x="25" y="25" width="150" height="150" rx="21" fill="none" stroke="white" stroke-width="12"/>
        <path d="M88 25v87M25 109h40M88 137h87" fill="none" stroke="white" stroke-width="12" stroke-linecap="round"/>
        <circle cx="134" cy="68" r="23" fill="{PINK}"/>'''
    if i == 4:
        walls = f'''<rect x="25" y="25" width="150" height="150" rx="21" fill="none" stroke="white" stroke-width="12"/>
        <path d="M100 25v84M100 71h62M100 109h50M25 103h49" fill="none" stroke="white" stroke-width="12" stroke-linecap="round"/>
        <circle cx="58" cy="62" r="10" fill="{PINK}"/>'''
    return f'<g transform="translate({x} {y}) scale({scale})">{outer}{walls}</g>'

def logo_content(i):
    if i == 0:
        return icon(i, 34, 32, 212) + f'''<text x="257" y="192" font-family="Arial,Helvetica,sans-serif" font-size="152" font-weight="800" letter-spacing="-7" fill="{PLUM}">ficia</text>
        <text x="265" y="234" font-family="Arial,Helvetica,sans-serif" font-size="22" font-weight="700" letter-spacing="2.1" fill="{DEEP}">TU ESPACIO, A TU HORA.</text>'''
    if i == 1:
        return icon(i, 34, 32, 212) + f'''<text x="276" y="168" font-family="Arial,Helvetica,sans-serif" font-size="114" font-weight="800" letter-spacing="-5" fill="{PLUM}">Oficia</text>
        <path d="M247 205h565" stroke="{CORAL}" stroke-width="9" stroke-linecap="round"/>
        <text x="281" y="236" font-family="Arial,Helvetica,sans-serif" font-size="20" font-weight="700" letter-spacing="2" fill="{DEEP}">ESPACIOS LISTOS PARA TRABAJAR</text>'''
    if i == 2:
        return icon(i, 34, 32, 212) + f'''<path d="M236 51h605q24 0 24 24v135q0 25-25 25H247" fill="none" stroke="{CORAL}" stroke-width="8" stroke-linecap="round"/>
        <text x="277" y="171" font-family="Arial,Helvetica,sans-serif" font-size="113" font-weight="800" letter-spacing="-5" fill="{PLUM}">Oficia</text>
        <text x="287" y="212" font-family="Arial,Helvetica,sans-serif" font-size="19" font-weight="700" letter-spacing="1.7" fill="{DEEP}">TU ESPACIO, A TU HORA</text>'''
    if i == 3:
        return icon(i, 63, 30, 215) + f'''<text x="302" y="165" font-family="Arial,Helvetica,sans-serif" font-size="113" font-weight="800" letter-spacing="-5" fill="{PLUM}">Oficia</text>
        <rect x="309" y="190" width="477" height="43" rx="21" fill="{PINK}"/>
        <text x="335" y="218" font-family="Arial,Helvetica,sans-serif" font-size="18" font-weight="800" letter-spacing="2" fill="{DEEP}">DELICIAS · CHIHUAHUA</text>'''
    return icon(i, 34, 32, 212) + f'''<text x="277" y="171" font-family="Arial,Helvetica,sans-serif" font-size="114" font-weight="800" letter-spacing="-5" fill="{PLUM}">Oficia</text>
    <path d="M277 190h513" stroke="{DEEP}" stroke-width="6" stroke-linecap="round"/>
    <text x="281" y="230" font-family="Arial,Helvetica,sans-serif" font-size="20" font-weight="700" letter-spacing="2" fill="{DEEP}">OFICINAS · SALAS · COWORKING</text>'''

for i, (num, title, desc) in enumerate(options):
    individual = f'''<svg xmlns="http://www.w3.org/2000/svg" width="900" height="280" viewBox="0 0 900 280" role="img" aria-label="Oficia, opción {num}: {title}">
    <rect width="900" height="280" rx="24" fill="white"/>{logo_content(i)}</svg>'''
    (OUT / f'oficia-plano-{num}.svg').write_text(individual, encoding='utf-8')
    standalone = f'''<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 200 200" role="img" aria-label="Ícono Oficia opción {num}">{icon(i)}</svg>'''
    (OUT / f'icono-oficia-{num}.svg').write_text(standalone, encoding='utf-8')

board = [f'''<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="2200" viewBox="0 0 1600 2200" role="img" aria-label="Cinco propuestas de logotipo Oficia basadas en el plano">
<defs><filter id="s"><feDropShadow dx="0" dy="9" stdDeviation="15" flood-color="{PLUM}" flood-opacity=".10"/></filter></defs>
<rect width="1600" height="2200" fill="{CREAM}"/>
<rect width="1600" height="238" fill="{PLUM}"/>
<text x="70" y="65" font-family="Arial,Helvetica,sans-serif" font-size="22" font-weight="700" letter-spacing="4" fill="#FFC9CD">OFICIA · EXPLORACIÓN DE LOGOTIPO</text>
<text x="70" y="144" font-family="Arial,Helvetica,sans-serif" font-size="76" font-weight="800" letter-spacing="-4" fill="white">Plano, más visible.</text>
<text x="73" y="197" font-family="Arial,Helvetica,sans-serif" font-size="27" fill="#F5DDE0">5 maneras de unir el símbolo con el nombre</text>''']
for i, (num, title, desc) in enumerate(options):
    y = 270 + i * 375
    board.append(f'''<g transform="translate(65 {y})">
      <rect width="1470" height="337" rx="30" fill="white" filter="url(#s)"/>
      <text x="35" y="42" font-family="Arial,Helvetica,sans-serif" font-size="22" font-weight="800" letter-spacing="2" fill="{DEEP}">{num} · {title.upper()}</text>
      <g transform="translate(36 43) scale(.91)">{logo_content(i)}</g>
      <path d="M1070 37v264" stroke="#F1E4E6" stroke-width="2"/>
      {icon(i, 1145, 58, 166)}
      <text x="1125" y="251" font-family="Arial,Helvetica,sans-serif" font-size="18" font-weight="700" fill="{PLUM}">ÍCONO DE APP</text>
      <text x="40" y="313" font-family="Arial,Helvetica,sans-serif" font-size="20" fill="#806F73">{desc}</text>
    </g>''')
board.append(f'''<text x="70" y="2180" font-family="Arial,Helvetica,sans-serif" font-size="20" fill="#806F73">Paleta: coral {CORAL} · ciruela {PLUM} · rosa {PINK}. Símbolos vectoriales escalables.</text></svg>''')
(OUT / 'oficia-plano-5-opciones.svg').write_text(''.join(board), encoding='utf-8')

# La opción 01 elegida se entrega además con nombres estables para producción.
final_logo = f'''<svg xmlns="http://www.w3.org/2000/svg" width="900" height="280" viewBox="0 0 900 280" role="img" aria-label="Logotipo final de Oficia">
<rect width="900" height="280" rx="24" fill="white"/>{logo_content(0)}</svg>'''
(OUT.parent / 'logo-oficia-final.svg').write_text(final_logo, encoding='utf-8')
dark_content = logo_content(0).replace(f'fill="{PLUM}"', 'fill="white"').replace(f'fill="{DEEP}"', 'fill="#FFC9CD"')
(OUT.parent / 'logo-oficia-final-oscuro.svg').write_text(f'''<svg xmlns="http://www.w3.org/2000/svg" width="900" height="280" viewBox="0 0 900 280" role="img" aria-label="Logotipo final de Oficia en fondo oscuro">
<rect width="900" height="280" rx="24" fill="{PLUM}"/>{dark_content}</svg>''', encoding='utf-8')
(OUT.parent / 'icono-oficia-final.svg').write_text(f'''<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 200 200" role="img" aria-label="Ícono final de la app Oficia">{icon(0)}</svg>''', encoding='utf-8')

sheet = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="1120" viewBox="0 0 1500 1120" role="img" aria-label="Presentación del logotipo final Oficia">
<rect width="1500" height="1120" fill="{CREAM}"/>
<rect width="1500" height="170" fill="{PLUM}"/>
<text x="65" y="69" font-family="Arial,Helvetica,sans-serif" font-size="22" font-weight="700" letter-spacing="4" fill="#FFC9CD">OFICIA · LOGOTIPO SELECCIONADO</text>
<text x="65" y="128" font-family="Arial,Helvetica,sans-serif" font-size="48" font-weight="800" fill="white">Plano 01 · círculo ampliado</text>
<rect x="65" y="214" width="1370" height="335" rx="30" fill="white"/>
<g transform="translate(155 233) scale(1.25)">{logo_content(0)}</g>
<text x="89" y="600" font-family="Arial,Helvetica,sans-serif" font-size="22" font-weight="800" fill="{PLUM}">ÍCONO DE APP</text>
<text x="710" y="600" font-family="Arial,Helvetica,sans-serif" font-size="22" font-weight="800" fill="{PLUM}">LECTURA A TAMAÑO PEQUEÑO</text>
<rect x="65" y="628" width="560" height="400" rx="30" fill="white"/>
{icon(0, 177, 658, 330)}
<rect x="660" y="628" width="775" height="400" rx="30" fill="white"/>
{icon(0, 755, 745, 135)}
<text x="925" y="832" font-family="Arial,Helvetica,sans-serif" font-size="73" font-weight="800" letter-spacing="-3" fill="{PLUM}">ficia</text>
<text x="930" y="873" font-family="Arial,Helvetica,sans-serif" font-size="21" font-weight="700" letter-spacing="1.8" fill="{DEEP}">TU ESPACIO, A TU HORA.</text>
<text x="66" y="1080" font-family="Arial,Helvetica,sans-serif" font-size="21" fill="#806F73">El círculo crece a 46 px de diámetro en la cuadrícula base; los muros se reequilibran para conservar aire visual.</text>
</svg>'''
(OUT.parent / 'oficia-logo-final-presentacion.svg').write_text(sheet, encoding='utf-8')
