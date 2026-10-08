import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { CODIGO_DEMO } from '../demo/supabaseDemo';

// Candado de la pestaña Reportes: la cuenta de admin la usan varias personas del
// mostrador y los números del negocio son solo de la dueña.
//
// La clave NO vive en el código: se compara en el servidor (RPC `verify_admin_code`,
// hash bcrypt en una tabla que nadie puede leer por la API). Si estuviera aquí,
// cualquiera que abra el JavaScript del sitio la leería.
//
// Se pide CADA VEZ que se entra a la pestaña: el componente se desmonta al
// cambiar de sección, así que el estado se pierde a propósito (nada se guarda
// en el navegador). Mientras estén dentro de Reportes no se vuelve a pedir.
const PRIMARY = '#FF914D';
const INK = '#1A1C1E';

export default function ReportesLock({ children }) {
  const { esDemo } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [verificando, setVerificando] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { if (!abierto) setTimeout(() => inputRef.current?.focus(), 300); }, [abierto]);

  const entrar = async (e) => {
    e?.preventDefault();
    if (!code.trim() || verificando) return;
    setVerificando(true); setError('');
    const { data, error: rpcError } = await supabase.rpc('verify_admin_code', {
      p_scope: 'reports_passcode', p_code: code.trim(),
    });
    setVerificando(false);
    if (rpcError) { setError('No se pudo verificar. Revisa tu conexión.'); return; }
    if (data === true) {
      setAbierto(true);
    } else {
      setError('Clave incorrecta.');
      setCode('');
      inputRef.current?.focus();
    }
  };

  if (abierto) return children;

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 20px' }}>
      <div style={{ width: 'min(400px, 100%)', textAlign: 'center' }}>
        <div style={{ width: '68px', height: '68px', borderRadius: '22px', background: 'linear-gradient(135deg, #FF914D, #E68245)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', boxShadow: '0 12px 28px rgba(255,145,77,0.35)' }}>
          <Lock size={30} color="#fff" />
        </div>
        <h2 style={{ margin: '0 0 8px', fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: INK }}>Reportes protegidos</h2>
        <p style={{ margin: '0 0 24px', color: 'var(--on-surface-variant)', fontSize: '0.95rem', lineHeight: 1.55 }}>
          Esta sección tiene los números del negocio. Escribe la clave para entrar.
        </p>

        {/* En la maqueta de venta la clave se enseña: nadie va a adivinarla, y
            si el candado no abre, la prospecta nunca ve Reportes.
            Va detrás de la bandera de compilación para que ni el texto exista
            en el build del estudio cliente. */}
        {import.meta.env.VITE_DEMOS === 'true' && esDemo && (
          <p style={{
            margin: '-14px 0 22px', padding: '10px 14px', borderRadius: '12px',
            background: 'var(--accent)', color: 'var(--on-surface)',
            fontSize: '0.9rem', fontWeight: 600,
          }}>
            Clave de la demostración: <strong>{CODIGO_DEMO}</strong>
          </p>
        )}

        <form onSubmit={entrar}>
          <input ref={inputRef} type="password" value={code} autoComplete="off"
            onChange={(e) => { setCode(e.target.value); setError(''); }}
            placeholder="Clave de acceso"
            style={{ width: '100%', padding: '15px 17px', borderRadius: '15px', fontSize: '1rem', textAlign: 'center', letterSpacing: '0.14em', border: `1.5px solid ${error ? '#ba1a1a' : 'rgba(0,0,0,0.12)'}`, background: '#fff', color: INK, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />

          {error && <p style={{ margin: '10px 0 0', color: '#ba1a1a', fontSize: '0.86rem', fontWeight: 600 }}>{error}</p>}

          <button type="submit" disabled={!code.trim() || verificando}
            style={{ width: '100%', marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px', padding: '15px', borderRadius: '15px', border: 'none', cursor: code.trim() && !verificando ? 'pointer' : 'default', fontWeight: 800, fontSize: '0.96rem', color: '#fff', background: PRIMARY, boxShadow: '0 10px 24px rgba(255,145,77,0.32)', opacity: code.trim() && !verificando ? 1 : 0.55 }}>
            {verificando
              ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Verificando…</>
              : <>Entrar <ArrowRight size={18} /></>}
          </button>
        </form>

        <p style={{ margin: '18px 0 0', fontSize: '0.78rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>
          Se pide cada vez que entras a Reportes.
        </p>
      </div>
    </motion.div>
  );
}
