import { useState } from 'react';
import { AlertTriangle, CalendarHeart, Minus, Plus } from 'lucide-react';
import {
  ESTADOS, PRODUCTOS, TALLOS, ZONAS, agotado, ajustarPrecio, alternarAgotado, fechaLarga, inicioDia, margen, peso,
  precioProducto, proximaFecha, useFlores,
} from './datos';
import { BotonPantalla, Foto, Logo, avisarListo, useAhora } from './comun';

// ─────────────────────────────────────────────────────────────────────────────
// DUEÑO — ventas del día contra el mes, pedidos en vivo, de dónde piden, qué se
// vende, las fechas fuertes que vienen (con cuánta flor comprar) y el catálogo
// editable: marcar agotado o subir precio se ve al instante en el sitio.
// Gráficas en SVG a mano (recharts no carga con Vite 8).
// ─────────────────────────────────────────────────────────────────────────────

// fechas fuertes del año para una florería en México
const TEMPORADAS = [
  { nombre: 'Día de Muertos', mes: 10, dia: 2, factor: 1.6, nota: 'Cempasúchil y terciopelo para ofrendas' },
  { nombre: 'Día de la Virgen de Guadalupe', mes: 11, dia: 12, factor: 2.1, nota: 'Rosas blancas y rojas' },
  { nombre: 'Navidad', mes: 11, dia: 24, factor: 1.5, nota: 'Nochebuenas y arreglos de mesa' },
  { nombre: '14 de febrero', mes: 1, dia: 14, factor: 6.5, nota: 'Rosas rojas: comprar con 3 semanas' },
  { nombre: '10 de mayo', mes: 4, dia: 10, factor: 7.2, nota: 'El día más fuerte del año' },
];

export default function Dueno() {
  const e = useFlores();
  useAhora(15000);   // refresca el tablero
  const [sobre, setSobre] = useState(null);

  const hoy = e.pedidos.filter((p) => p.t >= inicioDia(0));
  const ventasHoy = hoy.reduce((n, p) => n + p.total, 0);
  const prom = e.historia.reduce((n, d) => n + d.ventas, 0) / e.historia.length;
  const entregadosHoy = e.pedidos.filter((p) => p.estado === 'entregado' && p.historial.entregado >= inicioDia(0));
  const aTiempo = entregadosHoy.filter((p) => margen(p, p.historial.entregado) >= 0).length;
  const enVivo = ESTADOS.slice(0, 4).map((s) => ({ s, n: e.pedidos.filter((p) => p.estado === s.id && p.dia <= inicioDia(0)).length }));

  const serie = [...e.historia, { dia: inicioDia(0), ventas: ventasHoy, pedidos: hoy.length, hoy: true }];
  const maxV = Math.max(...serie.map((d) => d.ventas));

  // de dónde piden (mes simulado + hoy) y qué se vende
  const porZona = (() => {
    const base = { lapaz: 92, centro: 61, huexotitla: 70, zavaleta: 48, angelopolis: 84, lomas: 39, cholula: 55, cuautlancingo: 21 };
    hoy.forEach((p) => { base[p.zona] = (base[p.zona] || 0) + 1; });
    return ZONAS.map((z) => ({ z, n: base[z.id] || 0 })).sort((a, b) => b.n - a.n);
  })();
  const maxZ = porZona[0]?.n || 1;
  const top = (() => {
    const base = { pasion: 88, dalia: 54, mandarina: 47, sol: 44, nube: 39, joyero: 31, paz: 26, campo: 22, lavanda: 19, orquidea: 15 };
    hoy.forEach((p) => p.items.forEach((it) => { if (it.tipo === 'producto') base[it.id] = (base[it.id] || 0) + 1; }));
    return Object.entries(base).sort((a, b) => b[1] - a[1]).slice(0, 5);
  })();

  const proximas = TEMPORADAS.map((t) => ({ t, ...proximaFecha(t) })).sort((a, b) => a.dias - b.dias).slice(0, 3);
  const recordatorios = e.fechas.filter((f) => proximaFecha(f).dias <= 7).length + 23;
  const bajos = TALLOS.filter((t) => (e.inventario[t.id] || 0) < 20);

  const W = 640, H = 170, paso = W / serie.length;

  return (
    <div className="fl-panel">
      <header className="fl-panel-cab">
        <div><Logo /><span className="fl-panel-rol">Dueño</span></div>
        <p>{fechaLarga(0)}</p>
        <BotonPantalla />
      </header>

      <div className="fl-dueno">
        <div className="fl-kpis">
          <div className="fl-kpi"><small>Ventas de hoy</small><b>{peso(ventasHoy)}</b><span>{ventasHoy >= prom ? '▲' : '▼'} {Math.round(Math.abs(ventasHoy / prom - 1) * 100)}% vs. día promedio</span></div>
          <div className="fl-kpi"><small>Pedidos de hoy</small><b>{hoy.length}</b><span>{e.pedidos.filter((p) => p.dia === inicioDia(1)).length} programados para mañana</span></div>
          <div className="fl-kpi"><small>Ticket promedio</small><b>{peso(hoy.length ? ventasHoy / hoy.length : 0)}</b><span>con envío incluido</span></div>
          <div className="fl-kpi"><small>Entregas a tiempo</small><b>{entregadosHoy.length ? Math.round((aTiempo / entregadosHoy.length) * 100) : 100}%</b><span>{entregadosHoy.length} entregadas hoy</span></div>
        </div>

        <section className="fl-caja fl-grafica">
          <div className="fl-caja-cab"><h3>Ventas · últimos 30 días</h3><small>Hoy en curso</small></div>
          <div className="fl-svg-envoltura">
            <svg viewBox={`0 0 ${W} ${H + 22}`} role="img" aria-label="Ventas por día de los últimos 30 días">
              {[0.5, 1].map((k) => <line key={k} x1="0" x2={W} y1={H - H * k * 0.92} y2={H - H * k * 0.92} className="fl-rejilla-linea" />)}
              {serie.map((d, i) => {
                const h = Math.max(3, (d.ventas / maxV) * H * 0.92);
                const x = i * paso + 2;
                return (
                  <g key={d.dia} onMouseEnter={() => setSobre(i)} onMouseLeave={() => setSobre(null)}>
                    <rect x={i * paso} y="0" width={paso} height={H} fill="transparent" />
                    <path className={`fl-barra ${d.hoy ? 'hoy' : ''} ${sobre === i ? 'sobre' : ''}`}
                      d={`M${x},${H} V${H - h + 4} q0,-4 4,-4 h${paso - 8} q4,0 4,4 V${H} Z`} />
                  </g>
                );
              })}
              <text x="0" y={H + 16} className="fl-eje">{new Date(serie[0].dia).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</text>
              <text x={W} y={H + 16} textAnchor="end" className="fl-eje">Hoy</text>
            </svg>
            {sobre !== null && (
              <div className="fl-tooltip" style={{ left: `${((sobre + 0.5) / serie.length) * 100}%` }}>
                <b>{serie[sobre].hoy ? 'Hoy' : new Date(serie[sobre].dia).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}</b>
                <span>{peso(serie[sobre].ventas)} · {serie[sobre].pedidos} pedidos</span>
              </div>
            )}
          </div>
        </section>

        <section className="fl-caja">
          <h3>En este momento</h3>
          <ul className="fl-vivo">
            {enVivo.map(({ s, n }) => <li key={s.id} className={`e-${s.id}`}><b>{n}</b><span>{s.corto}</span></li>)}
          </ul>
          {bajos.length > 0 && <p className="fl-alerta"><AlertTriangle size={15} /> Se está acabando: {bajos.map((t) => t.nombre.toLowerCase()).join(', ')}.</p>}
        </section>

        <section className="fl-caja">
          <h3>De dónde piden · este mes</h3>
          <ul className="fl-barras-h">
            {porZona.map(({ z, n }) => (
              <li key={z.id} title={`${z.nombre}: ${n} pedidos`}><span>{z.nombre}</span><i><em style={{ width: `${(n / maxZ) * 100}%` }} /></i><b>{n}</b></li>
            ))}
          </ul>
        </section>

        <section className="fl-caja">
          <h3>Lo más pedido · este mes</h3>
          <ol className="fl-top">
            {top.map(([id, n], k) => {
              const p = PRODUCTOS.find((x) => x.id === id);
              return <li key={id}><span>{k + 1}</span><Foto nombre={p.foto} texto={p.nombre} /><b>{p.nombre}</b><em>{n}</em></li>;
            })}
          </ol>
        </section>

        <section className="fl-caja">
          <h3>Fechas fuertes que vienen</h3>
          <ul className="fl-lista">
            {proximas.map(({ t, dias }) => (
              <li key={t.nombre}>
                <div className="fl-fecha-num"><b>{dias}</b><small>días</small></div>
                <div><b>{t.nombre}</b><small>Se vende ~{t.factor}× un día normal · {t.nota}</small></div>
              </li>
            ))}
          </ul>
          <p className="fl-nota"><CalendarHeart size={14} /> {recordatorios} clientes recibirán esta semana su recordatorio de "Mis fechas".</p>
        </section>

        <section className="fl-caja fl-cat-editable">
          <div className="fl-caja-cab"><h3>Catálogo</h3><small>Los cambios se ven al instante en el sitio</small></div>
          <ul>
            {PRODUCTOS.map((p) => {
              const off = agotado(e, p.id);
              return (
                <li key={p.id} className={off ? 'apagado' : ''}>
                  <Foto nombre={p.foto} texto={p.nombre} />
                  <div><b>{p.nombre}</b><small>Mediano {peso(precioProducto(e, p, 'M' in p.tam ? 'M' : 'S'))}</small></div>
                  <div className="fl-contador chico">
                    <button type="button" onClick={() => ajustarPrecio(p.id, -50)} aria-label={`Bajar $50 a ${p.nombre}`}><Minus size={13} /></button>
                    <button type="button" onClick={() => ajustarPrecio(p.id, 50)} aria-label={`Subir $50 a ${p.nombre}`}><Plus size={13} /></button>
                  </div>
                  <button type="button" className={`fl-interruptor ${off ? '' : 'si'}`} onClick={() => { alternarAgotado(p.id); avisarListo(off ? `${p.nombre} de vuelta en el sitio` : `${p.nombre} marcado como agotado`); }} aria-pressed={!off} aria-label={`${p.nombre} disponible`} />
                </li>
              );
            })}
          </ul>
        </section>
      </div>
      <p className="fl-nota centro">Números del mes de ejemplo · los de hoy son los pedidos reales de la demo ({hoy.length}).</p>
    </div>
  );
}
