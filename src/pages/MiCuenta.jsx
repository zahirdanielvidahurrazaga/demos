import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Camera, Mail, Phone, Shield, Clock, ChevronRight, ChevronLeft, Check, AlertCircle, Utensils, TrendingUp, CalendarDays, QrCode, X, Home, CreditCard, Compass, Cake, Star, MessageSquare, Ruler } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { uploadAvatar, isLegacyDataUrl } from '../lib/avatar';
import { useScrollDetect } from '../hooks/useScrollDetect';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { motion, AnimatePresence } from 'framer-motion';

function MiCuenta() {
  const navigate = useNavigate();
  const { user, role, plan, classesRemaining, membershipStatus, myReservations, refreshUserData, avatarUrl, setAvatarUrl, setShowTour } = useAuth();
  const isScrolled = useScrollDetect(30);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [bio, setBio] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [experience, setExperience] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [pendingAvatar, setPendingAvatar] = useState(null);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [initialProfile, setInitialProfile] = useState({});

  // Load user data
  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  // Migración lazy: si el avatar guardado es base64 (modelo viejo), subirlo a
  // Storage y reemplazar avatar_url por la URL. Se hace una sola vez al abrir
  // Mi Cuenta; mientras tanto el base64 sigue mostrándose sin problema.
  useEffect(() => {
    if (!user || !isLegacyDataUrl(avatarUrl)) return;
    let cancelled = false;
    (async () => {
      const { url } = await uploadAvatar(user.id, avatarUrl);
      if (cancelled || !url) return;
      await supabase.from('users').update({ avatar_url: url }).eq('id', user.id);
      try { localStorage.setItem(`avatar_${user.id}`, url); } catch (e) {}
      setAvatarUrl(url);
    })();
    return () => { cancelled = true; };
  }, [user, avatarUrl, role]); // eslint-disable-line react-hooks/exhaustive-deps

  const compressAvatar = (dataUrl) =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const SIZE = 300;
        const ratio = Math.min(SIZE / img.width, SIZE / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      // Si la imagen no se puede decodificar (p.ej. HEIC raro), no colgar la
      // promesa: devolver el original para que el guardado no se quede atorado.
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });

  const handleCameraClick = async () => {
    try {
      const photo = await CapCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt,
        presentationStyle: 'popover',
      });
      if (photo.dataUrl) setPendingAvatar(photo.dataUrl);
    } catch (e) {
      console.error(e);
      alert('Aviso de Cámara: ' + e.message);
    }
  };

  const confirmAvatar = async () => {
    if (!pendingAvatar || savingAvatar) return;
    setSavingAvatar(true);
    setError('');
    const compressed = await compressAvatar(pendingAvatar);

    // Subir a Supabase Storage y guardar la URL pública. Si la subida falla NO
    // fingimos que guardó (antes caía a base64 silencioso y la foto no persistía
    // → la usuaria creía que sí). Avisamos y dejamos la foto pendiente para reintentar.
    const { url, error: upErr } = await uploadAvatar(user.id, compressed);
    if (upErr || !url) {
      console.error('Error subiendo avatar a Storage:', upErr);
      setError('No se pudo subir la foto. Revisa tu conexión e inténtalo de nuevo.');
      setSavingAvatar(false);
      return; // mantiene pendingAvatar para que pueda reintentar
    }

    setAvatarUrl(url);
    // El caché local es secundario; si revienta NO debe impedir el guardado en BD.
    try { localStorage.setItem(`avatar_${user.id}`, url); } catch (e) {
      console.warn('No se pudo cachear el avatar en localStorage:', e);
    }

    const { error: avatarError } = await supabase
      .from('users')
      .update({ avatar_url: url })
      .eq('id', user.id);

    if (avatarError) {
      console.error('Error guardando avatar en DB:', avatarError);
      setError('Foto subida, pero no se pudo sincronizar. Inténtalo de nuevo.');
      setSavingAvatar(false);
      return;
    }

    setPendingAvatar(null);
    setSavingAvatar(false);
  };

  const loadProfile = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('full_name, phone, emergency_contact_name, emergency_contact_phone, bio, experience, birth_date, height_cm')
      .eq('id', user.id)
      .single();

    if (data) {
      setFullName(data.full_name || '');
      setPhone(data.phone || '');
      setEmergencyName(data.emergency_contact_name || '');
      setEmergencyPhone(data.emergency_contact_phone || '');
      setBio(data.bio || '');
      setExperience(data.experience || '');
      setBirthDate(data.birth_date || '');
      setHeightCm(data.height_cm != null ? String(data.height_cm) : '');

      setInitialProfile({
        fullName: data.full_name || '',
        phone: data.phone || '',
        emergencyName: data.emergency_contact_name || '',
        emergencyPhone: data.emergency_contact_phone || '',
        bio: data.bio || '',
        experience: data.experience || '',
        birthDate: data.birth_date || '',
        heightCm: data.height_cm != null ? String(data.height_cm) : ''
      });
    }
  };



  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);

    const updatePayload = {
      full_name: fullName,
      phone: phone,
      emergency_contact_name: emergencyName,
      emergency_contact_phone: emergencyPhone,
      birth_date: birthDate || null,
      height_cm: heightCm ? parseFloat(heightCm) : null
    };
    
    if (role === 'COACH') {
      updatePayload.bio = bio;
      updatePayload.experience = experience;
    }

    const { error: updateError } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', user.id);

    if (updateError) {
      setError('Error al guardar. Intenta de nuevo.');
    } else {
      setInitialProfile({
        fullName, phone, emergencyName, emergencyPhone, bio, experience, birthDate, heightCm
      });
      
      setSaved(true);
      if (refreshUserData) await refreshUserData();
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  const hasChanges = 
    fullName !== (initialProfile.fullName || '') ||
    phone !== (initialProfile.phone || '') ||
    emergencyName !== (initialProfile.emergencyName || '') ||
    emergencyPhone !== (initialProfile.emergencyPhone || '') ||
    bio !== (initialProfile.bio || '') ||
    experience !== (initialProfile.experience || '') ||
    birthDate !== (initialProfile.birthDate || '') ||
    heightCm !== (initialProfile.heightCm || '');

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Styles
  const cardStyle = {
    background: 'var(--glass-bg, rgba(255,255,255,0.65))',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    borderRadius: '28px',
    padding: '24px 20px',
    marginBottom: '16px',
    boxShadow: '0 8px 32px rgba(255,145,77,0.05), inset 0 1px 0 rgba(255,255,255,0.6)',
    border: '1px solid var(--glass-border, rgba(255,255,255,0.5))'
  };

  const labelStyle = {
    fontSize: '0.75rem',
    fontWeight: 800,
    color: 'var(--on-surface-variant)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  };

  const inputContainerStyle = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    background: 'var(--surface, rgba(255,255,255,0.8))',
    borderRadius: '18px',
    border: '1px solid var(--border-subtle)',
    transition: 'all 0.3s ease',
    overflow: 'hidden',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
  };

  const inputStyle = {
    flex: 1,
    width: '100%',
    padding: '16px 16px 16px 46px',
    border: 'none',
    background: 'transparent',
    fontSize: '1rem',
    fontWeight: 600,
    fontFamily: 'DM Sans, sans-serif',
    color: 'var(--on-surface)',
    outline: 'none',
    boxSizing: 'border-box'
  };

  const inputReadOnlyStyle = {
    ...inputStyle,
    color: 'var(--on-surface-variant)',
    opacity: 0.7,
    cursor: 'not-allowed'
  };

  const iconStyle = {
    position: 'absolute',
    left: '16px',
    color: 'var(--on-surface-variant)',
    pointerEvents: 'none',
    transition: 'color 0.3s ease'
  };

  return (
    <div className="mobile-app-container" style={{ background: 'var(--app-bg)' }}>

      {/* PREVIEW FOTO — modal de confirmación */}
      <AnimatePresence>
        {pendingAvatar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '32px'
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
              style={{
                width: '200px', height: '200px', borderRadius: '50%',
                overflow: 'hidden', border: '4px solid #FF8B42',
                boxShadow: '0 0 0 8px rgba(255,139,66,0.15), 0 30px 60px rgba(0,0,0,0.5)'
              }}
            >
              <img src={pendingAvatar} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </motion.div>

            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'white', fontWeight: 700, fontSize: '1.1rem', margin: '0 0 6px' }}>¿Usar esta foto?</p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: 0 }}>Aparecerá en tu perfil y en el menú</p>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <button
                onClick={() => setPendingAvatar(null)}
                style={{
                  padding: '14px 28px', borderRadius: '99px', border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}
              >
                <X size={16} /> Cancelar
              </button>
              <button
                onClick={confirmAvatar}
                disabled={savingAvatar}
                style={{
                  padding: '14px 28px', borderRadius: '99px', border: 'none',
                  background: '#FF8B42', color: 'white', fontWeight: 800, fontSize: '0.95rem', cursor: savingAvatar ? 'default' : 'pointer',
                  boxShadow: '0 8px 20px rgba(255,139,66,0.4)', opacity: savingAvatar ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}
              >
                <Check size={16} /> {savingAvatar ? 'Guardando…' : 'Usar foto'}
              </button>
            </div>

            <button
              onClick={handleCameraClick}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}
            >
              Elegir otra foto
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER UNIFICADO */}
      <header className="ios-header" style={{ paddingBottom: '5px', background: 'transparent', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div 
              onClick={() => navigate(-1)}
              style={{ 
                width: '36px', height: '36px', borderRadius: '50%', 
                background: 'rgba(255,139,66,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <ChevronLeft size={20} color="var(--primary)" />
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', margin: '0 0 2px', fontWeight: 600 }}>Mi perfil</p>
              <h1 style={{ fontSize: '1.8rem', fontFamily: 'var(--font-display)', margin: 0, lineHeight: 1.1, color: 'var(--black)' }}>Mi Cuenta</h1>
            </div>
          </div>
          <div style={{ 
            width: '42px', height: '42px', borderRadius: '50%', 
            background: 'rgba(255,139,66,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <User size={20} color="var(--primary)" />
          </div>
        </div>
      </header>

      <main className="dashboard-main" style={{ display: 'block', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
        <div className="dashboard-sidebar" style={{ width: '100%' }}>

          {/* AVATAR */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px', marginTop: '10px' }}>
            <div style={{ position: 'relative' }}>
              <motion.div
                animate={{ boxShadow: ['0 0 0 0 rgba(255,139,66,0.4)', '0 0 0 15px rgba(255,139,66,0)'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                style={{
                  width: '110px', height: '110px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #FF8B42, #EEBA89)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 15px 35px rgba(255,139,66,0.35)',
                  overflow: 'hidden',
                  border: '3px solid var(--app-surface-solid)'
                }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Foto de perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '2.8rem', fontWeight: 800, color: 'white', fontFamily: 'DM Sans' }}>
                    {fullName ? fullName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || '?'}
                  </span>
                )}
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleCameraClick}
                style={{
                  position: 'absolute', bottom: '0', right: '0',
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: 'var(--app-surface-solid)', border: '2px solid var(--app-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)', cursor: 'pointer',
                  zIndex: 2
                }}>
                <Camera size={16} color="var(--primary)" />
              </motion.div>
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--on-surface)', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={18} color="var(--primary)" /> Datos Personales
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Nombre completo</label>
              <div style={inputContainerStyle} className="input-glass">
                <User size={18} style={iconStyle} className="input-icon" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Tu nombre"
                  style={inputStyle}
                  onFocus={(e) => { e.target.parentElement.style.borderColor = '#FF8B42'; e.target.parentElement.querySelector('.input-icon').style.color = '#FF8B42'; }}
                  onBlur={(e) => { e.target.parentElement.style.borderColor = 'var(--border-subtle)'; e.target.parentElement.querySelector('.input-icon').style.color = 'var(--on-surface-variant)'; }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Teléfono</label>
              <div style={inputContainerStyle} className="input-glass">
                <Phone size={18} style={iconStyle} className="input-icon" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+52 000 000 0000"
                  style={inputStyle}
                  onFocus={(e) => { e.target.parentElement.style.borderColor = '#FF8B42'; e.target.parentElement.querySelector('.input-icon').style.color = '#FF8B42'; }}
                  onBlur={(e) => { e.target.parentElement.style.borderColor = 'var(--border-subtle)'; e.target.parentElement.querySelector('.input-icon').style.color = 'var(--on-surface-variant)'; }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Cumpleaños</label>
              <div style={inputContainerStyle} className="input-glass">
                <Cake size={18} style={iconStyle} className="input-icon" />
                <input
                  type="date"
                  value={birthDate || ''}
                  onChange={(e) => setBirthDate(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: '46px' }}
                  onFocus={(e) => { e.target.parentElement.style.borderColor = '#FF8B42'; e.target.parentElement.querySelector('.input-icon').style.color = '#FF8B42'; }}
                  onBlur={(e) => { e.target.parentElement.style.borderColor = 'var(--border-subtle)'; e.target.parentElement.querySelector('.input-icon').style.color = 'var(--on-surface-variant)'; }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Estatura (cm)</label>
              <div style={inputContainerStyle} className="input-glass">
                <Ruler size={18} style={iconStyle} className="input-icon" />
                <input
                  type="number"
                  inputMode="decimal"
                  min="120"
                  max="220"
                  placeholder="Ej. 165"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: '46px' }}
                  onFocus={(e) => { e.target.parentElement.style.borderColor = '#FF8B42'; e.target.parentElement.querySelector('.input-icon').style.color = '#FF8B42'; }}
                  onBlur={(e) => { e.target.parentElement.style.borderColor = 'var(--border-subtle)'; e.target.parentElement.querySelector('.input-icon').style.color = 'var(--on-surface-variant)'; }}
                />
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)', margin: '6px 4px 0' }}>La usamos para calcular tu composición corporal al pesarte con la báscula.</p>
            </div>

            <div>
              <label style={labelStyle}>Email</label>
              <div style={{ ...inputContainerStyle, background: 'var(--surface-low)', opacity: 0.8 }}>
                <Mail size={18} style={iconStyle} />
                <input
                  type="email"
                  value={user?.email || ''}
                  readOnly
                  style={inputReadOnlyStyle}
                />
              </div>
            </div>
          </div>

          {role === 'COACH' && (
          <div style={cardStyle}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--on-surface)', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Star size={18} color="var(--primary)" /> Perfil Público
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Acerca de mí (Biografía)</label>
              <div style={{ ...inputContainerStyle, alignItems: 'flex-start' }} className="input-glass">
                <MessageSquare size={18} style={{ ...iconStyle, top: '16px' }} className="input-icon" />
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="¡Hola! Soy Coach... Me apasiona el Pilates porque..."
                  rows={4}
                  style={{ ...inputStyle, resize: 'none', fontFamily: 'inherit' }}
                  onFocus={(e) => { e.target.parentElement.style.borderColor = '#FF8B42'; e.target.parentElement.querySelector('.input-icon').style.color = '#FF8B42'; }}
                  onBlur={(e) => { e.target.parentElement.style.borderColor = 'var(--border-subtle)'; e.target.parentElement.querySelector('.input-icon').style.color = 'var(--on-surface-variant)'; }}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Especialidad / Experiencia</label>
              <div style={inputContainerStyle} className="input-glass">
                <TrendingUp size={18} style={iconStyle} className="input-icon" />
                <input
                  type="text"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  placeholder="Ej. Reformer Pro, 5 años de exp."
                  style={inputStyle}
                  onFocus={(e) => { e.target.parentElement.style.borderColor = '#FF8B42'; e.target.parentElement.querySelector('.input-icon').style.color = '#FF8B42'; }}
                  onBlur={(e) => { e.target.parentElement.style.borderColor = 'var(--border-subtle)'; e.target.parentElement.querySelector('.input-icon').style.color = 'var(--on-surface-variant)'; }}
                />
              </div>
            </div>
          </div>
          )}

          {/* MI MEMBRESÍA */}
          {role !== 'COACH' && (
          <div style={{
            ...cardStyle,
            background: 'linear-gradient(135deg, rgba(45,41,40,0.85) 0%, rgba(61,53,50,0.85) 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 15px 35px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)'
          }}>
            {/* Decorative circle */}
            <div style={{
              position: 'absolute', top: '-30px', right: '-30px',
              width: '120px', height: '120px', borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,139,66,0.2) 0%, transparent 70%)',
              filter: 'blur(10px)'
            }} />

            <h3 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.6)', margin: '0 0 12px', position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={18} color="rgba(255,255,255,0.8)" /> Mi Membresía
            </h3>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', position: 'relative' }}>
              <div>
                <p style={{ fontSize: '1.4rem', fontWeight: 900, margin: '0 0 4px', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
                  {plan || 'Sin Plan'}
                </p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: membershipStatus === 'ACTIVE' ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '12px', border: '1px solid', borderColor: membershipStatus === 'ACTIVE' ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.2)' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: membershipStatus === 'ACTIVE' ? '#4ade80' : 'rgba(255,255,255,0.5)' }} />
                  <p style={{ fontSize: '0.75rem', color: membershipStatus === 'ACTIVE' ? '#4ade80' : 'rgba(255,255,255,0.7)', margin: 0, fontWeight: 700 }}>
                    {membershipStatus === 'ACTIVE' ? 'Activa' : 'Inactiva'}
                  </p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '3.2rem', fontWeight: 900, margin: 0, lineHeight: 0.9, color: '#FF8B42', fontFamily: 'var(--font-display)', letterSpacing: '-0.05em' }}>
                  {classesRemaining >= 9000 ? '∞' : classesRemaining}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', margin: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>
                  clases restantes
                </p>
              </div>
            </div>

            {/* Botón Renovar */}
            <div style={{ position: 'relative', marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px' }}>
              <motion.button 
                whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,139,66,0.25)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/planes')}
                style={{ 
                  width: '100%', padding: '14px', borderRadius: '16px', border: '1px solid rgba(255,139,66,0.3)', 
                  background: 'rgba(255,139,66,0.15)', color: '#FF8B42', 
                  fontSize: '0.95rem', fontWeight: 800, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'background 0.2s', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)'
                }}>
                <CreditCard size={18} />
                Renovar o Cambiar Plan
              </motion.button>
            </div>
          </div>
          )}



          <div style={cardStyle}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--on-surface)', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} color="var(--primary)" /> Contacto de Emergencia
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Nombre</label>
              <div style={inputContainerStyle} className="input-glass">
                <User size={18} style={iconStyle} className="input-icon" />
                <input
                  type="text"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  placeholder="Nombre del contacto"
                  style={inputStyle}
                  onFocus={(e) => { e.target.parentElement.style.borderColor = '#FF8B42'; e.target.parentElement.querySelector('.input-icon').style.color = '#FF8B42'; }}
                  onBlur={(e) => { e.target.parentElement.style.borderColor = 'var(--border-subtle)'; e.target.parentElement.querySelector('.input-icon').style.color = 'var(--on-surface-variant)'; }}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Teléfono</label>
              <div style={inputContainerStyle} className="input-glass">
                <Phone size={18} style={iconStyle} className="input-icon" />
                <input
                  type="tel"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  placeholder="+52 000 000 0000"
                  style={inputStyle}
                  onFocus={(e) => { e.target.parentElement.style.borderColor = '#FF8B42'; e.target.parentElement.querySelector('.input-icon').style.color = '#FF8B42'; }}
                  onBlur={(e) => { e.target.parentElement.style.borderColor = 'var(--border-subtle)'; e.target.parentElement.querySelector('.input-icon').style.color = 'var(--on-surface-variant)'; }}
                />
              </div>
            </div>
          </div>

          {/* ERROR / SUCCESS MESSAGES */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '12px 16px', borderRadius: '16px',
              background: '#ffdad6', color: '#93000a',
              fontSize: '0.85rem', marginBottom: '16px'
            }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {saved && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '12px 16px', borderRadius: '16px',
              background: 'rgba(255,139,66,0.1)', color: '#9b4500',
              fontSize: '0.85rem', marginBottom: '16px', fontWeight: 600
            }}>
              <Check size={16} /> Cambios guardados correctamente
            </div>
          )}

          {/* GUARDAR BUTTON FLOATING */}
          <AnimatePresence>
            {hasChanges && (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                style={{
                  position: 'fixed',
                  bottom: '90px', // About the height of BottomNav + some padding
                  left: '20px',
                  right: '20px',
                  zIndex: 100
                }}
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    width: '100%', padding: '16px',
                    borderRadius: '24px', border: '1px solid rgba(255,255,255,0.4)',
                    background: saving ? 'var(--surface-variant)' : 'var(--primary)',
                    color: 'white', fontSize: '1.05rem',
                    fontWeight: 800, fontFamily: 'var(--font-display)',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    boxShadow: saving ? 'none' : '0 15px 35px rgba(255,145,77,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
                    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }}
                >
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* LINK TO SETTINGS */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/ajustes')}
            style={{
              ...cardStyle,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer', marginBottom: '16px', padding: '16px 20px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '16px',
                background: 'var(--surface, rgba(255,255,255,0.8))', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), 0 2px 8px rgba(0,0,0,0.05)',
                border: '1px solid var(--glass-border, rgba(255,255,255,0.4))'
              }}>
                <Shield size={20} color="var(--on-surface)" />
              </div>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--on-surface)', fontFamily: 'DM Sans' }}>Ajustes</span>
            </div>
            <ChevronRight size={22} color="var(--on-surface-variant)" />
          </motion.div>

          {/* VER TOUR DE LA APP */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { setShowTour(true); navigate('/portal'); }}
            style={{
              ...cardStyle,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer', marginBottom: '100px', padding: '16px 20px',
              background: 'linear-gradient(135deg, rgba(255,145,77,0.1) 0%, rgba(255,145,77,0.05) 100%)',
              border: '1px solid rgba(255,145,77,0.2)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '16px',
                background: 'var(--surface, rgba(255,255,255,0.8))', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(255,145,77,0.15), inset 0 1px 0 rgba(255,255,255,0.6)',
                border: '1px solid rgba(255,145,77,0.3)'
              }}>
                <Compass size={20} color="var(--primary)" />
              </div>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'DM Sans' }}>Ver Tour de la App</span>
            </div>
            <ChevronRight size={22} color="var(--primary)" />
          </motion.div>

        </div>
      </main>


    </div>
  );
}

export default MiCuenta;
