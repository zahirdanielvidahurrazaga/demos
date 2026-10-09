import { useEffect, useState } from 'react';
import { Bell, ChevronRight, FileText, KeyRound, Moon, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { a, vidrio } from './estilo';
import { Aviso, Boton, Hoja, Titulo } from './ui';

// Opciones de la cuenta en "Yo": lo mismo que Mi Cuenta y Ajustes de Be Fit.
// Los datos personales se guardan de verdad (users, como MiCuenta.jsx). Lo
// que en una demo rompería la cuenta compartida (contraseña, eliminar) se
// enseña pero avisa que en la demo no aplica.
export default function Cuenta({ cfg, tema, alTema }) {
  const [datos, setDatos] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [notif, setNotif] = useState(() => {
    try { return localStorage.getItem('befit_notifications') !== 'false'; } catch { return true; }
  });
  const cambiarNotif = () => {
    const v = !notif;
    setNotif(v);
    try { localStorage.setItem('befit_notifications', String(v)); } catch { /* sin almacenamiento */ }
  };

  const enDemo = (titulo, texto) => () => setAviso({ titulo, texto });

  return (
    <>
      <Titulo>Tu cuenta</Titulo>
      <Grupo>
        <Fila icono={UserRound} titulo="Datos personales" sub="Nombre, teléfono, contacto de emergencia" onClick={() => setDatos(true)} />
        <Fila icono={Bell} titulo="Recordatorios" sub="Te avisamos 1 hora antes de cada clase"
          derecha={<Interruptor encendido={notif} />} onClick={cambiarNotif} />
        <Fila icono={Moon} titulo="Modo oscuro" sub="Más cómodo de noche"
          derecha={<Interruptor encendido={tema === 'oscuro'} />} onClick={() => alTema(tema === 'oscuro' ? 'claro' : 'oscuro')} />
        <Fila icono={KeyRound} titulo="Contraseña" sub="Cámbiala cuando quieras"
          onClick={enDemo('Contraseña', 'En tu app cada clienta cambia su contraseña aquí. En la demostración todas comparten la cuenta de ejemplo, así que no se cambia.')} />
      </Grupo>

      <Titulo>{cfg.nombre}</Titulo>
      <Grupo>
        <Fila icono={ShieldCheck} titulo="Aviso de privacidad"
          onClick={enDemo('Aviso de privacidad', `En tu app aquí va el aviso de privacidad de ${cfg.nombre}.`)} />
        <Fila icono={FileText} titulo="Términos y condiciones"
          onClick={enDemo('Términos y condiciones', `En tu app aquí van los términos de ${cfg.nombre}: reservas, cancelaciones y paquetes.`)} />
        <Fila icono={Trash2} titulo="Eliminar mi cuenta" peligro
          onClick={enDemo('Eliminar mi cuenta', 'En tu app la clienta borra su cuenta y sus datos desde aquí (lo pide Apple). En la demostración está apagado.')} />
      </Grupo>

      <HojaDatos abierta={datos} alCerrar={() => setDatos(false)} />
      <Hoja abierta={Boolean(aviso)} alCerrar={() => setAviso(null)} titulo={aviso?.titulo}>
        {aviso && (
          <div style={{ padding: '34px 24px 28px' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{aviso.titulo}</div>
            <p style={{ color: a.suave, lineHeight: 1.55, margin: '10px 0 18px' }}>{aviso.texto}</p>
            <Boton tipo="vidrio" onClick={() => setAviso(null)} style={{ width: '100%' }}>Entendido</Boton>
          </div>
        )}
      </Hoja>
    </>
  );
}

function Grupo({ children }) {
  return <div style={{ ...vidrio, borderRadius: 28, padding: 6, display: 'grid' }}>{children}</div>;
}

function Fila({ icono: Icono, titulo, sub, derecha, onClick, peligro }) {
  return (
    <button type="button" onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '12px 12px', border: 'none', background: 'transparent', borderRadius: 22,
      cursor: 'pointer', textAlign: 'left', fontFamily: a.letra, color: peligro ? a.peligro : a.tinta, width: '100%',
    }}>
      <span style={{ width: 40, height: 40, borderRadius: '50%', background: a.solidoSuave, border: '1px solid var(--a-vidrio-borde)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icono size={18} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontWeight: 600, fontSize: '0.95rem' }}>{titulo}</span>
        {sub && <span style={{ display: 'block', fontSize: '0.78rem', color: a.suave, marginTop: 1 }}>{sub}</span>}
      </span>
      {derecha || <ChevronRight size={18} color="var(--a-suave)" />}
    </button>
  );
}

function Interruptor({ encendido }) {
  return (
    <span aria-hidden="true" style={{ width: 48, height: 28, borderRadius: 999, background: encendido ? a.tinta : a.linea, position: 'relative', flexShrink: 0, transition: 'background .2s ease' }}>
      <span style={{ position: 'absolute', top: 3, left: encendido ? 23 : 3, width: 22, height: 22, borderRadius: '50%', background: encendido ? a.sobreTinta : '#fff', boxShadow: '0 2px 6px rgba(0,0,0,.2)', transition: 'left .25s cubic-bezier(.3,1.4,.5,1)' }} />
    </span>
  );
}

const CAMPOS = [
  ['full_name', 'Nombre completo', 'text'],
  ['phone', 'Teléfono', 'tel'],
  ['birth_date', 'Fecha de nacimiento', 'date'],
  ['height_cm', 'Estatura (cm)', 'number'],
  ['emergency_contact_name', 'Contacto de emergencia', 'text'],
  ['emergency_contact_phone', 'Teléfono de emergencia', 'tel'],
];

function HojaDatos({ abierta, alCerrar }) {
  const { user, refreshUserData } = useAuth();
  const [valores, setValores] = useState(null);
  const [errorCarga, setErrorCarga] = useState(false);
  const [intento, setIntento] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  // El formulario solo aparece con datos leídos de verdad: si se guardara un
  // formulario vacío por un error de red, se borrarían los datos de la clienta.
  useEffect(() => {
    if (!abierta || !user) return undefined;
    let vivo = true;
    supabase.from('users').select(CAMPOS.map(([k]) => k).join(', ')).eq('id', user.id).maybeSingle()
      .then(({ data, error }) => {
        if (!vivo) return;
        if (error || !data) { setErrorCarga(true); setValores(null); return; }
        setErrorCarga(false);
        setValores(Object.fromEntries(CAMPOS.map(([k]) => [k, data[k] ?? ''])));
      });
    return () => { vivo = false; };
  }, [abierta, user, intento]);

  const guardar = async () => {
    setGuardando(true);
    setMensaje(null);
    const cambios = { ...valores, birth_date: valores.birth_date || null, height_cm: valores.height_cm ? parseFloat(valores.height_cm) : null };
    const { error } = await supabase.from('users').update(cambios).eq('id', user.id);
    setGuardando(false);
    if (error) { setMensaje(['error', 'No se pudo guardar. Intenta de nuevo.']); return; }
    setMensaje(['ok', 'Guardado.']);
    refreshUserData?.();
  };

  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Datos personales">
      <div style={{ padding: '34px 22px 24px' }}>
        <div style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 14 }}>Datos personales</div>
        {errorCarga && (
          <div style={{ textAlign: 'center', padding: 10 }}>
            <Aviso tono="error">No pudimos cargar tus datos.</Aviso>
            <Boton tipo="vidrio" onClick={() => setIntento((n) => n + 1)} style={{ marginTop: 12 }}>Reintentar</Boton>
          </div>
        )}
        {!errorCarga && !valores ? <div style={{ color: a.suave, padding: 20, textAlign: 'center' }}>Cargando…</div> : !valores ? null : (
          <div style={{ display: 'grid', gap: 10 }}>
            {CAMPOS.map(([k, etiqueta, tipo]) => (
              <label key={k} style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: a.suave }}>
                {etiqueta}
                <input type={tipo} value={valores[k] ?? ''} onChange={(e) => setValores((v) => ({ ...v, [k]: e.target.value }))} style={{
                  ...vidrio, display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 5, padding: '13px 16px', borderRadius: 18,
                  fontSize: '0.98rem', fontFamily: a.letra, color: a.tinta, outline: 'none',
                }} />
              </label>
            ))}
            <Boton onClick={guardar} disabled={guardando} style={{ width: '100%', marginTop: 8 }}>{guardando ? 'Guardando…' : 'Guardar cambios'}</Boton>
            {mensaje && <Aviso tono={mensaje[0]}>{mensaje[1]}</Aviso>}
          </div>
        )}
      </div>
    </Hoja>
  );
}
