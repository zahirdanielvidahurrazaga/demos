import { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { supabase } from '../lib/supabase';
import { ESTUDIO } from '../config/estudio';

// Enlace a la ficha del estudio en el App Store (sale de la configuración).
const STORE_URL = ESTUDIO.tiendas.appStore;

// Compara dos versiones "1.7.3" numéricamente. <0 si a<b, 0 igual, >0 si a>b.
function cmpVersion(a, b) {
  const pa = String(a || '0').split('.').map(n => parseInt(n, 10) || 0);
  const pb = String(b || '0').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

// Aviso de "actualiza la app" — SOLO en la app nativa de iOS (web y Android son
// PWA y se actualizan solas). Lee la versión mínima/recomendada de `app_config`
// (editable sin recompilar) y compara con la versión instalada:
//   • instalada < min_ios_version    → BLOQUEO DURO (pantalla completa, sin cerrar)
//   • instalada < latest_ios_version → aviso SUAVE (banner posponible por versión)
// Falla en SILENCIO ante cualquier error/offline: nunca bloquea la app por un
// problema de red.
export default function UpdateGate() {
  const [mode, setMode] = useState(null);   // null | 'soft' | 'hard'
  const [cfg, setCfg] = useState(null);      // { latest, message }

  const check = useCallback(async () => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') return;
    try {
      const [info, res] = await Promise.all([
        CapApp.getInfo(),
        supabase.from('app_config').select('min_ios_version, latest_ios_version, update_message').eq('id', 1).single(),
      ]);
      const current = info?.version;
      const data = res?.data;
      if (!current || !data) return;

      if (cmpVersion(current, data.min_ios_version) < 0) {
        setCfg({ latest: data.latest_ios_version, message: data.update_message });
        setMode('hard');
      } else if (cmpVersion(current, data.latest_ios_version) < 0) {
        // No repetir el banner suave para una versión ya pospuesta.
        const dismissed = localStorage.getItem('befit_update_dismissed');
        if (dismissed === data.latest_ios_version) return;
        setCfg({ latest: data.latest_ios_version, message: data.update_message });
        setMode('soft');
      } else {
        setMode(null);
      }
    } catch (e) {
      // Silencio deliberado: sin red no se avisa, pero jamás se bloquea.
    }
  }, []);

  useEffect(() => {
    check();
    // Re-verificar al volver del fondo (por si se subió la versión mínima).
    let listener;
    CapApp.addListener('appStateChange', ({ isActive }) => { if (isActive) check(); })
      .then(l => { listener = l; });
    return () => { if (listener) listener.remove(); };
  }, [check]);

  const openStore = () => { Browser.open({ url: STORE_URL }).catch(() => {}); };
  const postpone = () => {
    if (cfg?.latest) { try { localStorage.setItem('befit_update_dismissed', cfg.latest); } catch (e) {} }
    setMode(null);
  };

  if (!mode) return null;

  // ── BLOQUEO DURO ───────────────────────────────────────────────────────────
  if (mode === 'hard') {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 100000, background: '#15110E',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 'max(32px, env(safe-area-inset-top)) 28px max(32px, env(safe-area-inset-bottom))',
        textAlign: 'center', color: '#FDFBF7',
      }}>
        <div style={{ fontSize: '3.2rem', marginBottom: 18 }}>🌟</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: '0 0 12px' }}>Actualización necesaria</h2>
        <p style={{ fontSize: '1rem', lineHeight: 1.5, opacity: 0.85, maxWidth: 340, margin: '0 0 28px' }}>
          {cfg?.message || `Publicamos una nueva versión con mejoras importantes. Actualiza para seguir usando ${ESTUDIO.nombre}.`}
        </p>
        <button onClick={openStore} style={{
          background: '#FF914D', color: '#fff', border: 'none', borderRadius: 16,
          padding: '15px 40px', fontSize: '1.05rem', fontWeight: 800, cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(255,145,77,0.4)',
        }}>Actualizar ahora</button>
      </div>
    );
  }

  // ── AVISO SUAVE (banner posponible) ─────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', left: 12, right: 12, zIndex: 99999,
      top: 'calc(env(safe-area-inset-top) + 10px)',
      background: '#FFFFFF', color: '#15110E',
      borderRadius: 16, padding: '14px 16px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.18)', border: '1px solid rgba(255,145,77,0.35)',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{ fontSize: '1.6rem' }}>✨</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>Nueva versión disponible</div>
        <div style={{ fontSize: '0.82rem', opacity: 0.7 }}>
          {cfg?.message || 'Actualiza para tener las últimas mejoras.'}
        </div>
      </div>
      <button onClick={postpone} aria-label="Ahora no" style={{
        background: 'transparent', border: 'none', color: '#15110E', opacity: 0.5,
        fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', padding: '8px 6px',
      }}>Ahora no</button>
      <button onClick={openStore} style={{
        background: '#FF914D', color: '#fff', border: 'none', borderRadius: 12,
        padding: '10px 16px', fontSize: '0.86rem', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
      }}>Actualizar</button>
    </div>
  );
}
