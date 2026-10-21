# Demos de venta de KaiZen

Sitio con demos en vivo que KaiZen usa para vender: el cliente prueba una app
real con datos de ejemplo, como clienta, como equipo o como dueño.

> **Origen:** copiado de `be-fit-lab` (commit `d39be0f`, 8-oct-2026), donde las
> demos vivían temporalmente. Studio Alma corre sobre la app completa de Be Fit,
> por eso `src/` trae toda esa app. **Desde aquí los arreglos de Be Fit ya no
> llegan solos**: se copian a mano cuando valga la pena.

## Comandos

```bash
npm install
npm run dev       # = vite --mode demos  → http://localhost:5173
npm run build     # = vite build --mode demos → dist/
npm run preview   # sirve dist/ para revisarlo como en producción
```

El modo `demos` carga `.env.demos` (versionado a propósito: solo lleva la llave
**pública** de Supabase "Demos" y Stripe vacío). No hace falta `.env`.

## Despliegue (Cloudflare Pages)

- **En vivo: https://demos-zahirv.pages.dev** — cada push a `main` redespliega solo.
  Si cambia el dominio, actualizar `og:url` / `og:image` en `index.html` (van con URL completa por WhatsApp).

- Build command: `npm run build` · Output: `dist` · Node ≥ 20.19 (Vite 8).
- No necesita variables de entorno en Cloudflare: todo sale de `.env.demos`.
- `public/_redirects` manda todas las rutas a `index.html` (SPA).
- Sin service worker ni PWA (se quitó a propósito: una demo vieja en caché estorba).
- `robots.txt` + `<meta name="robots" content="noindex">`: son negocios inventados o prospectos reales, no deben salir en Google.

## Candado (códigos de acceso)

Desde el 13-oct-2026 **todo el sitio, índice incluido, está cerrado**: sin código válido solo se ve la pantalla del candado (pide código + botón "Pide tu demo" por WhatsApp). Motivo: la URL salió en un TikTok.

- Cada prospecto recibe un **link personal `/d/<CÓDIGO>`** (8 caracteres, sin 0/O/1/I/L) que vence en **7 días** por default. El link guarda el código en el navegador y lo manda directo a su demo (si abre solo una) o al índice, que solo enseña las demos de su código. También puede teclearlo en el candado (`XXXX-XXXX`).
- Se revalida contra la base en cada cambio de ruta: apagar o vencer un código cierra la demo al instante.
- Administración SOLO por terminal (`supabase/demos/accesos.mjs`; token como `sql.mjs`, en Mac lo toma del llavero):
  `nuevo "<prospecto>" [gimnasio/manhattan …] [--dias 7] [--nota "…"]` (sin demos = todas + índice; imprime link y mensaje para WhatsApp) · `lista [--todos]` · `ver CODIGO` (visitas) · `extender CODIGO [dias]` · `apagar|prender CODIGO`.
- Base: `40_accesos.sql` → `demo_accesos`, `demo_visitas` (RLS sin políticas, sin grants: el navegador no las puede leer) y la RPC `demo_entrar(codigo, ruta, registrar)` (única puerta, `security definer`). Freno a fuerza bruta: 20 intentos fallidos por IP en 10 min → `espera`. Las visitas fallidas se borran a los 30 días (cron `demo_visitas_limpieza`). Ningún reinicio nocturno las toca.
- Front: `src/demo/acceso/` (`acceso.js` lógica y contexto `useAcceso`, `Puerta.jsx` envuelve las rutas en `AppDemos.jsx` + `EntrarConCodigo`, `Candado.jsx` pantalla).
- Es candado de puerta, no de bóveda: el JS publicado se puede leer. Protege de curiosos, evita que ensucien las demos y dice quién entró.
- Códigos vigentes: el maestro de Zahir "Zahir (ventas)" (todas, vence 13-oct-2027) y "GYM Fitness Manhattan" (vence 20-oct-2026). Ver con `lista`.
- **Al mandar una demo a un prospecto, crearle su código con `nuevo`; los links viejos sin código ya no abren.**

## Las demos

- `/` → índice (marca KaiZen).
- `/demo/alma` → **Studio Alma** (pilates): la app real de Be Fit pintada con otra marca.
- `/pedidos/hoja` → **Hoja · cocina fit** (pedidos en línea: recoger, a domicilio, en mesa con QR).
- `/sorteos/fortuna` → **Sorteos Fortuna** (rifas con boletos; negocio de ejemplo, sin base de datos).
- `/gimnasio/atlas` → **Atlas Fitness** (control de acceso con QR y aforo en vivo). **Genérico desde el 20-oct-2026** para enseñarlo a cualquier gimnasio; antes era GYM Fitness Manhattan (prospecto real). Por dentro el negocio sigue siendo `manhattan` (cuentas `*@demo.manhattan.mx`, reinicio y cron): `ALIAS` en `GimnasioDemo.jsx` traduce el link, y `/gimnasio/manhattan` sigue abriendo. `?rol=socio|recepcion|dueno` abre directo en ese rol.

| Qué | Dónde |
|---|---|
| Entrada (siempre en modo demos) | `src/main.jsx` → `src/AppDemos.jsx` (`VITE_DEMOS=true`) |
| Índice | `src/pages/IndiceDemos.jsx` + `src/demo/catalogo.js` |
| Studio Alma | `src/pages/Demo.jsx`, `src/demo/estudiosDemo.js`, `recolorearDemo.js`, `GuiaDemo.jsx` |
| Hoja (pedidos) | `src/demo/pedidos/*` (no usa nada de Be Fit). App del cliente en estilo **"Tinta"** (9-oct, referencia de un video de app de café): azul cobalto sobre crema, dibujos a mano y una palabra en letra de plumón (Caveat Brush + Instrument Sans). `tinta.jsx` (Carga con %, Bienvenida, Dibujo, Nombre, Precio en brochazo, Pildora, Contorno) + `tintaBase.js` (fichas y animaciones). Dibujos en `public/pedidos/hoja/dibujos/<foto>.png` (los generó Codex; son máscaras con transparencia, se pintan con `mask-image`, y salen del nombre de la foto del producto; sin dibujo se cae a la foto). Cocina/Reparto/Dueño siguen con `ui.jsx`, pero toman los colores de la marca |
| Studio Alma · app de clienta propia | `src/demo/alma/*` (se activa con `appClienta: 'alma'` en `estudiosDemo.js`; Demo.jsx la pinta en las vistas portal/agenda/evolucion/yo). Estilo premium minimalista con vidrio líquido, UNA sola letra (Manrope) y paleta de Alma; fotos solo en la portada y la tarjeta de la próxima clase. Modo oscuro (Yo → Modo oscuro, `localStorage alma_tema`). `estilo.js` (tabla TEMAS con variables --a-*; vidrio, vidrioFoto), `ui.jsx` (Foto, TarjetaTinta, Chip, Boton, Deslizar, Hoja, Fondo), `Portada`, `Inicio`, `Horario` (TiraDias, ListaDia), `HojaClase` (reservar/espera/oferta/cancelar con las MISMAS funciones de useAuth + perfil de coach + compañeras vía get_class_attendees + calendario .ics en web), `Pase` (QR + Wallet: real en app nativa, aviso en web), `Progreso`, `Yo` + `Cuenta` (datos personales, recordatorios, modo oscuro) + `FotoPerfil` (uploadAvatar, como MiCuenta), `Avisos` (campana con notification_logs + animación de insignia nueva con badgeQueue), `Planes` (compra con pasarela de prueba → RPC `demo_comprar_plan`, `supabase/demos/30_alma_compra_plan.sql`). Cafetería, eventos, cumpleaños y nutrición siguen siendo las de Be Fit. |
| Studio Alma · paneles del equipo | `src/demo/alma/staff/*` (Demo.jsx los usa cuando `appClienta: 'alma'`). `Panel.jsx` (menú de vidrio lateral/abajo, mismo tema que la clienta) y `Equipo.jsx` (secciones por rol). **Mostrador** (`Mostrador.jsx` + `checkin.js`: misma ventana de check-in y `checkInClient`/`checkInReservation` que QrCheckIn de Be Fit; cámara con qr-scanner + lector USB; "pases de prueba" para demos en vivo; Clases de hoy con pase de lista; Ventas = la de Be Fit). **Coach** (`Coach.jsx`: mi día con clases por hora, lista de alumnas solo de sus clases, su QR, historias). **Barra** (`Barra.jsx`: tablero en tiempo real). **Dirección** modo mixto (`Direccion.jsx`: "Hoy" propio + las 15 secciones de `pages/Admin.jsx` incrustadas con `seccion`/`incrustado` y la piel `pielAdmin.js`: Manrope y cajas blancas → vidrio). |
| Gimnasio (acceso y aforo) | `src/demo/gimnasio/*` — estilo **"Volt"** (10-oct, referencias de apps de fitness que pasó el usuario): negro, UN acento plano (rojo `#FF3326`; lima `#D7FF3A` era la otra opción), sin degradados ni brillos, fotos de gente entrenando y titulares en Barlow Condensed mayúscula (+ Geist). La paleta vive en `TEMA` de `ui.jsx` (ya NO en `gym_negocios.marca`). "Bueno" va en blanco hueso; el rojo es para lo que hay que atender. Fotos (las generó Codex) en `public/gimnasio/img/*.webp (OJO: no `fotos/`, el .gitignore ignora `Fotos/`)` (`FOTOS`, `fotoSocio` solo #1001, `fotoClase`). `ui.jsx` (Tarjeta con `acento`, Foto, Grande, Barra, Chip, Segmentado…), `marco.jsx` (píldora flotante abajo en celular / lateral en compu, Notificaciones), `Lector.jsx` (lector USB en modo teclado + atajos 1–5 de la demo; **sin cámara**), `Socio` (Portada una vez por pestaña · Inicio · Pase · En vivo · Visitas · Cuenta; en compu usa menú lateral y cada pantalla va a dos columnas con `Columnas`, la portada parte foto/texto), `Recepcion` (Acceso: resultado a pantalla completa blanco=pasa/rojo=no pasa · En vivo · Socios con ficha), `Dueno` (Hoy · Aforo · Socios + directorio · Planes · Equipo · Dinero · Reportes · Ajustes), `cuerpo.jsx` (báscula del gym simulada en web con la fórmula de Be Fit `lib/bodyComposition.js` → `gym_medir`; `Actividad` = Salud simulado, datos de ejemplo por fecha), `admin.jsx` (FichaSocio compartida recepción/dueño con Accesos · Báscula · Pagos · Datos, FormSocio alta/edición, Directorio, Planes, Equipo, Reportes), `graficas.jsx` (SVG a mano; `BarrasHora`). Socio: pestaña Progreso (Cuerpo · Actividad · Visitas); la tira de días de Inicio es tocable (detalle del día, 4 semanas atrás) |
| Sorteos (rifas con boletos) | `src/demo/sorteos/*` — `/sorteos/fortuna`, **SIN base de datos**: todo vive en `localStorage` (`demo_sorteos_v3`) y dos pestañas se sincronizan con el evento `storage`. Prospecto (20-oct-2026): el hermano de Carlos (el del POS), referencia elchato.com.mx. Estilo "noche + oro" (Anton + Inter). `datos.js` (sorteos, paquetes, oportunidades, semilla determinista, compradores simulados, liberación de apartados vencidos, **comprobación automática simulada**: `verificarAuto`/`mandarARevision` con motivos; en el sistema real = IA lee el comprobante + CEP de Banxico), `Sitio.jsx` (comprador: portada, cuadrícula por bloques de 500, buscador, maquinita, apartar, pago con cuentas + subir comprobante + pasos "Comprobando tu pago", boleto digital con QR, verificar por teléfono/número), `Panel.jsx` (verificador: resumen, comprobantes con interruptor de comprobación automática, apartados, boletos + Excel de pagados, ganador con Lotería Nacional), `comun.jsx`, `sorteos.css` (prefijo `so-`). Fotos de premios generadas con Codex en `public/sorteos/`. **Pulido del 20-oct** (pedido de Zahir: "premium, no como la referencia; muy atascado de info"): vidrio líquido sobre resplandores de color (`.so::before`), poco texto y lo secundario plegado (reglas y bonos en `<details>`). `Maquina.jsx`: `Rodillos` (tragamonedas, tira 0–9 ×6, `girar(n, { lento, alParar })`, desenfoque mientras gira) + `MaquinaCasino` (corona en arco con focos sobre el óvalo, columnas de luces, LED con VT323, fichas de casino, botón de arcade, palanca que se arrastra, monedas y boleto impreso). `sonido.js`: sonidos sintetizados con Web Audio (palanca, tic-tac, golpe por rodillo, premio, ficha), silenciables (`demo_sorteos_silencio`). `useDialogo` también bloquea el scroll de atrás. `Transmision.jsx`: rol **En vivo** (`?rol=vivo`), pantalla 16:9 para el live con rodillos lentos, ganador y pantalla completa; las clases de fase son `tx-fase-*` (con `tx-ganador` chocaba con el bloque del ganador). Las reglas base van con `:where(.so)` para no ganarle el color a los componentes. **Revisión de Codex (20-oct, 9 hallazgos, todos reales y corregidos):** el ganador sale SOLO de `armarNumero`/`duenoDe` (datos.js; panel y transmisión), sin módulo — lo que se ve armado es lo que juega; con oportunidades el número tiene las cifras de la oportunidad más alta (`cifrasJuego`) y puede caer en una oportunidad; `cambiar` relee localStorage antes de escribir y solo la pestaña líder (`soyLider`) simula; `subirComprobante`/`aprobar`/`verificarAuto` exigen que el folio siga siendo dueño de sus números; la comprobación automática se agenda en el almacén (`programarAuto` → `procesarAutos` cada segundo en SorteosDemo), la pantalla solo la anima; CSV de pagados neutraliza fórmulas (`'`); modales con `useDialogo` (foco, Tab, Escape); confeti oculto con movimiento reducido. 🔴 Stripe PROHÍBE rifas comerciales: no proponer cobro con Stripe. |
| Marca KaiZen y barra superior | `src/demo/kaizen/marca.jsx`, `src/demo/kaizen/BarraDemo.jsx` |
| Pasarela de pago de PRUEBA | `src/demo/PasarelaPrueba.jsx`; tarjeta `4242…` aprueba, `4000000000000002` rechaza |
| SQL de la base Demos | `supabase/demos/*.sql` |
| Edge functions de la base Demos | `supabase/demos/functions/` (`stripe-cafe-checkout` versión demo, `pago-prueba`) |

## Base de datos

- Supabase **"Demos"**, ref `qwqrbckivrkmeykiukug`. **Nunca** la de Be Fit (`fifaowaiokauhuqklzwe`).
- Consultas en Windows o Mac: `node supabase/demos/sql.mjs <archivo.sql>` o `-e "<sql>"`. Token en `~/.supabase-demos-token`, `SUPABASE_DEMOS_TOKEN` o (Mac) el llavero "Supabase DEMOS" (`api.mjs`); el ref va fijo y antes de correr comprueba que el proyecto se llame "Demos".
- Consultas (Mac): `supabase/demos/consulta.sh demos <archivo.sql|->`. Lee el PAT del llavero de macOS ("Supabase DEMOS"); esa cuenta también es la del POS → **verificar el ref antes de correr nada**. En Windows no corre tal cual (usa `security`).
- Edge functions: se despliegan por la Management API con curl (el CLI viejo rechaza tokens `sbp_v0_`):
  `POST https://api.supabase.com/v1/projects/<ref>/functions/deploy?slug=<nombre>` multipart (`metadata` + `file`).
- Se reinician solas cada noche por pg_cron (`demo_reset` de Alma, `pedidos_reset_nocturno` de Hoja 3:10 am MX, `gym_reset_nocturno` del gimnasio 3:20 am MX).
- Cuentas demo: contraseña `StudioAlma-Demo-2026` (Alma, `*@demo.hoja.mx` y `*@demo.manhattan.mx`); el reset las restaura. Todas deben estar en `demo_cuentas` (el reset de Alma borra las demás).

### Gimnasio (`20_gimnasio.sql` estructura y funciones · `21_gimnasio_manhattan.sql` datos y reinicio · `22_gimnasio_v2.sql` báscula, equipo, alta/edición, planes, reportes)

- **Orden para aplicar:** 20 → 22 → 21 (21 termina con `select gym_reset()`, que al final llama `gym_reset_v2()` si existe). `gym_reset_v2` solo la llama `gym_reset` (sin grant).
- v2: `gym_staff` (equipo; la cuenta Recepción = "Karen Soto", Dirección = "Dirección"; 4 coaches para la fase de clases), `gym_mediciones` (báscula), columnas nuevas en `gym_socios` (telefono, sexo, nacimiento, estatura_cm, `plan_siguiente` = cambio de plan pendiente: `gym_editar_socio` no toca el plan pagado y `gym_regularizar` (reemplazada en 22) lo aplica y cobra al renovar) y `staff_id` en `gym_pagos`/`gym_accesos` con default `gym_staff_yo()` (firma quién cobró/registró). Funciones: `gym_mi_perfil`, `gym_medir`, `gym_alta_socio`, `gym_editar_socio`, `gym_congelar` (equipo), `gym_guardar_plan`, `gym_borrar_plan`, `gym_guardar_staff`, `gym_equipo`, `gym_reportes` (solo dueño). La ficha lee `gym_socios` directo (RLS: solo equipo); `gym_socio_json` NO se expone al cliente.
- Datos v2 del reinicio: 975 socios (855 + 90 ex-socios que vencieron hace 1-6 meses + 30 altas del último mes), 6 meses de cobros firmados por Karen (mañana) / Luis (tarde), ~35 socios "en riesgo" (dejaron de venir 2+ semanas), mediciones: Carlos con 10 semanas bajando grasa y ~20% de los activos con 1-3.

- El QR del socio es un token `GYM1.<numero>.<ventana>.<hmac>` que cambia cada 30 s (`gym_mi_pase`); la llave vive en `gym_secretos` (sin políticas). Recepción acepta la ventana actual y la anterior; más vieja = "captura de pantalla".
- Todo acceso pasa por `gym_evaluar`: congelada → vencida → adeudo → horario del plan → antipassback (solo en modo "Solo entrada") → aforo. Misma persona en < 12 s = `repetido`.
- "Adentro" = último acceso permitido de las últimas 3 h es entrada (sin salida = salida automática a las 3 h).
- Simulación: `gym_reset()` arma 855 socios (semilla fija; la v2 agrega ex-socios y altas recientes), 4 semanas de visitas con picos 7 am / 7 pm (lunes el más lleno, ~86% de aforo) y la agenda de hoy; `gym_simular()` (cron cada minuto) la suelta pasando por las mismas reglas.
- Socios de ejemplo para los "pases de prueba": 1001 Carlos (cuenta Socio), 1002 vencida, 1003 adeudo, 1004 plan matutino, 1005 congelada.
- `recharts` NO carga con Vite 8 (su dependencia es-toolkit choca con rolldown): las gráficas van en SVG.
- La CSP de `index.html` lleva `worker-src 'self' blob:` por qr-scanner, que hoy solo usa el Mostrador de Alma (el gimnasio ya no lo usa).

## Reglas

- **Los QR se leen con lector físico (USB, modo teclado), nunca con cámara.** Aplica a todas las demos y proyectos. En demos, los "pases de prueba" simulan la lectura.
- Nada de llaves secretas ni de producción en el repo. Tras `npm run build`, en `dist/` debe haber **0** `pk_live`, **0** `pk_test` y **0** `fifaowaiokauhuqklzwe`.
- Las imágenes de `public/` vienen de Be Fit y Alma las usa; no borrarlas sin revisar `src/demo/estudiosDemo.js`.

## Pendientes

0. Gimnasio: rediseño "Volt" hecho el 10-oct (la paleta del Instagram en `gym_negocios.marca` ya no se usa, a pedido del usuario). Dirección, Instagram y clases siguen en `gym_negocios.info`. El socio ve sus propios pagos (RLS) y el mapa de calor (`gym_calor` abierto a cualquier miembro). Siguiente paso acordado: un perfil "Sitio web" con inscripción en línea (pago de prueba → pase al instante → recepción → dueño). El logo es PROVISIONAL (`Logo` en `src/demo/gimnasio/ui.jsx`: cuadro de acento con las siglas + nombre en condensada); cuando pasen el suyo, reemplazarlo ahí. Pendiente aparte: el Mostrador de Alma todavía tiene botón de cámara (qr-scanner); quitarlo cuando se toque esa demo. Ya está listado en `catalogo.js` (lo pidió el usuario).
1. Ya que esto funcione en internet: quitar las demos de `be-fit-lab` (`src/demo/`, `AppDemos.jsx`, `IndiceDemos.jsx`, `Demo.jsx`, `.env.demos`, scripts `*:demos`, `supabase/demos/`).
2. Limpieza opcional: `src/` aún trae páginas de Be Fit que ninguna demo usa (el bundler ya las deja fuera del build).
3. Opcionales ya platicados: ejemplo de restaurante; en Alma, Reportes (`admin-analytics` no está desplegada en Demos y `AdminReportes` no tiene guardia), pasarela de prueba para membresías/eventos, `admin-create-client`.
4. Visto en Alma (sin tocar): "Tu semana" dice "2 asistidas" pero las tarjetas marcan 0 clases / 0 racha / 0 puntos. En `Coach.jsx`, "Alumnas hoy" muestra el día seleccionado y la lista de clases no se ordena por hora.
