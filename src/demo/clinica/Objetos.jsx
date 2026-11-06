// ─────────────────────────────────────────────────────────────────────────────
// OBJETOS DEL SITIO — el momento "wow" de cada especialidad (6-nov-2026).
//
// Un objeto cotidiano al centro que se desarma con el scroll (idea tomada de
// Oryzo: un posavasos tratado como joya). Fotos de Codex recortadas en
// public/clinica/raiz/. Cada objeto recibe `p` (0–1, avance del tramo fijo)
// y se pinta solo con transformaciones: nada de 3D, carga rápido en celular.
//   nut → el plato se separa en sus ingredientes y se vuelve a armar
//   med → la receta se escribe sola y las pastillas caen en su horario
//   den → el diente se abre en capas y se vuelve tu plan de tratamiento
// ─────────────────────────────────────────────────────────────────────────────

const F = '/clinica/raiz/';
const tramo = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
const sale = (t) => 1 - (1 - t) ** 3;
const entra = (t) => t * t * (3 - 2 * t);
const esMovil = () => typeof window !== 'undefined' && window.innerWidth < 820;

function Foto({ src, className = '', style }) {
  return <img className={`rz-foto ${className}`} src={F + src} alt="" draggable="false" style={style}
    onError={(ev) => { ev.currentTarget.style.visibility = 'hidden'; }} />;
}

// ── NUTRICIÓN · el plato ────────────────────────────────────────────────────
// en anillo (elipse más ancha que alta) alrededor del contador de kcal
const anillo = (g) => ({ x: Math.cos((g * Math.PI) / 180) * 0.6, y: Math.sin((g * Math.PI) / 180) * 0.38 });
const INGREDIENTES = [
  { f: 'ing-pollo.webp', n: 'Pollo deshebrado', d: '210 kcal · 28 g de proteína', ...anillo(-150), t: 0.3 },
  { f: 'ing-jitomate.webp', n: 'Jitomate', d: '25 kcal', ...anillo(-98), t: 0.2 },
  { f: 'ing-frijoles.webp', n: 'Frijoles de olla', d: '140 kcal · fibra', ...anillo(-46), t: 0.27 },
  { f: 'ing-aguacate.webp', n: 'Aguacate', d: '80 kcal · grasa buena', ...anillo(6), t: 0.27 },
  { f: 'ing-cebolla.webp', n: 'Cebolla morada', d: '15 kcal', ...anillo(58), t: 0.19 },
  { f: 'ing-chipotle.webp', n: 'Chipotle', d: '5 kcal · el sabor', ...anillo(110), t: 0.15 },
  { f: 'ing-tostada.webp', n: 'Tostada horneada', d: '60 kcal · sin freír', ...anillo(162), t: 0.27 },
];

export function Plato({ p }) {
  const abre = sale(tramo(p, 0.12, 0.48));
  const cierra = entra(tramo(p, 0.78, 0.96));
  const sep = abre * (1 - cierra);
  const nombres = tramo(p, 0.42, 0.52) * (1 - tramo(p, 0.74, 0.8));
  const giro = p * 70;
  const kcal = Math.round(535 * tramo(p, 0.46, 0.7)); // 210+140+80+60+25+15+5
  const k = esMovil() ? 0.74 : 1; // en celular el anillo es más cerrado y los ingredientes más chicos
  return (
    <div className="rz-obj rz-plato">
      <div className="rz-plato-giro" style={{ transform: `rotate(${giro}deg)` }}>
        <Foto src="plato-completo.webp" className="rz-plato-foto"
          style={{ opacity: 1 - sep * 1.4, transform: `scale(${1 + sep * 0.25})` }} />
        {INGREDIENTES.map((g) => {
          const r = sep;
          return (
            <div key={g.f} className="rz-ing" style={{
              width: `${g.t * 100 * (k < 1 ? 0.85 : 1)}%`,
              transform: `translate(-50%,-50%) translate(${g.x * r * 100 * k}cqw, ${g.y * r * 100 * (k < 1 ? 1.15 : 1)}cqw) rotate(${-giro}deg) scale(${0.55 + sep * 0.45})`,
              opacity: Math.min(1, sep * 2.2),
            }}>
              <Foto src={g.f} />
              <p className="rz-ing-nombre" style={{ opacity: nombres, transform: `translateY(${(1 - nombres) * 8}px)` }}>
                <b>{g.n}</b><span>{g.d}</span>
              </p>
            </div>
          );
        })}
      </div>
      <p className="rz-contador" style={{ opacity: tramo(p, 0.46, 0.52) * (1 - tramo(p, 0.74, 0.8)) }}>
        <b>{kcal}</b> kcal en tu comida
      </p>
    </div>
  );
}

// ── MÉDICO · la receta ──────────────────────────────────────────────────────
const RENGLONES = [
  ['Dx', 'Faringitis aguda · J02.9'],
  ['1', 'Amoxicilina 500 mg — 1 cápsula cada 8 h por 7 días'],
  ['2', 'Paracetamol 500 mg — solo si hay fiebre, máx. 4 al día'],
  ['', 'Líquidos tibios y reposo 48 h'],
];
const TOMAS = [{ h: 8, t: '8:00' }, { h: 16, t: '16:00' }, { h: 24, t: '24:00' }];

export function Receta({ p }) {
  const escribe = tramo(p, 0.1, 0.42);
  const sube = sale(tramo(p, 0.42, 0.62));
  const caen = tramo(p, 0.55, 0.8);
  const aviso = sale(tramo(p, 0.8, 0.92));
  const total = RENGLONES.reduce((n, r) => n + r[1].length, 0);
  const escritas = Math.round(escribe * total);
  const desde = RENGLONES.map((_, i) => RENGLONES.slice(0, i).reduce((n, r) => n + r[1].length, 0));
  return (
    <div className="rz-obj rz-receta">
      <div className="rz-receta-papel" style={{ transform: `translate(-50%,-50%) translateY(${-sube * 18}cqw) rotate(${-4 + sube * 4}deg) scale(${1 - sube * 0.28})` }}>
        <Foto src="receta.webp" />
        <div className="rz-receta-texto">
          <p className="rz-receta-cab">Dr. Emilio Navarro<span>Médico general · Céd. 8823140</span></p>
          {RENGLONES.map(([k, t], i) => {
            const n = Math.max(0, Math.min(t.length, escritas - desde[i]));
            return <p key={t} className="rz-receta-ren"><i>{k}</i>{t.slice(0, n)}{n > 0 && n < t.length && <u />}</p>;
          })}
        </div>
      </div>
      <Foto src="caja-medicina.webp" className="rz-receta-caja"
        style={{ opacity: sube, transform: `translate(${(1 - sube) * 40}cqw, 0) rotate(${8 - sube * 14}deg)` }} />
      <div className="rz-dia" style={{ opacity: sube }}>
        <div className="rz-dia-linea"><i style={{ transform: `scaleX(${sube})` }} /></div>
        {[6, 12, 18, 24].map((h) => <span key={h} className="rz-dia-hora" style={{ left: `${((h - 6) / 18) * 100}%` }}>{h}:00</span>)}
        {TOMAS.map((m, i) => {
          const c = sale(tramo(caen, i * 0.22, i * 0.22 + 0.5));
          return (
            <div key={m.t} className="rz-toma" style={{ left: `${((m.h - 6) / 18) * 100}%` }}>
              <span className="rz-pastilla" style={{ transform: `translate(-50%, ${(1 - c) * -26}cqw) rotate(${(1 - c) * 220 + 35}deg)`, opacity: c }} />
              <b style={{ opacity: c }}>{m.t}</b>
            </div>
          );
        })}
      </div>
      <div className="rz-noti" style={{ opacity: aviso, transform: `translate(-50%, ${(1 - aviso) * 30}px)` }}>
        <span className="rz-noti-app">Raíz · ahora</span>
        <b>Toca tu amoxicilina de las 16:00</b>
        <span>Vas en el día 3 de 7. Ya casi.</span>
      </div>
    </div>
  );
}

// ── DENTISTA · el diente ────────────────────────────────────────────────────
const CAPAS = [
  { n: 'Esmalte', d: 'Lo que se ve. Lo cuidas con limpieza cada 6 meses.', x: 9, y: 16, lado: 'izq' },
  { n: 'Dentina', d: 'Si la caries llega aquí, una resina la detiene.', x: 80, y: 28, lado: 'der' },
  { n: 'Pulpa', d: 'El nervio. Aquí ya hablamos de endodoncia.', x: 50, y: 44, lado: 'izq' },
  { n: 'Raíz', d: 'Lo que lo sostiene. Lo revisamos en la radiografía.', x: 76, y: 84, lado: 'der' },
];
const BOCA = '··c·r··|···h··c·'.replace('|', '').split('');

export function Diente({ p }) {
  const corta = entra(tramo(p, 0.16, 0.42));
  const capas = tramo(p, 0.4, 0.66);
  const plan = sale(tramo(p, 0.72, 0.9));
  const flota = Math.sin(p * Math.PI * 3) * 1.4;
  const movil = esMovil();
  const dx = movil ? 0 : -plan * 24, dy = movil ? -plan * 34 : -plan * 6, esc = 1 - plan * (movil ? 0.55 : 0.42);
  return (
    <div className="rz-obj rz-diente">
      <div className="rz-diente-pieza" style={{ transform: `translate(-50%,-50%) translate(${dx}cqw, ${flota + dy}cqw) rotate(${-6 + p * 10}deg) scale(${esc})` }}>
        <Foto src="diente-completo.webp" style={{ opacity: 1 - corta }} />
        <Foto src="diente-corte.webp" className="rz-diente-corte" style={{ clipPath: `inset(0 ${(1 - corta) * 100}% 0 0)` }} />
        {CAPAS.map((c, i) => {
          const v = tramo(capas, i * 0.2, i * 0.2 + 0.3) * (1 - plan);
          return (
            <div key={c.n} className={`rz-capa ${c.lado}`} style={{ left: `${c.x}%`, top: `${c.y}%`, opacity: v }}>
              <i className="rz-capa-punto" />
              <i className="rz-capa-linea" style={{ transform: `scaleX(${v})` }} />
              <p><b>{c.n}</b><span>{c.d}</span></p>
            </div>
          );
        })}
      </div>
      <div className="rz-plan" style={{ opacity: plan, transform: movil ? `translate(-50%, ${(1 - plan) * 10}cqw)` : `translate(${(1 - plan) * 10}cqw, -50%)` }}>
        <p className="rz-plan-t">Tu plan · 4 citas</p>
        <div className="rz-boca">{BOCA.map((k, i) => <i key={i} className={k === 'c' ? 'caries' : k === 'r' ? 'resina' : k === 'h' ? 'hecho' : ''} />)}</div>
        <ul>
          <li><span>Limpieza con ultrasonido</span><b>$850</b></li>
          <li><span>Resina · pieza 16</span><b>$950</b></li>
          <li><span>Resina · pieza 26</span><b>$950</b></li>
          <li className="hecho"><span>Valoración y radiografía</span><b>hecho</b></li>
        </ul>
        <p className="rz-plan-total"><span>En 3 abonos de</span><b>$917</b></p>
      </div>
    </div>
  );
}
