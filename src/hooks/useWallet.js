import { Capacitor, registerPlugin } from '@capacitor/core';
import { supabase } from '../lib/supabase';

const WalletPlugin = registerPlugin('WalletPlugin');

const isNative = () => Capacitor.isNativePlatform();
const isIOS = () => Capacitor.getPlatform() === 'ios';
const isAndroid = () => Capacitor.getPlatform() === 'android';

// Descarga y abre el .pkpass generado por la Edge Function
export async function addToAppleWallet(userId) {
  if (!isNative() || !isIOS()) return { success: false, reason: 'not_ios' };

  try {
    // Timeout de 25 segundos — evita que el botón quede colgado si la función no responde
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Tiempo de espera agotado. Intenta de nuevo.')), 25000)
    );

    const invokePromise = supabase.functions.invoke('generate-wallet-pass', {
      body: { userId },
    });

    const { data, error } = await Promise.race([invokePromise, timeoutPromise]);

    if (error) throw new Error(error.message || 'Error al generar el pase');

    const { passUrl } = data ?? {};
    if (!passUrl) throw new Error('No se recibió URL del pase');

    // Plugin nativo iOS — descarga el .pkpass y presenta PKAddPassesViewController
    const result = await WalletPlugin.addPass({ url: passUrl });
    if (!result?.success) throw new Error('No se pudo abrir Wallet');

    return { success: true };
  } catch (err) {
    console.error('Error generando Apple Wallet pass:', err);
    return { success: false, reason: err.message };
  }
}

// Genera el JWT de Google Wallet y abre el link de "Guardar"
export async function addToGoogleWallet(userId) {
  if (!isNative() || !isAndroid()) return { success: false, reason: 'not_android' };

  try {
    const { data, error } = await supabase.functions.invoke('generate-wallet-pass', {
      body: { userId, platform: 'android' },
    });

    if (error) throw error;

    const { saveUrl } = data;
    if (!saveUrl) throw new Error('No se recibió URL de Google Wallet');

    window.open(saveUrl, '_blank');

    return { success: true };
  } catch (err) {
    console.error('Error generando Google Wallet pass:', err);
    return { success: false, reason: err.message };
  }
}

// Detecta si la plataforma soporta Wallet
export function getWalletPlatform() {
  if (!isNative()) return null;
  if (isIOS()) return 'apple';
  if (isAndroid()) return 'google';
  return null;
}
