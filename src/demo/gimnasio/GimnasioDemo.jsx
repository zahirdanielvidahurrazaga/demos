import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { LayoutDashboard, Loader2, MessageCircle, RotateCcw, ScanLine, Smartphone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import BarraDemo from '../kaizen/BarraDemo';
import { KAIZEN } from '../kaizen/marca';
import { errorLegible } from './datos';
import { cargarFuentesGym, g } from './ui';
import Socio from './Socio';
import Recepcion from './Recepcion';
import Dueno from './Dueno';

// ─────────────────────────────────────────────────────────────────────────────
// MAQUETA DE GIMNASIO — /gimnasio/<negocio>
//
// Control de acceso con QR y aforo en vivo, contra la base de DEMOSTRACIONES
// (20_gimnasio.sql + 21_gimnasio_manhattan.sql). Cada rol de la barra es una
// cuenta de prueba con su sesión solo en esta pestaña (lib/supabase.js): el
// socio en el celular, recepción en la laptop y el dueño en otra pestaña, y
// todo se mueve en vivo. La gente "simulada" entra y sale sola (gym_simular,
// cada minuto) y la base se reinicia cada noche y desde la guía.
// ─────────────────────────────────────────────────────────────────────────────

const CONTRASENA = 'StudioAlma-Demo-2026';

const ROLES = [
  { id: 'socio', etiqueta: 'Socio', Icon: Smartphone, correo: (n) => `socio@demo.${n}.mx` },
  { id: 'recepcion', etiqueta: 'Recepción', Icon: ScanLine, correo: (n) => `recepcion@demo.${n}.mx` },
  { id: 'dueno', etiqueta: 'Dueño', Icon: LayoutDashboard, correo: (n) => `dueno@demo.${n}.mx` },
];

const GUIA = {
  socio: [
    'Tu pase de acceso: el QR cambia cada 30 segundos, así que una captura de pantalla no le sirve a nadie más.',
    'Abre "Recepción" en otra pestaña (o en otra compu) y escanea este QR con la cámara: aquí te llega la bienvenida al instante.',
    'Abajo ves qué tan lleno está el gimnasio ahora y a qué hora suele haber menos gente.',
  ],
  recepcion: [
    'Activa la cámara y escanea el pase del socio, o toca un "pase de prueba" para ver cada caso: vencida, adeudo, plan matutino, congelada.',
    'Si alguien no puede pasar, se resuelve ahí: renovar, cobrar el adeudo o dejarlo pasar con autorización.',
    'Cambia a "Solo entrada" (torniquete) y escanea dos veces al mismo socio: el antipassback no deja prestar el pase.',
    'Con el código de "Pruébalo con tu celular" abres el pase en tu teléfono y lo escaneas aquí.',
  ],
  dueno: [
    'Aforo en vivo: la gente simulada entra y sale sola cada minuto, y lo que escanea recepción aparece aquí al momento.',
    'Horas pico de las últimas 4 semanas, accesos negados por motivo y quién está adentro ahora.',
    'Baja el aforo máximo y mira cómo recepción empieza a negar entradas por "aforo completo".',
    '"Por cobrar": vencidas y adeudos con recordatorio por WhatsApp en un toque.',
  ],
};

export default function GimnasioDemo() {
  const { negocio: clave } = useParams();
  const [negocio, setNegocio] = useState(undefined);
  const [rol, setRol] = useState(() => {
    const r = new URLSearchParams(window.location.search).get('rol');
    return ROLES.some((x) => x.id === r) ? r : 'recepcion';
  });
  const [sesion, setSesion] = useState(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [errorSesion, setErrorSesion] = useState('');
  const [guia, setGuia] = useState(false);
  const [reiniciando, setReiniciando] = useState(false);
  const encabezado = useRef(null);
  const [alto, setAlto] = useState(100);

  useEffect(() => { cargarFuentesGym(); }, []);

  const cargarNegocio = useCallback(async () => {
    const { data, error } = await supabase.from('gym_negocios').select('*').eq('id', clave).maybeSingle();
    if (error) return; // falla de red: se queda lo que había
    setNegocio(data || null);
  }, [clave]);
  useEffect(() => {
    cargarNegocio();
    const canal = supabase.channel(`gym-negocio-${clave}-${Math.random().toString(36).slice(2, 7)}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'gym_negocios', filter: `id=eq.${clave}` }, cargarNegocio)
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [clave, cargarNegocio]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSesion(data.session); setCargandoSesion(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSesion(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const correo = ROLES.find((r) => r.id === rol)?.correo(clave);
  const listo = sesion?.user?.email === correo;
  useEffect(() => {
    if (!negocio || cargandoSesion || listo) return undefined;
    let vivo = true;
    setErrorSesion('');
    supabase.auth.signInWithPassword({ email: correo, password: CONTRASENA })
      .then(({ error }) => { if (vivo && error) setErrorSesion(error.message); });
    return () => { vivo = false; };
  }, [negocio, cargandoSesion, listo, correo]);

  useEffect(() => {
    if (!negocio) return undefined;
    const previoTitulo = document.title;
    const previoFondo = document.body.style.background;
    document.title = `${negocio.nombre} — control de acceso (demostración)`;
    document.body.style.background = negocio.marca?.fondo || '#0B0C0E';
    return () => { document.title = previoTitulo; document.body.style.background = previoFondo; };
  }, [negocio]);

  useLayoutEffect(() => {
    const medir = () => setAlto(encabezado.current?.offsetHeight ?? 100);
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [negocio]);

  if (negocio === null) return <Navigate to="/" replace />;
  if (negocio === undefined) {
    return <div style={{ minHeight: '100vh', background: '#0B0C0E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}><Loader2 size={26} style={{ animation: 'spin 1s linear infinite' }} /></div>;
  }

  const m = negocio.marca || {};
  const vars = {
    '--g-pri': m.primario, '--g-pri-texto': m.primarioTexto, '--g-fondo': m.fondo, '--g-sup': m.superficie,
    '--g-sup2': m.superficie2, '--g-texto': m.texto, '--g-suave': m.textoSuave || m.suave,
    '--g-verde': m.verde, '--g-rojo': m.rojo, '--g-ambar': m.ambar,
  };

  const reiniciar = async () => {
    setReiniciando(true);
    const { error } = await supabase.rpc('gym_reset');
    if (error) { setReiniciando(false); setErrorSesion(errorLegible(error)); return; }
    window.location.href = `/gimnasio/${negocio.id}?rol=${rol}`;
  };

  const mensaje = `Hola KaiZen, vi la demo de control de acceso de ${negocio.nombre} y me interesa para mi gimnasio.`;
  const rolActual = ROLES.find((r) => r.id === rol);

  return (
    <div style={{
      ...vars, minHeight: '100vh', background: g.fondo, color: g.texto, fontFamily: g.texto2, WebkitFontSmoothing: 'antialiased',
    }}>
      <div ref={encabezado} style={{ position: 'sticky', top: 0, zIndex: 9300, paddingBottom: 8, background: 'linear-gradient(var(--g-fondo) 62%, transparent)' }}>
        <BarraDemo roles={ROLES} rol={rol} alCambiar={setRol}
          guiaAbierta={guia} alGuia={() => setGuia((x) => !x)}
          aviso={`Demostración para ${negocio.nombre} · socios y movimientos de ejemplo · por KaiZen`} />
      </div>

      {guia && (
        <aside style={{
          position: 'fixed', zIndex: 9350, right: 16, top: alto + 4, width: 'min(380px, calc(100vw - 24px))', boxSizing: 'border-box',
          background: '#fff', borderRadius: 24, padding: 22, color: '#1d1d1f', fontFamily: KAIZEN.texto,
          border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
          maxHeight: `calc(100vh - ${alto + 24}px)`, overflowY: 'auto',
        }}>
          <div style={{ fontSize: '0.64rem', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#6e6e73', paddingBottom: 10, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
            Guía · {rolActual.etiqueta}
          </div>
          <div style={{ fontFamily: KAIZEN.display, fontSize: '1.45rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, margin: '14px 0 12px' }}>
            Qué probar <span style={{ fontStyle: 'italic', color: '#6e6e73' }}>aquí</span>
          </div>
          <ol style={{ listStyle: 'none', margin: '0 0 16px', padding: 0, display: 'grid', gap: 10 }}>
            {GUIA[rol].map((p, i) => (
              <li key={p} style={{ display: 'flex', gap: 12, fontSize: '0.9rem', lineHeight: 1.5 }}>
                <span style={{ fontFamily: KAIZEN.display, fontWeight: 700, color: '#86868b', minWidth: 20 }}>{String(i + 1).padStart(2, '0')}</span>
                <span>{p}</span>
              </li>
            ))}
          </ol>
          <p style={{ fontSize: '0.82rem', color: '#6e6e73', margin: '0 0 16px', lineHeight: 1.5 }}>
            Todo funciona de verdad: socios, accesos y aforo viven en una base de datos real. Los cobros son de prueba.
          </p>
          <a href={`https://wa.me/${KAIZEN.whatsapp}?text=${encodeURIComponent(mensaje)}`} target="_blank" rel="noreferrer" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 16px', borderRadius: 999,
            background: '#1d1d1f', color: '#fff', fontWeight: 600, textDecoration: 'none', marginBottom: 8, fontSize: '0.92rem',
          }}><MessageCircle size={17} /> Quiero esto para mi gimnasio</a>
          <button type="button" onClick={() => { setGuia(false); reiniciar(); }} style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 16px', borderRadius: 999,
            border: '1px solid rgba(0,0,0,0.12)', background: '#fff', color: '#1d1d1f', fontWeight: 600, cursor: 'pointer',
            fontFamily: KAIZEN.texto, fontSize: '0.92rem',
          }}><RotateCcw size={16} /> Reiniciar la demostración</button>
        </aside>
      )}

      {listo && !reiniciando ? (
        <main>
          {rol === 'socio' && <Socio negocio={negocio} />}
          {rol === 'recepcion' && <Recepcion negocio={negocio} />}
          {rol === 'dueno' && <Dueno negocio={negocio} alCambiarNegocio={cargarNegocio} />}
        </main>
      ) : (
        <div style={{ minHeight: `calc(100vh - ${alto}px)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: g.suave, padding: 24, textAlign: 'center' }}>
          {errorSesion ? <span>No se pudo entrar a la demostración: {errorSesion}</span> : (
            <>
              <Loader2 size={26} style={{ animation: 'spin 1s linear infinite' }} />
              {reiniciando ? 'Reiniciando la demostración…' : `Entrando como ${rolActual.etiqueta.toLowerCase()}…`}
            </>
          )}
        </div>
      )}
    </div>
  );
}
