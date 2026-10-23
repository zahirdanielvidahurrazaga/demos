# Recorta todos los cuadros al mismo rectángulo (la unión de lo que ocupa la
# persona), con margen, y los guarda a una altura fija. Uso: entrada salida alto
import sys, os
from PIL import Image
ent, sal, alto = sys.argv[1], sys.argv[2], int(sys.argv[3])
os.makedirs(sal, exist_ok=True)
fs = sorted(f for f in os.listdir(ent) if f.endswith('.png'))
caja = None
for f in fs:
    b = Image.open(os.path.join(ent, f)).getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
    caja = b if caja is None else (min(caja[0], b[0]), min(caja[1], b[1]), max(caja[2], b[2]), max(caja[3], b[3]))
w, h = caja[2] - caja[0], caja[3] - caja[1]
m = int(h * 0.03)
caja = (caja[0] - m, caja[1] - m, caja[2] + m, caja[3] + m)
print('caja', caja)
for i, f in enumerate(fs):
    im = Image.open(os.path.join(ent, f)).crop(caja)
    im = im.resize((round(im.width * alto / im.height), alto), Image.LANCZOS)
    im.save(os.path.join(sal, f'{i:02d}.png'))
print(len(fs), 'cuadros', im.size)
