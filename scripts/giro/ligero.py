# Versión ligera de un giro para la fila del book: uno de cada <paso> cuadros, a
# <alto> px. Lee public/.../giro/<id>/NN.webp y escribe giro/<id>/ligero/NN.webp.
# Uso: carpeta-del-giro [paso=2] [alto=450]
import sys, os
from PIL import Image
d = sys.argv[1]; paso = int(sys.argv[2]) if len(sys.argv) > 2 else 2; alto = int(sys.argv[3]) if len(sys.argv) > 3 else 450
fs = sorted((f for f in os.listdir(d) if f.endswith('.webp')), key=lambda f: int(f[:-5]))
sal = os.path.join(d, 'ligero'); os.makedirs(sal, exist_ok=True)
for f in os.listdir(sal): os.remove(os.path.join(sal, f))
for k, f in enumerate(fs[::paso]):
    im = Image.open(os.path.join(d, f)).convert('RGBA')
    im = im.resize((round(im.width * alto / im.height), alto), Image.LANCZOS)
    im.save(os.path.join(sal, f'{k:02d}.webp'), 'WEBP', quality=68, method=6)
print(len(fs[::paso]))
