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
- `robots.txt` + `<meta name="robots" content="noindex">`: son negocios inventados, no deben salir en Google.

## Las demos

- `/` → índice (marca KaiZen).
- `/demo/alma` → **Studio Alma** (pilates): la app real de Be Fit pintada con otra marca.
- `/pedidos/hoja` → **Hoja · cocina fit** (pedidos en línea: recoger, a domicilio, en mesa con QR).

| Qué | Dónde |
|---|---|
| Entrada (siempre en modo demos) | `src/main.jsx` → `src/AppDemos.jsx` (`VITE_DEMOS=true`) |
| Índice | `src/pages/IndiceDemos.jsx` + `src/demo/catalogo.js` |
| Studio Alma | `src/pages/Demo.jsx`, `src/demo/estudiosDemo.js`, `recolorearDemo.js`, `GuiaDemo.jsx` |
| Hoja (pedidos) | `src/demo/pedidos/*` (no usa nada de Be Fit) |
| Marca KaiZen y barra superior | `src/demo/kaizen/marca.jsx`, `src/demo/kaizen/BarraDemo.jsx` |
| Pasarela de pago de PRUEBA | `src/demo/PasarelaPrueba.jsx`; tarjeta `4242…` aprueba, `4000000000000002` rechaza |
| SQL de la base Demos | `supabase/demos/*.sql` |
| Edge functions de la base Demos | `supabase/demos/functions/` (`stripe-cafe-checkout` versión demo, `pago-prueba`) |

## Base de datos

- Supabase **"Demos"**, ref `qwqrbckivrkmeykiukug`. **Nunca** la de Be Fit (`fifaowaiokauhuqklzwe`).
- Consultas: `supabase/demos/consulta.sh demos <archivo.sql|->`. Lee el PAT del llavero de macOS ("Supabase DEMOS"); esa cuenta también es la del POS → **verificar el ref antes de correr nada**. En Windows no corre tal cual (usa `security`).
- Edge functions: se despliegan por la Management API con curl (el CLI viejo rechaza tokens `sbp_v0_`):
  `POST https://api.supabase.com/v1/projects/<ref>/functions/deploy?slug=<nombre>` multipart (`metadata` + `file`).
- Se reinician solas cada noche por pg_cron (`demo_reset` de Alma y `pedidos_reset_nocturno` de Hoja, 3:10 am MX).
- Cuentas demo: contraseña `StudioAlma-Demo-2026` (Alma y `*@demo.hoja.mx`); el reset las restaura.

## Reglas

- Nada de llaves secretas ni de producción en el repo. Tras `npm run build`, en `dist/` debe haber **0** `pk_live`, **0** `pk_test` y **0** `fifaowaiokauhuqklzwe`.
- Las imágenes de `public/` vienen de Be Fit y Alma las usa; no borrarlas sin revisar `src/demo/estudiosDemo.js`.

## Pendientes

1. Ya que esto funcione en internet: quitar las demos de `be-fit-lab` (`src/demo/`, `AppDemos.jsx`, `IndiceDemos.jsx`, `Demo.jsx`, `.env.demos`, scripts `*:demos`, `supabase/demos/`).
2. Limpieza opcional: `src/` aún trae páginas de Be Fit que ninguna demo usa (el bundler ya las deja fuera del build).
3. Opcionales ya platicados: ejemplo de restaurante; en Alma, Reportes (`admin-analytics` no está desplegada en Demos y `AdminReportes` no tiene guardia), pasarela de prueba para membresías/eventos, `admin-create-client`.
4. Visto en Alma (sin tocar): "Tu semana" dice "2 asistidas" pero las tarjetas marcan 0 clases / 0 racha / 0 puntos. En `Coach.jsx`, "Alumnas hoy" muestra el día seleccionado y la lista de clases no se ordena por hora.
