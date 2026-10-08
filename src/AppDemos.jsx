import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import { AuthProvider } from './context/AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// APLICACIÓN DEL DESPLIEGUE DE MAQUETAS
//
// Entrada SEPARADA de App.jsx a propósito. Bastaba con partir el árbol de rutas
// para que las pantallas del estudio cliente fueran inalcanzables, pero seguían
// COMPILÁNDOSE: los `lazy(() => import(...))` de App.jsx corren al cargar el
// módulo, aunque la rama que los usa esté muerta, así que Rollup conservaba los
// chunks de Landing, Admin y todo lo demás. Con una entrada propia, esos
// archivos ni existen en este despliegue.
//
// AuthProvider va SOLO en la ruta de la maqueta: entra con cuentas de prueba a
// la base de DEMOSTRACIONES (.env.demos), nunca a la de Be Fit Lab. El índice
// no necesita sesión.
// ─────────────────────────────────────────────────────────────────────────────

const IndiceDemos = lazy(() => import('./pages/IndiceDemos'));
const Demo = lazy(() => import('./pages/Demo'));
const PedidosDemo = lazy(() => import('./demo/pedidos/PedidosDemo'));

// Regreso de la pasarela de prueba (src/demo/PasarelaPrueba.jsx): el pago se
// "cobra" dentro de la maqueta de la que salió la compra.
function RegresoPago() {
  const orden = new URLSearchParams(window.location.search).get('orden') || '';
  let estudio = 'alma';
  try { estudio = sessionStorage.getItem('demo_actual') || 'alma'; } catch { /* sin almacenamiento */ }
  return <Navigate to={`/demo/${encodeURIComponent(estudio)}?pago=${encodeURIComponent(orden)}`} replace />;
}

export default function AppDemos() {
  return (
    <Router>
      <Suspense fallback={
        <div style={{
          height: '100vh', display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: '#12161A', color: '#8E9BA8',
          fontFamily: "'Avenir Next', system-ui, sans-serif",
        }}>
          Cargando…
        </div>
      }>
        <Routes>
          <Route path="/" element={<IndiceDemos />} />
          <Route path="/demo/:estudio" element={<AuthProvider><Demo /></AuthProvider>} />
          <Route path="/pago-prueba" element={<RegresoPago />} />
          {/* Pedidos en línea (cafeterías y restaurantes). Sin AuthProvider de
              Be Fit: la maqueta lleva su propia sesión por rol. */}
          <Route path="/pedidos/:negocio" element={<PedidosDemo />} />
          {/* Cualquier otra dirección regresa al índice: si una prospecta borra
              el path del link, aterriza en algo tuyo y no en otra marca. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
