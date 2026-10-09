import { useState } from 'react';
import { CakeSlice, CalendarDays, ChevronRight, Clock, Coffee, QrCode, Salad, Sparkles, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toLocalDateStr } from '../../lib/dates';
import { a, vidrio } from './estilo';
import { Avatar, Boton, Chip, Deslizar, Foto, TarjetaTinta, Titulo } from './ui';
import { TiraDias, Etiqueta } from './Horario';
import { BotonAvisos } from './Avisos';
import {
  clasesDelDia, cuandoTexto, diaTexto, estadoDeClase, fotoDeClase, hora, ilimitado, nombreCoach, proximosDias, reservasProximas,
} from './datos';

function saludo() {
  const h = new Date().getHours();
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}

export default function Inicio({ cfg, fotos, alAbrirClase, alPase, alIr, alVista, alAvisos, alPlanes }) {
  const { profileName, avatarUrl, myReservations, globalClasses, coaches, classesRemaining } = useAuth();
  const [fecha, setFecha] = useState(() => toLocalDateStr());
  const nombre = (profileName || '').split(' ')[0];
  const proximas = reservasProximas(myReservations, globalClasses);
  const prox = proximas.find((r) => r.status === 'offered') || proximas.find((r) => (r.status || 'confirmed') === 'confirmed');
  // Del día elegido, solo lo que aún no pasa (hoy en la noche ya no hay nada que reservar).
  const delDia = clasesDelDia(globalClasses, fecha).filter((c) => estadoDeClase(c, myReservations, fecha).tipo !== 'paso');
  const manana = proximosDias(2)[1].fecha;
  const nombreDia = proximosDias(14).find((d) => d.fecha === fecha);
  const sugerida = !prox && delDia.find((c) => estadoDeClase(c, myReservations, fecha).tipo === 'libre');
  const entra = (s) => ({ animation: `alma-entra .6s ${s}s both cubic-bezier(.2,.8,.2,1)` });

  const extras = [
    ['cafeteria', cfg.nombreCafeteria || 'Cafetería', 'Pide antes de clase', Coffee],
    ['eventos', 'Eventos', 'Talleres y retiros', Sparkles],
    ['cumpleanos', 'Cumpleaños', 'Celebra con tu comunidad', CakeSlice],
    ['nutricion', cfg.nombreNutricion || 'Nutrición', 'Recetas y tu plan', Salad],
  ].filter(([id]) => cfg.modulos?.[id] !== false);

  return (
    <div style={{ position: 'relative', zIndex: 1, padding: '20px 20px 140px', maxWidth: 640, margin: '0 auto', fontFamily: a.letra, color: a.tinta }}>
      {/* Saludo */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, ...entra(0) }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '1.2rem', letterSpacing: '-0.01em' }}>
            <span style={{ fontWeight: 400 }}>{saludo()} </span><span style={{ fontWeight: 700 }}>{nombre}</span>
          </div>
          <div style={{ fontSize: '0.84rem', color: a.suave, marginTop: 2 }}>Bienvenida a {cfg.nombre}</div>
        </div>
        <div style={{ ...vidrio, display: 'flex', alignItems: 'center', gap: 4, padding: 4, borderRadius: 999 }}>
          <BotonAvisos alAbrir={alAvisos} />
          <button type="button" aria-label="Mi pase" onClick={alPase} style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'transparent', color: a.tinta, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <QrCode size={20} />
          </button>
          <button type="button" aria-label="Mi perfil" onClick={() => alIr('yo')} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
            <Avatar src={avatarUrl} nombre={profileName} tam={40} />
          </button>
        </div>
      </header>

      {/* Tu semana */}
      <div style={entra(0.06)}>
        <Titulo accion={<CalendarDays size={20} />} alAccion={() => alIr('agenda')}>Tu semana</Titulo>
        <TiraDias fecha={fecha} alElegir={setFecha} />
      </div>

      {/* Tarjeta grande: tu próxima clase (o una sugerida para el día) */}
      {(prox || sugerida) && (
        <TarjetaGrande
          r={prox} c={prox ? (prox.clase || { title: prox.title, time: prox.time, instructor: prox.instructor, coach_id: prox.coachId }) : sugerida}
          foto={fotoDeClase(prox?.clase || sugerida || { title: prox?.title }, fotos)}
          coaches={coaches} clasesQuedan={classesRemaining} alPase={alPase}
          alDetalle={() => { const c = prox ? prox.clase : sugerida; if (c) alAbrirClase(c, prox ? prox.fecha : fecha); }}
          estilo={entra(0.12)}
        />
      )}

      {/* Clases del día elegido */}
      <Titulo accion="Ver todas" alAccion={() => alIr('agenda')}>
        {nombreDia?.i === 0 ? 'Clases de hoy' : `Clases del ${nombreDia?.dia.toLowerCase()} ${nombreDia?.num}`}
      </Titulo>
      {delDia.length ? (
        <div className="alma-tira" style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '0 20px 6px', margin: '0 -20px', scrollSnapType: 'x mandatory' }}>
          {delDia.map((c, i) => {
            const estado = estadoDeClase(c, myReservations, fecha);
            const h = hora(c.time);
            const mia = ['mia', 'oferta'].includes(estado.tipo);
            return (
              <button key={c.id} type="button" onClick={() => alAbrirClase(c, fecha)} style={{
                ...vidrio, flex: '0 0 150px', minHeight: 176, padding: 16, cursor: 'pointer', borderRadius: 28, scrollSnapAlign: 'start',
                textAlign: 'left', color: a.tinta, display: 'flex', flexDirection: 'column', boxSizing: 'border-box',
                animation: `alma-entra .5s ${0.15 + i * 0.04}s both ease`,
                ...(mia ? { border: '1.5px solid var(--a-tinta)' } : {}),
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 300, lineHeight: 1, letterSpacing: '-0.03em' }}>
                  {h.texto}<span style={{ fontSize: '0.75rem', fontWeight: 500, marginLeft: 3, color: a.suave }}>{h.sufijo}</span>
                </div>
                <div style={{ marginTop: 'auto', paddingTop: 18 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.98rem', lineHeight: 1.2 }}>{c.title}</div>
                  <div style={{ fontSize: '0.76rem', color: a.suave, margin: '3px 0 10px' }}>con {nombreCoach(c, coaches)}</div>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600,
                    background: mia ? a.tinta : a.solidoSuave, color: mia ? a.sobreTinta : a.tinta,
                  }}><Etiqueta estado={estado} c={c} /></span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div style={{ ...vidrio, borderRadius: 26, padding: 22, textAlign: 'center', color: a.suave }}>
          {fecha === toLocalDateStr() ? 'Ya terminaron las clases de hoy.' : 'No hay clases este día.'}
          {fecha === toLocalDateStr() && (
            <div><Boton tipo="vidrio" onClick={() => setFecha(manana)} style={{ marginTop: 12, padding: '10px 18px', fontSize: '0.86rem' }}>Ver mañana</Boton></div>
          )}
        </div>
      )}

      {/* Lo demás del estudio */}
      {extras.length > 0 && (
        <>
          <Titulo>En {cfg.nombre.replace(/^Studio /, '')}</Titulo>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {extras.map(([id, titulo, sub, Icono]) => (
              <button key={id} type="button" onClick={() => alVista(id)} style={{
                ...vidrio, padding: 16, cursor: 'pointer', borderRadius: 26, textAlign: 'left', color: a.tinta,
                display: 'flex', flexDirection: 'column', gap: 14, minHeight: 128, boxSizing: 'border-box',
              }}>
                <span style={{ width: 40, height: 40, borderRadius: '50%', background: a.solido, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(52,44,30,.08)' }}>
                  <Icono size={19} strokeWidth={1.7} />
                </span>
                <span style={{ marginTop: 'auto' }}>
                  <span style={{ display: 'block', fontWeight: 600 }}>{titulo}</span>
                  <span style={{ display: 'block', fontSize: '0.76rem', color: a.suave, marginTop: 2 }}>{sub}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {!ilimitado(classesRemaining) && classesRemaining <= 2 && (
        <TarjetaTinta radio={28} style={{ marginTop: 22 }}>
          <div style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: '2.6rem', fontWeight: 300, lineHeight: 1 }}>{classesRemaining}</div>
            <div style={{ flex: 1, fontSize: '0.88rem', lineHeight: 1.35 }}>
              {classesRemaining <= 0 ? 'Se terminó tu paquete.' : classesRemaining === 1 ? 'Te queda 1 clase.' : `Te quedan ${classesRemaining} clases.`}
              <span style={{ display: 'block', opacity: 0.8 }}>Renueva para seguir reservando.</span>
            </div>
            <Boton tipo="blanco" onClick={alPlanes} style={{ padding: '11px 16px', fontSize: '0.86rem' }}>Ver planes</Boton>
          </div>
        </TarjetaTinta>
      )}
    </div>
  );
}

function TarjetaGrande({ r, c, foto, coaches, clasesQuedan, alPase, alDetalle, estilo }) {
  const h = hora(c.time);
  const oferta = r?.status === 'offered';
  const inicio = r?.inicio;
  return (
    <div style={{ marginTop: 18, borderRadius: 34, boxShadow: '0 20px 40px rgba(52,44,30,.25)', ...estilo }}>
      <Foto src={foto} radio={34} oscura={0.4} style={{ minHeight: 280 }}>
        <div style={{ padding: 18, color: '#fff', display: 'flex', flexDirection: 'column', minHeight: 280, boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.92rem', fontWeight: 500 }}>
              {oferta ? '¡Se liberó un lugar!' : r ? 'Tu próxima clase' : 'Aparta tu lugar'}
            </span>
            <Chip style={{ marginLeft: 'auto', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.66rem' }}>
              {r ? diaTexto(inicio) : (c.category || c.level || 'Pilates')}
            </Chip>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1, margin: '22px 0 12px' }}>{c.title}</div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            <Chip icono={Clock}>{h.texto} {h.sufijo}{r ? ` · ${cuandoTexto(inicio)}` : ''}</Chip>
            <Chip>
              <Avatar src={(coaches || []).find((x) => x.id === c.coach_id)?.avatar_url} nombre={nombreCoach(c, coaches)} tam={18} borde="rgba(255,255,255,.6)" />
              {nombreCoach(c, coaches)}
            </Chip>
            {!r && <Chip icono={Users}>{c.spots} lugares</Chip>}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 22 }}>
            {r && !oferta ? (
              <>
                <Deslizar texto="Desliza: tu pase" alTerminar={alPase} />
                <Boton tipo="vidrioFoto" onClick={alDetalle} style={{ padding: '0 18px', height: 52 }}>Detalles <ChevronRight size={16} /></Boton>
              </>
            ) : (
              <Deslizar texto={oferta ? 'Desliza para confirmar' : clasesQuedan > 0 ? 'Desliza para reservar' : 'Ver la clase'} alTerminar={alDetalle} />
            )}
          </div>
        </div>
      </Foto>
    </div>
  );
}
