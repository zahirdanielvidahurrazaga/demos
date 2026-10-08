// ─────────────────────────────────────────────────────────────────────────────
// RECOLOREADO DE LA MAQUETA
//
// La paleta del estudio (estudio.js → aplicarMarca) solo cambia las variables
// de CSS. Pero Be Fit Lab trae cientos de colores escritos a mano en estilos en
// línea, íconos y hojas de estilo (el naranja #FF914D, el rosa de los
// degradados, el azul/verde del mostrador…), y esos no se enteran.
//
// Como la demo no toca archivos de la app, aquí se reescriben EN LA PÁGINA
// mientras la maqueta está abierta: un observador cambia cada color de la tabla
// `reemplazos` del estudio por el suyo, en estilos en línea, atributos de SVG y
// reglas de CSS. Al cerrar la demo se devuelven las reglas de CSS originales.
// ─────────────────────────────────────────────────────────────────────────────

const ATRIBUTOS = ['style', 'fill', 'stroke', 'stop-color', 'color'];

const aRgb = (hex) => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};

// Un color puede aparecer como #FF914D, como "255, 145, 77" (lo que el
// navegador guarda al normalizar) o como "255,145,77" dentro de un rgba().
function armarReemplazo(reemplazos) {
  const reglas = Object.entries(reemplazos).map(([de, a]) => {
    const [r, g, b] = aRgb(de);
    const [r2, g2, b2] = aRgb(a);
    return [
      new RegExp(`${de}(?![0-9a-f])`, 'gi'), a,
      new RegExp(`(?<![\\d.])${r},\\s*${g},\\s*${b}(?![\\d.])`, 'g'), `${r2}, ${g2}, ${b2}`,
    ];
  });
  return (texto) => {
    let salida = texto;
    for (const [hex, nuevoHex, rgb, nuevoRgb] of reglas) {
      salida = salida.replace(hex, nuevoHex).replace(rgb, nuevoRgb);
    }
    return salida;
  };
}

export function recolorearDemo(reemplazos) {
  if (!reemplazos || typeof document === 'undefined') return () => {};
  const cambiar = armarReemplazo(reemplazos);

  const pintarElemento = (el) => {
    for (const attr of ATRIBUTOS) {
      const valor = el.getAttribute?.(attr);
      if (!valor) continue;
      const nuevo = cambiar(valor);
      if (nuevo !== valor) el.setAttribute(attr, nuevo);
    }
  };
  const pintarArbol = (raiz) => {
    if (raiz.nodeType !== 1) return;
    pintarElemento(raiz);
    raiz.querySelectorAll('[style],[fill],[stroke],[stop-color],[color]').forEach(pintarElemento);
  };

  // Reglas de CSS: se guardan los valores originales para devolverlos al salir.
  const originales = [];
  const vistas = new WeakSet();
  const pintarReglas = (reglas) => {
    for (const regla of reglas) {
      if (regla.cssRules) pintarReglas(regla.cssRules);
      if (!regla.style || vistas.has(regla)) continue;
      vistas.add(regla);
      for (const prop of [...regla.style]) {
        const valor = regla.style.getPropertyValue(prop);
        const nuevo = cambiar(valor);
        if (nuevo === valor) continue;
        const prioridad = regla.style.getPropertyPriority(prop);
        originales.push([regla, prop, valor, prioridad]);
        regla.style.setProperty(prop, nuevo, prioridad);
      }
    }
  };
  const pintarHojas = () => {
    for (const hoja of document.styleSheets) {
      // Las hojas de otros dominios (Google Fonts) no dejan leer sus reglas.
      try { pintarReglas(hoja.cssRules); } catch { /* ajena */ }
    }
  };

  pintarHojas();
  pintarArbol(document.body);

  const observador = new MutationObserver((cambios) => {
    let hojasNuevas = false;
    for (const c of cambios) {
      if (c.type === 'attributes') pintarElemento(c.target);
      for (const nodo of c.addedNodes) {
        if (nodo.nodeName === 'STYLE' || nodo.nodeName === 'LINK') {
          hojasNuevas = true;
          nodo.addEventListener?.('load', pintarHojas, { once: true });
        } else {
          pintarArbol(nodo);
        }
      }
      // Vite reescribe el texto de sus <style> al recargar en caliente.
      if (c.target.nodeName === 'STYLE') hojasNuevas = true;
    }
    if (hojasNuevas) pintarHojas();
  });
  observador.observe(document.documentElement, {
    subtree: true, childList: true,
    attributes: true, attributeFilter: ATRIBUTOS,
  });

  return () => {
    observador.disconnect();
    for (const [regla, prop, valor, prioridad] of originales) {
      regla.style.setProperty(prop, valor, prioridad);
    }
  };
}
