import { useEffect } from 'react';
import App from './App';
import Espejo from './Espejo';
import Expo from './Expo';
import Iphone from './Iphone';
import Sitio from './Sitio';
import './bocado.css';

// ─────────────────────────────────────────────────────────────────────────────
// EL BUEN BOCADO — /comida/buenbocado (13-nov-2026)
//
// Proyecto de Emprendimiento de Zahir: comida saludable para recoger, para
// oficinistas. El profe (dueño de una cafetería) pidió ver el prototipo del
// local y de la app. Desde el 17-nov la ruta abre la EXPOSICIÓN (`Expo.jsx`:
// portada → la app → el local 3D), en olivo pastel con vidrio líquido.
// `?rol=app` = la app sola (en compu dentro del iPhone, en celular a pantalla
// completa). La presentación vieja por capítulos sigue en `?rol=sitio`.
// Sin base de datos y sin barra de KaiZen.
// Marca: `marca/buenbocado/manual.html` (ruta "Mordida").
// ─────────────────────────────────────────────────────────────────────────────

export default function BuenBocadoDemo() {
  const rol = new URLSearchParams(window.location.search).get('rol');

  useEffect(() => {
    if (!document.getElementById('fuentes-bocado')) {
      const link = document.createElement('link');
      link.id = 'fuentes-bocado'; link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,800&family=Inter:wght@400;500;600;700&display=swap';
      document.head.appendChild(link);
    }
    const antes = document.body.style.background;
    const titulo = document.title;
    document.body.style.background = rol === 'sitio' ? '#EEF0E2' : '#C4CAA3';
    document.title = 'el buen bocado · Comer bien, a tu hora';
    return () => { document.body.style.background = antes; document.title = titulo; };
  }, [rol]);

  if (!rol) return <div className="bb bb-expo"><Expo /></div>;
  if (rol === 'app') {
    // En compu la app vive dentro del iPhone realista; en el celular, a pantalla completa.
    const enCompu = window.matchMedia?.('(min-width: 700px) and (pointer: fine)').matches;
    if (enCompu) {
      return (
        <div className="bb bb-escenario">
          <Espejo selector=".bb-escenario > .ip .ip-escala" />
          <Iphone inclina logico={393}><App marco /></Iphone>
          <p className="pie">el buen bocado · prototipo de la app</p>
        </div>
      );
    }
    return <div className="bb bb-solo"><App /></div>;
  }
  return <div className="bb"><Sitio /></div>;
}
