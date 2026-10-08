// ─────────────────────────────────────────────────────────────────────────────
// ESTUDIOS DE DEMOSTRACIÓN
//
// Cada entrada es una maqueta de venta: se abre en /demo/<clave> y la app se
// pinta entera con esa marca, sin tocar Supabase ni pedir cuenta.
//
// Para armar la demo de un prospecto: copia un bloque, cambia nombre, colores y
// horario (el horario real sale de su Instagram — es lo que hace que la demo
// convenza), y mándale el link.
//
// ⚠️ Las demos con el nombre y logo de un estudio REAL son maquetas de venta,
// no su producto. Van siempre con `esReal: true` para que la pantalla muestre
// el sello de "maqueta preparada por…" y la página se marque como noindex.
// ─────────────────────────────────────────────────────────────────────────────

import portadaPase from './imagenes/portada-pase.jpg';
import portadaMembresia from './imagenes/portada-membresia.jpg';
import portadaGaleriaEventos from './imagenes/portada-galeria-eventos.jpg';
import portadaCumpleTarjeta from './imagenes/portada-cumple-tarjeta.jpg';
import logoAlma from './imagenes/logo-alma.png';

// Degradado como SVG en línea, para no depender de archivos de imagen.
const fondoDemo = (a, b) => 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="500">`
  + `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">`
  + `<stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/>`
  + `</linearGradient></defs><rect width="420" height="500" fill="url(#g)"/></svg>`);

export const ESTUDIOS_DEMO = {

  // La demo permanente y sin riesgo: estudio inventado. Es la que se puede
  // poner en el portafolio y mandar sin pensarlo dos veces.
  alma: {
    esReal: false,
    nombre: 'Studio Alma',
    nombreMayusculas: 'STUDIO ALMA',
    nombrePanel: 'Panel Alma',
    giro: 'Pilates Reformer',
    nombreCafeteria: 'Café Alma',
    nombreNutricion: 'Alma Nutrición',
    prefijoContrasena: 'Alma',
    ciudad: 'Puebla',
    // ⚠️ La paleta de una maqueta tiene que respetar la LUMINOSIDAD de la de
    // fábrica, no solo el tono: el CSS asume texto oscuro sobre --primary
    // (en Be Fit Lab es un naranja claro). Un verde oscuro deja los textos de
    // las tarjetas de clase ilegibles, aunque el color por sí solo se vea bien.
    // Paleta oficial de Studio Alma: Café Noir #4C3D19 · Kombu Green #354024 ·
    // Moss Green #889063 · Tan #CFBB99 · Bone #E5D7C4. Los tenues/suaves son
    // mezclas de esos cinco, no colores nuevos.
    colores: {
      primario: '#889063',      // Moss Green
      primarioTenue: '#6E7650', // Moss → Kombu
      primarioVivo: '#354024',  // Kombu Green
      acento: '#CFBB99',        // Tan
      fondo: '#E5D7C4',         // Bone
      fondoSuave: '#F0E8DC',    // Bone aclarado
      textoTenue: '#5E5134',    // Café Noir aclarado
      // No son tokens de Be Fit: los aplica Demo.jsx sobre --on-surface.
      texto: '#354024',         // Kombu Green
      textoSuave: '#7D7558',
      // Letras que la app pinta con el primario (Moss sobre Bone se lee mal):
      // Moss oscurecido. primarioRgb es el Moss como lo escribe el navegador.
      textoPrimario: '#5F6743',
      primarioRgb: 'rgb(136, 144, 99)',
    },
    // Colores que Be Fit Lab trae escritos a mano (no son variables) y que la
    // maqueta cambia en la página: ver src/demo/recolorearDemo.js.
    reemplazos: {
      '#FF914D': '#889063', // naranja de marca → Moss Green
      '#E68245': '#6E7650', // naranja tenue
      '#FF6B00': '#354024', // naranja vivo → Kombu Green
      '#FF7A5A': '#6E7650', // coral del halo de reserva
      '#E07A9C': '#5E5134', // rosa de los degradados → Café Noir aclarado
      '#C2456E': '#4C3D19', // rosa de regalos → Café Noir
      '#FFD4BA': '#DDD0B5', // durazno claro → Tan aclarado
      '#3B82F6': '#A8875A', // azul "Preparando" del mostrador → ocre
      '#16A34A': '#354024', // verde "Listos" → Kombu Green
      '#F4EFE9': '#F0E8DC', // fondo del mostrador → Bone aclarado
      '#1A1C1E': '#354024', // carbón (menú lateral del panel, tarjeta del QR,
                            // barra inferior, títulos) → Kombu Green
      '#2C302E': '#45512F', // fin del degradado carbón → Kombu aclarado
      // Segunda familia de naranjas de Be Fit (Mi cuenta, Ajustes, avatar,
      // barras de "Tu semana", Nutrición…). Los rojos y ámbar de error/aviso
      // NO van aquí: son semánticos y se quedan.
      '#FF8B42': '#889063', // naranja secundario → Moss Green
      '#EA7A3B': '#6E7650',
      '#E8A56B': '#889063', // barra "asistida" de Tu semana
      '#FF7A00': '#354024',
      '#E6722B': '#6E7650',
      '#E8643C': '#6E7650',
      '#F2855F': '#889063',
      '#C75D3A': '#5E5134', // naranjas oscuros → Café Noir aclarado
      '#8A4A16': '#4C3D19',
      '#7E562E': '#5E5134',
      '#EEBA89': '#CFBB99', // duraznos claros → Tan
      '#FFC79E': '#DDD0B5',
      '#FFB37A': '#CFBB99',
      '#FFB085': '#CFBB99',
      '#FFD194': '#DDD0B5',
    },
    // El acento (Tan) es claro: los degradados con letra blanca terminan en
    // Kombu en vez de en Tan. Ver Demo.jsx.
    degradadoOscuro: true,
    // Panel de Dirección en claro: menú lateral y tarjetas del mostrador QR en
    // Bone con letra Kombu, en vez de carbón. Ver Demo.jsx.
    panelClaro: true,
    marca: { logo: logoAlma },
    // Vacías a propósito: la maqueta no tiene app publicada, y heredar las de
    // fábrica mandaría a la prospecta a descargar la app DE BE FIT LAB.
    tiendas: { appleId: '', bundleId: '', appStore: '', playStore: '', applePayMerchantId: '' },
    coloresOscuro: {
      primario: '#7FA394',
      primarioTenue: '#6B8D7E',
      primarioVivo: '#5C7F70',
      acento: '#232B27',
      fondo: '#121614',
      fondoSuave: '#1A201D',
      textoTenue: '#A8B2AC',
    },
    // Coaches, horario, clases, clientas y menú viven en la base de
    // DEMOSTRACIONES (supabase/demos/02_demo_reset.sql), no aquí: la maqueta
    // corre con la app real. Aquí solo va lo que cambia de marca a marca.
    // ⚠️ Las portadas de "Explora" tienen que venir de aquí: las de fábrica son
    // FOTOGRAFÍA DE BE FIT LAB (hay un gorro con su logo bien visible) y
    // enseñarle a otra dueña la marca de su competencia hunde la venta.
    // TODAS las fotos, no solo las tarjetas: la app usa fotografía del estudio
    // en la tarjeta de membresía, el pase de clase, Comida, Evolución y la
    // agenda. Heredarlas le enseñaría a la prospecta el estudio de Be Fit Lab.
    portadas: {
      cafeteria: fondoDemo('#D9C7B2', '#8A6F52'),
      cumpleanos: fondoDemo('#E0BFC6', '#9E6B78'),
      eventos: fondoDemo('#C6D2C0', '#6E8567'),
      membresia: portadaMembresia,
      pase: portadaPase,
      nutricion: fondoDemo('#D6C9B4', '#8E7A5E'),
      progreso: fondoDemo('#C2D2CB', '#71897E'),
      evolucion: fondoDemo('#BCCFC4', '#6B8577'),
      meta: fondoDemo('#DCD2C0', '#9C8B72'),
      coach: fondoDemo('#B4C7BC', '#5D7A6C'),
      agenda: fondoDemo('#C9D8CF', '#7B948A'),
      cafeteriaPromo: fondoDemo('#CBBBA6', '#9E8469'),
      galeriaEventos: portadaGaleriaEventos,
      // Foto de la tarjeta de cuenta regresiva de Cumpleaños (en vez del collage
      // de papel kraft de Be Fit). La aplica Demo.jsx con estilos inyectados.
      cumpleTarjeta: portadaCumpleTarjeta,
    },
    modulos: {
      cafeteria: true,
      eventos: true,
      cumpleanos: true,
      nutricion: true,
      evolucion: true,
      fotosProgreso: true,
      insignias: true,
      wallet: false,
      salud: false,
    },
  },
};

// Claves viejas que siguen abriendo la maqueta: el estudio de ejemplo se llamó
// "Estudio Vera" y ese link pudo haberse mandado ya.
const ALIAS = { vera: 'alma' };

export function estudioDemo(clave) {
  const k = String(clave || '').toLowerCase();
  return ESTUDIOS_DEMO[ALIAS[k] || k] || null;
}
