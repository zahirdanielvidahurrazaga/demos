# Borra la base del giratorio en el video fuente cuando Veo la dibuja con
# franjas oscuras (el recorte la toma como parte de la modelo): todo lo que está
# debajo de las suelas se pinta con el fondo, y la orilla de la franja que
# asoma a los lados, 30 px más arriba. Lee y escribe video crudo rgb24.
# Uso: ffmpeg ... -f rawvideo -pix_fmt rgb24 - | python3 pintar-base.py <ancho> <alto> <y-suelas> | ffmpeg ...
import sys
import numpy as np
W, H, Y = int(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3])
fr = W * H * 3
i, o = sys.stdin.buffer, sys.stdout.buffer
t = np.linspace(0, 1, W)[None, :, None]
while True:
    b = i.read(fr)
    if len(b) < fr: break
    a = np.frombuffer(b, np.uint8).reshape(H, W, 3).astype(np.float32)
    # de las suelas para abajo: degradado entre el fondo de la orilla izquierda y la derecha
    izq, der = a[Y:, 4:12].mean(1), a[Y:, W - 12:W - 4].mean(1)
    a[Y:] = izq[:, None] * (1 - t) + der[:, None] * t
    # los lados de la franja (fuera de donde pisan los zapatos)
    for x0, x1 in ((0, int(W * 0.35)), (int(W * 0.65), W)):
        a[Y - 30:Y, x0:x1] = a[Y, x0:x1][None]
    o.write(a.astype(np.uint8).tobytes())
