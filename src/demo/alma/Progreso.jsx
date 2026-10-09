import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, ChevronRight, Minus, Plus, Scale } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { monthlyGoalCap } from '../../lib/plans';
import ProgressPhotos from '../../components/ProgressPhotos';
import { a, vidrio } from './estilo';
import { Boton, Chip, Hoja, TarjetaTinta, Titulo } from './ui';
import { DIAS_CORTOS } from './datos';

// Progreso: meta del mes, últimos 7 días, báscula, fotos e insignias.
// Mismos datos y reglas que Evolución de Be Fit (asistencias = reservas con
// check-in; meta en users.target_monthly_classes; insignias por badgeConfigs).
export default function Progreso() {
  const { user, plan, monthlyGoal, updateMonthlyGoal, badgeConfigs, customBadges, profileName, avatarUrl } = useAuth();
  const [historial, setHistorial] = useState(null);
  const [medida, setMedida] = useState(null);
  const [editarMeta, setEditarMeta] = useState(false);
  const [insignia, setInsignia] = useState(null);
  const [fotos, setFotos] = useState(false);

  useEffect(() => {
    if (!user) return undefined;
    let vivo = true;
    supabase.from('reservations').select('created_at, classes(date, time, instructor)')
      .eq('user_id', user.id).eq('checked_in', true)
      .then(({ data }) => { if (vivo) setHistorial(data || []); });
    supabase.from('body_measurements').select('weight_kg, body_fat_pct, muscle_pct, measured_at')
      .eq('user_id', user.id).order('measured_at', { ascending: false }).limit(1)
      .then(({ data }) => { if (vivo) setMedida(data?.[0] || null); });
    return () => { vivo = false; };
  }, [user]);

  // Fecha de cada asistencia: la de la clase (no la de cuando se reservó).
  const asistencias = useMemo(() => (historial || []).map((h) => {
    const f = h.classes?.date;
    return { dia: f ? new Date(`${f}T12:00:00`) : new Date(h.created_at), creada: new Date(h.created_at), coach: h.classes?.instructor };
  }), [historial]);

  const { delMes, semana } = useMemo(() => {
    const hoy = new Date();
    const delMes = asistencias.filter((x) => x.dia.getMonth() === hoy.getMonth() && x.dia.getFullYear() === hoy.getFullYear()).length;
    const semana = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 6 + i);
      const n = asistencias.filter((x) => x.dia.toDateString() === d.toDateString()).length;
      return { etiqueta: DIAS_CORTOS[d.getDay()][0], n, hoy: i === 6 };
    });
    return { delMes, semana };
  }, [asistencias]);

  const insignias = useMemo(() => {
    const total = asistencias.length;
    const coaches = new Set(asistencias.map((x) => x.coach).filter(Boolean)).size;
    const porSemana = {};
    // Igual que AuthContext (evaluateBadgesForUnlock): por fecha de reserva, para que la insignia anunciada y la de aquí coincidan.
    asistencias.forEach((x) => { const k = Math.floor(x.creada.getTime() / (7 * 86400000)); porSemana[k] = (porSemana[k] || 0) + 1; });
    const maxSemana = Math.max(0, ...Object.values(porSemana));
    const lista = (badgeConfigs || []).map((r) => {
      const manual = customBadges?.some((cb) => cb.label === r.label);
      const gano = manual || {
        TOTAL_CLASSES: total >= r.rule_value,
        DIFFERENT_COACHES: coaches >= r.rule_value,
        PROFILE_COMPLETE: Boolean(profileName?.trim() && avatarUrl),
        WEEKLY_CLASSES: maxSemana >= r.rule_value,
      }[r.rule_type];
      return { ...r, gano: Boolean(gano) };
    });
    (customBadges || []).forEach((cb) => {
      if ((cb.label || cb.icon) && !lista.some((x) => x.label === cb.label)) lista.push({ ...cb, gano: true });
    });
    return lista;
  }, [asistencias, badgeConfigs, customBadges, profileName, avatarUrl]);

  const meta = monthlyGoal || 0;
  const avance = meta ? Math.min(1, delMes / meta) : 0;
  const R = 54;
  const C = 2 * Math.PI * R;
  const maxDia = Math.max(1, ...semana.map((d) => d.n));
  const ganadas = insignias.filter((x) => x.gano).length;

  return (
    <div style={{ position: 'relative', zIndex: 1, padding: '24px 20px 140px', maxWidth: 640, margin: '0 auto', fontFamily: a.letra, color: a.tinta }}>
      <h1 style={{ margin: 0, fontSize: '2rem', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
        <span style={{ fontWeight: 300 }}>Tu </span><span style={{ fontWeight: 700 }}>progreso</span>
      </h1>
      <div style={{ fontSize: '0.86rem', color: a.suave, margin: '6px 0 18px' }}>Constancia antes que intensidad.</div>

      {/* Meta del mes */}
      <TarjetaTinta radio={34}>
        <div style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 18, color: '#fff' }}>
          <svg width="128" height="128" viewBox="0 0 128 128" role="img" aria-label={`${delMes} de ${meta || '—'} clases este mes`} style={{ flexShrink: 0 }}>
            <circle cx="64" cy="64" r={R} fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.25)" strokeWidth="10" />
            <circle cx="64" cy="64" r={R} fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - avance)} transform="rotate(-90 64 64)" style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)' }} />
            <text x="64" y="62" textAnchor="middle" fill="#fff" style={{ fontFamily: a.letra, fontSize: 34, fontWeight: 300 }}>{delMes}</text>
            <text x="64" y="84" textAnchor="middle" fill="rgba(255,255,255,.8)" style={{ fontFamily: a.letra, fontSize: 12, fontWeight: 500 }}>{meta ? `de ${meta}` : 'clases'}</text>
          </svg>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.74rem', letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.85 }}>Meta del mes</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 600, lineHeight: 1.2, margin: '4px 0 12px' }}>
              {!meta ? 'Ponte una meta' : avance >= 1 ? '¡La cumpliste!' : `Te faltan ${meta - delMes}`}
            </div>
            <Boton tipo="vidrioFoto" onClick={() => setEditarMeta(true)} style={{ padding: '10px 16px', fontSize: '0.86rem' }}>
              {meta ? 'Cambiar meta' : 'Elegir meta'}
            </Boton>
          </div>
        </div>
      </TarjetaTinta>

      {/* Últimos 7 días */}
      <Titulo>Últimos 7 días</Titulo>
      <div style={{ ...vidrio, borderRadius: 28, padding: '18px 18px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 96 }}>
          {semana.map((d, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%', justifyContent: 'flex-end' }}>
              <div style={{
                width: '100%', maxWidth: 30, borderRadius: 999, minHeight: 8,
                height: `${(d.n / maxDia) * 70 + 8}px`, background: d.n ? a.tinta : a.linea,
                boxShadow: d.n ? 'inset 0 1px 0 rgba(255,255,255,.25)' : 'none', transition: 'height .6s ease',
              }} />
              <span style={{ fontSize: '0.72rem', fontWeight: d.hoy ? 700 : 500, color: d.hoy ? a.tinta : a.suave }}>{d.etiqueta}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: '0.8rem', color: a.suave, marginTop: 12, textAlign: 'center' }}>
          {historial === null ? 'Cargando…' : `${asistencias.length} clases en total con nosotros`}
        </div>
      </div>

      {/* Báscula y fotos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
        <div style={{ ...vidrio, borderRadius: 28, padding: 16 }}>
          <Scale size={20} />
          {medida ? (
            <>
              <div style={{ fontSize: '2rem', fontWeight: 300, lineHeight: 1, marginTop: 10 }}>{Number(medida.weight_kg).toFixed(1)}<span style={{ fontSize: '0.85rem', marginLeft: 3 }}>kg</span></div>
              <div style={{ fontSize: '0.74rem', color: a.suave, marginTop: 6 }}>
                {[medida.body_fat_pct && `${medida.body_fat_pct}% grasa`, medida.muscle_pct && `${medida.muscle_pct}% músculo`].filter(Boolean).join(' · ') || 'Última medición'}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontWeight: 600, marginTop: 10 }}>Pésate en el estudio</div>
              <div style={{ fontSize: '0.76rem', color: a.suave, marginTop: 4 }}>La báscula guarda tu medición aquí.</div>
            </>
          )}
        </div>
        <button type="button" onClick={() => setFotos(true)} style={{ ...vidrio, borderRadius: 28, padding: 16, textAlign: 'left', cursor: 'pointer', color: a.tinta, fontFamily: a.letra }}>
          <Camera size={20} />
          <div style={{ fontWeight: 600, marginTop: 10 }}>Fotos de progreso</div>
          <div style={{ fontSize: '0.76rem', color: a.suave, marginTop: 4, display: 'flex', alignItems: 'center', gap: 2 }}>Frente y perfiles <ChevronRight size={14} /></div>
        </button>
      </div>

      {/* Insignias */}
      {insignias.length > 0 && (
        <>
          <Titulo>Insignias <span style={{ fontWeight: 400, color: a.suave, fontSize: '0.9rem' }}>· {ganadas} de {insignias.length}</span></Titulo>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', gap: 14 }}>
            {insignias.map((b, i) => (
              <button key={`${b.label}-${i}`} type="button" onClick={() => setInsignia(b)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontFamily: a.letra, color: a.tinta, padding: 0 }}>
                <span style={{
                  ...vidrio, width: 72, height: 72, borderRadius: '50%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.9rem', filter: b.gano ? 'none' : 'grayscale(1)', opacity: b.gano ? 1 : 0.45,
                }}>{b.icon || '★'}</span>
                <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, marginTop: 6, lineHeight: 1.25, opacity: b.gano ? 1 : 0.6 }}>{b.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <HojaMeta abierta={editarMeta} alCerrar={() => setEditarMeta(false)} meta={meta} tope={monthlyGoalCap(plan)} alGuardar={updateMonthlyGoal} />
      <Hoja abierta={Boolean(insignia)} alCerrar={() => setInsignia(null)} titulo={insignia?.label}>
        {insignia && (
          <div style={{ padding: '30px 24px 30px', textAlign: 'center' }}>
            <div style={{ fontSize: '3.4rem', filter: insignia.gano ? 'none' : 'grayscale(1)' }}>{insignia.icon || '★'}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: 8 }}>{insignia.label}</div>
            <p style={{ color: a.suave, lineHeight: 1.5, margin: '8px 0 14px' }}>{insignia.description || 'Gánala con tu constancia.'}</p>
            <Chip claro>{insignia.gano ? 'Ya es tuya' : 'Aún no la tienes'}</Chip>
          </div>
        )}
      </Hoja>
      {/* Fotos de progreso a pantalla completa y SIN backdrop-filter: los modales
          de ProgressPhotos son position:fixed y un filtro los encerraría. */}
      {fotos && createPortal(
        <div role="dialog" aria-label="Fotos de progreso" style={{ position: 'fixed', inset: 0, zIndex: 9450, background: 'var(--a-niebla)', overflowY: 'auto', paddingTop: 'var(--a-alto-encabezado, 70px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px' }}>
            <span style={{ fontWeight: 700, fontSize: '1.2rem' }}>Fotos de progreso</span>
            <Boton tipo="vidrio" onClick={() => setFotos(false)} style={{ padding: '9px 16px', fontSize: '0.86rem' }}>Listo</Boton>
          </div>
          <div style={{ padding: '0 12px 30px' }}><ProgressPhotos userId={user?.id} /></div>
        </div>,
        document.getElementById('alma-hojas') || document.body,
      )}
    </div>
  );
}

function HojaMeta({ abierta, alCerrar, meta, tope, alGuardar }) {
  const [n, setN] = useState(meta || 8);
  const [guardando, setGuardando] = useState(false);
  useEffect(() => { if (abierta) setN(meta || Math.min(8, tope)); }, [abierta, meta, tope]); // eslint-disable-line react-hooks/set-state-in-effect
  const guardar = async () => { setGuardando(true); await alGuardar(n); setGuardando(false); alCerrar(); };
  const boton = { ...vidrio, width: 52, height: 52, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: a.tinta };
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Meta del mes">
      <div style={{ padding: '30px 24px 28px', textAlign: 'center' }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>¿Cuántas clases este mes?</div>
        <div style={{ fontSize: '0.84rem', color: a.suave, marginTop: 4 }}>Tu plan te da hasta {tope}.</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 26, margin: '26px 0' }}>
          <button type="button" aria-label="Menos" onClick={() => setN((x) => Math.max(1, x - 1))} style={boton}><Minus size={20} /></button>
          <span style={{ fontSize: '4rem', fontWeight: 300, minWidth: 90, lineHeight: 1 }}>{n}</span>
          <button type="button" aria-label="Más" onClick={() => setN((x) => Math.min(tope, x + 1))} style={boton}><Plus size={20} /></button>
        </div>
        <Boton onClick={guardar} disabled={guardando} style={{ width: '100%' }}>{guardando ? 'Guardando…' : 'Guardar meta'}</Boton>
      </div>
    </Hoja>
  );
}
