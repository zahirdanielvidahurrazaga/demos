// ─────────────────────────────────────────────────────────────────────────────
// PEDIDOS EN LÍNEA — datos compartidos de la maqueta (/pedidos/<negocio>)
//
// Todo sale de la base de DEMOSTRACIONES (supabase/demos/10_pedidos.sql):
// menú, precios y órdenes. Aquí solo hay lectura y suscripciones; las órdenes
// se crean y avanzan por las funciones de la base, que validan precio y rol.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

export const pesos = (n) => `$${Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 2 })}`;

export const MODALIDADES = {
  recoger: { etiqueta: 'Para llevar', corta: 'Para llevar' },
  mesa: { etiqueta: 'En mesa', corta: 'Mesa' },
  domicilio: { etiqueta: 'A domicilio', corta: 'Domicilio' },
};

export const ESTADOS = {
  pendiente_pago: 'Esperando pago',
  recibido: 'Recibido',
  preparando: 'Preparando',
  listo: 'Listo',
  en_camino: 'En camino',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

// Los pasos que ve el cliente cambian según cómo pidió.
export function pasosDe(modalidad) {
  if (modalidad === 'domicilio') {
    return [['recibido', 'Recibido'], ['preparando', 'Preparando'], ['en_camino', 'En camino'], ['entregado', 'Entregado']];
  }
  return [
    ['recibido', 'Recibido'], ['preparando', 'Preparando'],
    ['listo', modalidad === 'mesa' ? 'Va a tu mesa' : 'Listo para recoger'], ['entregado', 'Entregado'],
  ];
}

export function modalidadDe(o) {
  if (o.modalidad === 'mesa') return `Mesa ${o.mesa}`;
  if (o.modalidad === 'domicilio') return 'A domicilio';
  if (o.hora_programada) {
    return `Para llevar · ${new Date(o.hora_programada).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' })}`;
  }
  return 'Para llevar';
}

export const minutosDesde = (fecha, ahora = Date.now()) => Math.max(0, Math.floor((ahora - new Date(fecha).getTime()) / 60000));

export function errorLegible(error) {
  const m = error?.message || String(error || '');
  return m.replace(/^.*?ERROR:\s*/, '') || 'Algo salió mal. Intenta de nuevo.';
}

// ¿Qué grupos de opciones aplican a un producto?
export const gruposDe = (producto, grupos) => grupos.filter((g) =>
  (producto.categoria_id && g.categorias?.includes(producto.categoria_id)) || g.productos?.includes(producto.id));

// Menú completo del negocio, al día (el dueño marca agotados y se ve en vivo).
export function useMenu(negocio) {
  const [menu, setMenu] = useState(null);
  const cargar = useCallback(async () => {
    const [c, p, g, o] = await Promise.all([
      supabase.from('pedidos_categorias').select('*').eq('negocio', negocio).order('orden'),
      supabase.from('pedidos_productos').select('*').eq('negocio', negocio).order('orden'),
      supabase.from('pedidos_grupos').select('*').eq('negocio', negocio).order('orden'),
      supabase.from('pedidos_opciones').select('*').eq('negocio', negocio).order('orden'),
    ]);
    // Si falla cualquier consulta se queda el último menú bueno: publicar listas
    // vacías haría que el carrito tirara todo como "ya no disponible".
    if (c.error || p.error || g.error || o.error) return;
    setMenu({ categorias: c.data, productos: p.data, grupos: g.data, opciones: o.data });
  }, [negocio]);

  useEffect(() => {
    cargar();
    const canal = supabase.channel(`pedidos-menu-${negocio}-${Math.random().toString(36).slice(2, 7)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos_productos', filter: `negocio=eq.${negocio}` }, cargar)
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [negocio, cargar]);

  return { menu, recargar: cargar };
}

// Órdenes visibles para la sesión (la base filtra: el cliente ve las suyas y
// el personal todas las del negocio), con cambios en tiempo real.
export function useOrdenes(negocio, { desde } = {}) {
  const [ordenes, setOrdenes] = useState(null);
  const cargar = useCallback(async () => {
    let q = supabase.from('pedidos_ordenes').select('*').eq('negocio', negocio)
      .order('created_at', { ascending: false }).limit(200);
    if (desde) q = q.gte('created_at', desde);
    const { data } = await q;
    setOrdenes(data || []);
  }, [negocio, desde]);

  useEffect(() => {
    cargar();
    const canal = supabase.channel(`pedidos-ordenes-${negocio}-${Math.random().toString(36).slice(2, 7)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos_ordenes', filter: `negocio=eq.${negocio}` }, cargar)
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [negocio, cargar]);

  return { ordenes, recargar: cargar };
}

// Reloj que avanza cada `ms` (para los minutos de espera en la cocina).
export function useAhora(ms = 30000) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return ahora;
}
