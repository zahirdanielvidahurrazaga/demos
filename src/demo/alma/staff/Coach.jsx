import { useMemo, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Check, ChevronDown, Clock, Lock, Users } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import ScheduleStoryExport from '../../../components/ScheduleStoryExport';
import { a, vidrio } from '../estilo';
import { Avatar, Chip, TarjetaTinta } from '../ui';
import { clasesDelDia, cuandoTexto, hora, inicioDeClase, proximosDias } from '../datos';
import { Encabezado } from './Panel';

// ─────────────────────────────────────────────────────────────────────────────
// COACH — Studio Alma. Mismas reglas que Coach.jsx de Be Fit:
//   · "Mía" = coach_id de la clase (el texto `instructor` lo cambia la dueña);
//     solo para clases viejas sin coach_id se compara el nombre COMPLETO.
//   · La lista de alumnas solo existe en SUS clases (la base no deja leer
//     reservas ajenas) e incluye a quien tiene un lugar ofrecido pendiente.
// Corrige dos detalles de Be Fit: las métricas son del día elegido (y lo dicen)
// y las clases van ordenadas por hora.
// ─────────────────────────────────────────────────────────────────────────────

const ahoraMs = () => Date.now();
const normalizar = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');

export default function Coach({ seccion }) {
  if (seccion === 'pase') return <MiPase />;
  if (seccion === 'historias') return <Historias />;
  return <MiDia />;
}

function useEsMia() {
  const { user, profileName } = useAuth();
  const nombres = [user?.user_metadata?.full_name, profileName, user?.email?.split('@')[0]].map(normalizar).filter(Boolean);
  return (c) => (c?.coach_id ? c.coach_id === user?.id : nombres.includes(normalizar(c?.instructor)));
}

function MiDia() {
  const { globalClasses, profileName } = useAuth();
  const esMia = useEsMia();
  const dias = useMemo(() => proximosDias(14), []);
  const [fecha, setFecha] = useState(dias[0].fecha);
  const [abierta, setAbierta] = useState(null);
  const [listas, setListas] = useState({});

  const delDia = clasesDelDia(globalClasses, fecha);
  const mias = delDia.filter(esMia);
  const alumnas = mias.reduce((s, c) => s + Math.max(0, (c.max_spots ?? 10) - (c.spots ?? 0)), 0);
  const proxima = mias.map((c) => ({ c, inicio: inicioDeClase(c, fecha) })).find((x) => x.inicio && x.inicio.getTime() > ahoraMs());
  const elegido = dias.find((d) => d.fecha === fecha);
  const etiquetaDia = elegido?.i === 0 ? 'hoy' : `el ${elegido?.dia.toLowerCase()} ${elegido?.num}`;

  const abrir = async (c) => {
    if (abierta === c.id) { setAbierta(null); return; }
    setAbierta(c.id);
    // Se vuelve a leer en cada apertura (llegadas y cancelaciones del día), como Coach.jsx de Be Fit.
    if (!esMia(c)) return;
    setListas((l) => ({ ...l, [c.id]: undefined }));
    const { data, error } = await supabase.from('reservations')
      .select('id, checked_in, status, users:user_id(id, full_name, email, avatar_url)')
      .eq('class_id', c.id).in('status', ['confirmed', 'offered']);
    setListas((l) => ({
      ...l,
      [c.id]: error ? 'error' : (data || []).map((r) => ({
        id: r.id, nombre: r.users?.full_name || r.users?.email?.split('@')[0] || 'Sin nombre', foto: r.users?.avatar_url,
        llego: Boolean(r.checked_in), pendiente: r.status === 'offered',
      })).sort((x, y) => (Number(x.pendiente) - Number(y.pendiente)) || (Number(y.llego) - Number(x.llego)) || x.nombre.localeCompare(y.nombre)),
    }));
  };

  return (
    <>
      <Encabezado ligero="Hola," fuerte={(profileName || 'coach').split(' ')[0]} sub="Tus clases y quién va a cada una." />

      <div className="alma-tira" style={{ display: 'flex', gap: 7, overflowX: 'auto', padding: '4px 2px 12px' }}>
        {dias.map((d) => {
          const on = d.fecha === fecha;
          const tiene = clasesDelDia(globalClasses, d.fecha).some(esMia);
          return (
            <button key={d.fecha} type="button" onClick={() => { setFecha(d.fecha); setAbierta(null); }} aria-pressed={on} style={{
              ...vidrio, flexShrink: 0, width: 52, padding: '9px 0 7px', borderRadius: 999, cursor: 'pointer', color: on ? a.sobreTinta : a.tinta,
              background: on ? a.tinta : vidrio.background, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 500 }}>{d.i === 0 ? 'Hoy' : d.dia}</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>{d.num}</span>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: tiene ? (on ? a.sobreTinta : a.tinta) : 'transparent' }} />
            </button>
          );
        })}
      </div>

      <TarjetaTinta radio={30}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', padding: '18px 8px' }}>
          {[
            [mias.length, mias.length === 1 ? 'clase tuya' : 'clases tuyas'],
            [alumnas, alumnas === 1 ? 'alumna' : 'alumnas'],
            [proxima ? hora(proxima.c.time).texto : '—', proxima ? `próxima · ${cuandoTexto(proxima.inicio)}` : 'sin pendientes'],
          ].map(([n, t], i) => (
            <div key={t} style={{ padding: '0 14px', borderLeft: i ? '1px solid rgba(255,255,255,.14)' : 'none' }}>
              <div style={{ fontSize: '2.3rem', fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 1 }}>{n}</div>
              <div style={{ fontSize: '0.76rem', opacity: 0.8, marginTop: 6 }}>{t}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: '0.72rem', opacity: 0.6, padding: '0 22px 14px' }}>Cifras de {etiquetaDia}.</div>
      </TarjetaTinta>

      <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
        {!delDia.length && <div style={{ ...vidrio, borderRadius: 26, padding: 24, textAlign: 'center', color: a.suave }}>No hay clases este día.</div>}
        {delDia.map((c) => {
          const mia = esMia(c);
          const h = hora(c.time);
          const ocupados = Math.max(0, (c.max_spots ?? 10) - (c.spots ?? 0));
          const lista = listas[c.id];
          return (
            <div key={c.id} style={{ ...vidrio, borderRadius: 26, overflow: 'hidden', opacity: mia ? 1 : 0.62, ...(mia ? { border: '1.5px solid var(--a-tinta)' } : {}) }}>
              <button type="button" onClick={() => abrir(c)} aria-expanded={abierta === c.id} style={{
                display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '14px 18px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', color: a.tinta,
              }}>
                <div style={{ width: 62 }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 300, lineHeight: 1 }}>{h.texto}</div>
                  <div style={{ fontSize: '0.7rem', color: a.suave }}>{h.sufijo}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{c.title}</div>
                  <div style={{ fontSize: '0.8rem', color: a.suave }}>{mia ? 'Tu clase' : `La da ${c.instructor || 'otra coach'}`}{c.level ? ` · ${c.level}` : ''}</div>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.82rem', fontWeight: 600 }}><Users size={15} /> {ocupados}/{c.max_spots ?? 10}</span>
                <ChevronDown size={18} style={{ transform: abierta === c.id ? 'rotate(180deg)' : 'none', transition: 'transform .25s ease' }} />
              </button>
              {abierta === c.id && (
                <div style={{ padding: '0 18px 16px', animation: 'alma-entra .3s ease both' }}>
                  {!mia && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: a.suave, fontSize: '0.86rem', padding: '6px 0' }}>
                      <Lock size={15} /> La lista de alumnas solo la ve quien da la clase.
                    </div>
                  )}
                  {mia && !lista && <div style={{ color: a.suave, fontSize: '0.86rem', padding: 6 }}>Cargando…</div>}
                  {mia && lista === 'error' && <div style={{ color: a.peligro, fontSize: '0.86rem', padding: 6 }}>No se pudo cargar la lista.</div>}
                  {mia && Array.isArray(lista) && !lista.length && <div style={{ color: a.suave, fontSize: '0.86rem', padding: 6 }}>Nadie ha reservado todavía.</div>}
                  {mia && Array.isArray(lista) && lista.map((r) => (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderTop: '1px solid var(--a-linea)' }}>
                      <Avatar src={r.foto} nombre={r.nombre} tam={36} borde="transparent" />
                      <span style={{ flex: 1, fontWeight: 600, fontSize: '0.9rem' }}>{r.nombre}</span>
                      {r.pendiente ? <Chip claro><Clock size={12} /> Lugar ofrecido</Chip> : r.llego ? <Chip claro><Check size={12} /> Llegó</Chip> : <span style={{ fontSize: '0.78rem', color: a.suave }}>Por llegar</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// El QR de la coach: recepción lo escanea para registrar su entrada.
function MiPase() {
  const { user, profileName, avatarUrl } = useAuth();
  return (
    <>
      <Encabezado ligero="Tu" fuerte="pase" sub="Muéstralo en recepción para registrar tu entrada." />
      <div style={{ maxWidth: 420 }}>
        <TarjetaTinta radio={32}>
          <div style={{ padding: 24, textAlign: 'center' }}>
            <Avatar src={avatarUrl} nombre={profileName} tam={64} borde="rgba(255,255,255,.6)" />
            <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: 10 }}>{profileName}</div>
            <div style={{ fontSize: '0.84rem', opacity: 0.8 }}>Coach</div>
            <div style={{ display: 'inline-block', padding: 14, borderRadius: 26, background: '#fff', marginTop: 20 }}>
              <QRCodeCanvas value={user?.id || 'coach'} size={190} fgColor="#22261B" level="M" />
            </div>
          </div>
        </TarjetaTinta>
      </div>
    </>
  );
}

// Historias de Instagram con el horario (el generador de Be Fit, dentro del vidrio).
function Historias() {
  const { globalClasses, coaches } = useAuth();
  return (
    <>
      <Encabezado ligero="Comparte el" fuerte="horario" sub="Genera la historia de Instagram con las clases del día." />
      <div style={{ ...vidrio, borderRadius: 30, padding: 18 }}>
        <ScheduleStoryExport classes={globalClasses} coaches={coaches} selectedDateStr={proximosDias(1)[0].fecha} />
      </div>
    </>
  );
}
