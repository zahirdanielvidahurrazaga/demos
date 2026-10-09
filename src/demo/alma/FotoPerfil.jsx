import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { uploadAvatar } from '../../lib/avatar';
import { a } from './estilo';
import { Avatar, Aviso, Boton, Hoja } from './ui';

// Foto de perfil: la misma lógica que Mi Cuenta de Be Fit (comprimir a 300 px,
// subir al bucket `avatars` y guardar users.avatar_url). En el celular el
// selector de archivos ofrece cámara o galería.

function comprimir(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const lado = 300;
      const r = Math.min(lado / img.width, lado / img.height, 1);
      const lienzo = document.createElement('canvas');
      lienzo.width = img.width * r;
      lienzo.height = img.height * r;
      lienzo.getContext('2d').drawImage(img, 0, 0, lienzo.width, lienzo.height);
      resolve(lienzo.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => resolve(null); // no se pudo leer (p. ej. HEIC en Safari viejo): no se sube
    img.src = dataUrl;
  });
}

export default function FotoPerfil({ tam = 64 }) {
  const { user, avatarUrl, setAvatarUrl, profileName } = useAuth();
  const entrada = useRef(null);
  const [pendiente, setPendiente] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [falloFormato, setFalloFormato] = useState(false);

  const elegir = (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    const lector = new FileReader();
    lector.onload = async () => {
      const lista = await comprimir(lector.result);
      if (!lista) { setError(''); setFalloFormato(true); return; }
      setFalloFormato(false);
      setError('');
      setPendiente(lista);
    };
    lector.readAsDataURL(archivo);
  };

  const guardar = async () => {
    setGuardando(true);
    setError('');
    const { url, error: e } = await uploadAvatar(user.id, pendiente);
    if (e || !url) { setGuardando(false); setError('No se pudo subir la foto. Revisa tu conexión e inténtalo de nuevo.'); return; }
    const { error: e2 } = await supabase.from('users').update({ avatar_url: url }).eq('id', user.id);
    setGuardando(false);
    if (e2) { setError('La foto se subió pero no se pudo guardar. Inténtalo de nuevo.'); return; }
    setAvatarUrl(`${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`);
    try { localStorage.setItem(`avatar_${user.id}`, url); } catch { /* sin almacenamiento */ }
    setPendiente(null);
  };

  return (
    <>
      <button type="button" onClick={() => entrada.current?.click()} aria-label="Cambiar foto de perfil" style={{ position: 'relative', border: 'none', background: 'none', padding: 0, cursor: 'pointer', flexShrink: 0 }}>
        <Avatar src={avatarUrl} nombre={profileName} tam={tam} borde="var(--a-solido)" />
        <span style={{
          position: 'absolute', right: -2, bottom: -2, width: 26, height: 26, borderRadius: '50%', background: a.tinta, color: a.sobreTinta,
          display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--a-niebla)',
        }}><Camera size={13} /></span>
      </button>
      <input ref={entrada} type="file" accept="image/*" onChange={elegir} style={{ display: 'none' }} />
      <Hoja abierta={falloFormato} alCerrar={() => setFalloFormato(false)} titulo="Foto no compatible">
        <div style={{ padding: '34px 24px 26px' }}>
          <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>No pudimos leer esa foto</div>
          <p style={{ color: a.suave, lineHeight: 1.5 }}>Prueba con otra o tómala con la cámara (JPG o PNG).</p>
          <Boton onClick={() => { setFalloFormato(false); entrada.current?.click(); }} style={{ width: '100%' }}>Elegir otra foto</Boton>
        </div>
      </Hoja>

      <Hoja abierta={Boolean(pendiente)} alCerrar={() => !guardando && setPendiente(null)} titulo="Tu foto">
        <div style={{ padding: '34px 24px 26px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', letterSpacing: '-0.03em' }}><span style={{ fontWeight: 300 }}>¿Te gusta </span><strong>así</strong>?</div>
          {pendiente && <img src={pendiente} alt="" style={{ width: 160, height: 160, borderRadius: '50%', objectFit: 'cover', margin: '22px auto', display: 'block', border: '4px solid var(--a-solido)', boxShadow: '0 14px 30px var(--a-sombra)' }} />}
          <Boton onClick={guardar} disabled={guardando} style={{ width: '100%' }}>
            {guardando && <Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} />} {guardando ? 'Guardando…' : 'Usar esta foto'}
          </Boton>
          <Boton tipo="linea" onClick={() => entrada.current?.click()} disabled={guardando} style={{ width: '100%', marginTop: 8 }}>Elegir otra</Boton>
          {error && <Aviso tono="error">{error}</Aviso>}
        </div>
      </Hoja>
    </>
  );
}
