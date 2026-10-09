// Fichas visuales de la app de Alma: premium y minimalista, paleta cálida de
// la marca (kombu casi negro, hueso, tan), fotos con su color suavizado y
// vidrio líquido encima. Todo color pasa por variables --a-* para que el modo
// oscuro (Yo → Modo oscuro) solo cambie la tabla TEMAS.
// La app de clienta NO usa los colores de Be Fit recoloreados: tiene los suyos.

export const PALETA = {
  tinta: '#22261B',      // kombu casi negro: texto y lo activo
  suave: '#706B5E',      // texto secundario, cálido
  niebla: '#F3EEE6',     // hueso claro (fondo)
  niebla2: '#E4DACB',    // hueso tostado (parte baja del fondo)
  tan: '#CDB896',        // tan de Alma: manchas del fondo y brillo cálido
  musgo: '#889063',      // musgo de Alma: detalles
};

const TEMAS = {
  claro: {
    '--a-tinta': PALETA.tinta, '--a-sobre-tinta': '#FFFFFF', '--a-suave': PALETA.suave,
    '--a-niebla': PALETA.niebla, '--a-niebla2': PALETA.niebla2,
    '--a-linea': 'rgba(31,34,24,.10)', '--a-tenue': 'rgba(31,34,24,.05)', '--a-sombra': 'rgba(52,44,30,.16)',
    '--a-solido': '#FFFFFF', '--a-solido-suave': 'rgba(255,255,255,.75)',
    '--a-vidrio': 'radial-gradient(120% 90% at 0% 0%, rgba(255,255,255,.75), rgba(255,255,255,0) 55%), linear-gradient(160deg, rgba(255,255,255,.62), rgba(255,255,255,.34))',
    '--a-vidrio-borde': 'rgba(255,255,255,.85)', '--a-vidrio-luz': '#FFFFFF',
    '--a-hoja': 'linear-gradient(170deg, rgba(250,247,242,.97), rgba(240,233,223,.93))',
    '--a-velo': 'rgba(31,34,24,.3)', '--a-luz-fondo': 'rgba(255,255,255,.85)', '--a-mancha': 'rgba(205,184,150,.4)',
    '--a-peligro': '#8E2A1E',
  },
  oscuro: {
    '--a-tinta': '#F1ECE3', '--a-sobre-tinta': '#1A1D15', '--a-suave': '#A9A291',
    '--a-niebla': '#191B12', '--a-niebla2': '#0E0F0A',
    '--a-linea': 'rgba(241,236,227,.12)', '--a-tenue': 'rgba(241,236,227,.06)', '--a-sombra': 'rgba(0,0,0,.45)',
    '--a-solido': '#2C3024', '--a-solido-suave': 'rgba(255,255,255,.08)',
    '--a-vidrio': 'radial-gradient(120% 90% at 0% 0%, rgba(255,255,255,.12), rgba(255,255,255,0) 55%), linear-gradient(160deg, rgba(255,255,255,.08), rgba(255,255,255,.03))',
    '--a-vidrio-borde': 'rgba(255,255,255,.12)', '--a-vidrio-luz': 'rgba(255,255,255,.16)',
    '--a-hoja': 'linear-gradient(170deg, rgba(38,41,31,.97), rgba(24,26,19,.96))',
    '--a-velo': 'rgba(0,0,0,.5)', '--a-luz-fondo': 'rgba(205,184,150,.10)', '--a-mancha': 'rgba(136,144,99,.22)',
    '--a-peligro': '#F0A08F',
  },
};

export const a = {
  tinta: 'var(--a-tinta)', sobreTinta: 'var(--a-sobre-tinta)', suave: 'var(--a-suave)', fondo: 'var(--a-niebla)',
  linea: 'var(--a-linea)', tenue: 'var(--a-tenue)', solido: 'var(--a-solido)', solidoSuave: 'var(--a-solido-suave)',
  peligro: 'var(--a-peligro)',
  letra: "'Manrope', 'Avenir Next', system-ui, sans-serif",
};

export const variables = (tema = 'claro') => TEMAS[tema] || TEMAS.claro;

// Vidrio: tarjetas, cápsulas y botones sobre el fondo.
export const vidrio = {
  background: 'var(--a-vidrio)',
  WebkitBackdropFilter: 'blur(22px) saturate(160%)', backdropFilter: 'blur(22px) saturate(160%)',
  border: '1px solid var(--a-vidrio-borde)',
  boxShadow: 'inset 0 1px 0 var(--a-vidrio-luz), 0 10px 28px var(--a-sombra)',
};

// Vidrio encima de una foto: chips y botones con letra blanca (igual en los dos temas).
export const vidrioFoto = {
  background: 'radial-gradient(120% 100% at 0% 0%, rgba(255,255,255,.28), rgba(255,255,255,0) 60%), rgba(255,255,255,.12)',
  WebkitBackdropFilter: 'blur(20px) saturate(160%)', backdropFilter: 'blur(20px) saturate(160%)',
  border: '1px solid rgba(255,255,255,.32)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.35)',
  color: '#fff',
};

export const estilosAlma = `
@keyframes alma-entra { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes alma-sube { from { transform: translateY(100%); } to { transform: none; } }
@keyframes alma-baja { from { transform: translateY(-110%); } to { transform: none; } }
@keyframes alma-velo { from { opacity: 0; } to { opacity: 1; } }
@keyframes alma-sale { to { opacity: 0; transform: scale(1.04); } }
@keyframes alma-deriva { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(10vw, 8vh) scale(1.1); } }
@keyframes alma-flecha { 0%,100% { transform: translateX(0); } 50% { transform: translateX(4px); } }
@keyframes alma-insignia { 0% { transform: scale(.4) rotate(-20deg); opacity: 0; } 60% { transform: scale(1.12) rotate(6deg); opacity: 1; } 100% { transform: scale(1) rotate(0); } }
@keyframes alma-brillo { 0% { transform: translateX(-120%) rotate(20deg); } 100% { transform: translateX(220%) rotate(20deg); } }
/* Una sola letra en toda la app: los estilos generales de Be Fit (index.css)
   le ponen Inter y su color a todos los h1–h5, y los botones traen la del
   sistema. Aquí todo hereda Manrope y el color de su contenedor. */
.alma-app h1, .alma-app h2, .alma-app h3, .alma-app h4, .alma-app h5 { font-family: inherit; color: inherit; letter-spacing: inherit; }
.alma-app button, .alma-app input, .alma-app select, .alma-app textarea, .alma-app label { font-family: inherit; }
.alma-app input::placeholder { color: var(--a-suave); }
.alma-app { transition: background-color .3s ease, color .3s ease; }
.alma-tira { scrollbar-width: none; }
.alma-tira::-webkit-scrollbar { display: none; }
@media (prefers-reduced-motion: reduce) { .alma-app *, .alma-app { animation: none !important; transition: none !important; } }
`;
