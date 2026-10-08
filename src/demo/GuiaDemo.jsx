import { MessageCircle, RotateCcw, X, ChevronRight } from 'lucide-react';
import { KAIZEN, PALETA } from './kaizen/marca';

// ─────────────────────────────────────────────────────────────────────────────
// GUÍA DE LA MAQUETA
//
// La demo casi siempre se manda por WhatsApp y la prospecta la abre SOLA, sin
// nadie que le explique qué está viendo. Sin guía, se queda en el inicio, da dos
// toques y cierra. Esta tarjeta dice qué es cada pantalla, qué probar, lleva de
// la mano por el recorrido de la clienta y deja el botón para escribirte.
//
// Los textos solo prometen lo que la app ya hace en producción: si algo se
// apaga con un módulo, el paso desaparece con él.
// ─────────────────────────────────────────────────────────────────────────────

// El WhatsApp de KaiZen (src/demo/kaizen/marca.jsx), el mismo del sitio.
// ⚠️ NO es el de `config/estudio.js`: ese es el del estudio de Be Fit Lab.
const C = PALETA.light;

// Recorrido de la clienta, en el orden en que conviene enseñarlo.
const PASOS_CLIENTA = [
  {
    vista: 'portal', titulo: 'Inicio',
    texto: 'Lo primero que ve tu clienta al abrir la app: su próxima clase, cuántas clases le quedan y la entrada a todo lo demás.',
    prueba: 'Toca su próxima clase para ver el pase con el QR que escanea el mostrador.',
  },
  {
    vista: 'agenda', titulo: 'Reservar',
    texto: 'Reserva en dos toques y ve cuántos lugares quedan. Si la clase está llena se forma en lista de espera: cuando alguien cancela, la app le ofrece el lugar y solo le descuenta la clase si lo acepta.',
    prueba: 'Reserva una clase y luego cancélala: el saldo de clases se ajusta solo.',
  },
  {
    vista: 'evolucion', titulo: 'Progreso', modulo: 'evolucion',
    texto: 'Sus clases tomadas, su racha, sus insignias y sus fotos de progreso, que solo ve ella. Es lo que hace que regrese.',
  },
  {
    vista: 'nutricion', titulo: 'Comida', modulo: 'nutricion',
    texto: 'Recetas del estudio con calorías y pasos, y un registro sencillo de lo que come en el día.',
    prueba: 'Abre una receta.',
  },
  {
    vista: 'cafeteria', titulo: 'Cafetería', modulo: 'cafeteria',
    texto: 'Pide su café desde la app, lo personaliza y lo recoge al salir de clase. La barra recibe el pedido al momento.',
    prueba: 'Arma un pedido y luego cambia a la vista «Barra» de arriba.',
  },
  {
    vista: 'eventos', titulo: 'Eventos', modulo: 'eventos',
    texto: 'Talleres y eventos especiales con su boleto y su pago dentro de la app.',
  },
  {
    vista: 'cumpleanos', titulo: 'Cumpleaños', modulo: 'cumpleanos',
    texto: 'Quién cumple años en la comunidad del estudio, para felicitarla en clase.',
  },
];

// Lo que se explica cuando la vista es de staff y no de la clienta.
const GUIA_ROL = {
  recepcion: {
    titulo: 'Mostrador',
    texto: 'La recepción escanea el QR de la clienta y su asistencia queda marcada al instante, con su saldo a la vista. Si llega sin reserva o hay dos clases seguidas, se resuelve aquí mismo.',
  },
  coach: {
    titulo: 'Coach',
    texto: 'Cada coach ve solo lo suyo: sus clases del día, quién reservó y quién ya llegó.',
    prueba: 'Toca «Ver lista» en una clase.',
  },
  barista: {
    titulo: 'Barra',
    texto: 'Los pedidos de la cafetería llegan aquí en cuanto la clienta los hace. La barista los va avanzando y la clienta ve en su teléfono cuando su café está listo. También canjea los regalos de lealtad.',
  },
  admin: {
    titulo: 'Dirección',
    texto: 'Tu panel: horarios y clases, clientas con su saldo e historial, cobros, reportes de ventas, cafetería, eventos, avisos a todas y auditoría de saldos para que ninguna clase se pierda.',
    prueba: 'Abre «Clientas» y toca a una para ver su ficha completa.',
  },
};

function pasosDe(cfg) {
  return PASOS_CLIENTA.filter((p) => !p.modulo || cfg.modulos?.[p.modulo] !== false);
}

export default function GuiaDemo({ cfg, rol, vista, irA, alReiniciar, alCerrar, style }) {
  const pasos = pasosDe(cfg);
  const paso = rol === 'clienta'
    ? (pasos.find((p) => p.vista === vista) || pasos[0])
    : GUIA_ROL[rol];
  const indice = rol === 'clienta' ? pasos.indexOf(paso) : -1;
  const siguiente = indice >= 0 ? pasos[indice + 1] : null;

  const mensaje = cfg.esReal
    ? `Hola KaiZen, vi la demostración de la app de ${cfg.nombre} y me interesa platicarlo.`
    : `Hola KaiZen, vi la demostración de ${cfg.nombre} y me interesa una app así para mi estudio.`;
  const enlaceWhatsApp = `https://wa.me/${KAIZEN.whatsapp}?text=${encodeURIComponent(mensaje)}`;

  // Tarjeta en la marca de KaiZen (como la de las demás demos), no en la del estudio.
  return (
    <aside
      aria-label="Guía de la demostración"
      style={{
        color: C.tinta, borderRadius: '24px', padding: '22px', background: '#fff',
        border: `1px solid ${C.cristalBorde}`, boxShadow: '0 24px 60px rgba(0,0,0,0.14)',
        fontFamily: KAIZEN.texto, display: 'flex', flexDirection: 'column', gap: '14px',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '10px', borderBottom: `1px solid ${C.borde}` }}>
        <div style={{ flex: 1, fontSize: '0.64rem', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.tenue }}>
          {rol === 'clienta' ? `Guía · Paso ${indice + 1} de ${pasos.length}` : 'Guía · Qué estás viendo'}
        </div>
        {alCerrar && (
          <button
            type="button" onClick={alCerrar} aria-label="Cerrar la guía"
            style={{ background: 'transparent', border: 'none', color: C.tenue, cursor: 'pointer', padding: '2px', display: 'flex' }}
          >
            <X size={17} />
          </button>
        )}
      </div>

      <div style={{ fontFamily: KAIZEN.display, fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{paso.titulo}</div>

      <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.55, color: '#3a3a3c' }}>{paso.texto}</p>

      {paso.prueba && (
        <div style={{ fontSize: '0.82rem', lineHeight: 1.5, padding: '12px 14px', borderRadius: '16px', background: C.elevado, color: '#3a3a3c' }}>
          <strong style={{ color: C.tinta }}>Pruébalo: </strong>{paso.prueba}
        </div>
      )}

      {/* El recorrido solo tiene sentido en la app de la clienta: las vistas de
          staff son una pantalla cada una. */}
      {rol === 'clienta' && (
        <>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {pasos.map((p, i) => {
              const activo = p === paso;
              return (
                <li key={p.vista}>
                  <button
                    type="button" onClick={() => irA(p.vista)} aria-current={activo ? 'step' : undefined}
                    style={{
                      cursor: 'pointer', borderRadius: '999px', padding: '6px 12px',
                      fontFamily: KAIZEN.texto, fontSize: '0.74rem', fontWeight: 600,
                      border: activo ? 'none' : `1px solid ${C.borde}`,
                      background: activo ? C.tinta : '#fff', color: activo ? '#fff' : C.tenue,
                    }}
                  >
                    {String(i + 1).padStart(2, '0')} {p.titulo}
                  </button>
                </li>
              );
            })}
          </ol>
          {siguiente && (
            <button
              type="button" onClick={() => irA(siguiente.vista)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                border: `1px solid ${C.borde}`, background: '#fff', color: C.tinta,
                borderRadius: '999px', padding: '11px 16px', cursor: 'pointer', fontFamily: KAIZEN.texto,
                fontSize: '0.84rem', fontWeight: 600,
              }}
            >
              Siguiente: {siguiente.titulo}
              <ChevronRight size={17} />
            </button>
          )}
        </>
      )}

      <a
        href={enlaceWhatsApp} target="_blank" rel="noopener noreferrer"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          borderRadius: '999px', padding: '13px 16px', textDecoration: 'none',
          background: C.tinta, color: '#fff', fontSize: '0.9rem', fontWeight: 600,
        }}
      >
        <MessageCircle size={17} strokeWidth={2.2} />
        {cfg.esReal ? `Quiero la app de ${cfg.nombre}` : 'Quiero una app así para mi estudio'}
      </a>
      <button
        type="button" onClick={alReiniciar}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          background: 'transparent', border: 'none', color: C.tenue, fontFamily: KAIZEN.texto,
          cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, padding: '2px',
        }}
      >
        <RotateCcw size={13} /> Reiniciar la demostración
      </button>
    </aside>
  );
}
