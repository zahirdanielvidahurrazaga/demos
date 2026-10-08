import { supabase } from './supabase';

// Imágenes locales por defecto de los productos sembrados (sin image_url en BD).
// Se usan tanto en la cafetería (cliente) como en el panel de Admin, para que la
// foto que ve el cliente sea la misma que el admin puede ver y reemplazar.
export const CAFE_IMG_MAP = {
  'Mango-Matcha': '/cafeteria/mango_matcha.webp',
  'Mango Proteín': '/cafeteria/mango_protein.webp',
  'Horchata Proteín': '/cafeteria/horchata_protein.webp',
  'Arroz con Leche': '/cafeteria/arroz_con_leche.webp',
  'Banana Maní': '/cafeteria/banana_mani.webp',
  'CHAI Frambuesa': '/cafeteria/chai_frambuesa.webp',
  'CHOCO BANANA': '/cafeteria/choco_banana.webp',
  'Dubai Proteín': '/cafeteria/dubai_protein.webp',
  'Mazapan': '/cafeteria/mazapan.webp',
  'Fit-colada': '/cafeteria/fit_colada.webp',
};

// URL efectiva de un producto: la subida por Admin (image_url) tiene prioridad;
// si no hay, cae al asset local sembrado mapeado por nombre.
export const resolveCafeImage = (product) =>
  product?.image_url || CAFE_IMG_MAP[product?.name] || null;

// Comprime una imagen (File/Blob/data URL) a JPEG ~max 900px, calidad 0.82.
// Devuelve un Blob listo para subir (evita subir fotos de 5MB del teléfono).
export function compressCafeImage(source, maxSize = 900, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const url = source instanceof Blob ? URL.createObjectURL(source) : source;
    const img = new Image();
    img.onerror = () => { if (source instanceof Blob) URL.revokeObjectURL(url); reject(new Error('no_image')); };
    img.onload = () => {
      const ratio = Math.min(1, maxSize / Math.max(img.width, img.height));
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      if (source instanceof Blob) URL.revokeObjectURL(url);
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('no_blob')), 'image/jpeg', quality);
    };
    img.src = url;
  });
}

// Sube una imagen comprimida a Storage (bucket público) con nombre único y
// devuelve su URL pública. RLS del bucket cafe-products: solo admin escribe.
export async function uploadImage(source, { bucket = 'cafe-products', folder = '', maxSize = 900 } = {}) {
  if (!source) return { url: null, error: 'sin_imagen' };
  let blob;
  // `maxSize` mayor para imágenes que se ven a pantalla completa (portadas),
  // no solo para las miniaturas de producto.
  try { blob = await compressCafeImage(source, maxSize); }
  catch (e) { return { url: null, error: e }; }

  const id = (crypto?.randomUUID?.() || String(Date.now() + Math.random())).replace(/[^a-z0-9-]/gi, '');
  const path = `${folder ? folder + '/' : ''}${id}.jpg`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '31536000' });
  if (error) return { url: null, error };

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

// Imagen de producto de cafetería (compat).
export const uploadCafeImage = (source) => uploadImage(source, { bucket: 'cafe-products' });
