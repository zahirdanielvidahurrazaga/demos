import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LogIn, LogOut, XCircle } from 'lucide-react';
import { hora, nivelAforo } from './datos';
import { Anillo, Avatar, Chip, NumeroVivo, g, useAncho } from './ui';

// ─────────────────────────────────────────────────────────────────────────────
// Marco de app para cada perfil: pestañas abajo en el celular (con el botón
// central que flota) y menú lateral en la compu para recepción y dueño. Las
// pantallas entran y salen animadas, y los accesos nuevos llegan como avisos.
// ─────────────────────────────────────────────────────────────────────────────

export function AppMarco({ pestanas, activa, alCambiar, fab, lateral = false, arriba = 0, logo, pie, anchoMax = 460, children }) {
  const compu = useAncho(1000);
  const conLateral = lateral && compu;
  useEffect(() => { window.scrollTo({ top: 0 }); }, [activa]);

  const pantalla = (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={activa} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}>
        {children}
      </motion.div>
    </AnimatePresence>
  );

  if (conLateral) {
    return (
      <div className="g-app" style={{ display: 'grid', gridTemplateColumns: '248px minmax(0, 1fr)', gap: 24, maxWidth: 1360, margin: '0 auto', padding: '4px 20px 48px' }}>
        <aside style={{ position: 'sticky', top: arriba + 4, alignSelf: 'start', height: `calc(100vh - ${arriba + 20}px)`, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ padding: '10px 8px 18px' }}>{logo}</div>
          {fab && (
            <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={fab.onClick} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', marginBottom: 10, borderRadius: 18, border: 'none', cursor: 'pointer',
              background: g.grad, color: '#fff', fontWeight: 700, fontSize: 14.5, boxShadow: '0 12px 30px color-mix(in srgb, var(--g-pri) 40%, transparent)',
            }}><fab.icono size={20} /> {fab.etiqueta}</motion.button>
          )}
          {pestanas.map((p) => {
            const on = p.id === activa;
            return (
              <button key={p.id} type="button" onClick={() => alCambiar(p.id)} style={{
                position: 'relative', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 16, border: 'none',
                background: 'transparent', color: on ? g.texto : g.suave, fontWeight: on ? 600 : 500, fontSize: 14.5, cursor: 'pointer', textAlign: 'left',
              }}>
                {on && <motion.span layoutId="lateral-activo" transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                  style={{ position: 'absolute', inset: 0, borderRadius: 16, background: 'color-mix(in srgb, var(--g-sup2), white 2%)', border: `1px solid ${g.linea}` }} />}
                <span style={{ position: 'relative', display: 'flex', color: on ? g.pri : 'inherit' }}><p.icono size={19} /></span>
                <span style={{ position: 'relative', flex: 1 }}>{p.etiqueta}</span>
                {p.globo != null && p.globo > 0 && <span style={{ position: 'relative', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: g.grad, color: '#fff' }}>{p.globo}</span>}
              </button>
            );
          })}
          <div style={{ flex: 1 }} />
          {pie}
        </aside>
        <main style={{ minWidth: 0, paddingTop: 6 }}>{pantalla}</main>
      </div>
    );
  }

  const mitad = Math.ceil(pestanas.length / 2);
  const boton = (p) => {
    const on = p.id === activa;
    return (
      <button key={p.id} type="button" onClick={() => alCambiar(p.id)} style={{
        flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, border: 'none', background: 'transparent',
        color: on ? g.pri : g.tenue, fontSize: 10.5, fontWeight: on ? 600 : 500, cursor: 'pointer', padding: '6px 0', position: 'relative',
      }}>
        <motion.span animate={{ y: on ? -1 : 0, scale: on ? 1.08 : 1 }} style={{ display: 'flex' }}><p.icono size={21} strokeWidth={on ? 2.3 : 2} /></motion.span>
        {p.etiqueta}
        {p.globo != null && p.globo > 0 && <span style={{ position: 'absolute', top: 0, right: '24%', minWidth: 16, height: 16, padding: '0 4px', boxSizing: 'border-box', borderRadius: 99, background: g.grad, color: '#fff', fontSize: 9.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p.globo}</span>}
      </button>
    );
  };

  return (
    <div className="g-app" style={{ maxWidth: lateral ? 720 : anchoMax, margin: '0 auto', padding: '4px 16px 120px' }}>
      {pantalla}
      <nav style={{
        position: 'fixed', zIndex: 9200, bottom: 14, left: '50%', transform: 'translateX(-50%)', width: `min(${lateral ? 560 : anchoMax - 8}px, calc(100% - 24px))`,
        height: 70, borderRadius: 28, boxSizing: 'border-box', padding: '0 8px', display: 'flex', alignItems: 'center',
        background: 'color-mix(in srgb, var(--g-sup) 88%, transparent)', backdropFilter: 'blur(18px) saturate(160%)', WebkitBackdropFilter: 'blur(18px) saturate(160%)',
        border: `1px solid ${g.linea}`, boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
      }}>
        {fab ? (
          <>
            {pestanas.slice(0, mitad).map(boton)}
            <div style={{ width: 76, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
              <motion.button type="button" aria-label={fab.etiqueta} onClick={fab.onClick} whileTap={{ scale: 0.92 }} style={{
                width: 62, height: 62, marginTop: -38, borderRadius: '50%', border: 'none', cursor: 'pointer', background: g.grad, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 10px 30px color-mix(in srgb, var(--g-pri) 55%, transparent), 0 0 0 6px var(--g-fondo)',
              }}><fab.icono size={27} /></motion.button>
            </div>
            {pestanas.slice(mitad).map(boton)}
          </>
        ) : pestanas.map(boton)}
      </nav>
    </div>
  );
}

// Aforo chiquito para el pie del menú lateral.
export function AforoMini({ aforo }) {
  if (!aforo) return null;
  const n = nivelAforo(aforo.adentro, aforo.capacidad, aforo.alerta_pct);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 22, background: g.tarjeta, border: `1px solid ${g.linea}` }}>
      <Anillo valor={aforo.adentro / aforo.capacidad} tamano={58} grosor={7}>
        <span style={{ fontSize: 15, fontWeight: 700 }}><NumeroVivo valor={aforo.adentro} /></span>
      </Anillo>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, color: g.suave }}>Adentro ahora</div>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{aforo.adentro} de {aforo.capacidad}</div>
        <Chip color={n.color} style={{ marginTop: 4 }} punto>{n.texto}</Chip>
      </div>
    </div>
  );
}

// Avisos en vivo: cada acceso nuevo (de la simulación, de recepción o de otra
// pestaña) aparece arriba unos segundos. Los que ya estaban al abrir no avisan.
export function Notificaciones({ accesos, arriba = 0, ignorar }) {
  const vistos = useRef(null);
  const [avisos, setAvisos] = useState([]);
  const compu = useAncho(700);

  useEffect(() => {
    if (!accesos) return;
    if (vistos.current === null) {
      if (accesos.length) vistos.current = new Set(accesos.map((a) => a.id));
      return;
    }
    const todos = accesos.filter((a) => !vistos.current.has(a.id));
    todos.forEach((a) => vistos.current.add(a.id));
    const nuevos = todos.filter((a) => !(ignorar?.id && a.socio_id === ignorar.id && Math.abs(new Date(a.creado) - ignorar.t) < 15000));
    if (!nuevos.length) return;
    setAvisos((x) => [...nuevos.slice(0, 3).reverse().map((a) => ({ ...a, llego: Date.now() })), ...x].slice(0, 3));
  }, [accesos]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!avisos.length) return undefined;
    const t = setTimeout(() => setAvisos((x) => x.filter((a) => Date.now() - a.llego < 4800)), 5000);
    return () => clearTimeout(t);
  }, [avisos]);

  return (
    <div style={{
      position: 'fixed', zIndex: 9450, right: compu ? 22 : 12, left: compu ? 'auto' : 12,
      ...(compu ? { bottom: 22 } : { top: arriba + 8 }),
      width: compu ? 340 : 'auto', display: 'grid', gap: 8, pointerEvents: 'none',
    }}>
      <AnimatePresence initial={false}>
        {avisos.map((a) => {
          const nombre = a.gym_socios?.nombre || 'QR desconocido';
          const color = !a.permitido ? 'var(--g-rojo)' : a.tipo === 'entrada' ? 'var(--g-verde)' : g.azul;
          const Icono = !a.permitido ? XCircle : a.tipo === 'entrada' ? LogIn : LogOut;
          return (
            <motion.div key={a.id} layout initial={{ opacity: 0, y: -16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }} transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 18,
                background: 'color-mix(in srgb, var(--g-sup2) 86%, transparent)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`, boxShadow: '0 14px 40px rgba(0,0,0,0.45)',
              }}>
              <Avatar nombre={nombre} tamano={36} color={color} />
              <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
                <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nombre}</div>
                <div style={{ color: a.permitido ? g.suave : g.rojo, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 12 }}>
                  {a.permitido ? (a.tipo === 'entrada' ? 'Entró' : 'Salió') : a.motivo} · {hora(a.creado)}
                </div>
              </div>
              <Icono size={18} color={color} />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
