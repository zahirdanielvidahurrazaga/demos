import { useEffect, useState } from 'react';
import { CircleCheck, CircleX, LifeBuoy, Usb } from 'lucide-react';
import { useLector } from '../gimnasio/Lector';
import {
  AYUDAS, CASA, CLIENTE, PELICULAS, atenderAyuda, boleto, nivelDe, puntosEnLugar, diaCorto, funcionPorId, funcionesDelDia, hora, leerPase, nombreLugar, pasesDePrueba, useCine, ventasDe,
} from './datos';
import { Controles, Mapa, minutos, useAhora } from './comun';

// ─────────────────────────────────────────────────────────────────────────────
// TAQUILLA / ENTRADA — el lector USB (modo teclado) lee el QR del pase y la
// pantalla completa dice si pasa y A QUÉ LUGAR mandar el auto. Sin cámara
// (regla de todas las demos). Las teclas 1…5 simulan los pases de prueba.
// ─────────────────────────────────────────────────────────────────────────────

const RES = {
  pasa: { titulo: 'Adelante', bien: true },
  'ya-entro': { titulo: 'Ya entró', bien: false },
  'otra-funcion': { titulo: 'Otra función', bien: false },
  'no-existe': { titulo: 'No válido', bien: false },
  cancelada: { titulo: 'Cancelada', bien: false },
  reembolsado: { titulo: 'Reembolsado', bien: false },
  cliente: { titulo: 'Cliente', bien: true },
  casa: { titulo: 'Adelante', bien: true },
  'casa-ya': { titulo: 'Ya entró', bien: false },
  'casa-otro-dia': { titulo: 'Otro día', bien: false },
};

function falta(t) {
  const m = minutos(Date.now(), t);
  if (t <= Date.now()) return 'Ya empezó';
  return m < 60 ? `en ${m} min` : `en ${Math.floor(m / 60)} h ${m % 60} min`;
}

export default function Taquilla() {
  const e = useCine();
  useAhora(20000);
  const hoy = funcionesDelDia(e, 0);
  // la función que está entrando: la primera de hoy que no lleva más de 1 h empezada
  const sugerida = hoy.find((f) => f.t + 3600000 > Date.now()) || hoy[hoy.length - 1];
  const [fid, setFid] = useState(sugerida?.id);
  const [res, setRes] = useState(null);
  const [recien, setRecien] = useState(null);
  const f = funcionPorId(e, fid) || sugerida;
  const pruebas = f ? pasesDePrueba(e, f.id) : [];

  const leer = (texto) => {
    if (!f) return;
    const r = leerPase(texto, f.id);
    setRes(r);
    if (r.resultado === 'pasa') setRecien(r.venta.lugar);
  };
  useLector(leer, { atajos: pruebas.map((p) => p.codigo) });
  useEffect(() => { if (!res || res.resultado === 'cliente') return; const id = setTimeout(() => setRes(null), 4200); return () => clearTimeout(id); }, [res]);

  if (!f) return <div className="ac-envoltura ac-panel"><p className="ac-suave">Hoy no hay funciones.</p></div>;
  const ventas = ventasDe(e, f.id);
  const llegaron = ventas.filter((v) => v.entro).sort((a, b) => b.entro - a.entro);
  const p = PELICULAS[f.peli];

  return (
    <div className="ac-envoltura ac-panel">
      <div className="ac-panel-cab">
        <div>
          <p className="ac-etiqueta">Entrada · Caseta 1</p>
          <h1>{p.titulo} · {hora(f.t)}</h1>
        </div>
        <div className="ac-der">
          <select className="ac-select" value={f.id} onChange={(ev) => setFid(ev.target.value)} aria-label="Función">
            {hoy.map((x) => <option key={x.id} value={x.id}>{hora(x.t)} · {PELICULAS[x.peli].titulo}</option>)}
          </select>
          <Controles vidrio={false} />
        </div>
      </div>

      <div className="ac-kpis">
        <div className="ac-tarjeta ac-kpi"><small>Boletos vendidos</small><b>{ventas.length}</b></div>
        <div className="ac-tarjeta ac-kpi verde"><small>Ya llegaron</small><b>{llegaron.length}</b></div>
        <div className="ac-tarjeta ac-kpi rosa"><small>Por llegar</small><b>{ventas.length - llegaron.length}</b></div>
        <div className="ac-tarjeta ac-kpi"><small>Empieza</small><b>{falta(f.t)}</b></div>
      </div>

      <div className="ac-taquilla">
        <div style={{ display: 'grid', gap: 14 }}>
          <div className="ac-tarjeta ac-lector">
            <div className="ac-lector-estado">
              <span><Usb size={18} /></span>
              <div><b>Lector USB conectado</b><p className="ac-suave" style={{ fontSize: 13 }}>Pasa el QR del pase por el lector</p></div>
            </div>
            <hr className="ac-sep" />
            <p className="ac-etiqueta">Pases de prueba · teclas 1–{pruebas.length}</p>
            {pruebas.map((x, i) => (
              <button key={x.codigo} type="button" className="ac-prueba" onClick={() => leer(x.codigo)}>
                <kbd>{i + 1}</kbd>{x.etiqueta}<code>{x.codigo}</code>
              </button>
            ))}
          </div>
          <AyudaLugar e={e} />
          <div className="ac-tarjeta" style={{ padding: 18 }}>
            <p className="ac-etiqueta" style={{ marginBottom: 6 }}>Últimas llegadas</p>
            <div className="ac-llegadas">
              {llegaron.slice(0, 30).map((v) => (
                <div key={v.codigo} className="ac-llegada">
                  <b>{hora(v.entro)}</b>
                  <span style={{ flex: 1 }}>{v.nombre}{v.mio && <span className="ac-chip ambar" style={{ marginLeft: 6 }}>Tú</span>}</span>
                  <span className="ac-suave">{nombreLugar(v.lugar)}</span>
                </div>
              ))}
              {!llegaron.length && <p className="ac-suave" style={{ fontSize: 14, padding: '8px 0' }}>Todavía no llega nadie.</p>}
            </div>
          </div>
        </div>
        <div>
          <p className="ac-etiqueta" style={{ marginBottom: 10 }}>El lugar en vivo</p>
          <Mapa e={e} funcion={f.id} modo="vivo" recien={recien} />
        </div>
      </div>

      {res && <Resultado r={res} e={e} alCerrar={() => setRes(null)} />}
    </div>
  );
}

function Resultado({ r, e, alCerrar }) {
  if (r.resultado === 'cliente') return <ResultadoCliente e={e} alCerrar={alCerrar} />;
  if (r.casa) return <ResultadoCasa r={r} alCerrar={alCerrar} />;
  const cfg = RES[r.resultado];
  const v = r.venta;
  const b = v && boleto(v.tipo);
  return (
    <div className={`ac-resultado ${cfg.bien ? 'pasa' : 'no'}`} onClick={alCerrar} role="alert">
      {cfg.bien ? <CircleCheck size={72} strokeWidth={1.5} /> : <CircleX size={72} strokeWidth={1.5} />}
      <div className="ac-res-titulo">{cfg.titulo}</div>
      {r.resultado === 'pasa' && (<>
        <div className="ac-res-lugar">{nombreLugar(v.lugar)}</div>
        <p>{v.nombre} · {b.nombre} · {b.personas.toLowerCase()}</p>
        {v.tipo.includes('terror') && <p style={{ fontWeight: 700 }}>Entregar pan de muerto, certificado y 2 pulseras de acceso rápido</p>}
      </>)}
      {r.resultado === 'ya-entro' && <p>Este pase entró a las {hora(v.entro)} a {nombreLugar(v.lugar)}. Puede ser una captura de pantalla compartida.</p>}
      {r.resultado === 'otra-funcion' && <p>El boleto de {v.nombre} es para {PELICULAS[r.funcion.peli].titulo}, <span>{diaCorto(r.funcion.t)}</span> a las {hora(r.funcion.t)}.</p>}
      {r.resultado === 'no-existe' && <p>El código {r.codigo} no corresponde a ningún boleto vendido.</p>}
      {r.resultado === 'cancelada' && <p>La función de {PELICULAS[r.funcion.peli].titulo} se canceló por lluvia. {v.nombre} puede cambiar su fecha desde su boleto, en su celular.</p>}
      {r.resultado === 'reembolsado' && <p>A {v.nombre} ya se le reembolsó este boleto.</p>}
      <p className="ac-res-pie">Toca para seguir</p>
    </div>
  );
}

// QR de cliente: se identifica a la persona y se suman los puntos de lo que
// pagó aquí mismo (boletos en taquilla o comida en la fuente de sodas).
function ResultadoCliente({ e, alCerrar }) {
  const [sumado, setSumado] = useState(null);
  const nivel = nivelDe(e.puntos.ganados);
  const sumar = (pesos, donde) => { const pts = puntosEnLugar(pesos, donde); setSumado({ pts, donde }); };
  return (
    <div className="ac-resultado pasa" onClick={alCerrar} role="alert">
      <span style={{ width: 92, height: 92, borderRadius: '50%', background: 'rgba(0,0,0,.14)', display: 'grid', placeItems: 'center', fontSize: 34, fontWeight: 600 }}>{CLIENTE.iniciales}</span>
      <div className="ac-res-titulo" style={{ fontSize: 'clamp(44px, 7vw, 88px)' }}>{CLIENTE.nombre}</div>
      <p>{nivel.nombre} · {e.puntos.saldo.toLocaleString('es-MX')} Cocopuntos</p>
      {sumado
        ? <div className="ac-res-lugar">+{sumado.pts} puntos</div>
        : (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }} onClick={(ev) => ev.stopPropagation()}>
            <button type="button" className="ac-btn" style={{ background: 'rgba(0,0,0,.82)', color: '#fff' }} onClick={() => sumar(450, 'taquilla')}>Cobré boleto Auto · $450</button>
            <button type="button" className="ac-btn" style={{ background: 'rgba(0,0,0,.82)', color: '#fff' }} onClick={() => sumar(285, 'fuente de sodas')}>Cobré en la fuente de sodas · $285</button>
          </div>
        )}
      <p className="ac-res-pie">{sumado ? `Sumados por la compra en ${sumado.donde}. Toca para seguir` : 'Elige lo que se cobró para sumarle sus puntos'}</p>
    </div>
  );
}

// Boleto de solo Casa del Terror: vale el día de su turno, una sola vez.
function ResultadoCasa({ r, alCerrar }) {
  const cfg = RES[r.resultado];
  const c = r.casa;
  const tipo = CASA.tipos.find((x) => x.id === c.tipo);
  return (
    <div className={`ac-resultado ${cfg.bien ? 'pasa' : 'no'}`} onClick={alCerrar} role="alert">
      {cfg.bien ? <CircleCheck size={72} strokeWidth={1.5} /> : <CircleX size={72} strokeWidth={1.5} />}
      <div className="ac-res-titulo">{cfg.titulo}</div>
      {r.resultado === 'casa' && (<>
        <div className="ac-res-lugar">Casa del Terror</div>
        <p>{c.nombre} · {c.personas} {c.personas === 1 ? 'persona' : 'personas'} · turno {hora(c.t)}{c.tipo === 'rapido' ? ' · acceso rápido, sin fila' : ''}</p>
        <p style={{ fontWeight: 700 }}>Entregar {c.personas} {c.personas === 1 ? 'pulsera' : 'pulseras'} {tipo.nombre.toLowerCase()}</p>
      </>)}
      {r.resultado === 'casa-ya' && <p>Este boleto de la Casa del Terror ya se usó a las {hora(c.entro)}.</p>}
      {r.resultado === 'casa-otro-dia' && <p>El boleto de {c.nombre} es para el {diaCorto(c.t)} a las {hora(c.t)}.</p>}
      <p className="ac-res-pie">Toca para seguir</p>
    </div>
  );
}

// Solicitudes de ayuda desde el boleto del cliente (perdido, batería, audio).
function AyudaLugar({ e }) {
  const abiertas = (e.ayuda || []).filter((a) => a.estado !== 'resuelta');
  return (
    <div className="ac-tarjeta" style={{ padding: 18, display: 'grid', gap: 10 }}>
      <p className="ac-etiqueta" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><LifeBuoy size={15} /> Ayuda en el lugar · {abiertas.length}</p>
      {abiertas.map((a) => (
        <div key={a.id} className={`ac-ayuda-pedida ${a.estado}`}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b>{nombreLugar(a.lugar)}</b>
            <span>{AYUDAS.find((x) => x.id === a.tipo).nombre} · {a.nombre}{a.mio ? ' (tú)' : ''}</span>
            <small>hace {minutos(a.t)} min{a.estado === 'camino' ? ' · va alguien en camino' : ''}</small>
          </div>
          <button type="button" className={`ac-btn chico ${a.estado === 'pendiente' ? 'acento' : 'fantasma'}`} onClick={() => atenderAyuda(a.id)}>{a.estado === 'pendiente' ? 'Voy' : 'Resuelto'}</button>
        </div>
      ))}
      {!abiertas.length && <p className="ac-suave" style={{ fontSize: 14 }}>Nadie ha pedido ayuda. Llegan solas desde el boleto del cliente.</p>}
    </div>
  );
}
