import { useRef, useState } from 'react';
import { Check, CreditCard, Loader2, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { a, vidrio } from './estilo';
import { Aviso, Boton, Chip, Hoja, TarjetaTinta } from './ui';
import { fechaLarga } from './datos';

// Comprar o renovar plan con la pasarela de prueba (sin Stripe, no mueve
// dinero). El servidor hace lo mismo que el webhook: ver
// supabase/demos/30_alma_compra_plan.sql (demo_comprar_plan).
const TARJETAS = [['4242 4242 4242 4242', 'Aprobada'], ['4000 0000 0000 0002', 'Rechazada']];
const ERRORES = {
  TARJETA_RECHAZADA: 'El banco rechazó la tarjeta (es la tarjeta de prueba de rechazo).',
  TARJETA_INCOMPLETA: 'El número de tarjeta está incompleto.',
  PLAN_NO_EXISTE: 'Ese plan ya no está disponible.',
};

export default function Planes({ abierta, alCerrar }) {
  const { plans, plan: planActual, refreshUserData, fetchNotifications, user } = useAuth();
  const [elegido, setElegido] = useState(null);
  const [tarjeta, setTarjeta] = useState(TARJETAS[0][0]);
  const [pagando, setPagando] = useState(false);
  const [error, setError] = useState('');
  const [listo, setListo] = useState(null);
  const intento = useRef(0);

  const cerrar = () => { intento.current += 1; setElegido(null); setError(''); setListo(null); setPagando(false); alCerrar(); };

  const pagar = async () => {
    const mio = ++intento.current;
    setPagando(true);
    setError('');
    const { data, error: e } = await supabase.rpc('demo_comprar_plan', { p_plan: elegido.name, p_tarjeta: tarjeta });
    // El saldo se refresca aunque ya hayan cerrado la hoja; la pantalla, solo si sigue siendo este intento.
    if (!e) { refreshUserData?.(); if (user?.id) fetchNotifications?.(user.id); }
    if (mio !== intento.current) return;
    setPagando(false);
    if (e) {
      const clave = Object.keys(ERRORES).find((k) => e.message?.includes(k));
      setError(ERRORES[clave] || 'No se pudo cobrar. Inténtalo de nuevo.');
      return;
    }
    setListo(data);
  };

  return (
    <Hoja abierta={abierta} alCerrar={cerrar} titulo="Planes">
      <div style={{ padding: '34px 20px 26px' }}>
        {listo ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <span style={{ width: 72, height: 72, borderRadius: '50%', background: a.tinta, color: a.sobreTinta, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', animation: 'alma-insignia .6s ease both' }}>
              <Check size={34} />
            </span>
            <div style={{ fontSize: '1.6rem', fontWeight: 300, letterSpacing: '-0.03em', marginTop: 14 }}>
              ¡Listo! Tu <strong style={{ fontWeight: 700 }}>{listo.plan}</strong> está activo
            </div>
            <p style={{ color: a.suave, margin: '8px 0 20px' }}>
              {listo.clases >= 9000 ? 'Clases ilimitadas' : `${listo.clases} clases`} · vence el {fechaLarga(listo.vence)}
            </p>
            <Boton onClick={cerrar} style={{ width: '100%' }}>Reservar mi siguiente clase</Boton>
          </div>
        ) : !elegido ? (
          <>
            <div style={{ fontSize: '1.7rem', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              <span style={{ fontWeight: 300 }}>Elige tu </span><strong style={{ fontWeight: 700 }}>plan</strong>
            </div>
            <div style={{ fontSize: '0.86rem', color: a.suave, margin: '6px 0 16px' }}>Vigencia de un mes desde el pago.</div>
            <div style={{ display: 'grid', gap: 10 }}>
              {(plans || []).map((p) => {
                const actual = p.name === planActual;
                return (
                  <button key={p.name} type="button" onClick={() => setElegido(p)} style={{
                    ...vidrio, textAlign: 'left', padding: 18, borderRadius: 26, cursor: 'pointer', color: a.tinta,
                    ...(actual ? { border: '1.5px solid var(--a-tinta)' } : {}),
                  }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                      <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{p.title || p.name}</span>
                      {actual && <Chip claro style={{ padding: '3px 9px', fontSize: '0.68rem' }}>Tu plan</Chip>}
                      <span style={{ marginLeft: 'auto', fontSize: '1.5rem', fontWeight: 300, letterSpacing: '-0.02em' }}>{p.price}</span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: a.suave, marginTop: 2 }}>{p.subtitle}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
                      {p.features.map((f) => <Chip key={f} claro style={{ fontSize: '0.7rem', padding: '4px 10px', fontWeight: 500 }}>{f}</Chip>)}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <Chip claro style={{ fontSize: '0.7rem' }}>Pasarela de prueba · no se cobra nada</Chip>
            <TarjetaTinta radio={26} style={{ marginTop: 14 }}>
              <div style={{ padding: 18 }}>
                <div style={{ fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.8 }}>Vas a pagar</div>
                <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 4 }}>
                  <span style={{ fontSize: '1.3rem', fontWeight: 700 }}>{elegido.title || elegido.name}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '2rem', fontWeight: 300 }}>{elegido.price}</span>
                </div>
              </div>
            </TarjetaTinta>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: a.suave, marginTop: 16 }}>Número de tarjeta
              <span style={{ ...vidrio, display: 'flex', alignItems: 'center', gap: 10, borderRadius: 18, padding: '0 16px', marginTop: 6 }}>
                <CreditCard size={18} />
                <input value={tarjeta} inputMode="numeric" autoComplete="off"
                  onChange={(e) => setTarjeta(e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 '))}
                  style={{ border: 'none', outline: 'none', background: 'transparent', padding: '14px 0', fontSize: '1rem', letterSpacing: '0.04em', color: a.tinta, width: '100%' }} />
              </span>
            </label>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              {TARJETAS.map(([n, t]) => (
                <button key={n} type="button" onClick={() => setTarjeta(n)} style={{
                  border: `1px solid ${tarjeta === n ? 'var(--a-tinta)' : 'var(--a-linea)'}`, borderRadius: 999, padding: '6px 12px', cursor: 'pointer',
                  background: tarjeta === n ? a.tinta : 'transparent', color: tarjeta === n ? a.sobreTinta : a.tinta, fontSize: '0.74rem', fontWeight: 600,
                }}>{t} · {n.slice(-4)}</button>
              ))}
            </div>
            {error && <Aviso tono="error">{error}</Aviso>}
            <Boton onClick={pagar} disabled={pagando} style={{ width: '100%', marginTop: 16 }}>
              {pagando ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Lock size={16} />}
              {pagando ? 'Procesando…' : `Pagar ${elegido.price}`}
            </Boton>
            <Boton tipo="linea" onClick={() => { setElegido(null); setError(''); }} disabled={pagando} style={{ width: '100%', marginTop: 8 }}>Ver otros planes</Boton>
          </>
        )}
      </div>
    </Hoja>
  );
}
