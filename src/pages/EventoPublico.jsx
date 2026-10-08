import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, MapPin, Ticket, Users, Plus, X, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { supabase, errorDeFuncion } from '../lib/supabase';
import BrandSpheres from '../components/BrandSpheres';
import { ESTUDIO } from '../config/estudio';

// Página PÚBLICA de un evento: cualquiera puede apartar su lugar sin tener
// cuenta ni membresía. El precio y el cupo los valida el servidor; aquí solo se
// captura a quién inscribir.
const PRIMARY = '#FF914D';
const MAUVE = '#E07A9C';
const MAX_ACOMP = 3; // el comprador + hasta 3 acompañantes = 4 boletos

const glass = {
  background: 'rgba(255,255,255,0.6)',
  backdropFilter: 'blur(22px) saturate(180%)',
  WebkitBackdropFilter: 'blur(22px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.5)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.7)',
};

const fmtFecha = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit',
  });
};
const yaPaso = (iso) => iso && new Date(iso).getTime() < Date.now() - 3 * 3600000;

function Countdown({ date }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const diff = Math.max(0, new Date(date).getTime() - now);
  const unidades = [
    { v: Math.floor(diff / 86400000), l: 'días' },
    { v: Math.floor(diff / 3600000) % 24, l: 'hrs' },
    { v: Math.floor(diff / 60000) % 60, l: 'min' },
    { v: Math.floor(diff / 1000) % 60, l: 'seg' },
  ];
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      {unidades.map((u) => (
        <div key={u.l} style={{ flex: 1, textAlign: 'center', padding: '11px 4px', borderRadius: '14px', ...glass }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2D2928', lineHeight: 1, fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>
            {String(u.v).padStart(2, '0')}
          </div>
          <div style={{ fontSize: '0.58rem', fontWeight: 700, color: '#9A8D85', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '5px' }}>{u.l}</div>
        </div>
      ))}
    </div>
  );
}

// Pantalla de gracias: los boletos recién emitidos, con su QR.
function Boletos({ tickets, correo, email }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      style={{ ...glass, borderRadius: '26px', padding: '28px 22px', textAlign: 'center' }}>
      <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
        <CheckCircle2 size={34} color="#16A34A" />
      </div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', margin: '0 0 6px', color: '#2D2928' }}>
        ¡Tu lugar está apartado!
      </h2>
      <p style={{ margin: '0 0 22px', color: '#6B615B', fontSize: '0.95rem', lineHeight: 1.55 }}>
        {correo
          ? <>Te enviamos {tickets.length > 1 ? 'tus boletos' : 'tu boleto'} a <strong style={{ color: '#2D2928' }}>{email}</strong>.</>
          : <>Guarda esta pantalla: {tickets.length > 1 ? 'estos son tus boletos' : 'este es tu boleto'}.</>}
        {' '}Muéstralo en la entrada.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {tickets.map((t) => (
          <div key={t.code} style={{ background: '#fff', borderRadius: '20px', padding: '20px', border: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#B0846A' }}>Boleto</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#2D2928', margin: '2px 0 14px' }}>{t.name}</div>
            <QRCodeCanvas value={t.code} size={150} level="M" />
            <div style={{ fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: 800, letterSpacing: '0.16em', color: PRIMARY, marginTop: '12px' }}>{t.code}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function EventoPublico() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const [ev, setEv] = useState(null);
  const [noExiste, setNoExiste] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [acomp, setAcomp] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [compra, setCompra] = useState(null); // { tickets, correo }
  const [confirmando, setConfirmando] = useState(false);

  // La ruta acepta las dos formas: /evento/<uuid> (links ya compartidos) y
  // /evento/rodeo (el corto, para Instagram).
  const cargar = async () => {
    const esUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const base = supabase.from('events').select('*');
    const { data } = esUuid
      ? await base.eq('id', id).maybeSingle()
      : await base.eq('slug', String(id).toLowerCase()).maybeSingle();
    if (!data) setNoExiste(true); else setEv(data);
  };
  useEffect(() => { window.scrollTo(0, 0); cargar(); }, [id]);

  // Regreso de Stripe: emitir/recuperar los boletos de esta compra.
  useEffect(() => {
    const sessionId = params.get('session_id');
    if (params.get('compra') !== 'ok' || !sessionId) return;
    setConfirmando(true);
    let cancelado = false;
    (async () => {
      // El pago acaba de ocurrir; si Stripe aún no lo marca pagado, reintentar.
      for (let intento = 0; intento < 4 && !cancelado; intento++) {
        const { data } = await supabase.functions.invoke('event-tickets', { body: { sessionId } });
        if (data?.ok && data.tickets?.length) {
          setCompra({ tickets: data.tickets, correo: !!data.correo });
          setParams({}, { replace: true });
          cargar();
          break;
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
      if (!cancelado) setConfirmando(false);
    })();
    return () => { cancelado = true; };
  }, []); // eslint-disable-line

  const total = ev ? (ev.price || 0) * (1 + acomp.length) : 0;
  const libres = useMemo(() => {
    if (!ev || ev.capacity == null) return null;
    return Math.max(0, ev.capacity - (ev.registered_count ?? 0));
  }, [ev]);
  const agotado = libres === 0;
  const cerrado = ev && (!ev.registration_open || yaPaso(ev.event_date));

  const pagar = async () => {
    setError('');
    if (form.name.trim().length < 3) return setError('Escribe tu nombre completo.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) return setError('Escribe un correo válido — ahí llega tu boleto.');
    if (form.phone.replace(/\D/g, '').length < 10) return setError('Escribe tu teléfono a 10 dígitos.');
    const invitados = acomp.map((a) => a.trim()).filter(Boolean);
    if (invitados.length !== acomp.length) return setError('Escribe el nombre de cada acompañante (o quita el que sobre).');

    setEnviando(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('event-public-checkout', {
        body: {
          eventId: ev.id,
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          guests: invitados,
          returnUrl: window.location.origin,
        },
      });
      const msg = await errorDeFuncion(fnError, data, 'No pudimos abrir el pago. Intenta de nuevo.');
      if (msg) {
        if (String(msg).includes('EVENT_FULL')) setError('¡Se agotaron los lugares!');
        else if (String(msg).includes('CERRADO')) setError('Las inscripciones de este evento ya cerraron.');
        else setError(String(msg));
        cargar();
        return;
      }
      if (data?.url) { window.location.href = data.url; return; }
      setError('No pudimos abrir el pago. Intenta de nuevo.');
    } catch (e) {
      console.error(e);
      setError('No pudimos abrir el pago. Revisa tu conexión e intenta otra vez.');
    } finally { setEnviando(false); }
  };

  if (noExiste) {
    return (
      <div style={{ minHeight: '100vh', background: '#FDFBF7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '30px', textAlign: 'center' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', color: '#2D2928' }}>Este evento no existe</h1>
          <p style={{ color: '#6B615B' }}>Puede que el link esté incompleto o el evento se haya cerrado.</p>
          <Link to="/" style={{ color: PRIMARY, fontWeight: 700 }}>Ir al sitio de {ESTUDIO.nombre} →</Link>
        </div>
      </div>
    );
  }
  if (!ev) {
    return <div style={{ minHeight: '100vh', background: '#FDFBF7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B615B' }}>Cargando…</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #FFF8F4 0%, #FDFBF7 40%)', fontFamily: 'var(--font-body)' }}>
      {/* ── Flyer + datos ─────────────────────────────────────────────── */}
      {/* El flyer se muestra COMPLETO (contain): trae la info del evento y es lo
          que la gente ya vio en Instagram. De fondo, las esferas de la marca. */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <BrandSpheres />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '620px', margin: '0 auto', padding: '34px 22px 34px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          {ev.image_url && (
            <img src={ev.image_url} alt={ev.title}
              style={{ width: '100%', maxHeight: '58vh', objectFit: 'contain', borderRadius: '20px', display: 'block', marginBottom: '26px', boxShadow: '0 20px 50px rgba(139,90,60,0.24)' }} />
          )}
          <div style={{ marginBottom: '10px' }}>
            <span style={{ fontSize: '0.66rem', fontWeight: 800, color: PRIMARY, textTransform: 'uppercase', letterSpacing: '0.14em' }}>{ESTUDIO.nombre} · Evento</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.1rem, 7vw, 3rem)', color: '#2D2928', margin: '0 0 14px', lineHeight: 1.05 }}>
            {ev.title}
          </h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
            {ev.event_date && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', color: '#4A423D', fontSize: '0.9rem', fontWeight: 600 }}>
                <CalendarDays size={16} color={PRIMARY} /> {fmtFecha(ev.event_date)}
              </span>
            )}
            {ev.location && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', color: '#4A423D', fontSize: '0.9rem', fontWeight: 600 }}>
                <MapPin size={16} color={PRIMARY} /> {ev.location}
              </span>
            )}
          </div>
          {ev.event_date && !yaPaso(ev.event_date) && <Countdown date={ev.event_date} />}
        </div>
      </div>

      <div style={{ maxWidth: '620px', margin: '0 auto', padding: '26px 22px 70px' }}>
        {/* ── Estado de la compra ───────────────────────────────────── */}
        <AnimatePresence>
          {confirmando && !compra && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ ...glass, borderRadius: '20px', padding: '20px', textAlign: 'center', marginBottom: '22px', color: '#6B615B' }}>
              <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} style={{ display: 'inline-flex' }}>
                <Loader2 size={22} color={PRIMARY} />
              </motion.span>
              <p style={{ margin: '10px 0 0', fontWeight: 600 }}>Confirmando tu pago…</p>
            </motion.div>
          )}
        </AnimatePresence>

        {compra ? (
          <Boletos tickets={compra.tickets} correo={compra.correo} email={form.email} />
        ) : (
          <>
            {ev.description && (
              <p style={{ whiteSpace: 'pre-line', color: '#5C534E', fontSize: '1rem', lineHeight: 1.65, margin: '0 0 24px' }}>
                {ev.description}
              </p>
            )}

            {/* ── Tarjeta de compra ──────────────────────────────────── */}
            <div style={{ ...glass, borderRadius: '26px', padding: '24px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', marginBottom: '4px' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.45rem', margin: 0, color: '#2D2928' }}>Aparta tu lugar</h2>
                <span style={{ fontSize: '1.35rem', fontWeight: 800, color: PRIMARY, fontFamily: 'var(--font-display)' }}>${ev.price}</span>
              </div>
              <p style={{ margin: '0 0 18px', fontSize: '0.88rem', color: '#8A7F78' }}>
                No necesitas cuenta ni membresía. Todos son bienvenidos.
              </p>

              {libres != null && !cerrado && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '18px', padding: '7px 12px', borderRadius: '10px', background: agotado ? 'rgba(186,26,26,0.09)' : 'rgba(255,145,77,0.12)', color: agotado ? '#ba1a1a' : '#B0642A' }}>
                  <Users size={15} />
                  {agotado ? 'Agotado' : `Quedan ${libres} de ${ev.capacity} lugares`}
                </div>
              )}

              {cerrado ? (
                <div style={{ padding: '16px', borderRadius: '16px', background: 'rgba(0,0,0,0.04)', color: '#6B615B', textAlign: 'center', fontWeight: 600 }}>
                  Las inscripciones de este evento están cerradas.
                </div>
              ) : agotado ? (
                <div style={{ padding: '16px', borderRadius: '16px', background: 'rgba(186,26,26,0.08)', color: '#ba1a1a', textAlign: 'center', fontWeight: 700 }}>
                  ¡Se agotaron los lugares! Escríbenos por WhatsApp para la lista de espera.
                </div>
              ) : (
                <>
                  <Campo label="Tu nombre completo" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Karime Pérez" autoComplete="name" />
                  <Campo label="Tu correo" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="karime@correo.com" type="email" autoComplete="email" hint="Aquí te llega el boleto" />
                  <Campo label="Tu WhatsApp" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="221 123 4567" type="tel" autoComplete="tel" />

                  {/* Acompañantes */}
                  <div style={{ marginTop: '6px', marginBottom: '18px' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#2D2928', marginBottom: '8px' }}>¿Vienes acompañada?</div>
                    {acomp.map((nombre, i) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <input
                          value={nombre}
                          onChange={(e) => setAcomp(acomp.map((a, j) => (j === i ? e.target.value : a)))}
                          placeholder={`Nombre del acompañante ${i + 1}`}
                          style={inputStyle}
                        />
                        <button onClick={() => setAcomp(acomp.filter((_, j) => j !== i))} aria-label="Quitar acompañante"
                          style={{ width: '46px', flexShrink: 0, borderRadius: '13px', border: '1px solid rgba(0,0,0,0.08)', background: '#fff', color: '#8A7F78', cursor: 'pointer' }}>
                          <X size={17} />
                        </button>
                      </div>
                    ))}
                    {acomp.length < MAX_ACOMP && (libres == null || acomp.length + 1 < libres) && (
                      <button onClick={() => setAcomp([...acomp, ''])}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '10px 15px', borderRadius: '13px', border: `1px dashed ${PRIMARY}`, background: 'rgba(255,145,77,0.07)', color: PRIMARY, fontWeight: 700, fontSize: '0.86rem', cursor: 'pointer' }}>
                        <Plus size={16} /> Agregar acompañante
                      </button>
                    )}
                    <div style={{ fontSize: '0.76rem', color: '#A2968E', marginTop: '8px' }}>
                      Máximo {MAX_ACOMP} acompañantes por compra. Cada uno ocupa un lugar y lleva su propio boleto.
                    </div>
                  </div>

                  {error && (
                    <div style={{ padding: '12px 14px', borderRadius: '13px', background: 'rgba(186,26,26,0.08)', color: '#ba1a1a', fontSize: '0.86rem', fontWeight: 600, marginBottom: '14px' }}>
                      {error}
                    </div>
                  )}

                  {/* Talón de boleto: la acción de un lado, el precio troquelado
                      del otro — el mismo botón que el del sitio. */}
                  <motion.button onClick={pagar} disabled={enviando} whileTap={enviando ? undefined : { scale: 0.985 }}
                    style={{ width: '100%', display: 'flex', alignItems: 'stretch', padding: 0, borderRadius: '100px', overflow: 'hidden', border: 'none', cursor: enviando ? 'default' : 'pointer', color: '#fff', background: `linear-gradient(120deg, ${PRIMARY} 0%, #F2855F 55%, ${MAUVE} 130%)`, boxShadow: '0 12px 28px rgba(255,145,77,0.32)', opacity: enviando ? 0.7 : 1, fontFamily: 'var(--font-body)' }}>
                    {enviando ? (
                      <span style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px', padding: '17px', fontWeight: 800, fontSize: '1rem' }}>
                        <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} style={{ display: 'flex' }}><Loader2 size={19} /></motion.span> Abriendo el pago…
                      </span>
                    ) : (
                      <>
                        <span style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '17px 14px', fontWeight: 700, fontSize: '1rem' }}>
                          <Ticket size={19} /> Apartar {acomp.length ? `${acomp.length + 1} lugares` : 'mi lugar'}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', padding: '17px 24px', fontWeight: 800, fontSize: '1.05rem', fontFamily: 'var(--font-display)', borderLeft: '2px dashed rgba(255,255,255,0.5)', background: 'rgba(0,0,0,0.07)' }}>
                          ${total}
                        </span>
                      </>
                    )}
                  </motion.button>
                  <p style={{ margin: '12px 0 0', fontSize: '0.76rem', color: '#A2968E', textAlign: 'center', lineHeight: 1.5 }}>
                    Pago seguro con Stripe. Tu boleto llega por correo al terminar.
                  </p>
                </>
              )}
            </div>
          </>
        )}

        {/* ── Pie: ¿ya eres socia? ──────────────────────────────────── */}
        <div style={{ marginTop: '26px', textAlign: 'center' }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', color: '#8A7F78', fontSize: '0.88rem', fontWeight: 600, textDecoration: 'none' }}>
            Conoce {ESTUDIO.nombre} <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '14px 15px', borderRadius: '13px', fontSize: '1rem',
  border: '1px solid rgba(0,0,0,0.09)', background: '#fff', color: '#2D2928',
  fontFamily: 'var(--font-body)', outline: 'none',
};

function Campo({ label, value, onChange, placeholder, type = 'text', hint, autoComplete }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#2D2928', marginBottom: '6px' }}>
        {label} {hint && <span style={{ fontWeight: 500, color: '#A2968E' }}>· {hint}</span>}
      </label>
      <input type={type} value={value} autoComplete={autoComplete} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)} style={inputStyle} />
    </div>
  );
}
