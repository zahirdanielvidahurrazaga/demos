import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarDays, MapPin, Ticket, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import BrandSpheres from './BrandSpheres';

// Sección "Próximo evento" del sitio público. Solo aparece si hay un evento con
// inscripción abierta; si no, el landing se ve igual que siempre.
const PRIMARY = '#FF914D';
const MAUVE = '#E07A9C';

const fmtFecha = (iso) => iso
  ? new Date(iso).toLocaleString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })
  : null;
const yaPaso = (iso) => iso && new Date(iso).getTime() < Date.now() - 3 * 3600000;

export default function LandingEvento() {
  const [ev, setEv] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('events').select('*')
        .eq('registration_open', true)
        .order('event_date', { ascending: true, nullsFirst: false })
        .limit(4);
      const proximo = (data || []).find((e) => !yaPaso(e.event_date));
      if (proximo) setEv(proximo);
    })();
  }, []);

  if (!ev) return null;

  const libres = ev.capacity == null ? null : Math.max(0, ev.capacity - (ev.registered_count ?? 0));
  const agotado = libres === 0;

  return (
    <section id="eventos" style={{ padding: '8rem 5%', background: '#FFF8F4', position: 'relative', overflow: 'hidden' }}>
      {/* Esferas de la marca */}
      <BrandSpheres />

      <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }} transition={{ type: 'spring', stiffness: 200, damping: 28 }}
          className="evento-grid"
          style={{
            display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '0',
            borderRadius: '32px', overflow: 'hidden',
            background: 'rgba(255,255,255,0.72)',
            backdropFilter: 'blur(26px) saturate(180%)',
            WebkitBackdropFilter: 'blur(26px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.75)',
            boxShadow: '0 24px 60px rgba(184,120,80,0.16), inset 0 1px 0 rgba(255,255,255,0.9)',
          }}>
          {/* Flyer */}
          {ev.image_url && (
            <div style={{ position: 'relative', minHeight: '280px', background: '#F3E6DC' }}>
              <img src={ev.image_url} alt={ev.title} loading="lazy"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}

          {/* Datos + CTA */}
          <div style={{ padding: 'clamp(2rem, 4vw, 3.2rem)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ marginBottom: '0.9rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: PRIMARY, textTransform: 'uppercase', letterSpacing: '0.16em' }}>
                Próximo evento
              </span>
            </div>

            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4.5vw, 3rem)', color: 'var(--on-surface)', margin: '0 0 1.2rem', lineHeight: 1.05 }}>
              {ev.title}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', marginBottom: '1.6rem' }}>
              {ev.event_date && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '11px', color: 'var(--on-surface)', fontSize: '1rem', fontWeight: 500 }}>
                  <CalendarDays size={18} color={PRIMARY} /> {fmtFecha(ev.event_date)}
                </span>
              )}
              {ev.location && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '11px', color: 'var(--on-surface)', fontSize: '1rem', fontWeight: 500 }}>
                  <MapPin size={18} color={PRIMARY} /> {ev.location}
                </span>
              )}
              {libres != null && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '11px', color: agotado ? '#ba1a1a' : 'var(--on-surface)', fontSize: '1rem', fontWeight: agotado ? 700 : 500 }}>
                  <Users size={18} color={agotado ? '#ba1a1a' : PRIMARY} />
                  {agotado ? 'Agotado' : `Quedan ${libres} de ${ev.capacity} lugares`}
                </span>
              )}
            </div>

            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.98rem', lineHeight: 1.6, margin: '0 0 2rem', maxWidth: '46ch' }}>
              Abierto a todos, seas socia o no. Aparta tu lugar en línea y trae a quien quieras.
            </p>

            {/* Botón con forma de talón de boleto: acción + precio troquelados */}
            <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.985 }} transition={{ type: 'spring', stiffness: 400, damping: 22 }} style={{ alignSelf: 'flex-start' }}>
              <Link to={`/evento/${ev.slug || ev.id}`}
                style={{
                  display: 'inline-flex', alignItems: 'stretch', textDecoration: 'none',
                  borderRadius: '100px', overflow: 'hidden', color: '#fff',
                  background: `linear-gradient(120deg, ${PRIMARY} 0%, #F2855F 55%, ${MAUVE} 130%)`,
                  boxShadow: '0 14px 30px rgba(255,145,77,0.32)',
                }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '1.05rem 1.5rem 1.05rem 1.9rem', fontWeight: 700, fontSize: '1rem', letterSpacing: '0.01em' }}>
                  <Ticket size={19} /> {agotado ? 'Ver el evento' : 'Aparta tu lugar'}
                </span>
                {!agotado && (
                  <span style={{
                    display: 'flex', alignItems: 'center', padding: '1.05rem 1.9rem',
                    fontWeight: 800, fontSize: '1.05rem', fontFamily: 'var(--font-display)',
                    borderLeft: '2px dashed rgba(255,255,255,0.5)', background: 'rgba(0,0,0,0.07)',
                  }}>
                    ${ev.price}
                  </span>
                )}
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .evento-grid { grid-template-columns: 0.85fr 1fr !important; }
        }
      `}</style>
    </section>
  );
}
