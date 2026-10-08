import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarDays, MapPin, CheckCircle2 } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '../lib/supabase';
import { ESTUDIO } from '../config/estudio';

// Boleto de un invitado (el link del correo). No requiere sesión: lo resuelve el
// RPC `get_ticket`, que solo devuelve los datos del boleto que ya trae en la mano.
const PRIMARY = '#FF914D';
const MAUVE = '#E07A9C';
// El durazno de la marca en blanco (el mismo del correo y del pase de Wallet).
const LOGO = 'https://fifaowaiokauhuqklzwe.supabase.co/storage/v1/object/public/wallet-passes/befit-mark.png';

const fmtFecha = (iso) => iso
  ? new Date(iso).toLocaleString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })
  : '';

export default function Boleto() {
  const { code } = useParams();
  const [ticket, setTicket] = useState(undefined); // undefined = cargando, null = no existe

  useEffect(() => {
    window.scrollTo(0, 0);
    (async () => {
      const { data } = await supabase.rpc('get_ticket', { p_code: code });
      setTicket(data?.[0] ?? null);
    })();
  }, [code]);

  if (ticket === undefined) {
    return <div style={wrap}><p style={{ color: '#6B615B' }}>Cargando tu boleto…</p></div>;
  }
  if (ticket === null) {
    return (
      <div style={wrap}>
        <div style={{ textAlign: 'center', maxWidth: '340px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', color: '#2D2928', fontSize: '1.5rem' }}>No encontramos este boleto</h1>
          <p style={{ color: '#6B615B', lineHeight: 1.6 }}>Revisa que el código esté completo. Si lo compraste y no aparece, escríbenos por WhatsApp al {ESTUDIO.contacto.telefono}.</p>
          <Link to="/" style={{ color: PRIMARY, fontWeight: 700 }}>Ir a {ESTUDIO.nombre} →</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...wrap, alignItems: 'flex-start', padding: '40px 20px' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        style={{ width: '100%', maxWidth: '380px', background: '#fff', borderRadius: '28px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.12)' }}>
        {/* Encabezado de marca */}
        <div style={{ background: `linear-gradient(135deg, ${PRIMARY}, ${MAUVE})`, padding: '26px 24px', textAlign: 'center' }}>
          <img src={LOGO} alt={ESTUDIO.nombre} width="38"
            style={{ display: 'block', width: '38px', height: 'auto', margin: '0 auto 10px' }} />
          <div style={{ fontSize: '0.64rem', fontWeight: 800, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: '6px' }}>{ESTUDIO.nombre}</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: '#fff', margin: 0, lineHeight: 1.15 }}>{ticket.event_title}</h1>
        </div>

        {/* Datos */}
        <div style={{ padding: '22px 24px 8px' }}>
          {ticket.event_date && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', color: '#5C534E', fontSize: '0.92rem', fontWeight: 600, marginBottom: '8px' }}>
              <CalendarDays size={16} color={PRIMARY} /> {fmtFecha(ticket.event_date)}
            </div>
          )}
          {ticket.event_location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', color: '#5C534E', fontSize: '0.92rem', fontWeight: 600 }}>
              <MapPin size={16} color={PRIMARY} /> {ticket.event_location}
            </div>
          )}
        </div>

        {/* Perforado */}
        <div style={{ position: 'relative', height: '26px', margin: '14px 0 0' }}>
          <div style={{ position: 'absolute', left: '-13px', top: '0', width: '26px', height: '26px', borderRadius: '50%', background: '#FDFBF7' }} />
          <div style={{ position: 'absolute', right: '-13px', top: '0', width: '26px', height: '26px', borderRadius: '50%', background: '#FDFBF7' }} />
          <div style={{ position: 'absolute', left: '20px', right: '20px', top: '13px', borderTop: '2px dashed rgba(0,0,0,0.1)' }} />
        </div>

        {/* QR */}
        <div style={{ padding: '10px 24px 28px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#B0846A' }}>A nombre de</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#2D2928', margin: '3px 0 18px' }}>{ticket.holder_name}</div>

          {ticket.checked_in ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', padding: '14px 20px', borderRadius: '16px', background: 'rgba(34,197,94,0.1)', color: '#16A34A', fontWeight: 700 }}>
              <CheckCircle2 size={20} /> Ya entraste al evento
            </div>
          ) : (
            <>
              <QRCodeCanvas value={ticket.ticket_code} size={190} level="M" />
              <div style={{ fontFamily: 'monospace', fontSize: '1.7rem', fontWeight: 800, letterSpacing: '0.18em', color: PRIMARY, marginTop: '14px' }}>
                {ticket.ticket_code}
              </div>
              <p style={{ margin: '14px 0 0', fontSize: '0.82rem', color: '#8A7F78', lineHeight: 1.5 }}>
                Muestra este código en la entrada.<br />Si no carga el QR, basta con dictar el código.
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

const wrap = {
  minHeight: '100vh', background: '#FDFBF7', display: 'flex',
  alignItems: 'center', justifyContent: 'center', padding: '24px',
  fontFamily: 'var(--font-body)',
};
