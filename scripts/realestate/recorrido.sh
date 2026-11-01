#!/bin/zsh
# Convierte los cuadros del render de Blender en los que el recorrido de
# The Halden dibuja con el scroll.
#   scripts/realestate/recorrido.sh <carpeta con 0001.png ... 0396.png>
# Deja public/realestate/halden/r/NNNN.webp (1920 px, calidad 85, compu) y
# rm/NNNN.webp (celular: el CENTRO del cuadro a resolución completa, 810×1080,
# calidad 82). Reemplaza los que ya existan.
# 1-nov: en el celular (vertical) el lienzo solo enseña el centro del cuadro
# y lo estira; con la versión a 1280 de ancho se veía bajo de calidad, por
# eso se recorta del original en vez de achicarlo.
# El render (Cycles, 1920×1080, 12 por segundo) sale de
# ~/Desktop/Recorrido NJ/blender/ (armar.py arma la escena, render.py la
# renderiza). Medido 1-nov: q85 pesa ~190 KB por cuadro y ya no se distingue
# del PNG; q60 dejaba ver la compresión en la madera.
set -e
origen=${1:A}
[[ -d $origen ]] || { echo "Uso: recorrido.sh <carpeta de PNG>"; exit 1; }
aqui=${0:A:h}; raiz=${aqui:h:h}
destino=$raiz/public/realestate/halden
mkdir -p $destino/r $destino/rm
ls $origen/[0-9][0-9][0-9][0-9].png | xargs -P 4 -I{} zsh -c '
  n=${1:t:r}
  cwebp -quiet -q 85 -m 4 "$1" -o "$2/r/$n.webp"
  cwebp -quiet -q 82 -m 4 -crop 555 0 810 1080 "$1" -o "$2/rm/$n.webp"
' _ {} $destino
echo "$(ls $destino/r | wc -l | tr -d ' ') cuadros en $destino/r"
