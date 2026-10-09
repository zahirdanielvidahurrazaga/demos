import { useState } from 'react';
import {
  Award, BarChart3, Cake, CalendarDays, ClipboardCheck, Coffee, DollarSign, History, LayoutDashboard, ListChecks,
  QrCode, Salad, Scale, ScanLine, Share2, Sparkles, Tag, Ticket, TrendingUp, UserCog,
} from 'lucide-react';
import Panel from './Panel';
import Mostrador from './Mostrador';
import Coach from './Coach';
import Barra from './Barra';
import Direccion, { SeccionBeFit } from './Direccion';
import { moduloActivo } from '../../../config/estudio';

// Paneles del equipo de Studio Alma. Cada rol con sus secciones; los que aún
// no tienen panel propio siguen con la pantalla de Be Fit (ver Demo.jsx).
const PANELES = {
  recepcion: {
    nombre: 'Mostrador',
    secciones: [
      { id: 'escanear', texto: 'Control de acceso', Icono: ScanLine },
      { id: 'clases', texto: 'Clases de hoy', Icono: ListChecks },
      { id: 'ventas', texto: 'Ventas', Icono: DollarSign },
    ],
    // Ventas (inscribir y cobrar) es la de Be Fit, con la piel de Alma.
    Contenido: ({ seccion }) => (seccion === 'ventas' ? <SeccionBeFit seccion="ventas" recepcion /> : <Mostrador seccion={seccion} />),
  },
  coach: {
    nombre: 'Coach',
    secciones: [
      { id: 'dia', texto: 'Mi día', Icono: CalendarDays },
      { id: 'pase', texto: 'Mi pase', Icono: QrCode },
      { id: 'historias', texto: 'Historias', Icono: Share2 },
    ],
    Contenido: Coach,
  },
  barista: {
    nombre: 'Barra',
    secciones: [
      { id: 'pedidos', texto: 'Pedidos', Icono: Coffee },
      { id: 'historial', texto: 'Historial', Icono: History },
    ],
    Contenido: Barra,
  },
  admin: {
    nombre: 'Dirección',
    // Mismas secciones que el menú de Admin.jsx (con sus módulos), más "Hoy".
    secciones: [
      { id: 'hoy', texto: 'Hoy', Icono: LayoutDashboard },
      { id: 'mostrador', texto: 'Mostrador QR', Icono: ScanLine },
      { id: 'clases', texto: 'Clases', Icono: CalendarDays },
      { id: 'ventas', texto: 'Ventas', Icono: DollarSign },
      { id: 'reportes', texto: 'Reportes', Icono: BarChart3 },
      { id: 'clientas', texto: 'Clientas', Icono: UserCog },
      { id: 'asistencias', texto: 'Pase de lista', Icono: ClipboardCheck },
      { id: 'membresias', texto: 'Membresías', Icono: Tag },
      { id: 'progreso', texto: 'Progreso', Icono: TrendingUp, modulo: 'evolucion' },
      { id: 'nutricion', texto: 'Nutrición', Icono: Salad, modulo: 'nutricion' },
      { id: 'cafeteria', texto: 'Cafetería', Icono: Coffee, modulo: 'cafeteria' },
      { id: 'eventos', texto: 'Eventos', Icono: Ticket, modulo: 'eventos' },
      { id: 'disciplinas', texto: 'Disciplinas', Icono: Sparkles },
      { id: 'insignias', texto: 'Insignias', Icono: Award, modulo: 'insignias' },
      { id: 'cumpleanos', texto: 'Cumpleaños', Icono: Cake, modulo: 'cumpleanos' },
      { id: 'auditoria', texto: 'Auditoría', Icono: Scale },
    ],
    Contenido: Direccion,
  },
};

export default function Equipo({ cfg, rol, altoEncabezado }) {
  const p = PANELES[rol];
  const secciones = p.secciones.filter((x) => !x.modulo || moduloActivo(x.modulo));
  const [seccion, setSeccion] = useState(secciones[0].id);
  return (
    <Panel cfg={cfg} rol={p.nombre} secciones={secciones} activa={seccion} alCambiar={(id) => { setSeccion(id); window.scrollTo({ top: 0 }); }} altoEncabezado={altoEncabezado}>
      <p.Contenido seccion={seccion} />
    </Panel>
  );
}

Equipo.roles = Object.keys(PANELES);
