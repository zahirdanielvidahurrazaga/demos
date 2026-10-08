// ============================================================================
// Báscula Etekcity ESF24 por Bluetooth (BLE) — con MODO DIAGNÓSTICO.
// Protocolo portado de `etekcity_esf551_ble` (módulo esf24) + Paul Banks.
// Fase 1a: lee PESO. La impedancia/composición se decodifica en Fase 1b.
// ============================================================================
import { BleClient, numbersToDataView } from '@capacitor-community/bluetooth-le';

const SERVICE = '0000fff0-0000-1000-8000-00805f9b34fb';
const NOTIFY  = '0000fff1-0000-1000-8000-00805f9b34fb';
const WRITE   = '0000fff2-0000-1000-8000-00805f9b34fb';
const EPOCH_OFFSET = 946656000;

const CMD_END_MEASUREMENT = [0x1f, 0x05, 0x15, 0x10, 0x49];

function unitCmdKg() {
  const p = [0x13, 0x09, 0x15, 0x00, 0x10, 0x28, 0x37, 0x00, 0xa0];
  p[3] = (p[3] & 0xf0) | 1;
  p[8] = (p[8] & 0xf0) | 1;
  return p;
}
function measInitCmd() {
  const cmd = [0x20, 0x08, 0x15, 0, 0, 0, 0, 0];
  const ts = Math.floor(Date.now() / 1000) - EPOCH_OFFSET;
  cmd[3] = ts & 0xff; cmd[4] = (ts >> 8) & 0xff; cmd[5] = (ts >> 16) & 0xff; cmd[6] = (ts >> 24) & 0xff;
  let sum = 0; for (let i = 0; i < 7; i++) sum += cmd[i];
  cmd[7] = sum & 0xff;
  return cmd;
}
function dvToHex(dv) {
  const out = [];
  for (let i = 0; i < dv.byteLength; i++) out.push(dv.getUint8(i).toString(16).padStart(2, '0'));
  return out.join('');
}

// ── Escanea y devuelve TODOS los dispositivos encontrados (id + nombre) ──
export async function scanDevices({ seconds = 9, onDevice, onLog } = {}) {
  await BleClient.initialize({ androidNeverForLocation: true });
  onLog?.('Bluetooth inicializado. Escaneando ' + seconds + 's…');
  const found = new Map();
  try {
    await BleClient.requestLEScan({ allowDuplicates: false }, (res) => {
      const id = res.device?.deviceId;
      if (!id) return;
      const name = res.device?.name || res.localName || '(sin nombre)';
      if (!found.has(id)) {
        found.set(id, { id, name });
        onDevice?.({ id, name });
        onLog?.('📡 ' + name + '  ·  ' + id);
      }
    });
  } catch (e) {
    onLog?.('❌ Error al escanear: ' + (e.message || e));
  }
  await new Promise((r) => setTimeout(r, seconds * 1000));
  try { await BleClient.stopLEScan(); } catch {}
  onLog?.('Escaneo terminado: ' + found.size + ' dispositivo(s).');
  return Array.from(found.values());
}

// ── Conecta a un dispositivo y realiza una pesada (con log detallado) ──
export async function connectAndWeigh(deviceId, { onLog, onLiveWeight, onRawFrame, timeoutMs = 60000 } = {}) {
  onLog?.('Conectando a ' + deviceId + '…');
  await BleClient.connect(deviceId, () => onLog?.('⚠️ Báscula desconectada.'));
  onLog?.('✅ Conectado. Leyendo servicios GATT…');

  // Volcar servicios/características reales (clave para diagnóstico)
  let hasNotify = false, hasWrite = false;
  try {
    const services = await BleClient.getServices(deviceId);
    for (const s of services) {
      onLog?.('SVC ' + s.uuid);
      for (const c of s.characteristics || []) {
        const props = Object.keys(c.properties || {}).filter((k) => c.properties[k]).join(',');
        onLog?.('   ◦ ' + c.uuid + ' [' + props + ']');
        if (c.uuid.toLowerCase() === NOTIFY) hasNotify = true;
        if (c.uuid.toLowerCase() === WRITE) hasWrite = true;
      }
    }
  } catch (e) {
    onLog?.('getServices falló: ' + (e.message || e));
  }
  if (!hasNotify) onLog?.('⚠️ No vi la característica notify ' + NOTIFY + ' — quizá el UUID es otro (ver lista arriba).');

  const rawFrames = [];
  const state = { unitSet: false, measInit: false, done: false };
  let resolveFn, rejectFn;
  const done = new Promise((res, rej) => { resolveFn = res; rejectFn = rej; });

  const writeCmd = async (arr) => {
    // fff2 es writeWithoutResponse (no acepta write con confirmación)
    try { await BleClient.writeWithoutResponse(deviceId, SERVICE, WRITE, numbersToDataView(arr)); onLog?.('→ cmd ' + arr.map((x) => x.toString(16).padStart(2, '0')).join('')); }
    catch (e) { onLog?.('write falló: ' + (e.message || e)); }
  };

  let impedanceTimer = null;
  const finalize = (weight, r1, r2, hex, bytes) => {
    if (state.done) return;
    state.done = true;
    if (impedanceTimer) clearTimeout(impedanceTimer);
    writeCmd(CMD_END_MEASUREMENT);
    const hasImp = r1 > 0 || r2 > 0;
    onLog?.('✅ ' + weight + ' kg' + (hasImp ? ' · impedancia ' + r1 + '/' + r2 + ' Ω' : ' · sin impedancia (no hubo contacto descalza)'));
    resolveFn({ weight_kg: weight, impedance_r1: r1 || null, impedance_r2: r2 || null, finalHex: hex, finalBytes: bytes, rawFrames: rawFrames.slice() });
  };

  try {
    await BleClient.startNotifications(deviceId, SERVICE, NOTIFY, (dv) => {
      const hex = dvToHex(dv);
      rawFrames.push(hex);
      onRawFrame?.(hex);
      onLog?.('← ' + hex);
      const n = dv.byteLength;
      const b = (i) => dv.getUint8(i);

      if (n === 15 && b(0) === 0x12 && b(1) === 0x0f && b(2) === 0x15) {
        // Negociación de unidad → responder KG (en cada trama hasta que avance)
        writeCmd(unitCmdKg());
      } else if (n === 11 && b(0) === 0x14 && b(1) === 0x0b && b(2) === 0x15) {
        // Pide iniciar medición → mandar timestamp
        writeCmd(measInitCmd());
      } else if (n === 11 && b(0) === 0x10 && b(1) === 0x0b && b(2) === 0x15) {
        const weight = ((b(3) << 8) | b(4)) / 100;
        const r1 = (b(6) << 8) | b(7); // resistencia 1 (BE uint16)
        const r2 = (b(8) << 8) | b(9); // resistencia 2 (BE uint16)
        onLiveWeight?.(weight);
        if (r1 > 0 || r2 > 0) {
          // Peso + impedancia listos → medición completa
          finalize(weight, r1, r2, hex, Array.from({ length: n }, (_, i) => b(i)));
        } else if (b(5) === 1 && !impedanceTimer) {
          // Peso estable pero impedancia aún no medida → esperar (sin cerrar)
          onLog?.('⚖️ Peso ' + weight + ' kg. Midiendo composición… quédate DESCALZA y quieta.');
          impedanceTimer = setTimeout(() => finalize(weight, 0, 0, hex, Array.from({ length: n }, (_, i) => b(i))), 14000);
        }
      }
    });
    onLog?.('🔔 Suscrito a notificaciones. Súbete a la báscula y quédate quieta.');
  } catch (e) {
    onLog?.('❌ startNotifications falló: ' + (e.message || e));
  }

  const timer = setTimeout(() => { if (!state.done) rejectFn(new Error('TIMEOUT')); }, timeoutMs);
  try {
    return await done;
  } finally {
    clearTimeout(timer);
    try { await BleClient.stopNotifications(deviceId, SERVICE, NOTIFY); } catch {}
    try { await BleClient.disconnect(deviceId); } catch {}
  }
}
