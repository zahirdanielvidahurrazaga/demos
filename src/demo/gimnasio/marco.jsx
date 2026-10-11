import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LogIn, LogOut, MoreHorizontal, XCircle } from 'lucide-react';
import { hora, nivelAforo } from './datos';
import { Avatar, Barra, Chip, NumeroVivo, g, titular, useAncho } from './ui';

// ─────────────────────────────────────────────────────────────────────────────
// Marco de app para cada perfil: en el celular, una píldora flotante abajo (la
// pestaña activa se pinta del acento y muestra su nombre; las demás, solo el
// icono); en la compu, menú lateral para recepción y dueño. Las pantallas
// entran y salen animadas, y los accesos nuevos llegan como avisos.
// ─────────────────────────────────────────────────────────────────────────────

// En el celular caben 5 pestañas; con más, las 4 primeras y "Más" (abre el resto).
const MAX_CEL = 5;

export function AppMarco({ pestanas, activa, alCambiar, lateral = false, arriba = 0, logo, pie, anchoMax = 460, anchoCel, children }) {
  const compu = useAncho(1000);
  const [masAbierto, setMasAbierto] = useState(false);
  const conLateral = lateral && compu;
  useEffect(() => { window.scrollTo({ top: 0 }); }, [activa]);

  const pantalla = (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={activa} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}>
        {children}
      </motion.div>
    </AnimatePresence>
  );

  if (conLateral) {
    return (
      <div className="g-app" style={{ display: 'grid', gridTemplateColumns: '236px minmax(0, 1fr)', gap: 26, maxWidth: 1400, margin: '0 auto', padding: '4px 22px 48px' }}>
        <aside style={{ position: 'sticky', top: arriba + 4, alignSelf: 'start', height: `calc(100vh - ${arriba + 20}px)`, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ padding: '10px 8px 22px' }}>{logo}</div>
          {pestanas.map((p) => {
            const on = p.id === activa;
            return (
              <button key={p.id} type="button" onClick={() => alCambiar(p.id)} style={{
                position: 'relative', display: 'flex', alignItems: 'center', gap: 12, height: 46, padding: '0 14px', borderRadius: 14, border: 'none',
                background: 'transparent', color: on ? g.texto : g.suave, fontWeight: 500, fontSize: 14, cursor: 'pointer', textAlign: 'left',
              }}>
                {on && <motion.span layoutId="lateral-activo" transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                  style={{ position: 'absolute', inset: 0, borderRadius: 14, background: g.sup2 }} />}
                <span style={{ position: 'relative', display: 'flex', color: on ? g.pri : 'inherit' }}><p.icono size={19} strokeWidth={1.9} /></span>
                <span style={{ position: 'relative', flex: 1 }}>{p.etiqueta}</span>
                {p.globo != null && p.globo > 0 && <span style={{ position: 'relative', fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: g.pri, color: g.priTexto }}>{p.globo}</span>}
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

  return (
    <div className="g-app" style={{ maxWidth: anchoCel || (lateral ? 720 : anchoMax), margin: '0 auto', padding: '4px 16px 120px' }}>
      {pantalla}
      <nav style={{
        position: 'fixed', zIndex: 9200, bottom: 18, left: '50%', transform: 'translateX(-50%)', width: `min(${anchoCel ? anchoCel - 20 : lateral ? 520 : anchoMax - 20}px, calc(100% - 28px))`,
        height: 64, borderRadius: 99, boxSizing: 'border-box', padding: '0 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4,
        background: 'rgba(26,26,26,0.86)', backdropFilter: 'blur(18px) saturate(140%)', WebkitBackdropFilter: 'blur(18px) saturate(140%)',
        border: `1px solid ${g.linea}`, boxShadow: '0 20px 50px rgba(0,0,0,0.55)',
      }}>
        {(() => {
          const sobran = pestanas.length > MAX_CEL;
          const visibles = sobran ? pestanas.slice(0, MAX_CEL - 1) : pestanas;
          const resto = sobran ? pestanas.slice(MAX_CEL - 1) : [];
          const enResto = resto.find((p) => p.id === activa);
          const boton = (p, on, alTocar) => (
            <button key={p.id} type="button" aria-label={p.etiqueta} onClick={alTocar} style={{
              position: 'relative', height: 48, minWidth: 48, padding: on ? '0 16px' : '0 12px', borderRadius: 99, border: 'none', cursor: 'pointer',
              background: 'transparent', color: on ? g.priTexto : g.suave, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontSize: 13, fontWeight: 600, flexShrink: 0,
            }}>
              {on && <motion.span layoutId="nav-activo" transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                style={{ position: 'absolute', inset: 0, borderRadius: 99, background: g.pri }} />}
              <span style={{ position: 'relative', display: 'flex' }}><p.icono size={20} strokeWidth={on ? 2.2 : 1.9} /></span>
              {on && <span style={{ position: 'relative' }}>{p.etiqueta}</span>}
              {p.globo != null && p.globo > 0 && !on && <span style={{ position: 'absolute', top: 6, right: 4, width: 8, height: 8, borderRadius: 9, background: g.pri }} />}
            </button>
          );
          return (
            <>
              {visibles.map((p) => boton(p, p.id === activa, () => { setMasAbierto(false); alCambiar(p.id); }))}
              {sobran && boton(enResto ? { ...enResto } : { id: 'mas', etiqueta: 'Más', icono: MoreHorizontal, globo: resto.some((p) => p.globo > 0) ? 1 : 0 },
                !!enResto, () => setMasAbierto((x) => !x))}
              <AnimatePresence>
                {masAbierto && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.16 }}
                    style={{
                      position: 'absolute', right: 0, bottom: 'calc(100% + 10px)', minWidth: 200, padding: 6, borderRadius: 22,
                      background: 'rgba(26,26,26,0.96)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
                      border: `1px solid ${g.linea}`, boxShadow: '0 20px 50px rgba(0,0,0,0.55)', display: 'grid', gap: 2,
                    }}>
                    {resto.map((p) => (
                      <button key={p.id} type="button" onClick={() => { setMasAbierto(false); alCambiar(p.id); }} style={{
                        display: 'flex', alignItems: 'center', gap: 12, height: 46, padding: '0 14px', borderRadius: 16, border: 'none', cursor: 'pointer',
                        background: p.id === activa ? g.sup2 : 'transparent', color: p.id === activa ? g.texto : g.suave, fontSize: 14, fontWeight: 500, textAlign: 'left',
                      }}>
                        <span style={{ display: 'flex', color: p.id === activa ? g.pri : 'inherit' }}><p.icono size={19} /></span>
                        <span style={{ flex: 1 }}>{p.etiqueta}</span>
                        {p.globo > 0 && <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: g.pri, color: g.priTexto }}>{p.globo}</span>}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          );
        })()}
      </nav>
    </div>
  );
}

// Aforo chiquito para el pie del menú lateral.
export function AforoMini({ aforo }) {
  if (!aforo) return null;
  const n = nivelAforo(aforo.adentro, aforo.capacidad, aforo.alerta_pct);
  return (
    <div style={{ padding: 16, borderRadius: 20, background: g.tarjeta, border: `1px solid ${g.linea}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5, color: g.suave }}>
        <span>Adentro ahora</span><Chip punto style={{ padding: '3px 9px', fontSize: 11 }}>{n.texto}</Chip>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '8px 0 10px' }}>
        <span style={{ ...titular, fontSize: 40 }}><NumeroVivo valor={aforo.adentro} /></span>
        <span style={{ ...titular, fontSize: 20, color: g.suave }}>/ {aforo.capacidad}</span>
      </div>
      <Barra valor={aforo.adentro / aforo.capacidad} alto={6} />
    </div>
  );
}

// Avisos en vivo: cada acceso nuevo (de la simulación, de recepción o de otra
// pestaña) aparece unos segundos. Los que ya estaban al abrir no avisan.
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
      width: compu ? 330 : 'auto', display: 'grid', gap: 8, pointerEvents: 'none',
    }}>
      <AnimatePresence initial={false}>
        {avisos.map((a) => {
          const nombre = a.gym_socios?.nombre || 'QR desconocido';
          const color = !a.permitido ? 'var(--g-rojo)' : g.texto;
          const Icono = !a.permitido ? XCircle : a.tipo === 'entrada' ? LogIn : LogOut;
          return (
            <motion.div key={a.id} layout initial={{ opacity: 0, y: -14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }} transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 20,
                background: 'rgba(30,30,30,0.9)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                border: `1px solid ${g.linea}`, boxShadow: '0 14px 40px rgba(0,0,0,0.5)', fontFamily: g.fuente, color: g.texto,
              }}>
              <Avatar nombre={nombre} tamano={36} />
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
