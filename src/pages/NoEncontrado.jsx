import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, MessageCircle } from 'lucide-react';
import { ESTUDIO } from '../config/estudio';

// Pantalla para cualquier dirección que no existe. Antes de esto, una URL mal
// escrita o cortada dejaba la pantalla EN BLANCO: quien recibía su boleto por
// correo y lo reenviaba a medias por WhatsApp creía que se le había perdido.
const PRIMARY = '#FF914D';
const MAUVE = '#E07A9C';
const LOGO = 'https://fifaowaiokauhuqklzwe.supabase.co/storage/v1/object/public/wallet-passes/befit-mark.png';
const WHATSAPP = 'https://wa.me/522212664253';

export default function NoEncontrado() {
  return (
    <div style={{ minHeight: '100vh', background: '#FDFBF7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '28px', fontFamily: 'var(--font-body)' }}>
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
        style={{ width: 'min(420px, 100%)', textAlign: 'center' }}>

        <div style={{ width: '78px', height: '78px', borderRadius: '26px', background: `linear-gradient(135deg, ${PRIMARY}, ${MAUVE})`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px', boxShadow: '0 14px 32px rgba(255,145,77,0.32)' }}>
          <img src={LOGO} alt={ESTUDIO.nombre} width="40" style={{ width: '40px', height: 'auto' }} />
        </div>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', color: '#2D2928', margin: '0 0 10px', lineHeight: 1.2 }}>
          Esta página no existe
        </h1>
        <p style={{ margin: '0 0 8px', color: '#6B615B', fontSize: '1rem', lineHeight: 1.6 }}>
          Puede que el link esté incompleto o que te lo hayan reenviado cortado.
        </p>
        <p style={{ margin: '0 0 28px', color: '#8A7F78', fontSize: '0.9rem', lineHeight: 1.6 }}>
          Si buscabas tu boleto de un evento, revisa que el correo traiga el link completo,
          o escríbenos y te lo reenviamos.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Link to="/"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px', padding: '15px', borderRadius: '16px', textDecoration: 'none', fontWeight: 800, fontSize: '0.96rem', color: '#fff', background: PRIMARY, boxShadow: '0 10px 24px rgba(255,145,77,0.3)' }}>
            <Home size={18} /> Ir al inicio
          </Link>
          <a href={WHATSAPP} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px', padding: '15px', borderRadius: '16px', textDecoration: 'none', fontWeight: 700, fontSize: '0.94rem', color: '#2D2928', background: 'rgba(0,0,0,0.05)' }}>
            <MessageCircle size={18} color={PRIMARY} /> Escribirnos por WhatsApp
          </a>
        </div>
      </motion.div>
    </div>
  );
}
