// ─────────────────────────────────────────────────────────────────────────────
// MARCA KAIZEN EN LAS DEMOS
//
// Copiado del sitio (github.com/…/Portafolio, src/index.css y
// src/components/KaizenWordmark.jsx). Las demos son de KaiZen: el índice y las
// barras de cada maqueta tienen que sentirse la misma marca que
// kaizenstudiomx.com. Si allá cambia algo de la marca, se copia aquí.
//
// Paleta MÁRMOL: sin color. Tinta y blanco hueso; "los proyectos ponen el
// color, la marca no". Tipografía: Familjen Grotesk (titulares) + Inter (texto).
// ─────────────────────────────────────────────────────────────────────────────

export const KAIZEN = {
  sitio: 'https://kaizenstudiomx.com',
  correo: 'info@kaizenstudiomx.com',
  whatsapp: '528138833422',
  display: "'Familjen Grotesk', 'Inter', -apple-system, sans-serif",
  texto: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
};

export const PALETA = {
  light: {
    fondo: '#ffffff', elevado: '#f5f5f7', tarjeta: '#ffffff',
    tinta: '#1d1d1f', fuerte: '#000000', tenue: '#6e6e73',
    borde: 'rgba(0,0,0,0.1)', bordeSuave: 'rgba(0,0,0,0.06)', velo: 'rgba(0,0,0,0.035)',
    acento: '#1d1d1f', sobreAcento: '#ffffff',
    italica: 'linear-gradient(135deg, #3a3a3c 0%, #8e8e93 100%)',
    cristal: 'rgba(255,255,255,0.72)', cristalBorde: 'rgba(0,0,0,0.08)',
    sombra: '0 12px 34px rgba(0,0,0,0.08)', sombraHover: '0 24px 60px rgba(0,0,0,0.12)',
  },
  dark: {
    fondo: '#000000', elevado: '#161617', tarjeta: '#1d1d1f',
    tinta: '#f5f5f7', fuerte: '#ffffff', tenue: '#86868b',
    borde: 'rgba(255,255,255,0.1)', bordeSuave: 'rgba(255,255,255,0.05)', velo: 'rgba(255,255,255,0.05)',
    acento: '#ece8df', sobreAcento: '#111111',
    italica: 'linear-gradient(135deg, #ece8df 0%, #8e8a84 100%)',
    cristal: 'rgba(30,30,30,0.6)', cristalBorde: 'rgba(255,255,255,0.1)',
    sombra: '0 12px 34px rgba(0,0,0,0.3)', sombraHover: '0 24px 60px rgba(0,0,0,0.45)',
  },
};

// Familjen Grotesk + Inter, una sola vez por página (la CSP ya permite Google Fonts).
export function cargarFuentesKaizen() {
  if (document.getElementById('fuentes-kaizen')) return;
  const link = document.createElement('link');
  link.id = 'fuentes-kaizen';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Familjen+Grotesk:ital,wght@0,500;0,600;0,700;1,500;1,600;1,700&family=Inter:wght@400;500;600;700&display=swap';
  document.head.appendChild(link);
}

// Wordmark ΚΛΙΖΣΝ: Λ en lugar de A y Σ en lugar de E, puros trazos rectos.
// SVG, no fuente; toma currentColor.
export function KaizenWordmark({ height = 16, style }) {
  return (
    <svg viewBox="-8 -10 498 120" height={height} width={(height * 498) / 120} role="img" aria-label="KaiZen" style={style}>
      <g fill="none" stroke="currentColor" strokeWidth="15" strokeLinejoin="miter">
        <path d="M7 0V100 M66 0 12 54 M30 37 70 100" />
        <path d="M92 100 132 6 172 100" />
        <path d="M201 0V100" />
        <path d="M230 7H300L230 93H300" />
        <path d="M388 7H322L360 50 322 93H388" />
        <path d="M417 100V7L473 93V0" />
      </g>
    </svg>
  );
}
