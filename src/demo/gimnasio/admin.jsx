import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2, LogIn, LogOut, MessageCircle, Pencil, Plus, Search, Snowflake, Trash2, UserPlus, XCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ESTADOS, diaRelativo, errorLegible, fechaCorta, hora, pesos, useAccesos } from './datos';
import { Cuerpo, Pesarme, useMediciones } from './cuerpo';
import {
  Avatar, Boton, Chip, Grande, Hoja, IconoCirculo, Segmentado, Tarjeta, Titulo, Vacio, fotoSocio, g, titular, useAncho,
} from './ui';

// ─────────────────────────────────────────────────────────────────────────────
// Administración del gimnasio (recepción y dueño): directorio de socios con
// alta y edición, la ficha completa del socio (accesos, báscula, pagos, datos),
// planes, equipo y reportes. Todo escribe por funciones de 22_gimnasio_v2.sql.
// ─────────────────────────────────────────────────────────────────────────────

const hoyMx = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
export function estadoDe(s) {
  if (s.congelada) return 'congelada';
  if (s.vence < hoyMx()) return 'vencida';
  if (Number(s.adeudo) > 0) return 'adeudo';
  return 'activa';
}

const campo = {
  width: '100%', boxSizing: 'border-box', height: 48, padding: '0 14px', borderRadius: 14, border: `1px solid ${g.linea}`,
  background: g.sup2, color: g.texto, fontSize: 15, fontFamily: g.fuente, outline: 'none', colorScheme: 'dark',
};
function Campo({ etiqueta, children }) {
  return <label style={{ display: 'grid', gap: 6, fontSize: 12.5, color: g.suave }}>{etiqueta}{children}</label>;
}

export function usePlanes(negocio) {
  const [planes, setPlanes] = useState([]);
  const cargar = useCallback(async () => {
    const { data } = await supabase.from('gym_planes').select('id, nombre, precio, dias, hora_desde, hora_hasta, orden').eq('negocio', negocio).order('orden');
    setPlanes(data || []);
  }, [negocio]);
  useEffect(() => { cargar(); }, [cargar]);
  return { planes, recargar: cargar };
}

const horarioDe = (p) => (p.hora_desde == null ? 'Horario libre' : `${p.hora_desde}:00 a ${p.hora_hasta}:00`);

// ── Alta / edición de socio ─────────────────────────────────────────────────
export function FormSocio({ negocio, socio, alListo }) {
  const { planes } = usePlanes(negocio.id);
  const [f, setF] = useState({
    nombre: socio?.nombre || '', telefono: socio?.telefono || '', plan: socio?.plan_id || socio?.plan || 'mensual',
    sexo: socio?.sexo || '', nacimiento: socio?.nacimiento || '', estatura: socio?.estatura_cm || '', inscripcion: socio ? 0 : 250,
  });
  const [estado, setEstado] = useState('');
  const plan = planes.find((p) => p.id === f.plan);
  const guardar = async () => {
    setEstado('Guardando…');
    const comun = { p_negocio: negocio.id, p_nombre: f.nombre, p_telefono: f.telefono, p_plan: f.plan, p_sexo: f.sexo || null, p_nacimiento: f.nacimiento || null, p_estatura: f.estatura ? Number(f.estatura) : null };
    const { data, error } = socio
      ? await supabase.rpc('gym_editar_socio', { ...comun, p_socio: socio.id })
      : await supabase.rpc('gym_alta_socio', { ...comun, p_inscripcion: Number(f.inscripcion) || 0 });
    if (error) { setEstado(errorLegible(error)); return; }
    setEstado('');
    alListo?.(data);
  };
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Campo etiqueta="Nombre completo"><input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Nombre y apellido" style={campo} autoFocus={!socio} /></Campo>
      <Campo etiqueta="Teléfono (WhatsApp)"><input value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} inputMode="tel" placeholder="951 000 0000" style={campo} /></Campo>
      <Campo etiqueta={socio ? 'Plan (aplica en su siguiente renovación)' : 'Plan'}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {planes.map((p) => (
            <button key={p.id} type="button" onClick={() => setF({ ...f, plan: p.id })} style={{
              textAlign: 'left', padding: '11px 12px', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: f.plan === p.id ? g.pri : g.sup2, color: f.plan === p.id ? g.priTexto : g.texto,
            }}>
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{p.nombre}</div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>{pesos(p.precio)} · {p.dias} días</div>
            </button>
          ))}
        </div>
      </Campo>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <Campo etiqueta="Sexo">
          <select value={f.sexo} onChange={(e) => setF({ ...f, sexo: e.target.value })} style={campo}>
            <option value="">—</option><option value="F">Mujer</option><option value="M">Hombre</option>
          </select>
        </Campo>
        <Campo etiqueta="Nacimiento"><input type="date" value={f.nacimiento} onChange={(e) => setF({ ...f, nacimiento: e.target.value })} style={{ ...campo, padding: '0 8px' }} /></Campo>
        <Campo etiqueta="Estatura (cm)"><input type="number" inputMode="numeric" value={f.estatura} onChange={(e) => setF({ ...f, estatura: e.target.value })} style={campo} /></Campo>
      </div>
      {!socio && (
        <Campo etiqueta="Inscripción">
          <input type="number" inputMode="numeric" value={f.inscripcion} onChange={(e) => setF({ ...f, inscripcion: e.target.value })} style={campo} />
        </Campo>
      )}
      {!socio && plan && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '12px 14px', borderRadius: 16, background: g.sup2 }}>
          <span style={{ color: g.suave, fontSize: 13 }}>Cobrar hoy · {plan.nombre}{Number(f.inscripcion) ? ' + inscripción' : ''}</span>
          <Grande tamano={30}>{pesos(Number(plan.precio) + (Number(f.inscripcion) || 0))}</Grande>
        </div>
      )}
      {estado && <div style={{ fontSize: 13, color: estado === 'Guardando…' ? g.suave : g.rojo }}>{estado}</div>}
      <Boton grande onClick={guardar} disabled={estado === 'Guardando…'}>{socio ? 'Guardar cambios' : <><UserPlus size={18} /> Dar de alta y cobrar</>}</Boton>
      {!socio && <div style={{ fontSize: 12, color: g.tenue, textAlign: 'center' }}>Su pase se activa al instante; el cobro queda a tu nombre.</div>}
    </div>
  );
}

// ── Ficha del socio ─────────────────────────────────────────────────────────
export function FichaSocio({ negocio, id, ocupado, alRegistrar, alRegularizar, alCambio }) {
  const [s, setS] = useState(null);
  const [vista, setVista] = useState('movimientos');
  const [editando, setEditando] = useState(false);
  const [pesando, setPesando] = useState(false);
  const [error, setError] = useState('');
  const { accesos } = useAccesos(negocio.id, { socio: id, limite: 20 });
  const { mediciones, recargar: recargarMed } = useMediciones(id);
  const [pagos, setPagos] = useState([]);
  const cargar = useCallback(async () => {
    // Directo de la tabla: la RLS deja ver socios solo al equipo.
    const { data } = await supabase.from('gym_socios')
      .select('id, numero, nombre, telefono, sexo, nacimiento, estatura_cm, alta, vence, adeudo, congelada, plan, plan_siguiente, gym_planes!gym_socios_negocio_plan_fkey(nombre, precio, hora_desde, hora_hasta), siguiente:gym_planes!gym_socios_plan_siguiente_fk(nombre, precio)')
      .eq('id', id).maybeSingle();
    if (data) {
      const [a, m, d] = data.vence.split('-').map(Number);
      const dias = Math.round((Date.UTC(a, m - 1, d) - new Date(`${hoyMx()}T00:00:00Z`).getTime()) / 86400000);
      setS({ ...data, plan_id: data.plan_siguiente || data.plan, plan_pendiente: data.siguiente, plan: data.gym_planes.nombre, precio: data.gym_planes.precio, dias, horario: horarioDe(data.gym_planes), estado: estadoDe(data) });
    }
    const { data: p } = await supabase.from('gym_pagos').select('id, monto, concepto, creado, gym_staff(nombre)').eq('socio_id', id).order('creado', { ascending: false }).limit(12);
    setPagos(p || []);
  }, [id]);
  useEffect(() => { cargar(); }, [cargar]);
  const adentro = useMemo(() => {
    const ultimo = accesos.find((a) => a.permitido);
    return ultimo?.tipo === 'entrada' && Date.now() - new Date(ultimo.creado) < 3 * 3600000 ? ultimo.creado : null;
  }, [accesos]);

  if (!s) return <div style={{ height: 320 }} />;
  if (editando) return <FormSocio negocio={negocio} socio={s} alListo={() => { setEditando(false); cargar(); alCambio?.(); }} />;
  if (pesando) return <Pesarme negocio={negocio} socio={s} previa={mediciones?.[0]} staff alGuardar={() => { recargarMed(); }} />;

  const estado = s.estado;
  const regularizar = estado === 'vencida' ? `Renovar ${s.plan} · ${pesos(Number(s.precio) + Number(s.adeudo))}`
    : estado === 'adeudo' ? `Cobrar ${pesos(s.adeudo)}` : estado === 'congelada' ? 'Reactivar' : null;
  // Si cambió de plan, la renovación ya cobra el nuevo.
  const renovar = estado === 'vencida' && s.plan_pendiente ? `Renovar ${s.plan_pendiente.nombre} · ${pesos(Number(s.plan_pendiente.precio) + Number(s.adeudo))}` : regularizar;
  const congelar = async () => {
    setError('');
    const { error: e } = await supabase.rpc('gym_congelar', { p_negocio: negocio.id, p_socio: id, p_congelar: !s.congelada });
    if (e) { setError(errorLegible(e)); return; }
    cargar(); alCambio?.();
  };
  const edad = s.nacimiento ? Math.floor((Date.now() - new Date(s.nacimiento)) / 31557600000) : null;
  const tel = (s.telefono || '').replace(/\D/g, '');

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Avatar nombre={s.nombre} foto={fotoSocio(s.numero)} tamano={64} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ ...titular, fontSize: 30 }}>{s.nombre}</div>
          <div style={{ fontSize: 13, color: g.suave, marginTop: 4 }}>Socio #{s.numero} · {s.plan} · desde {fechaCorta(s.alta)}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {estado === 'activa' ? <Chip relleno>{ESTADOS[estado].texto}</Chip> : <Chip color={ESTADOS[estado].color}>{ESTADOS[estado].texto}</Chip>}
            {adentro && <Chip punto>Adentro desde {hora(adentro)}</Chip>}
            {s.plan_pendiente && <Chip>Pasa a {s.plan_pendiente.nombre} al renovar</Chip>}
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {[['Vence', fechaCorta(s.vence)], ['Días', s.dias >= 0 ? s.dias : `−${-s.dias}`], ['Horario', s.horario.replace('Horario libre', 'Libre')]].map(([e, v]) => (
          <div key={e} style={{ padding: '12px 10px', borderRadius: 16, background: g.sup2, textAlign: 'center', minWidth: 0 }}>
            <div style={{ fontSize: 11.5, color: g.suave }}>{e}</div>
            <div style={{ fontWeight: 600, fontSize: 15, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {renovar && <Boton variante="verde" grande disabled={ocupado} onClick={alRegularizar}><CheckCircle2 size={18} /> {renovar} y dejar pasar</Boton>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Boton variante={adentro ? 'suave' : 'primario'} disabled={ocupado} onClick={() => alRegistrar('entrada')}><LogIn size={17} /> Entrada</Boton>
          <Boton variante={adentro ? 'primario' : 'suave'} disabled={ocupado} onClick={() => alRegistrar('salida')}><LogOut size={17} /> Salida</Boton>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: tel ? '1fr 1fr 1fr' : '1fr 1fr', gap: 8 }}>
          <Boton variante="borde" onClick={() => setEditando(true)}><Pencil size={15} /> Editar</Boton>
          <Boton variante="borde" onClick={congelar}><Snowflake size={15} /> {s.congelada ? 'Descongelar' : 'Congelar'}</Boton>
          {tel && <a href={`https://wa.me/52${tel}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}><Boton variante="borde" style={{ width: '100%' }}><MessageCircle size={15} /> WhatsApp</Boton></a>}
        </div>
        {error && <div style={{ color: g.rojo, fontSize: 13 }}>{error}</div>}
      </div>
      <Segmentado id="ficha" valor={vista} alCambiar={setVista}
        opciones={[{ id: 'movimientos', etiqueta: 'Accesos' }, { id: 'cuerpo', etiqueta: 'Báscula' }, { id: 'pagos', etiqueta: 'Pagos' }, { id: 'datos', etiqueta: 'Datos' }]} />
      {vista === 'movimientos' && (
        <div>
          {!accesos.length && <Vacio>Sin movimientos todavía.</Vacio>}
          {accesos.slice(0, 10).map((x, i) => (
            <div key={x.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 2px', borderTop: i ? `1px solid ${g.linea}` : 'none', fontSize: 13 }}>
              <IconoCirculo icono={!x.permitido ? XCircle : x.tipo === 'entrada' ? LogIn : LogOut} tamano={30}
                color={!x.permitido ? 'var(--g-rojo)' : x.tipo === 'entrada' ? g.texto : g.suave} />
              <span style={{ flex: 1, minWidth: 0, color: x.permitido ? g.texto : g.rojo, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {x.permitido ? (x.tipo === 'entrada' ? 'Entrada' : 'Salida') : x.motivo}
              </span>
              <span style={{ color: g.suave }}>{diaRelativo(x.creado)} · {hora(x.creado)}</span>
            </div>
          ))}
        </div>
      )}
      {vista === 'cuerpo' && <Cuerpo mediciones={mediciones} staff alPesarme={() => setPesando(true)} />}
      {vista === 'pagos' && (
        <div>
          {!pagos.length && <Vacio>Sin pagos registrados.</Vacio>}
          {pagos.map((p, i) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 2px', borderTop: i ? `1px solid ${g.linea}` : 'none' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{p.concepto}</div>
                <div style={{ fontSize: 12, color: g.suave }}>{diaRelativo(p.creado)} {hora(p.creado)}{p.gym_staff?.nombre ? ` · cobró ${p.gym_staff.nombre.split(' ')[0]}` : ''}</div>
              </div>
              <b>{pesos(p.monto)}</b>
            </div>
          ))}
        </div>
      )}
      {vista === 'datos' && (
        <div style={{ display: 'grid', gap: 2 }}>
          {[['Teléfono', s.telefono || '—'], ['Sexo', s.sexo === 'F' ? 'Mujer' : s.sexo === 'M' ? 'Hombre' : '—'], ['Edad', edad ? `${edad} años` : '—'],
            ['Estatura', s.estatura_cm ? `${s.estatura_cm} cm` : '—'], ['Plan', `${s.plan} · ${pesos(s.precio)}`], ['Alta', fechaCorta(s.alta)]].map(([e, v]) => (
            <div key={e} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 2px', borderTop: `1px solid ${g.linea}`, fontSize: 14 }}>
              <span style={{ color: g.suave }}>{e}</span><span>{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Directorio de socios ────────────────────────────────────────────────────
const FILTROS_DIR = [
  { id: 'todos', etiqueta: 'Todos' },
  { id: 'activa', etiqueta: 'Activos' },
  { id: 'vencida', etiqueta: 'Vencidos' },
  { id: 'adeudo', etiqueta: 'Adeudo' },
  { id: 'congelada', etiqueta: 'Congelados' },
  { id: 'nuevos', etiqueta: 'Nuevos' },
];

export function Directorio({ negocio, alVerFicha, alNuevo, version = 0 }) {
  const compu = useAncho(1000);
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [lista, setLista] = useState(null);
  const [total, setTotal] = useState(0);
  const [limite, setLimite] = useState(30);
  useEffect(() => {
    const t = setTimeout(async () => {
      const hoy = hoyMx();
      let c = supabase.from('gym_socios').select('id, nombre, numero, vence, adeudo, congelada, plan, telefono, alta, gym_planes(nombre)', { count: 'exact' })
        .eq('negocio', negocio.id);
      const texto = q.trim();
      if (texto) c = /^\d+$/.test(texto) ? c.eq('numero', Number(texto)) : c.ilike('nombre', `%${texto}%`);
      if (filtro === 'activa') c = c.eq('congelada', false).gte('vence', hoy).eq('adeudo', 0);
      if (filtro === 'vencida') c = c.eq('congelada', false).lt('vence', hoy);
      if (filtro === 'adeudo') c = c.gt('adeudo', 0);
      if (filtro === 'congelada') c = c.eq('congelada', true);
      if (filtro === 'nuevos') c = c.gte('alta', new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
      const { data, count } = await c.order(filtro === 'nuevos' ? 'alta' : filtro === 'vencida' ? 'vence' : 'nombre', { ascending: filtro !== 'nuevos' && filtro !== 'vencida' }).range(0, limite - 1);
      setLista(data || []);
      setTotal(count || 0);
    }, 200);
    return () => clearTimeout(t);
  }, [q, filtro, limite, negocio.id, version]);

  return (
    <Tarjeta titulo={`Directorio · ${total.toLocaleString('es-MX')}`} accion={<Boton onClick={alNuevo} style={{ height: 38 }}><Plus size={16} /> Nuevo socio</Boton>} pad={compu ? 18 : 14}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', height: 48, background: g.sup2, borderRadius: 99, marginBottom: 10 }}>
        <Search size={17} color="var(--g-suave)" />
        <input value={q} onChange={(e) => { setQ(e.target.value); setLimite(30); }} placeholder="Nombre o número de socio"
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: g.texto, fontSize: 15, fontFamily: g.fuente }} />
      </label>
      <div style={{ marginBottom: 8 }}><Segmentado id="dir" opciones={FILTROS_DIR} valor={filtro} alCambiar={(v) => { setFiltro(v); setLimite(30); }} /></div>
      {lista && !lista.length && <Vacio icono={Search}>Nadie con ese filtro.</Vacio>}
      <div style={{ display: 'grid' }}>
        {(lista || []).map((s, i) => {
          const e = estadoDe(s);
          return (
            <button key={s.id} type="button" onClick={() => alVerFicha(s.id)} style={{
              display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 6px', border: 'none', borderTop: i ? `1px solid ${g.linea}` : 'none',
              background: 'transparent', color: g.texto, cursor: 'pointer', textAlign: 'left',
            }}>
              <Avatar nombre={s.nombre} foto={fotoSocio(s.numero)} tamano={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.nombre}</div>
                <div style={{ fontSize: 12, color: g.suave }}>#{s.numero} · {s.gym_planes?.nombre} · {filtro === 'nuevos' ? `alta ${fechaCorta(s.alta)}` : `vence ${fechaCorta(s.vence)}`}</div>
              </div>
              {e === 'activa' ? <Chip>Activo</Chip> : <Chip color={ESTADOS[e].color}>{ESTADOS[e].texto}</Chip>}
            </button>
          );
        })}
      </div>
      {lista && lista.length < total && (
        <Boton variante="suave" style={{ width: '100%', marginTop: 10 }} onClick={() => setLimite((x) => x + 30)}>Ver más ({total - lista.length})</Boton>
      )}
    </Tarjeta>
  );
}

// ── PLANES ──────────────────────────────────────────────────────────────────
export function Planes({ negocio }) {
  const { planes, recargar } = usePlanes(negocio.id);
  const [conteo, setConteo] = useState({});
  const [editar, setEditar] = useState(null); // null | {} (nuevo) | plan
  useEffect(() => {
    supabase.from('gym_socios').select('plan').eq('negocio', negocio.id).gte('vence', hoyMx()).eq('congelada', false)
      .then(({ data }) => {
        const c = {};
        (data || []).forEach((x) => { c[x.plan] = (c[x.plan] || 0) + 1; });
        setConteo(c);
      });
  }, [negocio.id, planes]);
  const total = Object.values(conteo).reduce((a, b) => a + b, 0) || 1;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 14 }}>
      <Titulo chico="Lo que vendes" accion={<Boton onClick={() => setEditar({})}><Plus size={16} /> Nuevo plan</Boton>}>Planes</Titulo>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {planes.map((p, i) => (
          <Tarjeta key={p.id} acento={i === 0} onClick={() => setEditar(p)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ fontWeight: 500 }}>{p.nombre}</span><Pencil size={15} />
            </div>
            <Grande tamano={54} style={{ marginTop: 14 }}>{pesos(p.precio)}</Grande>
            <div style={{ fontSize: 12.5, marginTop: 6, opacity: 0.8 }}>{p.dias} días · {horarioDe(p)}</div>
            <div style={{ marginTop: 16, height: 6, borderRadius: 6, background: i === 0 ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${((conteo[p.id] || 0) / total) * 100}%`, background: i === 0 ? '#fff' : g.pri }} />
            </div>
            <div style={{ fontSize: 12.5, marginTop: 8, opacity: 0.85 }}>{conteo[p.id] || 0} socios activos</div>
          </Tarjeta>
        ))}
      </div>
      <div style={{ fontSize: 12.5, color: g.suave }}>Los cambios de precio aplican en la siguiente renovación de cada socio. Recepción y la app los toman al instante.</div>
      <Hoja abierta={!!editar} alCerrar={() => setEditar(null)} titulo={editar?.id ? 'Editar plan' : 'Nuevo plan'}>
        {editar && <FormPlan negocio={negocio} plan={editar.id ? editar : null} socios={conteo[editar.id] || 0}
          alListo={() => { setEditar(null); recargar(); }} />}
      </Hoja>
    </div>
  );
}

function FormPlan({ negocio, plan, socios, alListo }) {
  const [f, setF] = useState({
    nombre: plan?.nombre || '', precio: plan?.precio ?? '', dias: plan?.dias ?? 30,
    libre: plan ? plan.hora_desde == null : true, desde: plan?.hora_desde ?? 6, hasta: plan?.hora_hasta ?? 14,
  });
  const [estado, setEstado] = useState('');
  const guardar = async () => {
    setEstado('Guardando…');
    const { error } = await supabase.rpc('gym_guardar_plan', {
      p_negocio: negocio.id, p_id: plan?.id || null, p_nombre: f.nombre, p_precio: Number(f.precio), p_dias: Number(f.dias),
      p_hora_desde: f.libre ? null : Number(f.desde), p_hora_hasta: f.libre ? null : Number(f.hasta),
    });
    if (error) { setEstado(errorLegible(error)); return; }
    alListo();
  };
  const borrar = async () => {
    setEstado('Borrando…');
    const { error } = await supabase.rpc('gym_borrar_plan', { p_negocio: negocio.id, p_id: plan.id });
    if (error) { setEstado(errorLegible(error)); return; }
    alListo();
  };
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Campo etiqueta="Nombre"><input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Ej. Pareja, Semestral, Visita" style={campo} /></Campo>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Campo etiqueta="Precio"><input type="number" inputMode="decimal" value={f.precio} onChange={(e) => setF({ ...f, precio: e.target.value })} style={campo} /></Campo>
        <Campo etiqueta="Días de vigencia"><input type="number" inputMode="numeric" value={f.dias} onChange={(e) => setF({ ...f, dias: e.target.value })} style={campo} /></Campo>
      </div>
      <Campo etiqueta="¿A qué hora puede entrar?">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Boton variante={f.libre ? 'primario' : 'suave'} onClick={() => setF({ ...f, libre: true })}>Horario libre</Boton>
          <Boton variante={!f.libre ? 'primario' : 'suave'} onClick={() => setF({ ...f, libre: false })}>Restringido</Boton>
        </div>
      </Campo>
      {!f.libre && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Campo etiqueta="Desde (hora)"><input type="number" min={0} max={23} value={f.desde} onChange={(e) => setF({ ...f, desde: e.target.value })} style={campo} /></Campo>
          <Campo etiqueta="Hasta (hora)"><input type="number" min={1} max={24} value={f.hasta} onChange={(e) => setF({ ...f, hasta: e.target.value })} style={campo} /></Campo>
        </div>
      )}
      {estado && <div style={{ fontSize: 13, color: estado.endsWith('…') ? g.suave : g.rojo }}>{estado}</div>}
      <Boton grande onClick={guardar}>{plan ? 'Guardar cambios' : 'Crear plan'}</Boton>
      {plan && (
        <Boton variante="peligro" onClick={borrar} disabled={socios > 0}>
          <Trash2 size={15} /> {socios > 0 ? `No se puede borrar: ${socios} socios lo tienen` : 'Borrar plan'}
        </Boton>
      )}
    </div>
  );
}

// ── EQUIPO ──────────────────────────────────────────────────────────────────
const ROLES_STAFF = { dueno: 'Dirección', recepcion: 'Recepción', coach: 'Coach' };

export function Equipo({ negocio }) {
  const [equipo, setEquipo] = useState(null);
  const [editar, setEditar] = useState(null);
  const [error, setError] = useState('');
  const cargar = useCallback(async () => {
    const { data, error: e } = await supabase.rpc('gym_equipo', { p_negocio: negocio.id });
    if (e) { setError(errorLegible(e)); return; }
    setEquipo(data || []);
  }, [negocio.id]);
  useEffect(() => { cargar(); }, [cargar]);
  if (error) return <div style={{ color: g.suave, padding: 30 }}>{error}</div>;
  const grupos = ['recepcion', 'coach', 'dueno'];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 14 }}>
      <Titulo chico={equipo ? `${equipo.filter((x) => x.activo).length} activos` : ' '} accion={<Boton onClick={() => setEditar({})}><Plus size={16} /> Agregar</Boton>}>Equipo</Titulo>
      {grupos.map((r) => {
        const lista = (equipo || []).filter((x) => x.rol === r);
        if (!lista.length) return null;
        return (
          <div key={r}>
            <div style={{ fontSize: 13, color: g.suave, margin: '4px 2px 10px' }}>{ROLES_STAFF[r]}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {lista.map((x) => (
                <Tarjeta key={x.id} onClick={() => setEditar(x)} style={{ opacity: x.activo ? 1 : 0.5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar nombre={x.nombre} tamano={46} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{x.nombre}</div>
                      <div style={{ fontSize: 12.5, color: g.suave }}>{[x.especialidad, x.turno && `Turno ${x.turno.toLowerCase()}`, !x.activo && 'Inactivo'].filter(Boolean).join(' · ') || ROLES_STAFF[x.rol]}</div>
                    </div>
                    {x.cuenta && <Chip>Usa la app</Chip>}
                  </div>
                  {x.rol === 'recepcion' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 14 }}>
                      {[['Cobró hoy', pesos(x.cobros_hoy)], ['Este mes', pesos(x.cobros_mes)], ['A mano', x.manuales_mes]].map(([e, v]) => (
                        <div key={e} style={{ padding: '10px', borderRadius: 14, background: g.sup2, minWidth: 0 }}>
                          <div style={{ fontSize: 11, color: g.suave }}>{e}</div>
                          <div style={{ ...titular, fontSize: 22, marginTop: 4 }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {x.rol === 'coach' && <div style={{ fontSize: 12.5, color: g.suave, marginTop: 12 }}>Sus clases y alumnos llegan con el módulo de clases.</div>}
                </Tarjeta>
              ))}
            </div>
          </div>
        );
      })}
      <Hoja abierta={!!editar} alCerrar={() => setEditar(null)} titulo={editar?.id ? 'Editar' : 'Agregar al equipo'}>
        {editar && <FormStaff negocio={negocio} persona={editar.id ? editar : null} alListo={() => { setEditar(null); cargar(); }} />}
      </Hoja>
    </div>
  );
}

function FormStaff({ negocio, persona, alListo }) {
  const [f, setF] = useState({
    nombre: persona?.nombre || '', rol: persona?.rol || 'recepcion', telefono: persona?.telefono || '',
    turno: persona?.turno || 'Mañana', especialidad: persona?.especialidad || '', activo: persona?.activo ?? true,
  });
  const [estado, setEstado] = useState('');
  const guardar = async () => {
    setEstado('Guardando…');
    const { error } = await supabase.rpc('gym_guardar_staff', {
      p_negocio: negocio.id, p_id: persona?.id || null, p_nombre: f.nombre, p_rol: f.rol, p_telefono: f.telefono,
      p_turno: f.turno, p_especialidad: f.rol === 'coach' ? f.especialidad : null, p_activo: f.activo,
    });
    if (error) { setEstado(errorLegible(error)); return; }
    alListo();
  };
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Campo etiqueta="Nombre"><input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} style={campo} /></Campo>
      <Campo etiqueta="Puesto">
        <Segmentado id="rol-staff" valor={f.rol} alCambiar={(v) => setF({ ...f, rol: v })}
          opciones={[{ id: 'recepcion', etiqueta: 'Recepción' }, { id: 'coach', etiqueta: 'Coach' }, { id: 'dueno', etiqueta: 'Dirección' }]} />
      </Campo>
      {f.rol === 'coach' && <Campo etiqueta="Especialidad"><input value={f.especialidad} onChange={(e) => setF({ ...f, especialidad: e.target.value })} placeholder="CrossFit, Spinning, Zumba…" style={campo} /></Campo>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Campo etiqueta="Teléfono"><input value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} inputMode="tel" style={campo} /></Campo>
        <Campo etiqueta="Turno">
          <select value={f.turno} onChange={(e) => setF({ ...f, turno: e.target.value })} style={campo}>
            <option>Mañana</option><option>Tarde</option><option>Completo</option>
          </select>
        </Campo>
      </div>
      {persona && !persona.cuenta && (
        <Boton variante={f.activo ? 'suave' : 'primario'} onClick={() => setF({ ...f, activo: !f.activo })}>{f.activo ? 'Desactivar (ya no trabaja aquí)' : 'Reactivar'}</Boton>
      )}
      {estado && <div style={{ fontSize: 13, color: estado.endsWith('…') ? g.suave : g.rojo }}>{estado}</div>}
      <Boton grande onClick={guardar}>{persona ? 'Guardar' : 'Agregar'}</Boton>
    </div>
  );
}

// ── REPORTES ────────────────────────────────────────────────────────────────
const MES = (ym) => new Date(`${ym}-15T12:00:00Z`).toLocaleDateString('es-MX', { month: 'short', timeZone: 'UTC' }).replace('.', '');
const DIA_SEM = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function Barras({ datos, valor, formato = (v) => v, alto = 160, resaltarUltimo = true, segundo }) {
  const max = Math.max(1, ...datos.map((d) => Math.max(valor(d), segundo ? segundo(d) : 0)));
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${datos.length}, minmax(0, 1fr))`, gap: 10, alignItems: 'end', height: alto }}>
        {datos.map((d, i) => (
          <div key={i} style={{ height: '100%', display: 'flex', alignItems: 'flex-end', gap: 4, justifyContent: 'center' }}>
            <motion.div title={String(formato(valor(d)))} initial={{ height: 0 }} animate={{ height: `${Math.max(2, (valor(d) / max) * 100)}%` }} transition={{ delay: i * 0.05, duration: 0.7 }}
              style={{ flex: 1, maxWidth: 46, borderRadius: 8, background: resaltarUltimo && i === datos.length - 1 ? g.pri : '#5E5E5A' }} />
            {segundo && (
              <motion.div title={String(segundo(d))} initial={{ height: 0 }} animate={{ height: `${Math.max(2, (segundo(d) / max) * 100)}%` }} transition={{ delay: 0.1 + i * 0.05, duration: 0.7 }}
                style={{ flex: 1, maxWidth: 46, borderRadius: 8, background: 'var(--g-rojo)', opacity: 0.55 }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Reportes({ negocio, alVerFicha }) {
  const compu = useAncho(1000);
  const [r, setR] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    supabase.rpc('gym_reportes', { p_negocio: negocio.id }).then(({ data, error: e }) => {
      if (e) setError(errorLegible(e)); else setR(data);
    });
  }, [negocio.id]);
  if (error) return <div style={{ color: g.suave, padding: 30 }}>{error}</div>;
  if (!r) return <div style={{ height: 400 }} />;
  const meses = r.meses;
  const actual = meses[meses.length - 1];
  const previo = meses[meses.length - 2];
  const completos = meses.slice(0, -1);
  const promIngreso = completos.reduce((a, m) => a + Number(m.ingresos), 0) / Math.max(1, completos.length);
  const retencion = Math.round(completos.reduce((a, m) => a + (m.retencion || 0), 0) / Math.max(1, completos.length));
  const netos = completos.reduce((a, m) => a + m.altas - m.bajas, 0);
  const rotulos = (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${meses.length}, minmax(0, 1fr))`, gap: 10, marginTop: 8 }}>
      {meses.map((m, i) => <span key={m.mes} style={{ fontSize: 11.5, textAlign: 'center', color: i === meses.length - 1 ? g.texto : g.suave, textTransform: 'capitalize' }}>{MES(m.mes)}</span>)}
    </div>
  );
  const dos = compu ? 'minmax(0, 1fr) minmax(0, 1fr)' : 'minmax(0, 1fr)';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 14 }}>
      <Titulo chico="Últimos 6 meses">Reportes</Titulo>
      <div style={{ display: 'grid', gridTemplateColumns: compu ? 'repeat(4, minmax(0, 1fr))' : '1fr 1fr', gap: 12 }}>
        <Tarjeta acento pad={18}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Ingreso promedio</div>
          <Grande tamano={compu ? 46 : 36} style={{ marginTop: 12 }}>{pesos(promIngreso)}</Grande>
          <div style={{ fontSize: 12, fontWeight: 500, marginTop: 6 }}>por mes</div>
        </Tarjeta>
        <Tarjeta pad={18}>
          <div style={{ fontSize: 13, color: g.suave }}>Socios activos</div>
          <Grande tamano={compu ? 46 : 36} style={{ marginTop: 12 }}>{actual.activos}</Grande>
          <div style={{ fontSize: 12, color: g.suave, marginTop: 6 }}>{actual.activos - meses[0].activos >= 0 ? '+' : ''}{actual.activos - meses[0].activos} en 6 meses</div>
        </Tarjeta>
        <Tarjeta pad={18}>
          <div style={{ fontSize: 13, color: g.suave }}>Retención</div>
          <Grande tamano={compu ? 46 : 36} style={{ marginTop: 12 }}>{retencion}%</Grande>
          <div style={{ fontSize: 12, color: g.suave, marginTop: 6 }}>de los que vencen, renuevan</div>
        </Tarjeta>
        <Tarjeta pad={18}>
          <div style={{ fontSize: 13, color: g.suave }}>Altas netas</div>
          <Grande tamano={compu ? 46 : 36} style={{ marginTop: 12 }}>{netos >= 0 ? '+' : ''}{netos}</Grande>
          <div style={{ fontSize: 12, color: g.suave, marginTop: 6 }}>altas menos bajas</div>
        </Tarjeta>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: dos, gap: 14 }}>
        <Tarjeta titulo="Ingresos por mes" accion={<span style={{ fontSize: 12, color: g.suave }}>{MES(actual.mes)}: {pesos(actual.ingresos)} hasta hoy · {MES(previo.mes)}: {pesos(previo.ingresos)}</span>}>
          <Barras datos={meses} valor={(m) => Number(m.ingresos)} formato={pesos} />
          {rotulos}
        </Tarjeta>
        <Tarjeta titulo="Altas y bajas" accion={<span style={{ display: 'flex', gap: 12, fontSize: 12, color: g.suave }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><i style={{ width: 10, height: 10, borderRadius: 3, background: '#5E5E5A' }} />Altas</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><i style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--g-rojo)', opacity: 0.55 }} />Bajas</span></span>}>
          <Barras datos={meses} valor={(m) => m.altas} segundo={(m) => m.bajas} resaltarUltimo={false} />
          {rotulos}
        </Tarjeta>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: compu ? 'minmax(0, 1.2fr) minmax(0, 1fr)' : 'minmax(0, 1fr)', gap: 14, alignItems: 'start' }}>
        <Tarjeta titulo={`En riesgo · ${r.en_riesgo.total}`} accion={<span style={{ fontSize: 12, color: g.suave }}>al corriente, pero no vienen hace 2+ semanas</span>}>
          {!r.en_riesgo.lista.length && <Vacio>Todos tus socios activos han venido en las últimas 2 semanas.</Vacio>}
          {r.en_riesgo.lista.map((x, i) => {
            const tel = (x.telefono || '').replace(/\D/g, '');
            const msg = `Hola ${x.nombre.split(' ')[0]}, te extrañamos en ${negocio.nombre}. ¿Todo bien? Tu membresía sigue activa, ¡te esperamos!`;
            return (
              <div key={x.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 2px', borderTop: i ? `1px solid ${g.linea}` : 'none' }}>
                <button type="button" onClick={() => alVerFicha(x.id)} style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12, border: 'none', background: 'none', color: g.texto, cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                  <Avatar nombre={x.nombre} tamano={36} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.nombre}</span>
                    <span style={{ display: 'block', fontSize: 12, color: g.suave }}>{x.plan} · {x.nunca ? `se inscribió hace ${x.dias} días y no ha venido` : `sin venir hace ${x.dias} días`}</span>
                  </span>
                </button>
                <a href={`https://wa.me/${tel ? `52${tel}` : ''}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer" title="Escribirle por WhatsApp"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 99, background: '#25D366', color: '#05301A', fontSize: 12.5, fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}>
                  <MessageCircle size={14} />{compu && ' Escribir'}
                </a>
              </div>
            );
          })}
        </Tarjeta>
        <div style={{ display: 'grid', gap: 14 }}>
          <Tarjeta titulo="Por plan" accion={<span style={{ fontSize: 12, color: g.suave }}>activos · cobrado 90 días</span>}>
            <div style={{ display: 'grid', gap: 12 }}>
              {r.por_plan.map((p) => (
                <div key={p.plan}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 6 }}>
                    <span>{p.plan} <span style={{ color: g.suave }}>· {p.socios}</span></span><b>{pesos(p.ingresos)}</b>
                  </div>
                  <div style={{ height: 6, borderRadius: 6, background: 'rgba(255,255,255,0.08)' }}>
                    <div style={{ height: '100%', borderRadius: 6, width: `${(Number(p.ingresos) / Math.max(1, Number(r.por_plan[0].ingresos))) * 100}%`, background: g.pri }} />
                  </div>
                </div>
              ))}
            </div>
          </Tarjeta>
          <Tarjeta titulo="Visitas por día" accion={<span style={{ fontSize: 12, color: g.suave }}>promedio, últimas 4 semanas</span>}>
            <Barras datos={r.dias} valor={(d) => d.visitas} alto={110} resaltarUltimo={false} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 10, marginTop: 8 }}>
              {r.dias.map((d) => <span key={d.dia} style={{ fontSize: 11.5, textAlign: 'center', color: g.suave }}>{DIA_SEM[d.dia - 1]}</span>)}
            </div>
          </Tarjeta>
          <Tarjeta pad={16}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Grande tamano={40}>{r.mediciones.mes}</Grande>
              <div style={{ fontSize: 13.5 }}>pesajes en la báscula este mes<div style={{ fontSize: 12, color: g.suave }}>{r.mediciones.socios} socios ya la usan</div></div>
            </div>
          </Tarjeta>
        </div>
      </div>
    </div>
  );
}
