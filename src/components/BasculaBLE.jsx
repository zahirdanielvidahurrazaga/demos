import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { X, Bluetooth, Check, Scale, Copy, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { scanDevices, connectAndWeigh } from '../lib/esf24Scale';
import { computeBodyComposition, ageFromBirthDate } from '../lib/bodyComposition';

/*
  Modal "Pesarme" (ESF24 por Bluetooth) — MODO DIAGNÓSTICO.
  Muestra dispositivos encontrados, log en vivo y permite copiar todo para depurar.
*/

const looksLikeScale = (name) => /etekcity|scale|esf|qn-?scale|vesync|fitness|body/i.test(name || '');

export default function BasculaBLE({ user, onClose, onSaved }) {
  const [phase, setPhase] = useState('intro'); // intro | scanning | measuring | done | error
  const [liveWeight, setLiveWeight] = useState(null);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [log, setLog] = useState([]);
  const [copied, setCopied] = useState(false);
  const [profile, setProfile] = useState(null); // { height_cm, birth_date }
  const [comp, setComp] = useState(null);
  const logRef = useRef(null);
  const native = Capacitor.isNativePlatform();

  useEffect(() => {
    supabase.from('users').select('height_cm, birth_date').eq('id', user.id).single()
      .then(({ data }) => setProfile(data || {}));
  }, [user.id]);

  const addLog = (line) => setLog((l) => [...l, `${new Date().toLocaleTimeString('es-MX', { hour12: false })}  ${line}`]);

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [log]);

  const startScan = async () => {
    setPhase('scanning');
    setLog([]); setErrorMsg(''); setLiveWeight(null); setResult(null);
    try {
      const list = await scanDevices({ onDevice: (d) => addLog('· ' + (d.name || d.id)), onLog: addLog });
      // Detección automática: nos conectamos a la primera báscula reconocida.
      const match = list.filter((d) => looksLikeScale(d.name));
      if (match.length >= 1) { addLog('🎯 Báscula detectada: ' + match[0].name); connect(match[0].id); }
      else { setErrorMsg('No apareció ninguna báscula. Súbete a la báscula para encenderla y reintenta con el Bluetooth activado.'); setPhase('error'); }
    } catch (e) {
      setErrorMsg('Error de Bluetooth: ' + (e.message || e)); setPhase('error');
    }
  };

  const connect = async (deviceId) => {
    setPhase('measuring');
    try {
      const r = await connectAndWeigh(deviceId, { onLog: addLog, onLiveWeight: setLiveWeight, onRawFrame: () => {} });
      setResult(r);
      const imp = r.impedance_r1 || r.impedance_r2 || null;
      const age = ageFromBirthDate(profile?.birth_date);
      const c = (imp && profile?.height_cm && age)
        ? computeBodyComposition({ weight_kg: r.weight_kg, height_cm: profile.height_cm, age, impedance: imp })
        : null;
      setComp(c);
      const { error } = await supabase.from('body_measurements').insert({
        user_id: user.id, weight_kg: r.weight_kg, impedance: imp,
        measured_at: new Date().toISOString(), source: 'esf24', ...(c || {}),
      });
      if (error) setErrorMsg('Medición leída pero no se guardó: ' + error.message);
      else if (imp && !c) setErrorMsg('Peso e impedancia guardados. Agrega tu estatura en Mi Cuenta para ver tu composición.');
      setPhase('done');
      onSaved?.();
    } catch (e) {
      setErrorMsg(e.message === 'TIMEOUT' ? 'Conectó pero no llegó una medición estable. Mira el registro abajo y mándamelo.' : 'Error: ' + (e.message || e));
      setPhase('error');
    }
  };

  const copyLog = async () => {
    const text = `ESF24 diagnóstico\n${result ? 'peso: ' + result.weight_kg + ' kg\nimpedancia: ' + result.impedance_r1 + ' / ' + result.impedance_r2 + ' Ω\nfinal: ' + result.finalHex + '\n' : ''}${comp ? 'CALCULADO: ' + JSON.stringify(comp) + '\n' : ''}--- registro ---\n${log.join('\n')}`;
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { alert(text); }
  };

  const showLog = phase !== 'intro';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 4000, background: 'rgba(20,14,11,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <motion.div initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }} transition={{ type: 'spring', stiffness: 240, damping: 26 }} onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 480, background: 'var(--app-surface-solid, #fff)', borderRadius: '28px 28px 0 0', padding: '14px 22px calc(env(safe-area-inset-bottom,0px) + 24px)', maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.15)', margin: '4px auto 14px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-display)', margin: 0, color: 'var(--on-surface)' }}>Pesarme</h2>
          <button onClick={onClose} style={{ background: 'var(--surface-low)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
        </div>

        {!native ? (
          <Centered icon={<Bluetooth size={40} />} title="Solo en la app" text="Pesarte con la báscula está disponible en la app móvil." />
        ) : (
          <>
            {phase === 'intro' && (
              <div style={{ textAlign: 'center', padding: '6px 0' }}>
                <div style={{ width: 84, height: 84, borderRadius: 28, background: 'linear-gradient(135deg, rgba(255,145,77,0.16), rgba(224,122,156,0.16))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><Scale size={40} color="var(--primary)" /></div>
                <p style={{ fontSize: '0.96rem', color: 'var(--on-surface-variant)', lineHeight: 1.55, margin: '0 0 20px', padding: '0 6px' }}>Activa el Bluetooth, toca <b>Buscar báscula</b> y <b>súbete descalza</b> para encenderla. Quédate quieta unos segundos.</p>
                <button onClick={startScan} className="btn-primary" style={{ width: '100%', padding: '1.1rem', borderRadius: 18, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Bluetooth size={20} /> Buscar báscula</button>
              </div>
            )}

            {phase === 'scanning' && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: 14 }}>
                  <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1.3, repeat: Infinity }} style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,145,77,0.12)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Bluetooth size={30} color="var(--primary)" /></motion.div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--on-surface-variant)', marginTop: 10 }}>Buscando… súbete a la báscula para encenderla.</p>
                </div>
              </div>
            )}

            {phase === 'measuring' && (
              <div style={{ textAlign: 'center', padding: '4px 0 0' }}>
                {/* Anillo premium con peso en vivo */}
                <div style={{ position: 'relative', width: 230, height: 230, margin: '4px auto 0' }}>
                  <motion.div animate={{ scale: [1, 1.09, 1], opacity: [0.35, 0.65, 0.35] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ position: 'absolute', inset: -6, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,145,77,0.40), transparent 68%)' }} />
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2.6, repeat: Infinity, ease: 'linear' }}
                    style={{ position: 'absolute', inset: 8, borderRadius: '50%', background: 'conic-gradient(from 0deg, var(--primary), rgba(255,145,77,0.08) 55%, var(--primary))', WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 13px), #000 calc(100% - 13px))', mask: 'radial-gradient(farthest-side, transparent calc(100% - 13px), #000 calc(100% - 13px))' }} />
                  <div style={{ position: 'absolute', inset: 24, borderRadius: '50%', background: 'var(--app-surface-solid, #fff)', boxShadow: '0 18px 44px rgba(255,145,77,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div><span style={{ fontSize: '2.7rem', fontWeight: 800, color: 'var(--on-surface)', letterSpacing: '-0.02em' }}>{liveWeight != null ? liveWeight.toFixed(2) : '0.00'}</span><span style={{ fontSize: '1rem', color: 'var(--on-surface-variant)', marginLeft: 4 }}>kg</span></div>
                  </div>
                </div>
                {/* Puntos en cascada */}
                <div style={{ display: 'flex', gap: 9, justifyContent: 'center', margin: '20px 0 8px' }}>
                  {[0, 1, 2].map((i) => (
                    <motion.span key={i} animate={{ y: [0, -7, 0], opacity: [0.35, 1, 0.35] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
                      style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--primary)' }} />
                  ))}
                </div>
                <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--on-surface)', margin: 0 }}>Pesando…</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', margin: '4px 0 0' }}>Quédate descalza y quieta</p>
                {/* Báscula ilustrada flotando */}
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }} style={{ position: 'relative', width: 168, height: 56, margin: '20px auto 4px' }}>
                  <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 150, height: 13, borderRadius: '50%', background: 'rgba(40,28,20,0.10)', filter: 'blur(5px)' }} />
                  <div style={{ position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', width: 156, height: 42, borderRadius: 16, background: 'linear-gradient(160deg, #ffffff, #efe9e5)', boxShadow: '0 10px 22px rgba(40,28,20,0.14)', border: '1px solid rgba(0,0,0,0.05)' }}>
                    <div style={{ position: 'absolute', top: 9, left: '50%', transform: 'translateX(-50%)', width: 40, height: 6, borderRadius: 3, background: 'rgba(255,145,77,0.45)' }} />
                  </div>
                </motion.div>
              </div>
            )}

            {phase === 'done' && (
              <div style={{ textAlign: 'center', padding: '4px 0' }}>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 16 }} style={{ width: 70, height: 70, borderRadius: '50%', background: '#E9F8EE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}><Check size={36} color="#2B9E5B" /></motion.div>
                <div style={{ fontSize: '2.8rem', fontWeight: 800, color: 'var(--on-surface)', lineHeight: 1 }}>{result?.weight_kg?.toFixed(1)}<span style={{ fontSize: '1.1rem', color: 'var(--on-surface-variant)', marginLeft: 6 }}>kg</span></div>
                <p style={{ fontSize: '0.92rem', color: 'var(--on-surface-variant)', margin: '8px 0 0' }}>{errorMsg || '¡Listo! Tu peso quedó guardado.'}</p>
                {comp ? (
                  <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, textAlign: 'left' }}>
                    {[
                      ['Grasa corporal', comp.body_fat_pct + '%'],
                      ['Músculo', comp.skeletal_muscle_pct + '%'],
                      ['Agua', comp.body_water_pct + '%'],
                      ['Masa muscular', comp.muscle_mass_kg + ' kg'],
                      ['Grasa visceral', String(comp.visceral_fat)],
                      ['IMC', String(comp.bmi)],
                      ['Masa ósea', comp.bone_mass_kg + ' kg'],
                      ['Edad metabólica', comp.metabolic_age + ' años'],
                    ].map(([k, v]) => (
                      <div key={k} style={{ background: 'var(--surface-low)', borderRadius: 10, padding: '8px 10px' }}>
                        <div style={{ fontSize: '0.66rem', color: 'var(--on-surface-variant)' }}>{k}</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--on-surface)' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                ) : (result?.impedance_r1 || result?.impedance_r2) ? (
                  <p style={{ fontSize: '0.78rem', color: '#2B9E5B', fontWeight: 700, margin: '6px 0 0' }}>✓ Impedancia {result.impedance_r1}/{result.impedance_r2} Ω — agrega tu estatura para la composición.</p>
                ) : (
                  <p style={{ fontSize: '0.76rem', color: 'var(--on-surface-variant)', margin: '6px 0 0' }}>Para la composición: pésate <b>descalza</b> y quédate quieta ~10s.</p>
                )}
              </div>
            )}

            {phase === 'error' && (
              <div style={{ textAlign: 'center', padding: '4px 0' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#FDECEC', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}><AlertCircle size={34} color="#D9534F" /></div>
                <p style={{ fontSize: '0.92rem', color: 'var(--on-surface-variant)', lineHeight: 1.5, margin: '0 0 4px', padding: '0 6px' }}>{errorMsg}</p>
              </div>
            )}

            {/* Registro de diagnóstico (plegable, oculto por defecto) */}
            {showLog && (
              <details style={{ marginTop: 16 }}>
                <summary style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--on-surface-variant)', cursor: 'pointer' }}>Detalles técnicos</summary>
                <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '8px 0 6px' }}>
                  <button onClick={copyLog} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 9, padding: '6px 10px', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', color: 'var(--on-surface)' }}><Copy size={13} /> {copied ? 'Copiado ✓' : 'Copiar registro'}</button>
                </div>
                <div ref={logRef} style={{ background: '#11100f', color: '#9fe6a0', borderRadius: 12, padding: '10px 12px', fontSize: '0.66rem', fontFamily: 'ui-monospace, monospace', lineHeight: 1.5, maxHeight: 180, overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {log.length ? log.join('\n') : 'Sin eventos aún…'}
                </div>
              </details>
            )}

            {/* Acciones */}
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              {(phase === 'error' || phase === 'scanning') && (
                <button onClick={startScan} className="btn-primary" style={{ flex: 1, padding: '0.95rem', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><RefreshCw size={16} /> Reintentar</button>
              )}
              {(phase === 'done' || phase === 'error') && (
                <button onClick={onClose} style={{ flex: 1, padding: '0.95rem', borderRadius: 16, background: 'var(--surface-low)', border: 'none', fontWeight: 700, color: 'var(--on-surface)', cursor: 'pointer' }}>Cerrar</button>
              )}
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

function Centered({ icon, title, text }) {
  return (
    <div style={{ textAlign: 'center', padding: '30px 0' }}>
      <div style={{ width: 84, height: 84, borderRadius: 28, background: 'var(--surface-low)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>{icon}</div>
      <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', color: 'var(--on-surface)' }}>{title}</h3>
      {text && <p style={{ fontSize: '0.92rem', color: 'var(--on-surface-variant)', margin: 0 }}>{text}</p>}
    </div>
  );
}
