import { useState } from 'react';
import { AlertTriangle, Ban, DoorOpen, MessageCircle, Search, Settings2, UsersRound, Wallet } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ESTADOS, duracion, errorLegible, fechaCorta, hora, minutosDesde, nivelAforo, pesos, useAhora, useRpc } from './datos';
import { Avatar, Boton, Etiqueta, Logo, Medidor, Numero, Tarjeta, g, useAncho } from './ui';
import { CurvaHoras } from './graficas';

// Tablero del dueño: aforo en vivo, entradas y negados de hoy, horas pico,
// quién está adentro, membresías por cobrar y el aforo máximo. Se refresca solo
// con cada acceso (realtime) — incluido lo que escanea recepción en otra pestaña.

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function Dueno({ negocio, alCambiarNegocio }) {
  const ancho = useAncho(1000);
  const { datos: t, error, recargar } = useRpc('gym_tablero', { p_negocio: negocio.id }, { enVivo: true, cada: 60000 });
  const { datos: calor } = useRpc('gym_calor', { p_negocio: negocio.id });
  useAhora(30000);

  if (error && !t) return <div style={{ padding: 40, textAlign: 'center', color: g.suave }}>{error}</div>;
  if (!t) return <div style={{ padding: 40, textAlign: 'center', color: g.suave }}>Cargando el tablero…</div>;

  const a = t.aforo;
  const nivel = nivelAforo(a.adentro, a.capacidad, a.alerta_pct);
  const celda = (span) => (ancho ? { gridColumn: `span ${span}` } : {});

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '8px 16px 56px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '4px 2px 16px' }}>
        <div>
          <div style={{ fontSize: '0.72rem', letterSpacing: '0.2em', color: g.suave, fontWeight: 600, marginBottom: 10 }}>TABLERO · EN VIVO</div>
          <Logo nombre={negocio.nombre} tamano={ancho ? 1.15 : 1} />
        </div>
        {nivel.pct >= a.alerta_pct && (
          <Etiqueta color={g.rojo} style={{ fontSize: '0.86rem', padding: '8px 14px' }}>
            <AlertTriangle size={16} /> Aforo al {nivel.pct}%: considera pausar pases de día
          </Etiqueta>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: ancho ? 'repeat(12, minmax(0, 1fr))' : 'minmax(0, 1fr)', gap: 16 }}>
        <Tarjeta titulo="Aforo ahora" style={celda(4)} accion={<Etiqueta color={nivel.color}>{nivel.texto}</Etiqueta>}>
          <Medidor pct={nivel.pct} color={nivel.color} tamano={210}>
            <div style={{ fontFamily: g.display, fontWeight: 800, fontSize: '3.4rem', lineHeight: 1, color: nivel.color }}>{a.adentro}</div>
            <div style={{ color: g.suave, fontSize: '0.86rem' }}>de {a.capacidad} · {nivel.pct}%</div>
          </Medidor>
          <div style={{ textAlign: 'center', color: g.suave, fontSize: '0.8rem', marginTop: 4 }}>Alerta al {a.alerta_pct}% · estancia promedio {t.estancia_min ? duracion(t.estancia_min) : '—'}</div>
        </Tarjeta>

        <div style={{ ...celda(8), display: 'grid', gridTemplateColumns: ancho ? 'repeat(2, minmax(0, 1fr))' : 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <Tarjeta><Kpi icono={DoorOpen} valor={t.hoy.entradas} etiqueta="Entradas hoy" sub={`${t.hoy.unicos} socios distintos · ${t.hoy.manuales} manuales`} /></Tarjeta>
          <Tarjeta><Kpi icono={Ban} valor={t.hoy.denegados} etiqueta="Accesos negados hoy" sub="Vencidas, adeudos, QR copiados…" color={t.hoy.denegados ? g.rojo : g.texto} /></Tarjeta>
          <Tarjeta><Kpi icono={Wallet} valor={pesos(t.ingresos.hoy)} etiqueta="Cobrado hoy" sub={`${pesos(t.ingresos.mes)} en el mes`} /></Tarjeta>
          <Tarjeta><Kpi icono={UsersRound} valor={t.socios.activos} etiqueta="Socios activos" sub={`${t.socios.por_vencer} vencen esta semana · ${t.socios.vencidos} vencidos por recuperar`} /></Tarjeta>
        </div>

        <Tarjeta titulo="Personas adentro por hora" style={celda(8)}
          accion={<span style={{ fontSize: '0.78rem', color: g.suave }}>Hoy vs. promedio de los últimos 4 {DIAS[(new Date().getDay() + 6) % 7].toLowerCase()}</span>}>
          <CurvaHoras aforo={a} />
        </Tarjeta>

        <Adentro lista={t.adentro} style={celda(4)} />

        <Tarjeta titulo="Horas pico · últimas 4 semanas" style={celda(8)}>
          {calor ? <MapaCalor celdas={calor} capacidad={a.capacidad} /> : <div style={{ color: g.suave }}>Calculando…</div>}
        </Tarjeta>

        <Tarjeta titulo="Accesos negados hoy" style={celda(4)}>
          {t.motivos.length ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {t.motivos.map((m) => (
                <div key={m.motivo}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', marginBottom: 4 }}>
                    <span>{m.motivo}</span><b>{m.n}</b>
                  </div>
                  <div style={{ height: 6, borderRadius: 6, background: g.sup2 }}>
                    <div style={{ height: '100%', borderRadius: 6, width: `${(m.n / t.motivos[0].n) * 100}%`, background: 'var(--g-rojo)' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : <div style={{ color: g.suave, fontSize: '0.9rem' }}>Nadie se ha quedado afuera hoy.</div>}
        </Tarjeta>

        <PorCobrar avisos={t.avisos} negocio={negocio} style={celda(8)} />

        <Ajustes negocio={negocio} aforo={a} style={celda(4)} alGuardar={() => { recargar(); alCambiarNegocio?.(); }} />
      </div>
    </div>
  );
}

function Kpi({ icono: Icono, valor, etiqueta, sub, color }) {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: g.sup2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icono size={20} color="var(--g-pri)" />
      </div>
      <Numero valor={valor} etiqueta={etiqueta} sub={sub} color={color} />
    </div>
  );
}

function MapaCalor({ celdas, capacidad }) {
  const mapa = new Map(celdas.map((c) => [`${c.dia}-${c.h}`, c.personas]));
  const horas = Array.from({ length: 18 }, (_, i) => i + 5);
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `38px repeat(${horas.length}, minmax(22px, 1fr))`, gap: 3, minWidth: 520 }}>
        <span />
        {horas.map((h) => <span key={h} style={{ fontSize: '0.66rem', color: g.suave, textAlign: 'center' }}>{h % 3 === 0 ? h : ''}</span>)}
        {DIAS.map((d, i) => (
          <FilaCalor key={d} dia={d}>
            {horas.map((h) => {
              const p = mapa.get(`${i + 1}-${h}`) ?? 0;
              const x = Math.min(1, p / (capacidad * 0.85));
              return (
                <span key={h} title={`${d} ${h}:30 · ~${p} personas`} style={{
                  height: 24, borderRadius: 5,
                  background: x < 0.05 ? 'rgba(255,255,255,0.04)' : `color-mix(in srgb, var(--g-pri) ${Math.round(12 + x * 88)}%, transparent)`,
                }} />
              );
            })}
          </FilaCalor>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: '0.74rem', color: g.suave }}>
        Vacío <span style={{ width: 90, height: 8, borderRadius: 8, background: 'linear-gradient(90deg, color-mix(in srgb, var(--g-pri) 12%, transparent), var(--g-pri))' }} /> Lleno
      </div>
    </div>
  );
}

function FilaCalor({ dia, children }) {
  return (
    <>
      <span style={{ fontSize: '0.74rem', color: g.suave, alignSelf: 'center' }}>{dia}</span>
      {children}
    </>
  );
}

function Adentro({ lista, style }) {
  const ahora = Date.now();
  const [q, setQ] = useState('');
  const filtrada = lista.filter((s) => !q || s.nombre.toLowerCase().includes(q.toLowerCase()) || String(s.numero).includes(q));
  return (
    <Tarjeta titulo={`Adentro ahora · ${lista.length}`} style={{ ...style, display: 'flex', flexDirection: 'column', maxHeight: 420 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: g.sup2, borderRadius: 12, marginBottom: 8 }}>
        <Search size={15} color="var(--g-suave)" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar"
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: g.texto, fontSize: '0.88rem' }} />
      </label>
      <div style={{ overflowY: 'auto', flex: 1, marginRight: -6, paddingRight: 6 }}>
        {filtrada.map((s) => {
          const min = minutosDesde(s.desde, ahora);
          return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderTop: `1px solid ${g.linea}` }}>
              <Avatar nombre={s.nombre} tamano={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.nombre}</div>
                <div style={{ fontSize: '0.74rem', color: g.suave }}>#{s.numero} · desde {hora(s.desde)}</div>
              </div>
              <span style={{ fontSize: '0.78rem', color: min > 150 ? g.ambar : g.suave, whiteSpace: 'nowrap' }}>{duracion(min)}</span>
            </div>
          );
        })}
      </div>
    </Tarjeta>
  );
}

function PorCobrar({ avisos, negocio, style }) {
  const mensaje = (s) => (s.estado === 'vencida'
    ? `Hola ${s.nombre.split(' ')[0]}, te extrañamos en ${negocio.nombre}. Tu membresía ${s.plan} venció el ${fechaCorta(s.vence)}: renuévala y vuelve a entrenar.`
    : s.estado === 'adeudo'
      ? `Hola ${s.nombre.split(' ')[0]}, tienes un saldo pendiente de ${pesos(s.adeudo)} en ${negocio.nombre}. Puedes pagarlo en recepción.`
      : `Hola ${s.nombre.split(' ')[0]}, tu membresía ${s.plan} en ${negocio.nombre} vence el ${fechaCorta(s.vence)}. Renuévala para no perder tu acceso.`);
  return (
    <Tarjeta titulo="Por cobrar y por renovar" style={style}
      accion={<span style={{ fontSize: '0.78rem', color: g.suave }}>Vencidas (15 días), adeudos y las que vencen esta semana</span>}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
        {avisos.map((s) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 14, background: g.sup2 }}>
            <Avatar nombre={s.nombre} tamano={34} color={ESTADOS[s.estado].color} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.nombre}</div>
              <div style={{ fontSize: '0.74rem', color: ESTADOS[s.estado].color }}>
                {s.estado === 'vencida' ? `Venció ${fechaCorta(s.vence)}` : s.estado === 'adeudo' ? `Debe ${pesos(s.adeudo)}` : s.dias === 0 ? 'Vence hoy' : `Vence en ${s.dias} d`} · {s.plan}
              </div>
            </div>
            <a href={`https://wa.me/?text=${encodeURIComponent(mensaje(s))}`} target="_blank" rel="noreferrer" title="Mandar recordatorio por WhatsApp"
              style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(37,211,102,0.14)', color: '#4ADE80', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageCircle size={17} />
            </a>
          </div>
        ))}
      </div>
    </Tarjeta>
  );
}

function Ajustes({ negocio, aforo, style, alGuardar }) {
  const [capacidad, setCapacidad] = useState(aforo.capacidad);
  const [alerta, setAlerta] = useState(aforo.alerta_pct);
  const [estado, setEstado] = useState('');
  const guardar = async () => {
    setEstado('Guardando…');
    const { error } = await supabase.rpc('gym_ajustar', { p_negocio: negocio.id, p_capacidad: Number(capacidad), p_alerta_pct: Number(alerta) });
    setEstado(error ? errorLegible(error) : 'Listo: recepción ya aplica el nuevo aforo.');
    if (!error) alGuardar();
  };
  const campo = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 12, border: `1px solid ${g.linea}`, background: g.sup2, color: g.texto, fontSize: '1rem', fontFamily: g.texto2 };
  return (
    <Tarjeta titulo="Aforo máximo" style={style} accion={<Settings2 size={18} color="var(--g-suave)" />}>
      <div style={{ fontSize: '0.84rem', color: g.suave, marginTop: -6, marginBottom: 12 }}>
        Al llegar al máximo, el torniquete deja de dar acceso hasta que alguien salga. Prueba bajarlo para verlo en recepción.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <label style={{ fontSize: '0.78rem', color: g.suave }}>Personas máx.
          <input type="number" min={10} max={2000} value={capacidad} onChange={(e) => setCapacidad(e.target.value)} style={{ ...campo, marginTop: 6 }} />
        </label>
        <label style={{ fontSize: '0.78rem', color: g.suave }}>Alerta al (%)
          <input type="number" min={50} max={100} value={alerta} onChange={(e) => setAlerta(e.target.value)} style={{ ...campo, marginTop: 6 }} />
        </label>
      </div>
      <Boton style={{ width: '100%', marginTop: 12 }} onClick={guardar}>Guardar</Boton>
      {estado && <div style={{ fontSize: '0.82rem', color: g.suave, marginTop: 8 }}>{estado}</div>}
    </Tarjeta>
  );
}
