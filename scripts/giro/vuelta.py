# Arma la vuelta de 360°. Uso: entrada(PNGs) salida alto [completa]
# - sin "completa": la entrada es MEDIA vuelta (de espaldas → de frente) y la
#   otra mitad es la misma en espejo.
# - con "completa": la entrada ya es la vuelta entera, empezando de frente.
# En los dos: quita la plataforma giratoria bajo los pies (lo claro y SIN color:
# así los zapatos nude se quedan) y encuadra todos alrededor del eje de giro.
import sys, os
from PIL import Image, ImageOps
ent, sal, alto = sys.argv[1], sys.argv[2], int(sys.argv[3])
completa = len(sys.argv) > 4 and sys.argv[4] == 'completa'
os.makedirs(sal, exist_ok=True)
fs = sorted(f for f in os.listdir(ent) if f.endswith('.png'))
ims = []
for f in fs:
    im = Image.open(os.path.join(ent, f)).convert('RGBA')
    b = im.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
    # banda de los pies: lo claro y gris (la plataforma) se vuelve transparente
    pie = b[3] - int((b[3] - b[1]) * 0.08)
    px = im.load()
    for y in range(pie, b[3]):
        for x in range(b[0], b[2]):
            r, g, bb, a = px[x, y]
            if not a:
                continue
            alto_c, bajo_c = max(r, g, bb), min(r, g, bb)
            saturacion = (alto_c - bajo_c) / alto_c if alto_c else 0
            if (alto_c > 105 and saturacion < 0.16) or a < 110:
                px[x, y] = (r, g, bb, 0)
    ims.append(im)
cajas = [im.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox() for im in ims]
centros = sorted((c[0] + c[2]) / 2 for c in cajas)
eje = centros[len(centros) // 2]
mitad = max(max(eje - c[0], c[2] - eje) for c in cajas)
arriba, abajo = min(c[1] for c in cajas), max(c[3] for c in cajas)
m = int((abajo - arriba) * 0.03)
caja = (int(eje - mitad - m), arriba - m, int(eje + mitad + m), abajo + m)
mitad_vuelta = [im.crop(caja) for im in ims]          # espaldas … frente
w = round(mitad_vuelta[0].width * alto / mitad_vuelta[0].height)
mitad_vuelta = [im.resize((w, alto), Image.LANCZOS) for im in mitad_vuelta]
# 00 = frente; luego hacia espaldas por un lado; de regreso al frente por el otro (espejo)
secuencia = mitad_vuelta if completa else mitad_vuelta[::-1] + [ImageOps.mirror(im) for im in mitad_vuelta[1:-1]]
for i, im in enumerate(secuencia):
    im.save(os.path.join(sal, f'{i:02d}.png'))
print(len(secuencia), 'cuadros', (w, alto))
