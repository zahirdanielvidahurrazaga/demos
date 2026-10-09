import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { CalendarCheck, CalendarPlus, Check, ChevronDown, Clock, Hourglass, Loader2, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { addClassToCalendar } from '../../hooks/useCalendar';
import { mexicoClassStart } from '../../lib/dates';
import { a } from './estilo';
import { Avatar, Aviso, Boton, Chip, Hoja } from './ui';
import {
  coachDe, cuandoTexto, descargarIcs, diaTexto, estadoDeClase, hora, ilimitado, inicioDeClase, MOTIVOS_CANCELAR,
} from './datos';

// Una clase: qué es, quién la da, cuántos lugares quedan y LA acción que toca
// (reservar, entrar a la lista de espera, aceptar el lugar liberado o cancelar).
// Las reglas viven en AuthContext y en la base, igual que en la app de Be Fit.
export default function HojaClase({ clase: claseAbierta, fecha, cfg, alCerrar, alVerPase, alPlanes }) {
  const {
    bookClass, cancelClass, acceptOffer, declineOffer, myReservations, waitlistPositions,
    classesRemaining, planExpiresAt, coaches, globalClasses,
  } = useAuth();
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [apartar, setApartar] = useState(true);
  const enVuelo = useRef(false);
  // La clase VIVA (cupos al día tras reservar/cancelar o por realtime), no la copia de cuando se abrió.
  const clase = (globalClasses || []).find((c) => c.id === claseAbierta?.id) || claseAbierta;
  const [verCoach, setVerCoach] = useState(false);
  const [companeras, setCompaneras] = useState(null);
  const [enCalendario, setEnCalendario] = useState(false);

  // Quién más va: solo si ella ya está inscrita (get_class_attendees no
  // devuelve rosters ajenos), igual que ClassmatesList de Be Fit.
  const inscrita = Boolean(clase && (myReservations || []).some((r) => r.classId === clase.id && (r.status || 'confirmed') === 'confirmed'));
  useEffect(() => {
    if (!inscrita || !clase?.id) return undefined;
    let vivo = true;
    supabase.rpc('get_class_attendees', { p_class_id: clase.id })
      .then(({ data, error }) => { if (vivo) setCompaneras(error ? [] : (data || [])); });
    return () => { vivo = false; };
  }, [inscrita, clase?.id]);

  if (!clase) return <Hoja abierta={false} />;
  const estado = estadoDeClase(clase, myReservations, fecha);
  const inicio = inicioDeClase(clase, fecha);
  const coach = coachDe(clase, coaches);
  const h = hora(clase.time);
  const lugares = clase.spots ?? 0;
  const vencida = planExpiresAt && new Date(planExpiresAt) < new Date();

  const correr = async (accion) => {
    if (enVuelo.current) return;
    enVuelo.current = true;
    setEnviando(true);
    setMensaje(null);
    try { await accion(); } finally { enVuelo.current = false; setEnviando(false); }
  };

  const reservar = () => correr(async () => {
    if (classesRemaining <= 0) { setMensaje(['error', 'No te quedan clases en tu paquete.', true]); return; }
    if (vencida) { setMensaje(['error', 'Tu membresía venció. Renuévala para reservar.', true]); return; }
    const r = await bookClass(clase, estado.tipo === 'llena' ? apartar : false);
    if (r === 'confirmed') setMensaje(['ok', '¡Listo! Tu lugar está apartado.']);
    else if (r === 'waitlist') setMensaje(['ok', apartar ? 'Estás en la lista. Si se libera un lugar, es tuyo automáticamente.' : 'Estás en la lista. Te avisamos si se libera un lugar.']);
    else setMensaje(['error', 'No se pudo reservar. Actualiza e inténtalo de nuevo.']);
  });

  const cancelar = () => correr(async () => {
    const r = await cancelClass(clase.id);
    if (r?.success) setMensaje(['ok', estado.tipo === 'espera' ? 'Saliste de la lista de espera.' : 'Cancelada. La clase regresó a tu paquete.']);
    else setMensaje(['error', MOTIVOS_CANCELAR[r?.reason] || 'No se pudo cancelar. Inténtalo de nuevo.']);
  });

  const aceptar = () => correr(async () => {
    const r = await acceptOffer(clase.id);
    const motivos = { expired: 'La oferta ya venció.', gone: 'Esa oferta ya no está.', no_credits: 'No te quedan clases.', membership: 'Tu membresía venció.' };
    setMensaje(r?.success ? ['ok', '¡Es tuyo! Te esperamos.'] : ['error', motivos[r?.reason] || 'No se pudo confirmar.']);
  });
  const ceder = () => correr(async () => {
    const r = await declineOffer(clase.id);
    setMensaje(r?.success ? ['ok', 'Cediste el lugar a la siguiente de la lista.'] : ['error', 'No se pudo ceder. Inténtalo de nuevo.']);
  });

  const posicion = waitlistPositions?.[clase.id];

  const agregarCalendario = async () => {
    if (!inicio) return;
    if (Capacitor.isNativePlatform()) {
      const id = await addClassToCalendar({ ...clase, classId: clase.id }, fecha || clase.date);
      setEnCalendario(Boolean(id));
      if (!id) setMensaje(['error', 'No se pudo agregar. Da permiso de calendario en Configuración.']);
      return;
    }
    // La hora del estudio (México), no la zona del teléfono.
    const inicioMx = mexicoClassStart(fecha || clase.date, clase.time) || inicio;
    descargarIcs({
      titulo: `${clase.title} — ${cfg?.nombre || 'Pilates'}`, inicio: inicioMx, lugar: cfg?.nombre || '',
      notas: `Con ${coach?.full_name || clase.instructor || 'tu coach'}. Lleva calcetines antiderrapantes. Tu pase está en la app.`,
    });
    setEnCalendario('descargado');
  };

  return (
    <Hoja abierta alCerrar={alCerrar} titulo={clase.title}>
      <div style={{ padding: '26px 22px 4px' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Chip claro>{diaTexto(inicio)}</Chip>
          <Chip claro>{cuandoTexto(inicio)}</Chip>
        </div>
        <div style={{ fontSize: '3.4rem', fontWeight: 300, lineHeight: 1, letterSpacing: '-0.04em', marginTop: 16 }}>
          {h.texto}<span style={{ fontSize: '1rem', fontWeight: 500, marginLeft: 4, color: a.suave, letterSpacing: 0 }}>{h.sufijo}</span>
        </div>
        <h2 style={{ margin: '6px 0 0', fontWeight: 700, fontSize: '1.7rem', letterSpacing: '-0.03em', lineHeight: 1.1 }}>{clase.title}</h2>
      </div>
      <div style={{ padding: '18px 22px 26px' }}>
        {clase.description && <p style={{ margin: '0 0 4px', color: a.suave, lineHeight: 1.55, fontSize: '0.94rem' }}>{clase.description}</p>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 18 }}>
          <button type="button" onClick={() => setVerCoach((v) => !v)} aria-expanded={verCoach} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 20, background: a.tenue, border: 'none', cursor: 'pointer', color: a.tinta, textAlign: 'left' }}>
            <Avatar src={coach?.avatar_url} nombre={coach?.full_name || clase.instructor} tam={38} borde="var(--a-solido)" />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.72rem', color: a.suave }}>Coach</div>
              <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{coach?.full_name?.split(' ')[0] || clase.instructor}</div>
            </div>
            <ChevronDown size={16} style={{ marginLeft: 'auto', flexShrink: 0, transform: verCoach ? 'rotate(180deg)' : 'none', transition: 'transform .25s ease', color: 'var(--a-suave)' }} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 20, background: a.tenue }}>
            <span style={{ width: 38, height: 38, borderRadius: '50%', background: a.solido, display: 'flex', alignItems: 'center', justifyContent: 'center', color: a.tinta, flexShrink: 0 }}><Users size={18} /></span>
            <div>
              <div style={{ fontSize: '0.72rem', color: a.suave }}>Lugares</div>
              <div style={{ fontWeight: 600 }}>{lugares > 0 ? `${lugares === 1 ? 'Queda 1' : `Quedan ${lugares}`} de ${clase.max_spots ?? lugares}` : 'Llena'}</div>
            </div>
          </div>
        </div>

        {verCoach && (
          <div style={{ marginTop: 10, padding: 16, borderRadius: 22, background: a.tenue, animation: 'alma-entra .35s ease both' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar src={coach?.avatar_url} nombre={coach?.full_name || clase.instructor} tam={52} borde="var(--a-solido)" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{coach?.full_name || clase.instructor}</div>
                {coach?.experience && <div style={{ fontSize: '0.8rem', color: a.suave, marginTop: 2 }}>{coach.experience}</div>}
              </div>
            </div>
            <p style={{ margin: '12px 0 0', fontSize: '0.9rem', lineHeight: 1.55, color: coach?.bio ? a.tinta : a.suave }}>
              {coach?.bio || 'Pronto conocerás más de tu coach.'}
            </p>
          </div>
        )}

        {/* La acción que toca según su reserva */}
        <div style={{ marginTop: 20 }}>
          {estado.tipo === 'paso' && <Aviso>Esta clase ya pasó.</Aviso>}

          {estado.tipo === 'libre' && (
            <>
              <Boton onClick={reservar} disabled={enviando} style={{ width: '100%' }}>
                {enviando ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <CalendarCheck size={18} />}
                Reservar mi lugar
              </Boton>
              <div style={{ textAlign: 'center', fontSize: '0.8rem', color: a.suave, marginTop: 8 }}>
                {ilimitado(classesRemaining) ? 'Tu plan es ilimitado' : `Usa 1 de tus ${classesRemaining} clases · puedes cancelar hasta 5 h antes`}
              </div>
            </>
          )}

          {estado.tipo === 'llena' && (
            <>
              <div style={{ padding: 14, borderRadius: 20, border: `1px solid ${a.linea}` }}>
                <div style={{ fontWeight: 600 }}>Está llena. Entra a la lista de espera.</div>
                <div style={{ fontSize: '0.84rem', color: a.suave, marginTop: 4 }}>No se descuenta ninguna clase hasta que tengas lugar.</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input type="checkbox" checked={apartar} onChange={(e) => setApartar(e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--a-tinta)' }} />
                  Apártamelo solo si se libera un lugar
                </label>
              </div>
              <Boton onClick={reservar} disabled={enviando} style={{ width: '100%', marginTop: 12 }}>
                {enviando ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Hourglass size={18} />}
                Entrar a la lista de espera
              </Boton>
            </>
          )}

          {estado.tipo === 'mia' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 14, borderRadius: 20, background: a.tinta, color: a.sobreTinta }}>
                <Check size={20} /> <span style={{ fontWeight: 600 }}>Tu lugar está apartado</span>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <Boton tipo="vidrio" onClick={alVerPase} style={{ flex: 1 }}>Ver mi pase</Boton>
                <Boton tipo="vidrio" onClick={cancelar} disabled={enviando} style={{ flex: 1, color: a.peligro }}>
                  {enviando && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />} Cancelar
                </Boton>
              </div>
              <Boton tipo="linea" onClick={agregarCalendario} style={{ width: '100%', marginTop: 10 }}>
                {enCalendario ? <Check size={17} /> : <CalendarPlus size={17} />} {enCalendario === 'descargado' ? 'Descargado: ábrelo para agregarlo' : enCalendario ? 'En tu calendario' : 'Agregar a mi calendario'}
              </Boton>

              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: a.suave, marginBottom: 10 }}>
                  {companeras === null ? 'Buscando quién más va…' : companeras.length ? `Van contigo · ${companeras.length}` : 'Aún nadie más. ¡Eres la primera!'}
                </div>
                {companeras?.length > 0 && (
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {companeras.map((m, i) => (
                      <div key={i} style={{ width: 54, textAlign: 'center' }}>
                        <Avatar src={m.avatar_url} nombre={m.first_name} tam={46} borde={m.checked_in ? 'var(--a-tinta)' : 'var(--a-solido)'} />
                        <div style={{ fontSize: '0.7rem', fontWeight: 600, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.first_name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {estado.tipo === 'espera' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 20, border: `1px solid ${a.linea}` }}>
                <span style={{ fontWeight: 300, fontSize: '2.4rem', lineHeight: 1, color: a.tinta, minWidth: 34, textAlign: 'center' }}>{posicion ?? '·'}</span>
                <div>
                  <div style={{ fontWeight: 600 }}>{posicion ? `Eres la número ${posicion} en la lista` : 'Estás en la lista de espera'}</div>
                  <div style={{ fontSize: '0.84rem', color: a.suave }}>{estado.r?.autoClaim ? 'Si se libera un lugar, es tuyo automáticamente.' : 'Te avisamos si se libera un lugar.'}</div>
                </div>
              </div>
              <Boton tipo="vidrio" onClick={cancelar} disabled={enviando} style={{ width: '100%', marginTop: 12 }}>Salir de la lista</Boton>
            </>
          )}

          {estado.tipo === 'oferta' && (
            <>
              <div style={{ padding: 14, borderRadius: 20, background: a.tinta, color: a.sobreTinta }}>
                <div style={{ fontWeight: 300, fontSize: '1.6rem' }}>¡Se liberó un lugar!</div>
                <div style={{ fontSize: '0.86rem', opacity: 0.9, display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <Clock size={14} /> Confirma antes de que pase a la siguiente.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <Boton onClick={aceptar} disabled={enviando} style={{ flex: 1.4 }}>Lo quiero</Boton>
                <Boton tipo="vidrio" onClick={ceder} disabled={enviando} style={{ flex: 1 }}>Ceder</Boton>
              </div>
            </>
          )}

          {mensaje && <Aviso tono={mensaje[0]}>{mensaje[1]}</Aviso>}
          {mensaje?.[2] && alPlanes && <Boton onClick={alPlanes} style={{ width: '100%', marginTop: 10 }}>Ver planes</Boton>}
        </div>
      </div>
    </Hoja>
  );
}
