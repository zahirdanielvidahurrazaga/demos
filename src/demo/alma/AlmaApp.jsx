import { useState } from 'react';
import { a, estilosAlma, variables } from './estilo';
import { Fondo } from './ui';
import Portada from './Portada';
import Inicio from './Inicio';
import Clases from './Clases';
import Yo from './Yo';
import Progreso from './Progreso';
import Barra from './Barra';
import HojaClase from './HojaClase';
import Pase from './Pase';
import Planes from './Planes';
import { HojaAvisos, InsigniaNueva } from './Avisos';

// ─────────────────────────────────────────────────────────────────────────────
// APP DE LA CLIENTA — STUDIO ALMA (estilo "frío": niebla, fotos monocromo y
// vidrio claro). Portada, Inicio, Clases, Yo y el pase son pantallas propias
// con los datos y funciones REALES (useAuth): reservar, cancelar, lista de
// espera y ofertas pasan por las mismas reglas y la misma base que en Be Fit.
// Progreso y las opciones de cuenta también. Cafetería, eventos, cumpleaños y
// nutrición siguen siendo las
// pantallas de Be Fit (se abren con `alVista`).
// ─────────────────────────────────────────────────────────────────────────────

const CLAVE_PORTADA = 'alma_portada_vista';
const CLAVE_TEMA = 'alma_tema';

function portadaVista() {
  try { return Boolean(sessionStorage.getItem(CLAVE_PORTADA)); } catch { return false; }
}

export default function AlmaApp({ cfg, vista, alVista, altoEncabezado }) {
  const [clase, setClase] = useState(null); // { clase, fecha }
  const [pase, setPase] = useState(false);
  const [portada, setPortada] = useState(() => !portadaVista());
  const [avisos, setAvisos] = useState(false);
  const [planes, setPlanes] = useState(false);
  // El tema es preferencia de quien ve la demo (este navegador).
  const [tema, setTemaEstado] = useState(() => { try { return localStorage.getItem(CLAVE_TEMA) || 'claro'; } catch { return 'claro'; } });
  const setTema = (t) => { setTemaEstado(t); try { localStorage.setItem(CLAVE_TEMA, t); } catch { /* sin almacenamiento */ } };
  const p = cfg.portadas || {};
  const fotos = [p.membresia, p.galeriaEventos, p.pase].filter((f) => f && !String(f).startsWith('data:'));
  const abrirClase = (cl, fecha) => setClase({ clase: cl, fecha });
  const entrar = () => {
    try { sessionStorage.setItem(CLAVE_PORTADA, '1'); } catch { /* sin almacenamiento */ }
    setPortada(false);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="alma-app" style={{
      ...variables(tema), '--a-alto-encabezado': `${altoEncabezado}px`,
      position: 'relative', minHeight: '100vh', fontFamily: a.letra, color: a.tinta, WebkitFontSmoothing: 'antialiased',
    }}>
      <style>{estilosAlma}</style>
      <Fondo />

      {portada ? (
        <Portada cfg={cfg} foto={p.pase || fotos[0]} alto={`calc(100dvh - ${altoEncabezado}px)`} alEntrar={entrar} />
      ) : (
        <>
          {vista === 'portal' && <Inicio cfg={cfg} fotos={fotos} alAbrirClase={abrirClase} alPase={() => setPase(true)} alIr={alVista} alVista={alVista} alAvisos={() => setAvisos(true)} alPlanes={() => setPlanes(true)} />}
          {vista === 'agenda' && <Clases alAbrirClase={abrirClase} />}
          {vista === 'evolucion' && <Progreso />}
          {vista === 'yo' && <Yo cfg={cfg} alAbrirClase={abrirClase} alPlanes={() => setPlanes(true)} tema={tema} alTema={setTema} />}
          <Barra vista={vista} alIr={alVista} alPase={() => setPase(true)} />
        </>
      )}

      {clase && (
        <HojaClase clase={clase.clase} fecha={clase.fecha} cfg={cfg} alCerrar={() => setClase(null)}
          alPlanes={() => { setClase(null); setPlanes(true); }}
          alVerPase={() => { setClase(null); setPase(true); }} />
      )}
      {/* Capa de hojas: por encima de la barra y con las variables del tema (ver Hoja en ui.jsx). */}
      <div id="alma-hojas" style={{ position: 'relative', zIndex: 9400 }} />
      <Pase abierto={pase} alCerrar={() => setPase(false)} cfg={cfg} />
      <HojaAvisos abierta={avisos} alCerrar={() => setAvisos(false)} />
      <Planes abierta={planes} alCerrar={() => setPlanes(false)} />
      <InsigniaNueva />
    </div>
  );
}
