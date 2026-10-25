# Prompt de Gemini/Veo para los videos del Giro (v2, 24-oct-2026)

Foto: `~/Downloads/kade-poses/pose-<id>.png` (cuerpo entero, 9:16, fondo gris).
En Gemini: elegir **vertical 9:16** si lo deja, subir la foto y pegar el texto
tal cual (sirve para las 10). Lo que aprendimos a prueba y error:

- La POSE va en la foto: pedirle otra pose hace que la cambie a medio giro.
- Sin la línea de tiempo, Veo gira hasta la espalda y se REGRESA por el mismo lado.
- Si no se le da tiempo, se queda ~20° antes del frente y el bucle no cierra:
  por eso acaba en el segundo 7 y se queda quieta (`quietos.py` borra esa pausa).
- El zoom del inicio venía de la foto book cortada a medio muslo. Las fotos nuevas
  ya son de cuerpo entero, así que ahora se le pide que el 1er cuadro SEA la foto.
- Sin giratorio la modelo "camina" para girar → se le pide giratorio y pies
  clavados; si dibuja la base: `BASE=<y> hacer-giro.sh …` / `pintar-base.py`.
- v1 decía "clockwise" Y "primero perfil hacia la DERECHA": se contradecían
  (visto desde arriba, horario = la cara va primero a la IZQUIERDA del cuadro).
  v2 solo usa los bordes del cuadro.

Procesar: `scripts/giro/hacer-giro.sh <video> <id> <inicio> <fin> completa`
(<fin> = final del video) y registrar lo que imprime en `GIROS` de `datos.js`.

```
The first frame of the video is EXACTLY the reference image: same framing, same camera distance, same pose, same light-grey seamless studio. Keep this framing for the whole video. The model is shown full body, head to shoes, centered, the same size in every frame.

ACTION: The model stands on a hidden turntable (flush with the floor, the same light grey as the floor, no visible disc, edge, stripes or cables) and the turntable spins them through exactly ONE full 360-degree revolution, always in the same direction, at a smooth constant speed. The model's whole body turns as one rigid piece, like a mannequin on a turntable. The feet stay planted on the turntable: no steps, no walking, no shifting weight, no lifting the heels. The pose of the reference image is frozen for the entire video: arms, hands, legs, head, face expression and gaze never move. No breathing motion, no blinking, no hair or clothes swaying.

TIMELINE (8-second video):
- 0s: facing the camera, identical to the reference image.
- 1.6s: exact side profile, face pointing to the RIGHT edge of the frame.
- 3.6s: back fully to the camera, face not visible.
- 5.6s: exact side profile, face pointing to the LEFT edge of the frame (the other side of the body and outfit).
- 7.2s: facing the camera again, the revolution is complete.
- 7.2s to 8s: the turntable has stopped; the model holds still, identical to the first frame.
The rotation never pauses at the back and never reverses: after the back it keeps going forward and shows the other side. Each profile appears exactly once. The last frame matches the first frame: same angle straight to the camera, same pose, same position, same size.

CAMERA: locked on a tripod at waist height, fixed lens. No zoom in or out, no pan, no tilt, no dolly, no reframing at any moment, including the first second and the last second. The model stays at the exact horizontal center and never drifts.

LOOK: same face, hair, outfit and shoes as the reference image, consistent from every angle (complete the back of the outfit naturally). Soft, even studio lighting that does not change as the model turns. No text, no logos, no watermark, no other people, no cuts, no music.
```

**24-oct: Diego salió bien a la primera con este texto** (Gemini lo hizo de 10 s,
no de 8: la vuelta va de 0.15 a ~8.7 y luego acomoda un poco la postura). Se
procesó con `hacer-giro.sh video-diego.mp4 diego 0.15 8.7 completa` → 206 cuadros. Ana Paula igual: `video-ana.mp4 ana 0.4 9.55` → 220.
Para las demás: buscar el segundo donde vuelve a quedar de frente más parecido al
primer cuadro (no el final del video) y usarlo como <fin>.

Si sale con zoom o caminando, anotar aquí cuál foto y en qué segundo.
