import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Bike, ChefHat, LayoutDashboard, Loader2, MessageCircle, RotateCcw, Smartphone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { errorLegible } from './datos';
import BarraDemo from '../kaizen/BarraDemo';
import { KAIZEN } from '../kaizen/marca';
import Cliente from './Cliente';
import Cocina from './Cocina';
import Reparto from './Reparto';
import Dueno from './Dueno';

// ─────────────────────────────────────────────────────────────────────────────
// MAQUETA DE PEDIDOS EN LÍNEA — /pedidos/<negocio>
//
// Corre contra la base de DEMOSTRACIONES con datos reales (10_pedidos.sql):
// cada rol de la barra es una cuenta de prueba y la sesión vive solo en esta
// pestaña (ver lib/supabase.js), así se puede tener al cliente en una pestaña
// y a la cocina en otra viendo entrar el pedido. La base se reinicia cada
// noche (pedidos_reset) y desde la guía.
// ─────────────────────────────────────────────────────────────────────────────

const CONTRASENA = 'StudioAlma-Demo-2026';

const ROLES = [
  { id: 'cliente', etiqueta: 'Cliente', Icon: Smartphone, correo: (n) => `ana@demo.${n}.mx` },
  { id: 'cocina', etiqueta: 'Cocina', Icon: ChefHat, correo: (n) => `cocina@demo.${n}.mx` },
  { id: 'repartidor', etiqueta: 'Reparto', Icon: Bike, correo: (n) => `reparto@demo.${n}.mx` },
  { id: 'dueno', etiqueta: 'Dueño', Icon: LayoutDashboard, correo: (n) => `dueno@demo.${n}.mx` },
];

const GUIA = {
  cliente: [
    'Elige "A domicilio", agrega un bowl y escoge su base y proteína extra.',
    'Paga con la tarjeta 4242 (o prueba la 4000…0002 para ver un rechazo).',
    'Abre otra pestaña en "Cocina": el pedido entra solo, en vivo.',
  ],
  cocina: [
    'Los pedidos nuevos llegan resaltados. "Empezar" y "Marcar listo" avisan al cliente al instante.',
    'Los de domicilio, al quedar listos, pasan al repartidor.',
  ],
  repartidor: [
    '"Salir a entregar" y "Marcar entregado" mueven el seguimiento del cliente.',
    'El botón Mapa abre la dirección en Google Maps.',
  ],
  dueno: [
    'Hoy: ventas, ticket promedio y lo más pedido, al día.',
    'Menú: marca algo como agotado y desaparece del menú del cliente.',
    'Mesas QR: cada código abre el menú ya en esa mesa.',
  ],
};

export default function PedidosDemo() {
  const { negocio: clave } = useParams();
  const [negocio, setNegocio] = useState(undefined);
  const [rol, setRol] = useState('cliente');
  const [sesion, setSesion] = useState(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [errorSesion, setErrorSesion] = useState('');
  const [guia, setGuia] = useState(false);
  const [reiniciando, setReiniciando] = useState(false);
  const encabezado = useRef(null);
  const [alto, setAlto] = useState(100);
  const mesaQR = (() => {
    const n = Number(new URLSearchParams(window.location.search).get('mesa'));
    return Number.isInteger(n) && n > 0 ? n : null;
  })();

  const cargarNegocio = useCallback(async () => {
    const { data, error } = await supabase.from('pedidos_negocios').select('*').eq('id', clave).maybeSingle();
    if (error) return; // falla de red: se queda lo que había (no "negocio inexistente")
    setNegocio(data || null);
  }, [clave]);
  // Ajustes del dueño (abierto, envío, modalidades) en vivo en todas las pestañas.
  useEffect(() => {
    cargarNegocio();
    const canal = supabase.channel(`pedidos-negocio-${clave}-${Math.random().toString(36).slice(2, 7)}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pedidos_negocios', filter: `id=eq.${clave}` }, cargarNegocio)
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [clave, cargarNegocio]);

  // Sesión
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSesion(data.session); setCargandoSesion(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSesion(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const correo = ROLES.find((r) => r.id === rol)?.correo(clave);
  const listo = sesion?.user?.email === correo;
  useEffect(() => {
    if (!negocio || cargandoSesion || listo) return;
    let vivo = true;
    setErrorSesion('');
    supabase.auth.signInWithPassword({ email: correo, password: CONTRASENA })
      .then(({ error }) => { if (vivo && error) setErrorSesion(error.message); });
    return () => { vivo = false; };
  }, [negocio, cargandoSesion, listo, correo]);

  // Marca, título y "no indexar" mientras la maqueta está abierta.
  useEffect(() => {
    if (!negocio) return;
    const previoTitulo = document.title;
    const previoFondo = document.body.style.background;
    document.title = `${negocio.nombre} — pedidos en línea (demostración)`;
    document.body.style.background = negocio.marca?.fondo || '#F5F0E6';
    const meta = document.createElement('meta');
    meta.name = 'robots'; meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => { document.title = previoTitulo; document.body.style.background = previoFondo; meta.remove(); };
  }, [negocio]);

  useLayoutEffect(() => {
    const medir = () => setAlto(encabezado.current?.offsetHeight ?? 100);
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [negocio]);

  if (negocio === null) return <Navigate to="/" replace />;
  if (negocio === undefined) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 size={26} style={{ animation: 'spin 1s linear infinite' }} /></div>;
  }

  const m = negocio.marca || {};
  const vars = {
    '--p-pri': m.primario, '--p-pri-osc': m.primarioOscuro, '--p-acento': m.acento, '--p-fondo': m.fondo,
    '--p-sup': m.superficie, '--p-texto': m.texto, '--p-suave': m.textoSuave, '--p-alto-encabezado': `${alto}px`,
  };

  const reiniciar = async () => {
    setReiniciando(true);
    const { error } = await supabase.rpc('pedidos_reset');
    if (error) { setReiniciando(false); setErrorSesion(errorLegible(error)); return; }
    try { localStorage.removeItem(`pedidos_carrito_${negocio.id}`); } catch { /* sin almacenamiento */ }
    window.location.href = `/pedidos/${negocio.id}`;
  };

  const mensaje = `Hola KaiZen, vi la demo de pedidos en línea de ${negocio.nombre} y me interesa para mi negocio.`;

  return (
    <div style={{
      ...vars, minHeight: '100vh', background: 'var(--p-fondo)', color: 'var(--p-texto)',
      fontFamily: "'Avenir Next', 'Segoe UI', system-ui, sans-serif", WebkitFontSmoothing: 'antialiased',
    }}>
      {/* Barra de KaiZen, igual en todas las demos (src/demo/kaizen/BarraDemo.jsx). */}
      <div ref={encabezado} style={{
        position: 'sticky', top: 0, zIndex: 9300, paddingBottom: 8,
        background: 'linear-gradient(var(--p-fondo) 62%, transparent)',
      }}>
        <BarraDemo roles={ROLES} rol={rol} alCambiar={setRol}
          guiaAbierta={guia} alGuia={() => setGuia((g) => !g)}
          aviso={`Demostración con datos de ejemplo · ${negocio.nombre} es un negocio inventado · por KaiZen`} />
      </div>

      {guia && (
        <aside style={{
          position: 'fixed', zIndex: 9350, right: 16, top: alto + 4, width: 'min(380px, calc(100vw - 24px))', boxSizing: 'border-box',
          background: '#fff', borderRadius: 24, padding: 22, color: '#1d1d1f', fontFamily: KAIZEN.texto,
          border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 24px 60px rgba(0,0,0,0.14)',
          maxHeight: `calc(100vh - ${alto + 24}px)`, overflowY: 'auto',
        }}>
          <div style={{ fontSize: '0.64rem', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#6e6e73', paddingBottom: 10, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
            Guía · {ROLES.find((r) => r.id === rol).etiqueta}
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
            Todo funciona de verdad: menú, pedidos y avisos viven en una base de datos real. El pago es de prueba: no se cobra nada.
          </p>
          <a href={`https://wa.me/${KAIZEN.whatsapp}?text=${encodeURIComponent(mensaje)}`} target="_blank" rel="noreferrer" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 16px', borderRadius: 999,
            background: '#1d1d1f', color: '#fff', fontWeight: 600, textDecoration: 'none', marginBottom: 8, fontSize: '0.92rem',
          }}><MessageCircle size={17} /> Quiero esto para mi negocio</a>
          <button type="button" onClick={() => { setGuia(false); reiniciar(); }} style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 16px', borderRadius: 999,
            border: '1px solid rgba(0,0,0,0.12)', background: '#fff', color: '#1d1d1f', fontWeight: 600, cursor: 'pointer',
            fontFamily: KAIZEN.texto, fontSize: '0.92rem',
          }}><RotateCcw size={16} /> Reiniciar la demostración</button>
        </aside>
      )}

      {listo && !reiniciando ? (
        <main>
          {rol === 'cliente' && <Cliente negocio={negocio} mesaQR={mesaQR} usuario={sesion.user.user_metadata?.full_name} />}
          {rol === 'cocina' && <Cocina negocio={negocio} />}
          {rol === 'repartidor' && <Reparto negocio={negocio} />}
          {rol === 'dueno' && <Dueno negocio={negocio} alCambiarNegocio={cargarNegocio} />}
        </main>
      ) : (
        <div style={{ minHeight: `calc(100vh - ${alto}px)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#6B7564', padding: 24, textAlign: 'center' }}>
          {errorSesion ? <span>No se pudo entrar a la demostración: {errorSesion}</span> : (
            <>
              <Loader2 size={26} style={{ animation: 'spin 1s linear infinite' }} />
              {reiniciando ? 'Reiniciando la demostración…' : `Entrando como ${ROLES.find((r) => r.id === rol).etiqueta.toLowerCase()}…`}
            </>
          )}
        </div>
      )}
    </div>
  );
}
