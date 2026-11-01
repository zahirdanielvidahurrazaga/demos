#!/bin/zsh
# Convierte cuadros del render de Blender (PNG 1920×1080) en los webp que la
# página de The Halden dibuja con el scroll.
#   scripts/realestate/recorrido.sh <carpeta de PNG> <destino> [movil]
# <destino> es la carpeta dentro de public/realestate/halden/:
#   r   ← cuadros-24fps/ (recorrido a 24 por segundo, compu, calidad 85)
#   rm  ← cuadros/       (recorrido a 12 por segundo, celular)
#   c   ← recamara/      (recámara, compu)
#   cm  ← recamara/      (recámara, celular)
# `movil` = el CENTRO del cuadro a resolución completa (810×1080, calidad 82):
# en vertical el lienzo solo enseña el centro y lo estira; achicar todo el
# cuadro a 1280 se veía bajo de calidad (1-nov). Los archivos van numerados
# 0001… en el orden de la carpeta. Reemplaza los que ya existan.
# El render (Cycles) sale de ~/Desktop/Recorrido NJ/blender/: armar.py y
# armar-recamara.py arman las escenas; render.py, render24.py (intermedios
# para 24 por segundo) y render-recamara.py las renderizan.
set -e
origen=${1:A}; destino=$2; modo=$3
[[ -d $origen && -n $destino ]] || { echo "Uso: recorrido.sh <carpeta de PNG> <r|rm|c|cm> [movil]"; exit 1; }
aqui=${0:A:h}; raiz=${aqui:h:h}
salida=$raiz/public/realestate/halden/$destino
mkdir -p $salida
if [[ $modo == movil ]]; then opciones=(-q 82 -crop 555 0 810 1080); else opciones=(-q 85); fi
i=0
for png in $origen/[0-9][0-9][0-9][0-9].png; do
  i=$((i + 1))
  printf '%s\0%s\0' "$png" "$salida/$(printf %04d $i).webp"
done | xargs -0 -P 4 -n 2 zsh -c 'cwebp -quiet -m 4 '"${opciones[*]}"' "$1" -o "$2"' _
echo "$(ls $salida | wc -l | tr -d ' ') cuadros en $salida ($(du -sh $salida | cut -f1))"
