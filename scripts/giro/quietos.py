# Quita los cuadros quietos del FINAL de una vuelta completa: el prompt pide que
# Veo termine la vuelta al 90% y se quede de frente hasta el 100%; ese frente
# es el mismo cuadro con el que empieza, así que se borra toda la pausa y el
# bucle cierra solo. Avisa si el último cuadro no se parece al primero.
# Uso: carpeta-de-PNGs
import sys, os
import numpy as np
from PIL import Image
d = sys.argv[1]
fs = sorted(f for f in os.listdir(d) if f.endswith('.png'))
chico = lambda f: np.asarray(Image.open(os.path.join(d, f)).convert('L').resize((90, 160)), np.float32)
ims = [chico(f) for f in fs]
dif = [float(np.abs(b - a).mean()) for a, b in zip(ims, ims[1:])]
mediana = float(np.median(dif))
# girando, un cuadro cambia ~0.7 contra el anterior; quieta, < 0.25
fin = len(fs)
while fin > 1 and dif[fin - 2] < 0.25:
    fin -= 1
quitados = len(fs) - fin
if quitados >= 3:
    fin -= 1  # el primer cuadro de la pausa también es el frente repetido
    for f in fs[fin:]:
        os.remove(os.path.join(d, f))
else:
    quitados, fin = 0, len(fs)
costura = float(np.abs(ims[fin - 1] - ims[0]).mean())
print(f'pausa final: {len(fs) - fin} cuadros fuera · costura {costura:.2f} (girando: {mediana:.2f})')
if costura > mediana * 3:
    print('OJO: el último cuadro no se parece al primero; la vuelta no cierra (revisa el final del video o ajusta <fin>)')
