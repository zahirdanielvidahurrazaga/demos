import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ConciergeBell, Globe, LayoutDashboard, MessageCircle, RotateCcw, Smartphone, Stethoscope } from 'lucide-react';
import BarraDemo from '../kaizen/BarraDemo';
import { KAIZEN } from '../kaizen/marca';
import { NEGOCIO, reiniciarDemo, simular, soyLider } from './datos';
import Sitio from './Sitio';
import Paciente from './Paciente';
import Recepcion from './Recepcion';
import Doctor from './Doctor';
import Dueno from './Dueno';
import { AvisoListo, usePantallaCompleta } from './comun';
import './clinica.css';

// ─────────────────────────────────────────────────────────────────────────────
// MAQUETA DE CLÍNICA — /clinica/raiz (29-oct-2026)
//
// Clínica genérica ("Raíz · clínica integral", Puebla) con nutrición, médico
// general y dentista, para enseñarla a consultorios y clínicas y luego
// pintarla con la marca de cada prospecto. Sin base de datos (localStorage),
// como Florería y POS. `?rol=paciente|recepcion|doctor|dueno` abre directo.
// ─────────────────────────────────────────────────────────────────────────────

const ROLES = [
  { id: 'sitio', etiqueta: 'Sitio', Icon: Globe },
  { id: 'paciente', etiqueta: 'Paciente', Icon: Smartphone },
  { id: 'recepcion', etiqueta: 'Recepción', Icon: ConciergeBell },
  { id: 'doctor', etiqueta: 'Doctor', Icon: Stethoscope },
  { id: 'dueno', etiqueta: 'Dueño', Icon: LayoutDashboard },
];

const GUIA = {
  sitio: [
    'Es la página que ve alguien ANTES de ser paciente. Baja despacio: el objeto del centro se transforma con el scroll.',
    'Abajo cambias de especialidad: Nutrición (el plato se desarma en ingredientes), Médico (la receta se escribe y las tomas caen en su horario) y Dentista (el diente se abre en capas y sale el plan).',
    "Para un consultorio de UNA especialidad manda el link con ?para=medico, ?para=dentista o ?para=nutricion: solo se ve ese doctor.",
    '"Tu primera visita": el teléfono cambia de pantalla en cada paso (agenda, WhatsApp, sala, consulta y seguimiento).',
    'Agenda una cita al final con horarios reales y ábrela en Recepción: ya está en la agenda, marcada En línea.',
  ],
  paciente: [
    'Eres Sofía: lleva 10 semanas con su nutrióloga, fue al médico y tiene un tratamiento dental a medias.',
    'Hoy: tus comidas con su receta. Marca la que ya comiste o toca "¿Qué pasó?": no tuve tiempo, no tengo ingredientes, comeré fuera… y elige una opción que tu nutrióloga ya autorizó.',
    '"Estoy comiendo fuera": elige Taquería o Sushi, escribe un menú o "toma foto" y mira qué va con tu plan (sin lactosa, bajar grasa).',
    'Súper: la lista se arma sola con tu plan. Pon $700 de presupuesto y toca "Ajustar a mi presupuesto": cambia por opciones autorizadas más baratas.',
    'Check-in de la semana: responde que fue difícil y ábrelo como Doctor → Andrea: Sofía sube al Radar.',
    'Progreso: peso, grasa y cintura de cada consulta, logros y "compartir mis avances".',
    'Mi clínica: agenda con anticipo (tarjeta de prueba ya llena) o con tu paquete, receta del médico, tu tratamiento dental con saldo y abonos, y sube tus estudios.',
  ],
  recepcion: [
    'La agenda de los tres doctores en columnas, en vivo: los pacientes llegan a sala y pasan a consulta solos.',
    'Toca una cita: recordatorio por WhatsApp, "Llegó", cobrar (y ofrecer paquete de nutrición), reprogramar o cancelar.',
    'Cancela una cita de la mañana con la Nut. Andrea: el espacio se le ofrece a la lista de espera y en unos segundos se llena solo (sale como "recuperada").',
    '"Recordar a N de mañana" manda los recordatorios; las confirmaciones por WhatsApp van llegando.',
    'Nueva cita: busca al paciente o dalo de alta ahí mismo.',
  ],
  doctor: [
    'Arriba eliges quién eres: Andrea (nutrición), Dr. Navarro (médico) o Dra. Ríos (dentista).',
    'Andrea · Radar: a quién darle seguimiento primero (pidió ajuste, check-in difícil, días sin registrar, cita sin confirmar).',
    'Expediente de Sofía: responde su solicitud autorizando una receta nueva, captura la medición de hoy, edita su plan o pide al copiloto un borrador de semana sin lactosa y apruébalo.',
    'Notas de consulta → "Preparar resumen": junta tus notas, mediciones y su check-in; lo revisas y lo compartes a su app.',
    'Dr. Navarro: signos vitales, diagnóstico CIE-10 y receta con cédula, imprimible y que llega a la app de la paciente ("Llenar ejemplo" para ir rápido).',
    'Dra. Ríos: toca un diente del odontograma, marca caries y agrega la resina al presupuesto; márcala hecha y el diente cambia de color.',
  ],
  dueno: [
    'Ingresos de 30 días por especialidad, contra los 30 anteriores.',
    'Ocupación de la agenda de cada doctor y cuántos no asistieron (lo que no entró).',
    'De dónde llegan las citas: en línea, WhatsApp, recepción o lista de espera.',
    'Agenda que se salvó con la lista de espera y lo que falta por cobrar en tratamientos dentales.',
    'Pacientes que no han vuelto, con su mensaje listo para invitarlos de regreso.',
  ],
};

export default function ClinicaDemo() {
  const [rol, setRol] = useState(() => {
    const r = new URLSearchParams(window.location.search).get('rol');
    return ROLES.some((x) => x.id === r) ? r : 'sitio';
  });
  const [guia, setGuia] = useState(false);
  const pc = usePantallaCompleta();
  const instalada = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const app = pc.activa || instalada;
  const encabezado = useRef(null);
  const [alto, setAlto] = useState(70);

  useLayoutEffect(() => {
    const el = encabezado.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setAlto(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => { if (app) setGuia(false); }, [app]);
  useEffect(() => {
    document.title = `${NEGOCIO.completo} · Demo`;
    if (document.getElementById('fuentes-clinica')) return;
    const link = document.createElement('link');
    link.id = 'fuentes-clinica'; link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..600;1,9..144,300..600&family=Figtree:wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
  }, []);
  useEffect(() => {
    const antes = document.body.style.background;
    document.body.style.background = '#F3F1EC';
    return () => { document.body.style.background = antes; };
  }, []);
  // los demás pacientes y el resto de la clínica
  useEffect(() => {
    let id;
    const paso = () => {
      if (!document.hidden && soyLider()) simular();
      id = setTimeout(paso, 8000 + Math.random() * 7000);
    };
    id = setTimeout(paso, 4000);
    return () => clearTimeout(id);
  }, []);

  const mensaje = 'Hola KaiZen, vi la demo de la clínica (nutrición, médico y dentista) y me interesa para mi consultorio.';
  return (
    <div className={`cl ${app ? 'cl-modo-app' : ''}`} style={{ '--cl-barra': `${app ? 0 : alto}px` }}>
      <div ref={encabezado} className="cl-barra-demo">
        <BarraDemo roles={ROLES} rol={rol} alCambiar={(r) => { setRol(r); window.scrollTo({ top: 0 }); }}
          guiaAbierta={guia} alGuia={() => setGuia((x) => !x)}
          aviso="Demostración · clínica y pacientes de ejemplo · por KaiZen" />
      </div>
      {guia && (
        <aside className="cl-guia" style={{ top: alto + 4, maxHeight: `calc(100vh - ${alto + 24}px)`, fontFamily: KAIZEN.texto }}>
          <p className="cl-guia-rol">Guía · {ROLES.find((r) => r.id === rol).etiqueta}</p>
          <p className="cl-guia-titulo" style={{ fontFamily: KAIZEN.display }}>Qué probar <em>aquí</em></p>
          <ol>{GUIA[rol].map((p, i) => <li key={p}><span>{String(i + 1).padStart(2, '0')}</span>{p}</li>)}</ol>
          <p className="cl-guia-nota">Todo funciona de verdad en este navegador. Abre Paciente y Doctor en dos pestañas y se mueven juntos. La "IA" de la demo es simulada.</p>
          <a className="cl-guia-boton" href={`https://wa.me/${KAIZEN.whatsapp}?text=${encodeURIComponent(mensaje)}`} target="_blank" rel="noreferrer"><MessageCircle size={17} /> Quiero esto para mi consultorio</a>
          <button type="button" className="cl-guia-boton claro" onClick={() => { reiniciarDemo(); window.location.reload(); }}><RotateCcw size={16} /> Reiniciar la demo</button>
        </aside>
      )}
      {rol === 'sitio' && <Sitio alVer={(r) => { setRol(r); window.scrollTo({ top: 0 }); }} />}
      {/* la app de la paciente se queda montada: regresa donde estaba */}
      <div hidden={rol !== 'paciente'}><Paciente /></div>
      {rol === 'recepcion' && <Recepcion />}
      {rol === 'doctor' && <Doctor />}
      {rol === 'dueno' && <Dueno />}
      <AvisoListo />
    </div>
  );
}
