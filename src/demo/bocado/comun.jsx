import { useId, useState } from 'react';
import { foto } from './datos';
import { BORDE, VERDES } from './marcaSvg';

// ─────────────────────────────────────────────────────────────────────────────
// LA MARCA "BOLSITA" (19-nov-2026; reemplaza al plato con mordida). El
// personaje es la bolsa de papel en la que te llevas tu comida, con un brote
// (empaque biodegradable), que saluda. En el nombre, la última o sonríe.
// Fuente de verdad del dibujo: marca/buenbocado/bolsita.html (2D) y
// montarBolsita.js (3D). Letra del logo: Outfit 900.
// Colores por variables: --l trazo · --f relleno · --d doblez · --h hojas · --a acento.
// ─────────────────────────────────────────────────────────────────────────────
const ROJO = '#E2553B'; // SOLO en la bolsita: chapitas y corazones
const TINTAS = {
  color: { '--l': VERDES.ceylan, '--f': '#FFFFFF', '--d': VERDES.kiwi, '--h': VERDES.plaza, '--a': ROJO },
  // dibujo de línea sobre papel (pantallas de bienvenida, vacíos)
  linea: { '--l': VERDES.ceylan, '--f': VERDES.papel, '--d': VERDES.papel, '--h': VERDES.kiwi, '--a': ROJO },
  // línea clara sobre albahaca (pantalla de carga, bloques de marca)
  kiwi: { '--l': VERDES.kiwi, '--f': 'transparent', '--d': 'transparent', '--h': 'rgba(220, 231, 190, .22)', '--a': ROJO },
  blanca: { '--l': '#FFFFFF', '--f': 'transparent', '--d': 'transparent', '--h': 'transparent', '--a': '#FFFFFF' },
  olivo: { '--l': VERDES.albahaca, '--f': 'transparent', '--d': 'transparent', '--h': 'transparent', '--a': VERDES.albahaca },
};

// La bolsa sola (cuerpo, doblez, brote y cara): ícono de la app, sellos, avisos.
function BolsaBase() {
  return (
    <>
      <g stroke="var(--l)" strokeWidth="3.2" strokeLinejoin="round" strokeLinecap="round">
        <path className="tallo" d="M71 54 C70 44 71 37 74 30" fill="none" />
        <path className="hoja h1" d="M74 32 C82 20 95 20 99 27 C91 37 80 38 74 32Z" fill="var(--h)" />
        <path className="hoja h2" d="M71 43 C64 33 52 32 47 38 C53 47 64 48 71 43Z" fill="var(--h)" />
        <path d="M38 70 L102 70 L106 134 Q106 139 101 139 L39 139 Q34 139 34 134 Z" fill="var(--f)" />
        <path d={BORDE} fill="var(--d)" />
        <path d="M44 80 L42 132 M96 80 L98 132" fill="none" strokeWidth="2" opacity=".45" />
        <path d="M88 126 C90 118 98 116 101 119 C99 126 93 129 88 126Z" fill="var(--h)" strokeWidth="2.2" />
      </g>
      <g className="cara">
        <ellipse cx="60" cy="100" rx="3.9" ry="4.6" fill="var(--l)" />
        <ellipse cx="80" cy="100" rx="3.9" ry="4.6" fill="var(--l)" />
        <circle cx="61.3" cy="98.4" r="1.4" fill="var(--f)" />
        <circle cx="81.3" cy="98.4" r="1.4" fill="var(--f)" />
        <path d="M61 109 Q70 118 79 109" fill="none" stroke="var(--l)" strokeWidth="3.4" strokeLinecap="round" />
        <ellipse cx="51" cy="109" rx="5" ry="3.4" fill="var(--a)" opacity=".38" />
        <ellipse cx="89" cy="109" rx="5" ry="3.4" fill="var(--a)" opacity=".38" />
      </g>
    </>
  );
}
const corazon = (x, y, s = 1) => <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 3C0-1 5-2 6 2C7-2 12-1 12 3C12 7 6 11 6 11S0 7 0 3Z" fill="var(--a)" />;

// El símbolo (solo la bolsa). Firma vieja (`aro`, `centro`) se ignora.
export function Isotipo({ size = 40, tinta = 'color', className = '', style, ...resto }) {
  return (
    <svg className={`bb-isotipo ${className}`} width={size * 0.82} height={size} viewBox="14 12 112 136" aria-hidden="true" style={{ ...TINTAS[tinta], ...style }} {...resto}>
      <BolsaBase />
    </svg>
  );
}

// El personaje completo: saluda, mano en la cintura, zapatitos y corazones.
export function Bolsita({ size = 120, tinta = 'color', className = '', style, ...resto }) {
  return (
    <svg className={`bb-bolsita ${className}`} width={size * 0.946} height={size} viewBox="10 14 140 148" aria-hidden="true" style={{ ...TINTAS[tinta], ...style }} {...resto}>
      <g fill="none" stroke="var(--l)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M36 96 Q19 104 25 116 Q29 122 36 118" />
        <path className="brazo" d="M104 96 Q120 92 121 66" />
        <path d="M58 139 L57 156" /><path d="M82 139 L83 156" />
      </g>
      <g stroke="var(--l)" strokeWidth="3" strokeLinejoin="round">
        <path d="M47 156 Q47 151 53 151 L58 151 Q60 151 60 154 L60 158 L49 158 Q47 158 47 156Z" fill="var(--l)" />
        <path d="M93 156 Q93 151 87 151 L82 151 Q80 151 80 154 L80 158 L91 158 Q93 158 93 156Z" fill="var(--l)" />
        <g className="mano">
          <path d="M115 66 Q113 54 120 53 Q127 53 127 62 Q127 68 121 69 Q116 69 115 66Z" fill="var(--f)" />
          <path d="M115 62 Q110 59 112 55" fill="none" strokeLinecap="round" />
        </g>
      </g>
      <g className="corazones">{corazon(126, 34)}{corazon(137, 46, 0.55)}</g>
      <BolsaBase />
    </svg>
  );
}

// La "o" que sonríe del nombre.
export function OSonrisa() {
  return (
    <svg className="bb-o" viewBox="0 0 60 60" aria-hidden="true">
      <circle cx="30" cy="30" r="22.5" fill="none" stroke="currentColor" strokeWidth="15" />
      <circle cx="24.6" cy="27" r="3" fill="currentColor" /><circle cx="35.4" cy="27" r="3" fill="currentColor" />
      <path d="M23.6 33.2 Q30 39.5 36.4 33.2" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
    </svg>
  );
}

// El nombre: "el buen" chiquito arriba, "bocado" con la o que sonríe y el lema opcional.
export function Nombre({ size = 40, lema = false, className = '', style }) {
  return (
    <span className={`bb-wm ${className}`} style={{ fontSize: size, ...style }} aria-label="el buen bocado">
      <span className="el" aria-hidden="true">el buen</span>
      <span aria-hidden="true">bocad<OSonrisa /></span>
      {lema && <span className="lema" aria-hidden="true">{lema === true ? 'comida real para llevar' : lema}</span>}
    </span>
  );
}

// Logo principal horizontal: nombre + bolsita. `size` = alto de las letras.
export function Logo({ size = 40, lema = false, tinta = 'color', className = '', sinMono = false }) {
  return (
    <span className={`bb-logo ${className}`}>
      <Nombre size={size} lema={lema} />
      {!sinMono && <Bolsita size={size * 1.55} tinta={tinta} />}
    </span>
  );
}

// Sello redondo: la bolsita al centro y el nombre alrededor (como un sello de tinta).
export function Sello({ size = 96, texto = 'el buen bocado · comida real · para llevar · ', className = '' }) {
  const id = `sello${useId().replace(/[^a-z0-9]/gi, '')}`;
  return (
    <svg className={`bb-sello ${className}`} width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <defs><path id={id} d="M60 60 m-45 0 a45 45 0 1 1 90 0 a45 45 0 1 1 -90 0" /></defs>
      <g className="giro">
        <circle cx="60" cy="60" r="57" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <text fill="currentColor" style={{ font: "700 10.6px 'Outfit', sans-serif", letterSpacing: '.18em', textTransform: 'uppercase' }}>
          <textPath href={`#${id}`} textLength="276">{texto}</textPath>
        </text>
      </g>
      <Isotipo size={50} tinta="color" x="39.5" y="35" />
    </svg>
  );
}

// Dibujos de línea con la bolsita (bienvenida, vacíos y exposición). Mismo trazo del logo.
const T = { fill: 'none', stroke: 'var(--l)', strokeWidth: 3.2, strokeLinecap: 'round', strokeLinejoin: 'round' };
const ESCENAS = {
  // "Comer bien, a tu hora": escritorio, laptop y el reloj marcando la 1
  oficina: (
    <>
      <path {...T} d="M14 222 H306" />
      <circle {...T} cx="236" cy="56" r="25" fill="var(--f)" />
      <path {...T} d="M236 56 V37 M236 56 L243 44" />
      <path {...T} strokeWidth="2" d="M236 33 v3 M259 56 h-3 M236 79 v-3 M213 56 h3" />
      <path {...T} d="M150 152 H302 M164 152 V222 M288 152 V222 M164 184 H288" />
      <path {...T} d="M194 152 L200 112 H262 L268 152" fill="var(--f)" />
      <path {...T} d="M186 152 H276" />
      <rect {...T} x="278" y="132" width="16" height="20" rx="3" fill="var(--f)" />
      <path {...T} d="M294 137 q8 0 8 6 q0 6 -8 6" />
      <path {...T} strokeWidth="2.2" d="M283 126 q-3 -5 0 -9 M289 126 q-3 -5 0 -9" />
    </>
  ),
  // "Recógelo sin fila": la pared de casillas con una abierta
  casilla: (
    <>
      <path {...T} d="M14 222 H306" />
      <rect {...T} x="170" y="36" width="134" height="186" rx="4" fill="var(--f)" />
      <path {...T} d="M214.7 36 V222 M259.3 36 V222 M170 98 H304 M170 160 H304" />
      <path {...T} d="M192 84 h10 l2 -18 h-14 z" fill="var(--d)" strokeWidth="2.4" />
      <path {...T} d="M214.7 98 L236 90 V168 L214.7 160 Z" fill="var(--f)" />
      <path {...T} d="M196 152 h12 l2 -24 h-16 z" fill="var(--d)" strokeWidth="2.4" />
      <path {...T} strokeWidth="2" d="M194 128 l3 -3 l3 3 l3 -3 l3 3 l3 -3 l3 3" />
      <path {...T} d="M281 208 h10 l2 -18 h-14 z" fill="var(--d)" strokeWidth="2.4" />
      <text x="177" y="50" fill="var(--l)" style={{ font: "700 10px 'Outfit', sans-serif" }}>01</text>
      <text x="177" y="112" fill="var(--l)" style={{ font: "700 10px 'Outfit', sans-serif" }}>04</text>
      <text x="266" y="174" fill="var(--l)" style={{ font: "700 10px 'Outfit', sans-serif" }}>09</text>
    </>
  ),
  // "Junta bocados": un bowl grande con vapor y la burbuja de +10
  bowl: (
    <>
      <path {...T} d="M14 222 H306" />
      <path {...T} d="M200 128 q-7 -9 0 -18 q7 -9 0 -18 M232 122 q-7 -9 0 -18 q7 -9 0 -18 M264 128 q-7 -9 0 -18 q7 -9 0 -18" strokeWidth="2.4" />
      <path {...T} d="M186 150 C190 132 206 130 214 142 M222 150 C226 126 250 124 254 146 M252 150 C258 136 276 136 282 150" fill="var(--h)" />
      <circle {...T} cx="244" cy="142" r="7" fill="var(--h)" strokeWidth="2.4" />
      <path {...T} d="M168 150 H308 Q306 214 238 218 Q170 214 168 150 Z" fill="var(--f)" />
      <path {...T} d="M162 150 H314" strokeWidth="4" />
      <path {...T} d="M182 172 Q238 186 294 172" strokeWidth="2" opacity=".5" />
      <path {...T} d="M126 28 h44 a12 12 0 0 1 12 12 v10 a12 12 0 0 1 -12 12 h-30 l-10 10 v-10 h-4 a12 12 0 0 1 -12 -12 v-10 a12 12 0 0 1 12 -12 z" fill="var(--f)" strokeWidth="2.6" />
      <text x="148" y="51" textAnchor="middle" fill="var(--l)" style={{ font: "800 15px 'Outfit', sans-serif" }}>+10</text>
    </>
  ),
};
export function Dibujo({ escena = 'oficina', tinta = 'linea', className = '' }) {
  return (
    <svg className={`bb-dibujo ${className}`} viewBox="0 0 320 240" aria-hidden="true" style={TINTAS[tinta]}>
      {ESCENAS[escena]}
      <Bolsita size={158} tinta={tinta} x="0" y="64" />
    </svg>
  );
}

// Foto de platillo con respaldo (si la imagen no existe, un plato dibujado).
export function FotoPlato({ id, className = '' }) {
  const [mal, setMal] = useState(false);
  if (mal) {
    return (
      <div className={`bb-foto-falta ${className}`}>
        <Isotipo size={48} />
      </div>
    );
  }
  return <img className={className} src={foto(id)} alt="" onError={() => setMal(true)} draggable={false} decoding="async" />;
}

export function Escena({ nombre, className = '', alt = '' }) {
  const [mal, setMal] = useState(false);
  if (mal) return <div className={`bb-escena-falta ${className}`} />;
  return <img className={className} src={`/bocado/${nombre}.webp`} alt={alt} onError={() => setMal(true)} draggable={false} decoding="async" />;
}
