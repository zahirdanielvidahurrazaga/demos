import { useState, useEffect, useCallback } from 'react';
import { Health as CapacitorHealth } from '@capgo/capacitor-health';
import { Capacitor } from '@capacitor/core';

const isNative = () => Capacitor.isNativePlatform();

// Solo pasos y calorías (+ peso y % de grasa de la báscula).
// La frecuencia cardíaca se quitó el 15-ago-2026: Google Play rechazó la 2.6.3
// por "acceso excesivo a datos de la función declarada" señalando HeartRate y
// ExerciseSession. Pedir un permiso de Health Connect exige una función que lo
// justifique, y el pulso solo pintaba un número suelto en Evolución.
// Si algún día se vuelve a necesitar, hay que reponer el permiso en
// AndroidManifest.xml Y justificarlo en la declaración de Play Console.
export function useHealth() {
  const [healthData, setHealthData] = useState({
    steps: null,
    calories: null,
  });
  const [healthPermission, setHealthPermission] = useState(false);
  const [healthLoading, setHealthLoading] = useState(false);

  // Sin dependencia en healthPermission — se controla desde los call sites
  const fetchTodayData = useCallback(async () => {
    if (!isNative()) return;
    setHealthLoading(true);

    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

      const [stepsRes, calRes] = await Promise.allSettled([
        CapacitorHealth.queryAggregated({
          dataType: 'steps',
          startDate: startOfDay.toISOString(),
          endDate: now.toISOString(),
          bucket: 'day',
          aggregation: 'sum',
        }),
        CapacitorHealth.queryAggregated({
          dataType: 'calories',
          startDate: startOfDay.toISOString(),
          endDate: now.toISOString(),
          bucket: 'day',
          aggregation: 'sum',
        }),
      ]);

      setHealthData({
        steps: stepsRes.status === 'fulfilled' && stepsRes.value?.samples?.length
          ? Math.round(stepsRes.value.samples[0].value)
          : null,
        calories: calRes.status === 'fulfilled' && calRes.value?.samples?.length
          ? Math.round(calRes.value.samples[0].value)
          : null,
      });
    } catch (err) {
      console.error('Error obteniendo datos de salud:', err);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  const requestPermissions = useCallback(async () => {
    if (!isNative()) return false;
    try {
      const result = await CapacitorHealth.requestAuthorization({
        read: ['steps', 'calories', 'weight', 'bodyFat'],
        write: ['calories'],
      });
      const granted = result?.readAuthorized?.length > 0;
      setHealthPermission(granted);
      if (granted) fetchTodayData(); // Llama directo, sin esperar el estado
      return granted;
    } catch (err) {
      console.error('Error solicitando permisos de salud:', err);
      return false;
    }
  }, [fetchTodayData]);

  const logPilatesWorkout = useCallback(async (durationMinutes = 60, caloriesBurned = 280) => {
    if (!isNative()) return;
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - durationMinutes * 60 * 1000);
      await CapacitorHealth.saveSample({
        dataType: 'calories',
        value: caloriesBurned,
        unit: 'kilocalorie',
        startDate: startTime.toISOString(),
        endDate: endTime.toISOString(),
        metadata: { workoutType: 'pilates' },
      });
    } catch (err) {
      console.error('Error registrando workout de pilates:', err);
    }
  }, []);

  // Lee la última medición de peso y % de grasa desde Salud (la pone ahí la
  // báscula VeSync al sincronizar). Devuelve { weight_kg, body_fat_pct, measured_at }.
  const readBodyComposition = useCallback(async () => {
    if (!isNative()) return null;
    const now = new Date();
    const start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const latest = (samples) => (samples || []).reduce((a, b) => {
      if (!a) return b;
      const da = new Date(a.endDate || a.startDate || 0).getTime();
      const db = new Date(b.endDate || b.startDate || 0).getTime();
      return db >= da ? b : a;
    }, null);
    try {
      const [wRes, fRes] = await Promise.allSettled([
        CapacitorHealth.readSamples({ dataType: 'weight', startDate: start.toISOString(), endDate: now.toISOString(), limit: 60 }),
        CapacitorHealth.readSamples({ dataType: 'bodyFat', startDate: start.toISOString(), endDate: now.toISOString(), limit: 60 }),
      ]);
      const w = wRes.status === 'fulfilled' ? latest(wRes.value?.samples) : null;
      const f = fRes.status === 'fulfilled' ? latest(fRes.value?.samples) : null;
      if (!w || w.value == null) return null;
      let fat = f?.value ?? null;
      if (fat != null && fat <= 1) fat = fat * 100; // HealthKit guarda fracción 0-1
      return {
        weight_kg: Math.round(w.value * 10) / 10,
        body_fat_pct: fat != null ? Math.round(fat * 10) / 10 : null,
        measured_at: w.endDate || w.startDate || new Date().toISOString(),
      };
    } catch (err) {
      console.error('Error leyendo composición corporal:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!isNative()) return;
    requestPermissions();
  }, []);

  return {
    healthData,
    healthPermission,
    healthLoading,
    requestPermissions,
    fetchTodayData,
    logPilatesWorkout,
    readBodyComposition,
  };
}
