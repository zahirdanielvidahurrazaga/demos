import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import Candado from './Candado';
import {
  AccesoContexto, demoDeRuta, destinoInicial, guardarCodigo, leerCodigo, normalizarCodigo,
  olvidarCodigo, permite, verificar,
} from './acceso';

// ─────────────────────────────────────────────────────────────────────────────
// PUERTA: envuelve todas las demos (y el índice). Sin código válido pinta el
// Candado y las demos ni se descargan (son lazy). Cada demo (o el índice) se
// valida ANTES de montarse: al pasar de una a otra, primero se pregunta a la
// base y luego se pinta, para que un código apagado no alcance a abrir nada.
// ─────────────────────────────────────────────────────────────────────────────

function Cargando() {
  return <div style={{ minHeight: '100vh' }} />;
}

export default function Puerta({ children }) {
  const { pathname } = useLocation();
  const zona = demoDeRuta(pathname) || 'indice';
  const [estado, setEstado] = useState(() => (leerCodigo() ? { fase: 'cargando' } : { fase: 'candado' }));
  // Turno de la última validación: una respuesta que llega tarde (o después de
  // que tecleó otro código en el candado) se ignora.
  const turno = useRef(0);

  useEffect(() => {
    const codigo = leerCodigo();
    if (!codigo) return undefined; // ya está en el candado
    const mio = ++turno.current;
    let vivo = true;
    verificar(codigo, pathname).then((r) => {
      if (!vivo || mio !== turno.current) return;
      if (r.ok) { setEstado({ fase: 'ok', acceso: r, zona }); return; }
      // Sin conexión o con demasiados intentos, el código sigue siendo suyo.
      if (r.motivo === 'invalido' || r.motivo === 'vencido') olvidarCodigo(codigo);
      setEstado({ fase: 'candado', motivo: r.motivo, codigo });
    });
    return () => { vivo = false; };
  }, [pathname, zona]);

  const alEntrar = (acceso) => {
    turno.current++;
    guardarCodigo(acceso.codigo);
    setEstado({ fase: 'ok', acceso, zona });
  };

  if (estado.fase === 'cargando') return <Cargando />;

  if (estado.fase === 'candado' || !permite(estado.acceso, pathname)) {
    const ajeno = estado.fase === 'ok';
    return (
      <Candado
        key={ajeno ? 'otra' : estado.motivo || 'sin-codigo'}
        motivo={ajeno ? 'otra' : estado.motivo}
        codigoInicial={ajeno ? '' : estado.codigo}
        ruta={pathname}
        alEntrar={alEntrar}
      />
    );
  }

  // Validado para otra demo: esperar la respuesta de esta antes de montarla.
  if (estado.zona !== zona) return <Cargando />;

  return <AccesoContexto.Provider value={estado.acceso}>{children}</AccesoContexto.Provider>;
}

// /d/<CÓDIGO>: el link personal. Valida, guarda y manda a su demo.
export function EntrarConCodigo() {
  const { codigo: crudo } = useParams();
  const codigo = normalizarCodigo(crudo);
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    let vivo = true;
    verificar(codigo, '/d').then((r) => {
      if (!vivo) return;
      if (r.ok) guardarCodigo(r.codigo);
      setResultado(r);
    });
    return () => { vivo = false; };
  }, [codigo]);

  if (!resultado) return <Cargando />;
  if (resultado.ok) return <Navigate to={destinoInicial(resultado)} replace />;
  return (
    <Candado
      motivo={resultado.motivo}
      codigoInicial={codigo}
      ruta="/d"
      alEntrar={(acceso) => { guardarCodigo(acceso.codigo); setResultado(acceso); }}
    />
  );
}
