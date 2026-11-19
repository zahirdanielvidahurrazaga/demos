// Trazos compartidos de la bolsita (comun.jsx la dibuja en React; aquí va como
// texto para texturas de three.js). Fuera de comun.jsx por fast refresh.

// Paleta "helecho" (19-nov, de Pinterest): de lo más oscuro a lo más claro.
export const VERDES = {
  noche: '#121F0D', ceylan: '#30401C', albahaca: '#526531', gamuza: '#758850',
  plaza: '#98A973', uva: '#B9C798', kiwi: '#DCE7BE', papel: '#F4F4E6',
};

function picos(x1, x2, abajo, arriba, n) {
  const paso = (x2 - x1) / n; let d = `M${x1} ${abajo}`;
  for (let i = 0; i < n; i++) d += ` L${(x1 + paso * (i + 0.5)).toFixed(1)} ${arriba} L${(x1 + paso * (i + 1)).toFixed(1)} ${abajo}`;
  return d;
}
export const BORDE = `${picos(36, 104, 58, 51, 10)} L103 72 L37 72 Z`;

// La misma bolsa como texto SVG (para texturas de three.js: letreros del local).
// OJO: si cambias BolsaBase, cambia esto igual.
export function isotipoSVG(px = 512) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(px * 0.82)}" height="${px}" viewBox="14 12 112 136">`
    + '<g stroke="#30401C" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round">'
    + '<path d="M71 54 C70 44 71 37 74 30" fill="none"/>'
    + '<path d="M74 32 C82 20 95 20 99 27 C91 37 80 38 74 32Z" fill="#98A973"/>'
    + '<path d="M71 43 C64 33 52 32 47 38 C53 47 64 48 71 43Z" fill="#98A973"/>'
    + '<path d="M38 70 L102 70 L106 134 Q106 139 101 139 L39 139 Q34 139 34 134 Z" fill="#FFFFFF"/>'
    + `<path d="${BORDE}" fill="#DCE7BE"/>`
    + '<path d="M44 80 L42 132 M96 80 L98 132" fill="none" stroke-width="2" opacity=".45"/>'
    + '<path d="M88 126 C90 118 98 116 101 119 C99 126 93 129 88 126Z" fill="#98A973" stroke-width="2.2"/></g>'
    + '<ellipse cx="60" cy="100" rx="3.9" ry="4.6" fill="#30401C"/><ellipse cx="80" cy="100" rx="3.9" ry="4.6" fill="#30401C"/>'
    + '<circle cx="61.3" cy="98.4" r="1.4" fill="#fff"/><circle cx="81.3" cy="98.4" r="1.4" fill="#fff"/>'
    + '<path d="M61 109 Q70 118 79 109" fill="none" stroke="#30401C" stroke-width="3.4" stroke-linecap="round"/>'
    + '<ellipse cx="51" cy="109" rx="5" ry="3.4" fill="#E2553B" opacity=".38"/><ellipse cx="89" cy="109" rx="5" ry="3.4" fill="#E2553B" opacity=".38"/>'
    + '</svg>';
}

