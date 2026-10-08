import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Plus, Sparkles, Lock, X, Check, CalendarClock, Info, Image as ImageIcon, RotateCcw, ChevronLeft, Trash2, Columns } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { compressCafeImage } from '../lib/cafeImage';
import { scheduleProgressPhotoReminder } from '../hooks/useLocalNotifications';
import poseFront from '../assets/poses/pose-front.png';
import poseSide from '../assets/poses/pose-side.png';
import { ESTUDIO } from '../config/estudio';

const PRIMARY = '#FF914D';
const SIX_WEEKS = 42 * 24 * 60 * 60 * 1000;

// ───────────────────── Siluetas guía (avatar) por ángulo ─────────────────────
// Figura humana semitransparente que orienta a la clienta sobre cómo pararse.
// Respira sutilmente (motion) para que se note que es una guía.
function PoseGuide({ angle }) {
  // Silueta femenina real (dominio público, recoloreada a blanco translúcido) que
  // orienta la pose. 'front' y 'back' comparten la misma silueta: es un contorno
  // sin rasgos, así que el cuerpo de frente y de espaldas se encuadran igual.
  // 'left' usa el contorno de perfil.
  const src = angle === 'left' ? poseSide : poseFront;

  return (
    <div style={{ height: '94%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.img
        src={src}
        alt=""
        aria-hidden="true"
        animate={{ opacity: [0.55, 0.85, 0.55], scale: [1, 1.012, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{ height: '100%', width: 'auto', maxWidth: '78%', objectFit: 'contain', filter: 'drop-shadow(0 0 14px rgba(0,0,0,0.55))' }}
      />
    </div>
  );
}

// Los 3 ángulos. `col` mapea a la columna existente de la tabla.
// 2026-08-01 (pedido de las dueñas): el tercer ángulo pasó de "Perfil derecho" a
// ESPALDAS, que es el que faltaba y el que mejor muestra postura y espalda en
// pilates. Sigue guardándose en `back_path` — la columna ya se llamaba así, solo
// que antes almacenaba el perfil derecho. Por eso NO hubo migración: las
// sesiones viejas siguen mostrando su foto en la misma tarjeta.
const ANGLES = [
  { key: 'front', col: 'front_path', label: 'Frente', title: 'Vista Frontal', phrase: 'Tu mejor versión te espera', hint: 'Brazos relajados a los costados, mirando al frente.' },
  { key: 'left', col: 'side_path', label: 'Perfil', title: 'Vista de Perfil', phrase: 'Constancia, no perfección', hint: 'Gira 90° a tu izquierda, brazos relajados.' },
  { key: 'back', col: 'back_path', label: 'Espaldas', title: 'Vista de Espaldas', phrase: 'Hoy más fuerte que ayer', hint: 'Dale la espalda a la cámara, brazos relajados a los costados.' },
];

const glass = {
  background: 'var(--glass-bg, rgba(255,255,255,0.55))',
  backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  border: '1px solid var(--glass-border, rgba(255,255,255,0.65))',
  boxShadow: '0 8px 28px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.4)',
};

// Todas las fotos de progreso se capturan y guardan en formato vertical 2:3.
const PHOTO_AR = 2 / 3;            // ancho / alto
const PHOTO_AR_CSS = '2 / 3';     // mismo valor para el CSS aspect-ratio

// Recorta el CENTRO de una fuente (video o imagen) a 2:3 vertical y devuelve un canvas.
function cropToPortrait(source, srcW, srcH, mirror = false) {
  let sw = srcW, sh = srcW / PHOTO_AR;     // intenta usar todo el ancho
  if (sh > srcH) { sh = srcH; sw = srcH * PHOTO_AR; } // si no cabe, usa todo el alto
  const sx = (srcW - sw) / 2, sy = (srcH - sh) / 2;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(sw); canvas.height = Math.round(sh);
  const ctx = canvas.getContext('2d');
  if (mirror) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); } // des-espejar selfie
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas;
}

// ───────────────────────── Tarjeta con flip ─────────────────────────
function FlipCard({ label, url, session, angleKey, onDeleteIndividual }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div style={{ perspective: '1100px', aspectRatio: '2 / 3' }}>
      <motion.div animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{ position: 'relative', width: '100%', height: '100%', transformStyle: 'preserve-3d' }}>
        
        {/* Portada (Logo) */}
        <div onClick={() => setFlipped(true)} style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', borderRadius: '14px', overflow: 'hidden', background: 'var(--surface-lowest)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '14px', boxShadow: '0 8px 32px rgba(0,0,0,0.05)', cursor: 'pointer' }}>
          <img src={ESTUDIO.marca.logo} alt={ESTUDIO.nombre} style={{ width: '65%', objectFit: 'contain', opacity: 0.85, filter: 'drop-shadow(0 4px 12px rgba(255,145,77,0.2))' }} />
          <span style={{ position: 'absolute', bottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '0.64rem', fontWeight: 700, color: 'var(--on-surface-variant)' }}><Lock size={11} /> {label}</span>
        </div>

        {/* Reverso (foto) */}
        <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)', borderRadius: '12px', overflow: 'hidden', background: '#1A1C1E', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
          {url ? (
             <>
               <img src={url} alt={label} onClick={() => setFlipped(false)} style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} />
               <button onClick={(e) => { e.stopPropagation(); onDeleteIndividual(session, angleKey); }} style={{ position: 'absolute', top: '8px', right: '8px', width: '28px', height: '28px', borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.5)', color: '#ff4d4d', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)' }} title="Eliminar esta foto">
                 <Trash2 size={14} />
               </button>
             </>
            ) : <div onClick={() => setFlipped(false)} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><Camera size={28} /></div>}
          <span onClick={() => setFlipped(false)} style={{ position: 'absolute', bottom: '10px', left: '10px', fontSize: '0.66rem', fontWeight: 800, color: '#fff', background: 'rgba(0,0,0,0.5)', padding: '3px 9px', borderRadius: '8px', backdropFilter: 'blur(6px)', cursor: 'pointer' }}>{label}</span>
        </div>
      </motion.div>
    </div>
  );
}

// ───────────────────────── Modal de Comparación ─────────────────────────
function CompareModal({ sessions, onClose }) {
  const [s1, setS1] = useState(sessions[sessions.length - 1]?.id || sessions[0]?.id);
  const [s2, setS2] = useState(sessions[0]?.id);
  const [angle, setAngle] = useState('front');

  const sess1 = sessions.find(s => s.id === s1);
  const sess2 = sessions.find(s => s.id === s2);

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 5200, backdropFilter: 'blur(8px)' }} />
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 32, stiffness: 320 }}
        style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 5201, height: '90vh', background: 'var(--app-surface-solid, #fff)', borderTopLeftRadius: '28px', borderTopRightRadius: '28px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        <div style={{ padding: '16px 20px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle, rgba(0,0,0,0.05))' }}>
          <button onClick={onClose} style={{ width: '34px', height: '34px', borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={18} color="var(--on-surface)" /></button>
          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--on-surface)' }}>Comparar Progreso</span>
          <div style={{ width: '34px' }} />
        </div>

        <div style={{ padding: '14px 20px', display: 'flex', gap: '8px', overflowX: 'auto', flexShrink: 0, WebkitOverflowScrolling: 'touch' }}>
          {ANGLES.map(a => (
            <button key={a.key} onClick={() => setAngle(a.key)} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', background: angle === a.key ? PRIMARY : 'rgba(0,0,0,0.05)', color: angle === a.key ? '#fff' : 'var(--on-surface-variant)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {a.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, padding: '0 16px 20px', display: 'flex', gap: '10px', alignItems: 'flex-start', overflowY: 'auto' }}>
          {[ { sess: sess1, val: s1, set: setS1, label: 'Antes' }, { sess: sess2, val: s2, set: setS2, label: 'Después' } ].map((col, idx) => (
            <div key={idx} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <select value={col.val} onChange={e => col.set(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '10px', border: '1px solid var(--border-subtle, rgba(0,0,0,0.1))', background: 'var(--surface-low)', color: 'var(--on-surface)', fontSize: '0.8rem', fontWeight: 600, outline: 'none' }}>
                {sessions.map(s => <option key={s.id} value={s.id}>{new Date(s.taken_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: '2-digit' })}</option>)}
              </select>
              {/* Proporción fija vertical + contain = foto completa sin deformar ni recortar */}
              <div style={{ width: '100%', aspectRatio: '2 / 3', background: '#101010', borderRadius: '16px', overflow: 'hidden', position: 'relative' }}>
                {col.sess?.urls?.[angle] ? (
                  <img src={col.sess.urls[angle]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)' }}><Camera size={24} /></div>
                )}
                <span style={{ position: 'absolute', bottom: '8px', left: '8px', fontSize: '0.65rem', fontWeight: 800, color: '#fff', background: 'rgba(0,0,0,0.5)', padding: '3px 8px', borderRadius: '8px', backdropFilter: 'blur(6px)' }}>{col.label}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </>
  );
}

// ───────────────────── Wizard de captura paso a paso ─────────────────────
function CaptureWizard({ userId, onClose, onSaved }) {
  const [step, setStep] = useState(0);              // 0,1,2 = captura · 3 = review
  const [shots, setShots] = useState({});           // key -> { blob, url }
  const [camActive, setCamActive] = useState(false);
  const [camError, setCamError] = useState(false);
  const [saving, setSaving] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileRef = useRef(null);

  const isReview = step >= ANGLES.length;
  const cur = ANGLES[step] || ANGLES[0];

  const stopCam = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setCamActive(false);
  };
  const startCam = async () => {
    setCamError(false);
    stopCam();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1080 }, height: { ideal: 1440 } }, audio: false });
      streamRef.current = stream;
      setCamActive(true);
      // esperar a que el <video> exista
      setTimeout(() => { if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); } }, 50);
    } catch (e) { setCamError(true); setCamActive(false); }
  };

  // Al entrar a un paso de captura sin foto, abrir la cámara
  useEffect(() => {
    if (!isReview && !shots[cur.key]) startCam(); else stopCam();
    return () => { stopCam(); };
    // eslint-disable-next-line
  }, [step]);

  const capture = () => {
    const v = videoRef.current; if (!v || !v.videoWidth) return;
    const canvas = cropToPortrait(v, v.videoWidth, v.videoHeight, true); // 2:3 + des-espejado
    canvas.toBlob(blob => {
      if (!blob) return;
      setShots(s => ({ ...s, [cur.key]: { blob, url: URL.createObjectURL(blob) } }));
      stopCam();
    }, 'image/jpeg', 0.9);
  };
  const pickGallery = (e) => {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
    // Normaliza la foto de galería al mismo 2:3 vertical (recorte centrado).
    const img = new Image();
    img.onload = () => {
      const canvas = cropToPortrait(img, img.naturalWidth, img.naturalHeight, false);
      canvas.toBlob(blob => {
        if (!blob) return;
        setShots(s => ({ ...s, [cur.key]: { blob, url: URL.createObjectURL(blob) } }));
        stopCam();
      }, 'image/jpeg', 0.9);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => { // fallback: usar el archivo tal cual si no se pudo procesar
      setShots(s => ({ ...s, [cur.key]: { blob: f, url: URL.createObjectURL(f) } }));
      stopCam();
    };
    img.src = URL.createObjectURL(f);
  };
  const retake = () => { setShots(s => { const n = { ...s }; delete n[cur.key]; return n; }); startCam(); };

  const save = async () => {
    setSaving(true);
    try {
      const ts = Date.now();
      const cols = {};
      for (const a of ANGLES) {
        const blob = await compressCafeImage(shots[a.key].blob, 1280, 0.82);
        const path = `${userId}/${ts}/${a.key}.jpg`;
        const { error } = await supabase.storage.from('progress-photos').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
        if (error) throw error;
        cols[a.col] = path;
      }
      const { error } = await supabase.from('progress_photos').insert({ user_id: userId, ...cols });
      if (error) throw error;
      // Reprograma el recordatorio: 6 semanas desde esta sesión.
      scheduleProgressPhotoReminder(ts);
      onSaved();
    } catch (e) { alert('No se pudieron subir las fotos: ' + (e.message || e)); }
    finally { setSaving(false); }
  };

  const shot = shots[cur.key];
  const progressPct = (isReview ? ANGLES.length : step) / ANGLES.length * 100;

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 5200 }} />
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 32, stiffness: 320 }}
        style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 5201, height: '94vh', background: 'var(--app-surface-solid, #fff)', borderTopLeftRadius: '28px', borderTopRightRadius: '28px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Cabecera + progreso */}
        <div style={{ padding: '16px 20px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <button onClick={onClose} style={{ width: '34px', height: '34px', borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={18} color="var(--on-surface)" /></button>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--on-surface)' }}>{isReview ? 'Revisa tus fotos' : `Paso ${step + 1} de ${ANGLES.length}: ${cur.title}`}</span>
            <div style={{ width: '34px' }} />
          </div>
          <div style={{ height: '6px', background: 'rgba(0,0,0,0.07)', borderRadius: '4px', overflow: 'hidden' }}>
            <motion.div animate={{ width: `${progressPct}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} style={{ height: '100%', background: 'linear-gradient(90deg, #FF914D, #FFB37A)', borderRadius: '4px' }} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px calc(env(safe-area-inset-bottom,0px) + 16px)', display: 'flex', flexDirection: 'column' }}>

          {!isReview ? (
            <>
              {/* Área de cámara / foto */}
              <div style={{ position: 'relative', width: '100%', aspectRatio: '2 / 3', borderRadius: '22px', overflow: 'hidden', background: '#101010', marginBottom: '12px' }}>
                {shot ? (
                  <img src={shot.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : camActive ? (
                  <>
                    <video ref={videoRef} playsInline muted autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
                    {/* Silueta guía (avatar) que orienta la pose del ángulo actual.
                        👉 Si más adelante quieres usar tus propias siluetas/Lottie,
                        reemplaza <PoseGuide/> por tu animación para `cur.key`. */}
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                      <PoseGuide angle={cur.key} />
                    </div>
                    <span style={{ position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.74rem', fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,0.45)', padding: '5px 12px', borderRadius: '999px', backdropFilter: 'blur(6px)', whiteSpace: 'nowrap' }}>
                      Acomódate dentro de la silueta · {cur.label}
                    </span>
                  </>
                ) : (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', color: 'rgba(255,255,255,0.7)', padding: '20px', textAlign: 'center' }}>
                    <Camera size={34} />
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>{camError ? 'No pudimos abrir la cámara. Sube la foto desde tu galería.' : 'Preparando cámara…'}</p>
                  </div>
                )}
              </div>

              {/* Texto de ayuda */}
              {!shot && (
                <div style={{ ...glass, borderRadius: '14px', padding: '11px 14px', marginBottom: '14px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <Info size={16} color={PRIMARY} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--on-surface-variant)', lineHeight: 1.45 }}>
                    Como es de cuerpo completo, pídele a alguien que te tome la foto o <strong style={{ color: 'var(--on-surface)' }}>apoya el teléfono y acomódate dentro de la silueta.</strong> {cur.hint}
                  </p>
                </div>
              )}

              {/* Controles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto' }}>
                {shot ? (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={retake} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '14px', borderRadius: '15px', ...glass, color: 'var(--on-surface)', fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer' }}><RotateCcw size={16} /> Repetir</button>
                    <button onClick={() => setStep(step + 1)} style={{ flex: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '14px', borderRadius: '15px', border: 'none', background: PRIMARY, color: '#fff', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 10px 24px rgba(255,145,77,0.35)' }}>{step < ANGLES.length - 1 ? 'Siguiente' : 'Revisar'} <Check size={17} /></button>
                  </div>
                ) : (
                  <>
                    <button onClick={capture} disabled={!camActive} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '15px', borderRadius: '16px', border: 'none', background: camActive ? PRIMARY : 'rgba(0,0,0,0.1)', color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: camActive ? 'pointer' : 'default', boxShadow: camActive ? '0 10px 24px rgba(255,145,77,0.35)' : 'none' }}>
                      <Camera size={18} /> Capturar foto
                    </button>
                    <button onClick={() => fileRef.current?.click()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '13px', borderRadius: '15px', ...glass, color: 'var(--on-surface)', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}><ImageIcon size={16} /> Subir desde galería</button>
                    <input ref={fileRef} type="file" accept="image/*" onChange={pickGallery} style={{ display: 'none' }} />
                  </>
                )}
                {step > 0 && !shot && (
                  <button onClick={() => setStep(step - 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)', fontWeight: 700, fontSize: '0.84rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '4px' }}><ChevronLeft size={15} /> Paso anterior</button>
                )}
              </div>
            </>
          ) : (
            /* ─── Estado final: review de las 3 fotos ─── */
            <>
              <p style={{ margin: '6px 0 14px', fontSize: '0.86rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>¡Listo! Revisa tus 3 fotos y guarda tu sesión. Quedarán guardadas en privado detrás de cada tarjeta; solo tú y tu coach pueden verlas.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '18px' }}>
                {ANGLES.map((a, i) => (
                  <div key={a.key} style={{ position: 'relative', aspectRatio: '2 / 3', borderRadius: '14px', overflow: 'hidden', background: '#000' }}>
                    {shots[a.key] ? <img src={shots[a.key].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                    <button onClick={() => setStep(i)} style={{ position: 'absolute', top: '6px', right: '6px', width: '24px', height: '24px', borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.55)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><RotateCcw size={13} /></button>
                    <span style={{ position: 'absolute', bottom: '6px', left: '6px', fontSize: '0.62rem', fontWeight: 800, color: '#fff', background: 'rgba(0,0,0,0.5)', padding: '2px 7px', borderRadius: '6px' }}>{a.label}</span>
                  </div>
                ))}
              </div>
              <button onClick={save} disabled={saving} style={{ marginTop: 'auto', width: '100%', padding: '15px', borderRadius: '16px', border: 'none', background: PRIMARY, color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 10px 24px rgba(255,145,77,0.35)' }}>
                {saving ? 'Guardando…' : 'Guardar mi sesión de fotos'}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </>
  );
}

const FRASES = [
  'El _proceso_ que hoy te pesa, mañana será tu mayor _recompensa_.',
  'Tu _cuerpo_ escucha todo lo que tu _mente_ dice.',
  'Cada clase es un _regalo_ que te das a ti misma.',
  'No se trata de ser _perfecta_, sino de ser _constante_.',
  'Tu única _competencia_ eres tú de ayer.',
  'Brilla por _dentro_ y se notará por _fuera_.',
  'Hoy es un buen día para _empezar_ de nuevo.',
];

function FrasePostIt({ text }) {
  const parts = text.split('_');
  return (
    <div style={{ position: 'relative', transform: 'rotate(-1.5deg)', background: '#FAF6EF', padding: '28px 24px 24px', borderRadius: '6px', boxShadow: '0 12px 24px rgba(0,0,0,0.08)', marginBottom: '18px', width: '100%', maxWidth: '320px', margin: '0 auto 18px' }}>
      <div style={{ position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%) rotate(-3deg)', width: '110px', height: '26px', background: 'rgba(224,122,156,0.28)', borderLeft: '2px dashed rgba(255,255,255,0.7)', borderRight: '2px dashed rgba(255,255,255,0.7)', backdropFilter: 'blur(1px)' }} />
      <p style={{ fontFamily: "'Caveat', cursive", color: '#3A3632', fontSize: '1.85rem', lineHeight: 1.35, fontWeight: 600, margin: 0, textAlign: 'center' }}>
        {parts.map((seg, i) => i % 2 === 1
          ? <span key={i} style={{ textDecoration: 'underline', textUnderlineOffset: '4px' }}>{seg}</span>
          : <span key={i}>{seg}</span>)}
      </p>
    </div>
  );
}

// ───────────────────────── Componente principal ─────────────────────────
export default function ProgressPhotos({ userId }) {
  const [sessions, setSessions] = useState(null);
  const [showWizard, setShowWizard] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState(null);

  const load = async () => {
    if (!userId) return;
    const { data } = await supabase.from('progress_photos').select('*').eq('user_id', userId).order('taken_at', { ascending: false });
    
    // Auto-limpieza: Si por alguna razón queda una sesión completamente vacía en la base de datos,
    // la eliminamos automáticamente para que no aparezca como tarjetas vacías.
    const validSessions = [];
    for (const s of (data || [])) {
      if (!s.front_path && !s.side_path && !s.back_path) {
        await supabase.from('progress_photos').delete().eq('id', s.id);
      } else {
        validSessions.push(s);
      }
    }

    const withUrls = await Promise.all(validSessions.map(async (s) => {
      const sign = async (p) => p ? (await supabase.storage.from('progress-photos').createSignedUrl(p, 3600)).data?.signedUrl : null;
      const [front, left, back] = await Promise.all([sign(s.front_path), sign(s.side_path), sign(s.back_path)]);
      return { ...s, urls: { front, left, back } };
    }));
    setSessions(withUrls);
  };
  useEffect(() => { load(); }, [userId]);

  // Asegura el recordatorio de 6 semanas para quienes ya tenían fotos antes de
  // existir esta feature (al guardar nuevas ya se reprograma en el wizard).
  // Idempotente: el ID fijo hace que se reemplace, no se acumule.
  useEffect(() => {
    if (sessions && sessions.length > 0) {
      scheduleProgressPhotoReminder(new Date(sessions[0].taken_at).getTime());
    }
  }, [sessions]);

  const confirmDeletePhoto = async () => {
    if (!photoToDelete) return;
    const { session, angleKey } = photoToDelete;
    setPhotoToDelete(null);
    try {
      const colName = ANGLES.find(a => a.key === angleKey).col;
      const path = session[colName];
      if (path) {
        await supabase.storage.from('progress-photos').remove([path]);
      }
      
      // Checar si con este borrado la sesión se queda totalmente vacía
      const updatedSession = { ...session, [colName]: null };
      if (!updatedSession.front_path && !updatedSession.side_path && !updatedSession.back_path) {
        // Borrar el registro completo de la base de datos
        await supabase.from('progress_photos').delete().eq('id', session.id);
      } else {
        // Solo actualizar la columna a null
        await supabase.from('progress_photos').update({ [colName]: null }).eq('id', session.id);
      }
      
      load();
    } catch (e) {
      alert('Error al eliminar la foto: ' + e.message);
    }
  };

  const nextDue = useMemo(() => {
    if (!sessions?.length) return { due: true, days: 0 };
    const diff = new Date(sessions[0].taken_at).getTime() + SIX_WEEKS - Date.now();
    return { due: diff <= 0, days: Math.ceil(diff / 86400000) };
  }, [sessions]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Cadencia 6 semanas — hero cálido con foto del estudio */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        borderRadius: '32px', padding: '24px', border: 'none',
        display: 'flex', alignItems: 'center', color: '#fff',
        boxShadow: '0 22px 46px rgba(58,33,24,0.30)', minHeight: '175px', backgroundColor: '#2a1d16'
      }}>
        <img src={ESTUDIO.portadas.progreso} alt="" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 35%' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(110deg, rgba(26,17,12,0.88) 0%, rgba(40,26,18,0.62) 55%, rgba(58,33,24,0.28) 100%)', pointerEvents: 'none' }}></div>

        {/* Contenido texto */}
        <div style={{ flex: 1, zIndex: 1, position: 'relative' }}>
          <h3 style={{ margin: '0 0 8px', fontWeight: 900, fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: '#fff', lineHeight: 1.1, textShadow: '0 2px 12px rgba(0,0,0,0.45)' }}>
            {nextDue.due ? '¡Hora de tus fotos!' : 'Tu progreso visual'}
          </h3>
          <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: 'rgba(255,255,255,0.9)', fontWeight: 600, lineHeight: 1.4, textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}>
            {!sessions?.length ? 'Toma tus primeras fotos para empezar tu viaje' : nextDue.due ? 'Han pasado 6 semanas, registra tu avance' : `Próxima sesión en ${nextDue.days} ${nextDue.days === 1 ? 'día' : 'días'}`}
          </p>
          {/* Pill glass para alto contraste */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.16)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', padding: '8px 14px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.25)' }}>
            {nextDue.due ? <Sparkles size={14} color="#FFC79E" /> : <CalendarClock size={14} color="#FFC79E" />}
            <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#fff' }}>
              {nextDue.due ? 'Acción Requerida' : 'Evolución'}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={() => setShowWizard(true)} className="tour-progress-photos-btn" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', borderRadius: '16px', border: '1px solid var(--glass-border, rgba(255,255,255,0.7))', background: 'var(--glass-bg, rgba(255,255,255,0.55))', color: 'var(--on-surface)', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', boxShadow: '0 8px 28px rgba(0,0,0,0.07)' }}>
          <Plus size={18} color="var(--primary)" /> Nueva sesión
        </button>
        {sessions && sessions.length > 1 && (
          <button onClick={() => setShowCompare(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px 20px', borderRadius: '16px', border: '1px solid var(--glass-border, rgba(255,255,255,0.7))', background: 'var(--glass-bg, rgba(255,255,255,0.55))', color: 'var(--on-surface)', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', boxShadow: '0 8px 28px rgba(0,0,0,0.07)' }}>
            <Columns size={18} color="var(--primary)" /> Comparar
          </button>
        )}
      </div>

      {sessions === null ? (
        <p style={{ textAlign: 'center', color: 'var(--on-surface-variant)', padding: '30px 0' }}>Cargando…</p>
      ) : sessions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--on-surface-variant)' }}>
          <Camera size={32} style={{ opacity: 0.3, marginBottom: '10px' }} />
          <p style={{ margin: 0, fontSize: '0.9rem' }}>Aún no tienes fotos. Cada 6 semanas toma 3 (frente, perfil y espaldas) para ver tu evolución 💪</p>
        </div>
      ) : (
        sessions.map((s, i) => (
          <div key={s.id} style={{ marginBottom: '24px', background: 'var(--surface)', padding: '20px 16px', borderRadius: '24px' }}>
            
            {/* 1. Post-it */}
            <FrasePostIt text={FRASES[i % FRASES.length]} />

            {/* 2. Fecha (centrada) */}
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--on-surface-variant)' }}>
                {i === 0 ? 'Más reciente · ' : ''}{new Date(s.taken_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>

            {/* 3. Fotos */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {ANGLES.map(a => <FlipCard key={a.key} label={a.label} url={s.urls[a.key]} session={s} angleKey={a.key} onDeleteIndividual={(sess, angle) => setPhotoToDelete({ session: sess, angleKey: angle })} />)}
            </div>
          </div>
        ))
      )}

      <AnimatePresence>
        {photoToDelete && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPhotoToDelete(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)' }} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} style={{ position: 'relative', background: 'var(--surface-lowest)', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '320px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '1.2rem', color: 'var(--on-surface)', fontFamily: 'var(--font-display)' }}>¿Eliminar foto?</h3>
              <p style={{ margin: '0 0 24px', fontSize: '0.9rem', color: 'var(--on-surface-variant)', lineHeight: 1.4 }}>¿Seguro que deseas eliminar esta foto permanentemente? Esta acción no se puede deshacer.</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setPhotoToDelete(null)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border-subtle, rgba(0,0,0,0.1))', background: 'transparent', color: 'var(--on-surface)', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={confirmDeletePhoto} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: '#ff4d4d', color: '#fff', fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 16px rgba(255,77,77,0.3)' }}>Eliminar</button>
              </div>
            </motion.div>
          </div>
        )}
        {showWizard && <CaptureWizard userId={userId} onClose={() => setShowWizard(false)} onSaved={() => { setShowWizard(false); load(); }} />}
        {showCompare && <CompareModal sessions={sessions} onClose={() => setShowCompare(false)} />}
      </AnimatePresence>
    </div>
  );
}
