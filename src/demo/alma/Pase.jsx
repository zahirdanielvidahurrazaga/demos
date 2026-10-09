import { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Wallet } from 'lucide-react';
import { addToAppleWallet, addToGoogleWallet, getWalletPlatform } from '../../hooks/useWallet';
import { useAuth } from '../../context/AuthContext';
import { a, vidrioFoto } from './estilo';
import { Aviso, Boton, Hoja, TarjetaTinta } from './ui';
import { cuandoTexto, diaTexto, fechaLarga, hora, ilimitado, reservasProximas } from './datos';

// El pase para entrar: baja desde arriba como una tarjeta de Wallet. El QR es
// el mismo que lee el mostrador en la app de Be Fit (el id de la clienta).
export default function Pase({ abierto, alCerrar, cfg }) {
  const { user, profileName, plan, classesRemaining, planExpiresAt, myReservations, globalClasses } = useAuth();
  const [wallet, setWallet] = useState(null); // null | 'cargando' | 'ok' | texto de aviso
  if (!abierto) return null;
  // En la app instalada se usa la función real (pase firmado por el estudio);
  // en la web solo se explica, porque Apple/Google exigen ese pase firmado.
  const nativo = getWalletPlatform();
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const nombreWallet = nativo === 'google' || (!nativo && /Android/i.test(ua)) ? 'Google Wallet' : 'Apple Wallet';
  const agregarWallet = async () => {
    if (!nativo) {
      setWallet(`En la app instalada este botón guarda tu pase en ${nombreWallet} y lo muestras sin abrir la app. En la demostración web no está disponible.`);
      return;
    }
    setWallet('cargando');
    const r = nativo === 'apple' ? await addToAppleWallet(user.id) : await addToGoogleWallet(user.id);
    setWallet(r?.success ? 'ok' : 'No se pudo agregar a Wallet. Inténtalo de nuevo.');
  };
  const prox = reservasProximas(myReservations, globalClasses).find((r) => r.status === 'confirmed' || !r.status);
  const h = prox ? hora(prox.time ?? prox.clase?.time) : null;
  return (
    <Hoja abierta alCerrar={alCerrar} titulo="Mi pase" desdeArriba>
      <div style={{ padding: 'calc(var(--a-alto-encabezado, 70px) + 6px) 18px 22px' }}>
        <TarjetaTinta radio={30}>
          <div style={{ position: 'relative', padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {cfg.marca?.logo && <img src={cfg.marca.logo} alt="" style={{ height: 26, filter: 'brightness(0) invert(1)' }} />}
              <span style={{ marginLeft: 'auto', fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.85 }}>Pase de entrada</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: '1.8rem', letterSpacing: '-0.02em', lineHeight: 1.05, margin: '20px 0 2px' }}>{profileName}</div>
            <div style={{ fontSize: '0.88rem', opacity: 0.88 }}>
              {plan && plan !== 'none' ? plan : 'Sin plan'} · {ilimitado(classesRemaining) ? 'ilimitado' : `${classesRemaining} clases`}
              {planExpiresAt ? ` · vence ${fechaLarga(planExpiresAt)}` : ''}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', margin: '22px 0 18px' }}>
              <div style={{ padding: 14, borderRadius: 26, background: '#fff', boxShadow: '0 0 0 6px rgba(255,255,255,.25)' }}>
                <QRCodeCanvas value={user?.id || 'alma'} size={196} fgColor="#22261B" level="M" />
              </div>
            </div>

            <div style={{ ...vidrioFoto, borderRadius: 22, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              {prox ? (
                <>
                  <div style={{ fontWeight: 300, fontSize: '2rem', lineHeight: 1 }}>{h.texto}<span style={{ fontFamily: a.letra, fontSize: '0.75rem', marginLeft: 3 }}>{h.sufijo}</span></div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prox.title ?? prox.clase?.title}</div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>{diaTexto(prox.inicio)} · {cuandoTexto(prox.inicio)}</div>
                  </div>
                </>
              ) : <div style={{ fontSize: '0.9rem' }}>No tienes clases reservadas.</div>}
            </div>
          </div>
        </TarjetaTinta>
        <Boton onClick={agregarWallet} disabled={wallet === 'cargando' || wallet === 'ok'} style={{ width: '100%', marginTop: 14, background: '#000', color: '#fff' }}>
          <Wallet size={18} /> {wallet === 'ok' ? `En tu ${nombreWallet}` : wallet === 'cargando' ? 'Agregando…' : `Agregar a ${nombreWallet}`}
        </Boton>
        {wallet && !['cargando', 'ok'].includes(wallet) && <Aviso>{wallet}</Aviso>}
        <p style={{ textAlign: 'center', color: a.suave, fontSize: '0.86rem', margin: '14px 0 0' }}>Muéstralo en recepción al llegar.</p>
      </div>
    </Hoja>
  );
}
