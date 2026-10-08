import React, { useState, useEffect } from 'react';
import { Camera, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

// Recordatorio para tomar fotos de progreso, en la pestaña RESUMEN.
//
// Por qué existe: el wizard de fotos está construido desde junio y funciona, pero
// a septiembre sólo UNA socia tiene dos tomas. El problema nunca fue la función,
// es que la única invitación a usarla ("Aún no tienes fotos…") vive DENTRO de la
// pestaña Fotos — o sea que sólo la ve quien ya decidió entrar. Este aviso la
// mueve a Resumen, que es la pestaña que abre todo mundo.
//
// Y es urgente por una razón de calendario: un "antes" sólo sirve si se toma
// antes. Una primera foto tomada en diciembre no se puede comparar con nada.
//
// Deliberadamente NO promete ninguna función futura (el cierre de año todavía no
// está confirmado por la dueña). Habla sólo de lo que la app ya hace hoy:
// comparar dos tomas lado a lado.

const SNOOZE_KEY = 'befit_progreso_recordatorio_visto';
const SNOOZE_DIAS = 14;   // al cerrarlo, no vuelve a molestar en dos semanas
const CADA_DIAS = 42;     // 6 semanas, el ritmo que ya recomienda la pestaña Fotos

const diasDesde = (fecha) => Math.floor((Date.now() - new Date(fecha).getTime()) / 86400000);

// Se pospuso hace poco? Se lee en try/catch porque en modo privado de Safari
// `localStorage` puede lanzar, y esto es un adorno: nunca debe tumbar Evolución.
const estaPospuesto = () => {
  try {
    const guardado = localStorage.getItem(SNOOZE_KEY);
    return !!guardado && diasDesde(guardado) < SNOOZE_DIAS;
  } catch {
    return false;
  }
};

export default function RecordatorioProgreso({ userId, onIrAFotos }) {
  const [motivo, setMotivo] = useState(null);   // 'primera' | 'actualizar' | null
  const [diasUltima, setDiasUltima] = useState(0);
  const [cerrado, setCerrado] = useState(false);

  useEffect(() => {
    if (!userId || estaPospuesto()) return;
    let vivo = true;

    (async () => {
      try {
        // Sólo la última toma: no hace falta bajar el historial completo para
        // decidir si se muestra una tarjeta.
        const { data } = await supabase
          .from('progress_photos')
          .select('taken_at')
          .eq('user_id', userId)
          .order('taken_at', { ascending: false })
          .limit(1);

        if (!vivo) return;

        if (!data?.length) {
          setMotivo('primera');
          return;
        }
        const dias = diasDesde(data[0].taken_at);
        if (dias >= CADA_DIAS) {
          setDiasUltima(dias);
          setMotivo('actualizar');
        }
      } catch (err) {
        console.error('Error revisando fotos de progreso:', err);
      }
    })();

    return () => { vivo = false; };
  }, [userId]);

  const posponer = (e) => {
    e.stopPropagation();
    try { localStorage.setItem(SNOOZE_KEY, new Date().toISOString()); } catch { /* da igual */ }
    setCerrado(true);
  };

  if (!motivo || cerrado) return null;

  const semanas = Math.floor(diasUltima / 7);
  const titulo = motivo === 'primera'
    ? 'Tómate tu primera foto'
    : `Van ${semanas} semanas desde tu última foto`;
  const texto = motivo === 'primera'
    ? 'La de hoy es tu «antes». En unas semanas vas a querer tener con qué compararte.'
    : 'Buen momento para la siguiente toma y verlas lado a lado.';

  return (
    <AnimatePresence>
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
        transition={{ duration: 0.4 }}
        onClick={onIrAFotos}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onIrAFotos?.(); } }}
        style={{
          position: 'relative', cursor: 'pointer', marginBottom: '18px',
          display: 'flex', alignItems: 'center', gap: '14px',
          padding: '16px 44px 16px 16px', borderRadius: '22px',
          background: 'linear-gradient(135deg, rgba(255,145,77,0.13), rgba(230,130,69,0.07))',
          border: '1px solid rgba(255,145,77,0.28)',
          boxShadow: '0 8px 22px rgba(255,145,77,0.12)'
        }}
      >
        <div style={{
          flexShrink: 0, width: '44px', height: '44px', borderRadius: '14px',
          display: 'grid', placeItems: 'center',
          background: 'linear-gradient(135deg, #FF914D, #E68245)',
          boxShadow: '0 6px 16px rgba(255,145,77,0.35)'
        }}>
          <Camera size={21} color="#fff" />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: '0 0 3px', fontSize: '0.92rem', fontWeight: 800, color: 'var(--on-surface)', lineHeight: 1.25 }}>
            {titulo}
          </p>
          <p style={{ margin: 0, fontSize: '0.79rem', color: 'var(--on-surface-variant)', lineHeight: 1.4 }}>
            {texto}
          </p>
        </div>

        <ChevronRight size={18} style={{ flexShrink: 0, color: '#E68245', opacity: 0.8 }} />

        <button
          onClick={posponer}
          aria-label="Ocultar por ahora"
          style={{
            position: 'absolute', top: '8px', right: '8px',
            width: '26px', height: '26px', borderRadius: '50%',
            display: 'grid', placeItems: 'center', cursor: 'pointer',
            border: 'none', background: 'transparent', color: 'var(--on-surface-variant)', opacity: 0.55
          }}
        >
          <X size={14} />
        </button>
      </motion.section>
    </AnimatePresence>
  );
}
