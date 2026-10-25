#!/bin/zsh
# Convierte el video de Gemini de una modelo girando en los cuadros de la vista
# "Giro" del book de KADE.
#   scripts/giro/hacer-giro.sh <video.mp4> <id-modelo> <inicio> <fin> [vuelta]
# MEDIO GIRO (sin "vuelta"): <inicio>/<fin> = segundos donde está de PERFIL y
# donde ya quedó de FRENTE (Valeria v1: 5.9 y 6.8); si gira al revés, pásalos al
# revés y el script invierte el orden. → en GIROS:  <id>: <n>
# VUELTA COMPLETA ("vuelta"): de una MEDIA vuelta limpia se arma la completa
# (la otra mitad en espejo, `vuelta.py`): <inicio> = de ESPALDAS, <fin> = ya de
# FRENTE (Valeria v2: 5.6 y 8.7; Veo alejó la cámara en la primera mitad y por
# eso solo sirve la segunda). Quita la plataforma blanca bajo los pies.
# → en GIROS:  <id>: { n: <n>, vuelta: true }
# VUELTA COMPLETA REAL ("completa"): el video ya trae la vuelta entera con la
# cámara quieta (Camila y Renata: 0.8 y 8.35): <inicio> = justo cuando empieza a
# girar de frente, <fin> = cuando vuelve a quedar de frente. TODOS los cuadros del
# video (~180 por vuelta: con 72 se veía trabado), sin espejo.
# → en GIROS:  <id>: { n: <n>, vuelta: true }
# Con el prompt nuevo (23-oct: Veo acaba la vuelta al 90% y se queda de frente)
# <fin> puede ser el final del video: `quietos.py` borra la pausa del final para
# que el bucle cierre solo, y avisa si el último cuadro no se parece al primero.
# Si Veo dibuja la base del giratorio con franjas oscuras: BASE=<y de las suelas
# en el video> antes del comando (`pintar-base.py` la pinta de fondo).
# Deja public/modelos/mira/giro/<id>/NN.webp.
set -e
video=$1; id=$2; ini=$3; fin=$4; modo=$5
aqui=${0:A:h}; raiz=${aqui:h:h}
tmp=$(mktemp -d)
mkdir -p $tmp/{a,b,c}
desde=$ini; hasta=$fin; invertir=0
if (( $(echo "$ini > $fin" | bc) )); then desde=$fin; hasta=$ini; invertir=1; fi
if [[ $modo == completa ]]; then
  if [[ -n $BASE ]]; then
    tam=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0:s=x "$video")
    ffmpeg -v error -ss $desde -to $hasta -i "$video" -f rawvideo -pix_fmt rgb24 - \
      | python3 $aqui/pintar-base.py ${tam%x*} ${tam#*x} $BASE \
      | ffmpeg -v error -y -f rawvideo -pix_fmt rgb24 -s $tam -i - $tmp/a/i%03d.png
  else
    ffmpeg -v error -y -ss $desde -to $hasta -i "$video" $tmp/a/i%03d.png
  fi
  python3 $aqui/quietos.py $tmp/a
elif [[ $modo == vuelta ]]; then
  # todos los cuadros de la media vuelta
  ffmpeg -v error -y -ss $desde -to $hasta -i "$video" $tmp/a/i%03d.png
else
  ffmpeg -v error -y -ss $desde -to $hasta -i "$video" -vf "minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:vsbmc=1" $tmp/a/i%03d.png
fi
[[ -x $aqui/recortar ]] || swiftc -O $aqui/recortar.swift -o $aqui/recortar
if [[ -n $modo ]]; then $aqui/recortar $tmp/a $tmp/b persona; else $aqui/recortar $tmp/a $tmp/b; fi
if (( invertir )); then i=0; for f in $(ls $tmp/b | sort -r); do mv $tmp/b/$f $tmp/b/r$(printf %03d $i).png; i=$((i+1)); done; fi
if [[ $modo == completa ]]; then python3 $aqui/vuelta.py $tmp/b $tmp/c 900 completa
elif [[ $modo == vuelta ]]; then python3 $aqui/vuelta.py $tmp/b $tmp/c 900; else python3 $aqui/encuadrar.py $tmp/b $tmp/c 1000; fi
destino=$raiz/public/modelos/mira/giro/$id
rm -rf $destino; mkdir -p $destino
for f in $tmp/c/*.png; do cwebp -quiet -q 72 -alpha_q 85 "$f" -o "$destino/${${f:t}%.png}.webp"; done
n=$(ls $destino | wc -l | tr -d ' ')
# versión ligera para la fila del book (uno de cada dos cuadros, 450 px)
nl=$(python3 $aqui/ligero.py $destino 2 450)
rm -rf $tmp
if [[ -n $modo ]]; then cual="$id: { n: $n, ligero: $nl, vuelta: true }"; else cual="$id: $n"; fi
echo "Listo: $n cuadros en public/modelos/mira/giro/$id → en GIROS de src/demo/modelos/datos.js:  $cual"
