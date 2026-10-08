import { supabase } from './supabase';

// Convierte un data URL (data:image/...;base64,XXXX) a Blob SIN usar fetch().
// Por qué: en el WebView nativo de iOS (WKWebView) `fetch()` sobre un `data:` URL
// falla, así que la subida a Storage nunca ocurría y la foto no se guardaba.
// La conversión manual con atob funciona igual en web y en nativo.
function dataUrlToBlob(dataUrl) {
  const comma = dataUrl.indexOf(',');
  const header = dataUrl.slice(0, comma);
  const b64 = dataUrl.slice(comma + 1);
  const mime = (header.match(/data:(.*?);base64/) || [])[1] || 'image/jpeg';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// Sube un avatar (data URL o Blob) a Supabase Storage en avatars/{userId}/avatar.jpg
// y devuelve la URL pública con cache-busting (?v=timestamp), ya que la ruta es
// fija y el navegador/CDN cachearía la imagen anterior.
export async function uploadAvatar(userId, source) {
  if (!userId || !source) return { url: null, error: 'datos_incompletos' };

  let blob;
  try {
    if (source instanceof Blob) {
      blob = source;
    } else if (typeof source === 'string' && source.startsWith('data:')) {
      blob = dataUrlToBlob(source); // <- ya NO usamos fetch() para data: URLs
    } else {
      // URL http(s) normal (caso raro): aquí fetch sí aplica.
      blob = await (await fetch(source)).blob();
    }
  } catch (e) {
    return { url: null, error: e };
  }

  const path = `${userId}/avatar.jpg`;
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '31536000' });

  if (error) return { url: null, error };

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  const url = `${data.publicUrl}?v=${Date.now()}`;
  return { url, error: null };
}

// ¿La cadena es un avatar base64 heredado (modelo viejo) que conviene migrar?
export const isLegacyDataUrl = (s) => typeof s === 'string' && s.startsWith('data:');
