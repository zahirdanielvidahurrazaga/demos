import React from 'react';
import Admin from './Admin';

// Pantalla del mostrador (rol RECEPCION, también accesible para ADMIN).
// Reutiliza el panel de Admin en "modo recepción": solo expone las pestañas
// del mostrador — Control de acceso (lector QR), Clases y Ventas (inscribir
// clienta + cobro de membresía). El resto de la gestión queda oculto.
export default function Recepcion() {
  return <Admin recepcion />;
}
