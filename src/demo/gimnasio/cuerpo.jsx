import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bluetooth, Check, Footprints, Flame, HeartPulse, Scale, Smartphone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ageFromBirthDate, computeBodyComposition } from '../../lib/bodyComposition';
import { diaRelativo, errorLegible, fechaCorta } from './datos';
import { Boton, Chip, Grande, Tarjeta, Vacio, g, titular } from './ui';

// ─────────────────────────────────────────────────────────────────────────────
// Cuerpo y actividad del socio.
//
// · Báscula: es la del gimnasio. El socio se sube, abre "Pesarme" y la medición
//   cae a su app (gym_medir). En la web se SIMULA la báscula (no hay Bluetooth):
//   busca, pesa en vivo y analiza. La composición sale de la misma fórmula que
//   Be Fit (lib/bodyComposition.js) con una impedancia de ejemplo; en la app
//   nativa sería la báscula real por Bluetooth (components/BasculaBLE.jsx).
// · Salud: en la app nativa lee Apple Salud / Health Connect (hooks/useHealth.js);
//   en la web, "conectar" muestra pasos y calorías de ejemplo.
// ─────────────────────────────────────────────────────────────────────────────

export function useMediciones(socioId, limite = 30) {
  const [mediciones, setMediciones] = useState(null);
  const cargar = useCallback(async () => {
    if (!socioId) return;
    const { data } = await supabase.from('gym_mediciones')
      .select('id, peso, imc, grasa_pct, musculo_pct, agua_pct, visceral, metabolismo, creado')
      .eq('socio_id', socioId).order('creado', { ascending: false }).limit(limite);
    setMediciones(data || []);
  }, [socioId, limite]);
  useEffect(() => { cargar(); }, [cargar]);
  return { mediciones, recargar: cargar };
}

const METRICAS = [
  { k: 'grasa_pct', e: 'Grasa', u: '%', bajarEsBueno: true },
  { k: 'musculo_pct', e: 'Músculo', u: '%' },
  { k: 'agua_pct', e: 'Agua', u: '%' },
  { k: 'visceral', e: 'Grasa visceral', u: '', bajarEsBueno: true },
  { k: 'imc', e: 'IMC', u: '', bajarEsBueno: true },
  { k: 'metabolismo', e: 'Metabolismo', u: ' kcal' },
];

function Delta({ actual, previa, bajarEsBueno, unidad = '' }) {
  if (previa == null || actual == null) return null;
  const d = Math.round((Number(actual) - Number(previa)) * 10) / 10;
  if (!d) return <span style={{ fontSize: 11.5, color: g.suave }}>igual</span>;
  const bueno = bajarEsBueno ? d < 0 : d > 0;
  return <span style={{ fontSize: 11.5, fontWeight: 600, color: bueno ? g.texto : 'var(--g-rojo)' }}>{d > 0 ? '▲' : '▼'} {Math.abs(d)}{unidad}</span>;
}

// Peso grande + las 6 métricas, con el cambio contra la medición anterior.
export function Medicion({ m, previa, compacto = false }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
        <Grande tamano={compacto ? 48 : 72}>{Number(m.peso).toFixed(1)}<span style={{ fontSize: compacto ? 22 : 30, color: g.suave }}> kg</span></Grande>
        <span style={{ marginBottom: compacto ? 6 : 10 }}><Delta actual={m.peso} previa={previa?.peso} bajarEsBueno unidad=" kg" /></span>
      </div>
      <div style={{ fontSize: 12.5, color: g.suave, marginTop: 4 }}>{diaRelativo(m.creado)} · báscula del gimnasio</div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${compacto ? 3 : 3}, minmax(0, 1fr))`, gap: 8, marginTop: 14 }}>
        {METRICAS.map((x) => (
          <div key={x.k} style={{ padding: '11px 12px', borderRadius: 16, background: g.sup2, minWidth: 0 }}>
            <div style={{ fontSize: 11.5, color: g.suave, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.e}</div>
            <div style={{ ...titular, fontSize: 24, marginTop: 6 }}>{m[x.k] != null ? `${Number(m[x.k]).toLocaleString('es-MX')}${x.u.trim() === '%' ? '%' : ''}` : '—'}</div>
            <Delta actual={m[x.k]} previa={previa?.[x.k]} bajarEsBueno={x.bajarEsBueno} unidad={x.u === '%' ? '' : ''} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Línea del peso (o de la grasa) en el tiempo, de la más vieja a la más nueva.
export function GraficaPeso({ mediciones, campo = 'peso', alto = 120 }) {
  const lista = [...mediciones].reverse().filter((m) => m[campo] != null);
  if (lista.length < 2) return <div style={{ fontSize: 13, color: g.suave, padding: '12px 0' }}>Con dos mediciones verás aquí tu tendencia.</div>;
  const vals = lista.map((m) => Number(m[campo]));
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const rango = Math.max(0.5, max - min);
  const w = 100;
  const pts = vals.map((v, i) => [(i / (vals.length - 1)) * w, 8 + (1 - (v - min) / rango) * (alto - 26)]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)} ${p[1].toFixed(1)}`).join('');
  const ult = pts[pts.length - 1];
  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${w} ${alto}`} preserveAspectRatio="none" style={{ width: '100%', height: alto, display: 'block', overflow: 'visible' }}>
        <motion.path d={d} fill="none" stroke="var(--g-pri)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} />
      </svg>
      <span style={{ position: 'absolute', left: `calc(${ult[0]}% - 6px)`, top: ult[1] - 6, width: 12, height: 12, borderRadius: 12, background: g.pri, border: '3px solid var(--g-sup)' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: g.suave, marginTop: 6 }}>
        <span>{fechaCorta(lista[0].creado.slice(0, 10))} · {vals[0]}</span>
        <span>{fechaCorta(lista[lista.length - 1].creado.slice(0, 10))} · {vals[vals.length - 1]}</span>
      </div>
    </div>
  );
}

// ── PESARME ─────────────────────────────────────────────────────────────────
// fases: datos (si falta estatura/edad/sexo) → buscar → pesando → analizar → listo
export function Pesarme({ negocio, socio, previa: previaInicial, staff = false, alGuardar }) {
  const [previa] = useState(previaInicial); // la de antes de subirse (no la que se acaba de guardar)
  const faltan = !socio.sexo || !socio.nacimiento || !socio.estatura_cm;
  const [fase, setFase] = useState(faltan ? (staff ? 'faltan' : 'datos') : 'buscar');
  const [datos, setDatos] = useState({ sexo: socio.sexo || 'M', nacimiento: socio.nacimiento || '', estatura: socio.estatura_cm || '' });
  const [vivo, setVivo] = useState(0);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');

  const perfil = faltan ? { sexo: datos.sexo, nacimiento: datos.nacimiento, estatura_cm: Number(datos.estatura) } : socio;
  const objetivo = useMemo(() => {
    const base = previa?.peso ? Number(previa.peso) : Math.pow((perfil.estatura_cm || 170) / 100, 2) * 24;
    return Math.round((base + (Math.random() - 0.55) * 0.8) * 10) / 10;
  }, [previa?.peso, perfil.estatura_cm]);

  const guardarDatos = async () => {
    setError('');
    if (!datos.nacimiento || !datos.estatura) { setError('Completa tu fecha de nacimiento y estatura.'); return; }
    const { error: e } = await supabase.rpc('gym_mi_perfil', { p_negocio: negocio.id, p_sexo: datos.sexo, p_nacimiento: datos.nacimiento, p_estatura: Number(datos.estatura) });
    if (e) { setError(errorLegible(e)); return; }
    setFase('buscar');
  };

  // La báscula "aparece", pesa en vivo (el número se asienta) y analiza.
  useEffect(() => {
    if (fase === 'buscar') { const t = setTimeout(() => setFase('pesando'), 1800); return () => clearTimeout(t); }
    if (fase === 'pesando') {
      const ini = Date.now();
      const t = setInterval(() => {
        const p = Math.min(1, (Date.now() - ini) / 2600);
        const ruido = (1 - p) * (Math.random() - 0.5) * 6;
        setVivo(Math.max(0, objetivo * (1 - Math.pow(1 - p, 3)) + ruido));
        if (p >= 1) { clearInterval(t); setVivo(objetivo); setFase('analizar'); }
      }, 70);
      return () => clearInterval(t);
    }
    if (fase === 'analizar') {
      const t = setTimeout(async () => {
        const c = computeBodyComposition({
          weight_kg: objetivo, height_cm: perfil.estatura_cm, age: ageFromBirthDate(perfil.nacimiento),
          impedance: 430 + Math.round(Math.random() * 120), sex: perfil.sexo,
        });
        const fila = {
          p_negocio: negocio.id, p_socio: staff ? socio.id : null, p_peso: objetivo, p_imc: c?.bmi ?? null,
          p_grasa: c?.body_fat_pct ?? null, p_musculo: c?.skeletal_muscle_pct ?? null, p_agua: c?.body_water_pct ?? null,
          p_visceral: c?.visceral_fat ?? null, p_metabolismo: c?.bmr ?? null,
        };
        const { data, error: e } = await supabase.rpc('gym_medir', fila);
        if (e) { setError(errorLegible(e)); setFase('error'); return; }
        setResultado(data);
        setFase('listo');
        alGuardar?.(data);
      }, 1600);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [fase]); // eslint-disable-line react-hooks/exhaustive-deps

  const campo = { width: '100%', boxSizing: 'border-box', height: 48, padding: '0 14px', borderRadius: 14, border: `1px solid ${g.linea}`, background: g.sup2, color: g.texto, fontSize: 15, fontFamily: g.fuente };

  return (
    <div style={{ minHeight: 360 }}>
      <AnimatePresence mode="wait">
        {fase === 'datos' && (
          <motion.div key="datos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'grid', gap: 12 }}>
            <p style={{ margin: 0, color: g.suave, fontSize: 14, lineHeight: 1.5 }}>Para calcular tu composición corporal la báscula necesita estos datos. Solo se piden una vez.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[['F', 'Mujer'], ['M', 'Hombre']].map(([v, e]) => (
                <Boton key={v} variante={datos.sexo === v ? 'primario' : 'suave'} onClick={() => setDatos({ ...datos, sexo: v })}>{e}</Boton>
              ))}
            </div>
            <label style={{ fontSize: 12.5, color: g.suave }}>Fecha de nacimiento
              <input type="date" value={datos.nacimiento} onChange={(e) => setDatos({ ...datos, nacimiento: e.target.value })} style={{ ...campo, marginTop: 6, colorScheme: 'dark' }} />
            </label>
            <label style={{ fontSize: 12.5, color: g.suave }}>Estatura (cm)
              <input type="number" inputMode="numeric" min={120} max={230} value={datos.estatura} onChange={(e) => setDatos({ ...datos, estatura: e.target.value })} placeholder="170" style={{ ...campo, marginTop: 6 }} />
            </label>
            {error && <div style={{ color: g.rojo, fontSize: 13 }}>{error}</div>}
            <Boton grande onClick={guardarDatos}>Continuar</Boton>
          </motion.div>
        )}

        {fase === 'faltan' && (
          <motion.div key="faltan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: g.suave, fontSize: 14, lineHeight: 1.5, paddingTop: 20 }}>
            Para calcular su composición la báscula necesita sexo, fecha de nacimiento y estatura. Agrégalos con "Editar" en su ficha y vuelve a pesarlo.
          </motion.div>
        )}

        {fase === 'buscar' && (
          <motion.div key="buscar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'grid', justifyItems: 'center', textAlign: 'center', gap: 14, paddingTop: 30 }}>
            <div style={{ position: 'relative', width: 110, height: 110, borderRadius: '50%', border: '1px solid #3A3A38', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {[0, 1].map((i) => <span key={i} style={{ position: 'absolute', inset: -16, borderRadius: '50%', border: `1px solid ${g.linea}`, animation: `g-onda 2s ${i}s infinite` }} />)}
              <Bluetooth size={38} color="var(--g-pri)" />
            </div>
            <div style={{ ...titular, fontSize: 36 }}>Buscando báscula</div>
            <div style={{ color: g.suave, fontSize: 14, maxWidth: 300, lineHeight: 1.5 }}>{staff ? `Que ${socio.nombre.split(' ')[0]} se suba descalzo a la báscula.` : 'Súbete descalzo a la báscula del gimnasio. Se enciende sola.'}</div>
          </motion.div>
        )}

        {(fase === 'pesando' || fase === 'analizar') && (
          <motion.div key="pesando" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'grid', justifyItems: 'center', textAlign: 'center', gap: 10, paddingTop: 24 }}>
            <Chip punto>Báscula {negocio.nombre.split(' ').pop()} · conectada</Chip>
            <Grande tamano={112} style={{ marginTop: 10 }}>{vivo.toFixed(1)}</Grande>
            <div style={{ ...titular, fontSize: 28, color: g.suave }}>kg</div>
            <div style={{ color: fase === 'analizar' ? g.texto : g.suave, fontSize: 14, marginTop: 6 }}>
              {fase === 'pesando' ? 'No te bajes todavía…' : 'Analizando composición corporal…'}
            </div>
            <div style={{ width: 220, height: 4, borderRadius: 4, background: '#262626', overflow: 'hidden', marginTop: 6 }}>
              <motion.div initial={{ width: '0%' }} animate={{ width: fase === 'pesando' ? '60%' : '100%' }} transition={{ duration: fase === 'pesando' ? 2.6 : 1.6 }}
                style={{ height: '100%', background: g.pri }} />
            </div>
          </motion.div>
        )}

        {fase === 'listo' && resultado && (
          <motion.div key="listo" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
              <span style={{ width: 28, height: 28, borderRadius: '50%', background: g.pri, color: g.priTexto, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={16} /></span>
              Guardado en {staff ? `la ficha de ${socio.nombre.split(' ')[0]}` : 'tu progreso'}
            </div>
            <Medicion m={resultado} previa={previa} compacto />
          </motion.div>
        )}

        {fase === 'error' && <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: g.rojo, paddingTop: 30 }}>{error}</motion.div>}
      </AnimatePresence>
    </div>
  );
}

// ── ACTIVIDAD (Salud) ───────────────────────────────────────────────────────
const claveSalud = (negocio) => `gym_salud_${negocio}`;

// Pasos/calorías de ejemplo: los mismos para el mismo día (semilla = fecha).
function ejemplo(dia, hora = 24) {
  let s = [...dia].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 2147483647, 7) || 1;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  r(); r(); r();
  const pasos = Math.round(5200 + r() * 6200);
  const parte = Math.min(1, Math.max(0.05, (hora - 6) / 15));
  return { pasos: Math.round(pasos * parte), calorias: Math.round((pasos * parte) * 0.045 + r() * 60) };
}

export function Actividad({ negocio, ultimoPeso }) {
  const [conectado, setConectado] = useState(() => { try { return !!localStorage.getItem(claveSalud(negocio.id)); } catch { return false; } });
  const [pidiendo, setPidiendo] = useState(false);
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
  const horaMx = Number(new Date().toLocaleString('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: 'America/Mexico_City' }));
  const semana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000).toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
    return { d, ...ejemplo(d, d === hoy ? horaMx : 24) };
  });
  const hoyDatos = semana[6];
  const meta = 8000;
  const maxP = Math.max(meta, ...semana.map((x) => x.pasos));
  const plataforma = /iPhone|iPad|Mac/i.test(navigator.userAgent) ? 'Apple Salud' : 'Health Connect';

  const conectar = () => {
    try { localStorage.setItem(claveSalud(negocio.id), '1'); } catch { /* sin almacenamiento */ }
    setPidiendo(false);
    setConectado(true);
  };

  if (!conectado) {
    return (
      <Tarjeta>
        <div style={{ display: 'grid', justifyItems: 'start', gap: 12 }}>
          <span style={{ width: 52, height: 52, borderRadius: 16, background: g.sup2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><HeartPulse size={26} color="var(--g-pri)" /></span>
          <div style={{ ...titular, fontSize: 32 }}>Conecta tu actividad</div>
          <p style={{ margin: 0, color: g.suave, fontSize: 14, lineHeight: 1.5 }}>
            Trae tus pasos y calorías de {plataforma} y manda allá el peso de la báscula del gym. Todo en un solo lugar.
          </p>
          <AnimatePresence initial={false}>
            {pidiendo ? (
              <motion.div key="permiso" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ width: '100%', overflow: 'hidden' }}>
                <div style={{ padding: 14, borderRadius: 18, background: '#fff', color: '#0A0A0A', display: 'grid', gap: 10 }}>
                  <b style={{ fontSize: 15 }}>{negocio.nombre} quiere acceder a {plataforma}</b>
                  {[['Pasos', 'leer'], ['Calorías activas', 'leer'], ['Peso y % de grasa', 'leer y escribir']].map(([e, p]) => (
                    <div key={e} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}><span>{e}</span><span style={{ color: '#6B6B66' }}>{p}</span></div>
                  ))}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                    <Boton variante="suave" style={{ background: '#EDEDE8', color: '#0A0A0A' }} onClick={() => setPidiendo(false)}>No permitir</Boton>
                    <Boton onClick={conectar}>Permitir</Boton>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="boton" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><Boton grande onClick={() => setPidiendo(true)}><Smartphone size={18} /> Conectar con {plataforma}</Boton></motion.div>
            )}
          </AnimatePresence>
          <div style={{ fontSize: 12, color: g.tenue }}>En la demo los datos de {plataforma} son de ejemplo.</div>
        </div>
      </Tarjeta>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Tarjeta acento pad={16}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500 }}><Footprints size={15} /> Pasos hoy</div>
          <Grande tamano={44} style={{ marginTop: 10 }}>{hoyDatos.pasos.toLocaleString('es-MX')}</Grande>
          <div style={{ fontSize: 12, fontWeight: 500, marginTop: 6 }}>{Math.round((hoyDatos.pasos / meta) * 100)}% de la meta</div>
        </Tarjeta>
        <Tarjeta pad={16}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: g.suave }}><Flame size={15} /> Calorías activas</div>
          <Grande tamano={44} style={{ marginTop: 10 }}>{hoyDatos.calorias}</Grande>
          <div style={{ fontSize: 12, color: g.suave, marginTop: 6 }}>kcal</div>
        </Tarjeta>
      </div>
      <Tarjeta titulo="Últimos 7 días" accion={<span style={{ fontSize: 12, color: g.suave }}>meta {meta.toLocaleString('es-MX')} pasos</span>}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, alignItems: 'end', height: 120, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 0, right: 0, bottom: `${(meta / maxP) * 100}%`, borderTop: '1px dashed #3A3A38' }} />
          {semana.map((x, i) => (
            <motion.div key={x.d} initial={{ height: 0 }} animate={{ height: `${Math.max(4, (x.pasos / maxP) * 100)}%` }} transition={{ delay: i * 0.04, duration: 0.6 }}
              title={`${x.pasos.toLocaleString('es-MX')} pasos`}
              style={{ borderRadius: 8, background: i === 6 ? g.pri : x.pasos >= meta ? '#8A8A85' : '#3A3A38' }} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginTop: 8 }}>
          {semana.map((x, i) => (
            <span key={x.d} style={{ fontSize: 11, textAlign: 'center', color: i === 6 ? g.texto : g.suave }}>
              {new Date(`${x.d}T12:00:00Z`).toLocaleDateString('es-MX', { weekday: 'narrow', timeZone: 'UTC' }).toUpperCase()}
            </span>
          ))}
        </div>
      </Tarjeta>
      <Tarjeta pad={14}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 38, height: 38, borderRadius: '50%', background: g.sup2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Scale size={18} /></span>
          <div style={{ flex: 1, fontSize: 13.5 }}>
            <div style={{ fontWeight: 600 }}>{plataforma} conectado</div>
            <div style={{ color: g.suave, fontSize: 12.5 }}>{ultimoPeso ? `Tu último peso (${Number(ultimoPeso.peso).toFixed(1)} kg) ya se mandó a ${plataforma}.` : 'Tus pesajes se mandarán solos.'}</div>
          </div>
          <Check size={18} color="var(--g-pri)" />
        </div>
      </Tarjeta>
      <div style={{ fontSize: 12, color: g.tenue, textAlign: 'center' }}>En la demo los datos de {plataforma} son de ejemplo.</div>
    </div>
  );
}

// ── Tarjeta de progreso corporal (socio y ficha) ────────────────────────────
export function Cuerpo({ mediciones, alPesarme, staff = false }) {
  if (!mediciones) return <div style={{ height: 200 }} />;
  const [ult, previa] = mediciones;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 12 }}>
      {alPesarme && (
        <Boton grande onClick={alPesarme} style={{ width: '100%' }}><Scale size={18} /> {staff ? 'Pesar ahora' : 'Pesarme'}</Boton>
      )}
      {!ult ? (
        <Tarjeta><Vacio icono={Scale}>{staff ? 'Todavía no tiene mediciones.' : 'Súbete a la báscula del gimnasio y toca "Pesarme".'}</Vacio></Tarjeta>
      ) : (
        <>
          <Tarjeta titulo="Última medición"><Medicion m={ult} previa={previa} /></Tarjeta>
          <Tarjeta titulo="Peso" accion={<span style={{ fontSize: 12, color: g.suave }}>{mediciones.length} mediciones</span>}>
            <GraficaPeso mediciones={mediciones} />
          </Tarjeta>
          {mediciones.length > 1 && (
            <Tarjeta titulo="Grasa corporal" accion={<span style={{ fontSize: 12, color: g.suave }}>%</span>}>
              <GraficaPeso mediciones={mediciones} campo="grasa_pct" alto={90} />
            </Tarjeta>
          )}
        </>
      )}
    </div>
  );
}
