import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabase';

const isNative = () => Capacitor.isNativePlatform();

export async function registerPushToken(userId) {
  if (!isNative() || !userId) return;

  try {
    const { receive } = await PushNotifications.requestPermissions();
    if (receive !== 'granted') return;

    // Listener antes de register() para no perder el evento
    await PushNotifications.addListener('registration', async ({ value: token }) => {
      const platform = Capacitor.getPlatform();
      await supabase.from('device_tokens').upsert(
        { user_id: userId, token, platform, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,token' }
      );
    });

    await PushNotifications.register();
  } catch (err) {
    console.error('Error registrando push token:', err);
  }
}

export async function unregisterPushToken(userId) {
  if (!isNative() || !userId) return;
  try {
    // Obtener token actual antes de hacer unregister
    // (Capacitor no expone el token actual directamente, se borra desde BD)
    await supabase.from('device_tokens').delete().eq('user_id', userId);
    await PushNotifications.unregister();
  } catch (err) {
    console.error('Error eliminando push token:', err);
  }
}

export function usePushNotifications({ onNotification, onAction } = {}) {
  useEffect(() => {
    if (!isNative()) return;

    const listeners = [];

    PushNotifications.addListener('registrationError', (err) => {
      console.error('Error de registro push:', err.error);
    }).then(l => listeners.push(l));

    // Notificación recibida mientras la app está abierta (foreground)
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      onNotification?.(notification);
    }).then(l => listeners.push(l));

    // Usuaria toca la notificación (background / killed)
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      onAction?.(action);
    }).then(l => listeners.push(l));

    return () => listeners.forEach(l => l.remove());
  }, [onNotification, onAction]);
}
