// ─────────────────────────────────────────────────────────────────────────────
// NAVEGACIÓN DENTRO DE LA MAQUETA
//
// Las pantallas navegan de dos formas y las dos sacaban de la demo:
//   · <Link to="/..."> → lo atrapa Demo.jsx con onClickCapture.
//   · navigate('/...') o navigate(-1) por código → esto.
//
// Un botón de "cerrar" que hace navigate(-1) desde /demo/alma te deja en el
// sitio real de Be Fit Lab, que es exactamente lo que no puede pasar con una
// prospecta enfrente. En vez de bloquearlo (dejando botones muertos), se avisa
// a Demo.jsx para que cambie de vista: cerrar la cafetería regresa al portal de
// la maqueta, como esperaría cualquiera.
// ─────────────────────────────────────────────────────────────────────────────

export const EVENTO_NAVEGAR = 'demo:navegar';

// Devuelve la función de navegación que debe usar una pantalla: la real fuera de
// la maqueta, y el aviso interno dentro de ella.
export function crearIrA(navigate, esDemo) {
  return (destino) => {
    if (!esDemo) {
      navigate(destino);
      return;
    }
    window.dispatchEvent(new CustomEvent(EVENTO_NAVEGAR, { detail: destino }));
  };
}
