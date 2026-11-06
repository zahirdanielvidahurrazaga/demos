import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Plato, Receta, Diente } from './Objetos';
import {
  NEGOCIO, DOCTORES, SERVICIOS, PAQUETES, doctorDe, especialidad, espacios, agendar,
  inicioDia, bloquesDelDia, horaDe, peso, useClinica,
} from './datos';
import './sitio.css';

// ─────────────────────────────────────────────────────────────────────────────
// SITIO PÚBLICO — /clinica/raiz?rol=sitio (6-nov-2026)
//
// La cara que ve un paciente ANTES de ser paciente. Referencias de Zahir
// (Awwwards): Oryzo (un objeto cotidiano tratado como joya, al centro, que se
// transforma con el scroll), Minémal (tipografía enorme), Klearmind (texto
// que pasa de borroso a nítido). Concepto propio:
//   1. Portada fija con el OBJETO de la especialidad (Objetos.jsx).
//   2. Manifiesto palabra por palabra.
//   3. "Tu primera visita": teléfono fijo que cambia de pantalla por paso.
//   4. Doctores · 5. Precios · 6. Agenda REAL (crea la cita: sale en
//      Recepción como "En línea") · 7. Pie con la marca gigante.
// Una demo, tres entradas: `?para=nut|med|den` deja SOLO esa especialidad
// (para enseñársela a un consultorio de un doctor); sin `para` es la clínica
// integral con selector. Prefijo `rz-`.
// ─────────────────────────────────────────────────────────────────────────────

const F = '/clinica/raiz/';
const mayuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const tramo = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
const ALIAS = { nut: 'nut', nutricion: 'nut', med: 'med', medico: 'med', den: 'den', dental: 'den', dentista: 'den' };

const ESCENA = {
  nut: {
    Obj: Plato, fondo: 'bocado',
    titulo: <>Tu plan,<br /><em>bocado</em> por bocado.</>,
    pasos: [
      { a: 0.14, b: 0.4, t: <>Esto es una <em>tinga</em>.</>, s: 'Pollo, frijoles, aguacate y una tostada. Comida de aquí, no de revista.' },
      { a: 0.42, b: 0.72, t: <>Cada cosa <em>cuenta</em>.</>, s: 'Tu nutrióloga sabe cuánto de cada ingrediente te toca, y lo ajusta a lo que comes de verdad.' },
      { a: 0.76, b: 1.01, t: <>Y si te falta <em>algo</em>…</>, s: '…la app te dice con qué cambiarlo. Sin culpa, sin empezar de cero el lunes.' },
    ],
  },
  med: {
    Obj: Receta, fondo: 'receta',
    titulo: <>Saber qué tienes,<br />y qué <em>tomar</em>.</>,
    pasos: [
      { a: 0.1, b: 0.4, t: <>Una receta que <em>se entiende</em>.</>, s: 'Diagnóstico, medicamento y dosis, con letra que se lee y explicado con palabras normales.' },
      { a: 0.44, b: 0.76, t: <>A su <em>hora</em>.</>, s: 'Cada toma cae en tu día: 8, 16 y 24 horas. Nada de contar con los dedos.' },
      { a: 0.8, b: 1.01, t: <>Te <em>avisamos</em>.</>, s: 'Tu teléfono te recuerda cada toma y el doctor ve cómo vas.' },
    ],
  },
  den: {
    Obj: Diente, fondo: 'sonrisa',
    titulo: <>Tu sonrisa,<br /><em>capa</em> por capa.</>,
    pasos: [
      { a: 0.1, b: 0.36, t: <>Primero, <em>ver</em>.</>, s: 'Antes de cobrarte nada, te enseñamos tu boca diente por diente.' },
      { a: 0.4, b: 0.68, t: <>Entender qué <em>pasa</em>.</>, s: 'No es lo mismo una mancha en el esmalte que una caries en la dentina. Te lo explicamos.' },
      { a: 0.72, b: 1.01, t: <>Y un plan <em>claro</em>.</>, s: 'Qué se hace, en cuántas citas y cuánto cuesta. En abonos, si lo necesitas.' },
    ],
  },
};

const MANIFIESTO = 'Aquí nadie te da una hoja y te despide. Sales con tu plan en el teléfono y con alguien que lo sigue contigo, semana a semana.';

// pantallas del teléfono para "Tu primera visita"; los pasos 4 y 5 cambian por especialidad
function pantallas(esp) {
  const d = doctorDe(esp);
  const comun = [
    { n: '01', k: 'Agendas', t: <>Treinta segundos y <em>listo</em>.</>, s: 'Eliges día y hora desde tu celular. Sin llamar, sin esperar a que te contesten.',
      tel: <><p className="rz-t1">Agendar</p><p className="rz-t2">{especialidad(esp).corto} con <em>{d.corto}</em></p>
        <div className="rz-fila"><b>Mié 11</b><span>10:30</span></div><div className="rz-fila on"><b>Mié 11</b><span>12:00 ✓</span></div><div className="rz-fila"><b>Jue 12</b><span>16:30</span></div>
        <div className="rz-fila negra"><b>Confirmar cita</b><span>→</span></div></> },
    { n: '02', k: 'Te recordamos', t: <>Un día antes, un <em>WhatsApp</em>.</>, s: 'Confirmas con un toque. Si no puedes, la cambias ahí mismo y tu lugar pasa a alguien en lista de espera.',
      tel: <><p className="rz-t1">WhatsApp · {NEGOCIO.nombre}</p><p className="rz-t2">Martes 10</p>
        <div className="rz-burb">Hola Sofía. Te recordamos tu cita <b>mañana a las 12:00</b> con {d.nombre}.</div>
        <div className="rz-burb">¿Confirmas? 1 = sí · 2 = cambiarla</div><div className="rz-burb yo">1</div><div className="rz-burb">Listo, te esperamos.</div></> },
    { n: '03', k: 'Llegas', t: <>Te esperan por tu <em>nombre</em>.</>, s: 'Recepción ya sabe a qué vienes y en tu teléfono ves cuántos van antes que tú.',
      tel: <><p className="rz-t1">Sala de espera</p><p className="rz-t2">Ya <em>llegaste</em></p><p className="rz-grande">2</p><p className="rz-centro">personas antes que tú</p>
        <div className="rz-fila"><b>Tu consulta</b><span>≈ 12:10</span></div><div className="rz-fila"><b>{d.consultorio}</b><span>planta baja</span></div></> },
  ];
  const propio = {
    nut: [
      { n: '04', k: 'Consulta', t: <>Sales con todo en la <em>mano</em>.</>, s: 'Tus medidas, tu plan nuevo y la nota de tu nutrióloga llegan a la app antes de que salgas.',
        tel: <><p className="rz-t1">Resumen de consulta</p><p className="rz-t2">Bajaste <em>1.2 kg</em></p><div className="rz-fila"><b>Peso</b><span>68.4 kg</span></div><div className="rz-fila"><b>Cintura</b><span>−2 cm</span></div><div className="rz-fila"><b>Plan nuevo</b><span>sin lactosa</span></div><p className="rz-nota">“Vas muy bien. Esta semana probamos cenas más ligeras.” — Andrea</p></> },
      { n: '05', k: 'Entre citas', t: <>No te quedas <em>sola</em>.</>, s: 'Registras cómo vas, ella lo ve y te ajusta el plan cuando lo necesitas.',
        tel: <><p className="rz-t1">Esta semana</p><p className="rz-t2">Vas al <em>80%</em></p><p className="rz-mini">Comidas del plan</p><div className="rz-barra"><i style={{ width: '80%' }} /></div><p className="rz-mini">Agua</p><div className="rz-barra"><i style={{ width: '62%' }} /></div><p className="rz-mini">Pasos</p><div className="rz-barra"><i style={{ width: '48%' }} /></div><div className="rz-fila negra"><b>Pedir ajuste a Andrea</b><span>→</span></div></> },
    ],
    med: [
      { n: '04', k: 'Consulta', t: <>La receta, sin <em>papelito</em>.</>, s: 'Diagnóstico, medicamentos y horarios en tu app. La enseñas en la farmacia o la imprimes.',
        tel: <><p className="rz-t1">Receta · hoy</p><p className="rz-t2">Faringitis <em>aguda</em></p><div className="rz-fila"><b>Amoxicilina 500 mg</b><span>c/8 h</span></div><div className="rz-fila"><b>Paracetamol 500 mg</b><span>si hay fiebre</span></div><div className="rz-fila"><b>Reposo</b><span>48 h</span></div><div className="rz-fila negra"><b>Imprimir receta</b><span>→</span></div></> },
      { n: '05', k: 'Entre citas', t: <>¿Cómo <em>sigues</em>?</>, s: 'Al tercer día te preguntamos. Si algo no va bien, el doctor se entera sin que tengas que llamar.',
        tel: <><p className="rz-t1">Día 3 de 7</p><p className="rz-t2">¿Te bajó la <em>fiebre</em>?</p><div className="rz-fila on"><b>Sí, ya me siento mejor</b><span>✓</span></div><div className="rz-fila"><b>Sigo igual</b><span /></div><div className="rz-fila"><b>Estoy peor</b><span /></div><p className="rz-nota">Tomas de hoy: 8:00 ✓ · 16:00 · 24:00</p></> },
    ],
    den: [
      { n: '04', k: 'Consulta', t: <>Tu boca, diente por <em>diente</em>.</>, s: 'Ves qué está sano, qué hay que atender y cuánto cuesta. Nada de presupuestos en una servilleta.',
        tel: <><p className="rz-t1">Tu odontograma</p><p className="rz-t2">2 por <em>atender</em></p><div className="rz-boca-mini">{'··c·r···h··c····'.split('').map((k, i) => <i key={i} className={k === 'c' ? 'caries' : k === 'r' ? 'resina' : k === 'h' ? 'hecho' : ''} />)}</div><div className="rz-fila"><b>Resina · 16</b><span>$950</span></div><div className="rz-fila"><b>Resina · 26</b><span>$950</span></div><div className="rz-fila negra"><b>Aceptar presupuesto</b><span>→</span></div></> },
      { n: '05', k: 'Entre citas', t: <>Pagas a tu <em>ritmo</em>.</>, s: 'Abonas desde el teléfono y siempre sabes cuánto llevas y cuánto falta.',
        tel: <><p className="rz-t1">Tu tratamiento</p><p className="rz-t2">Vas a la <em>mitad</em></p><div className="rz-barra grueso"><i style={{ width: '52%' }} /></div><div className="rz-fila"><b>Pagado</b><span>$1,450</span></div><div className="rz-fila"><b>Saldo</b><span>$1,300</span></div><div className="rz-fila negra"><b>Abonar $650</b><span>→</span></div></> },
    ],
  };
  return [...comun, ...propio[esp]];
}

// avance 0–1 de una sección alta con un tramo fijo adentro
function useAvance(ref) {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const medir = () => {
      raf = 0;
      const el = ref.current; if (!el) return;
      const fijo = el.firstElementChild;
      const r = el.getBoundingClientRect();
      const arriba = fijo ? parseFloat(getComputedStyle(fijo).top) || 0 : 0;
      const largo = el.offsetHeight - (fijo ? fijo.offsetHeight : window.innerHeight);
      setP(Math.min(1, Math.max(0, (arriba - r.top) / Math.max(1, largo))));
    };
    const pedir = () => { if (!raf) raf = requestAnimationFrame(medir); };
    pedir();
    window.addEventListener('scroll', pedir, { passive: true });
    window.addEventListener('resize', pedir);
    return () => { window.removeEventListener('scroll', pedir); window.removeEventListener('resize', pedir); cancelAnimationFrame(raf); };
  }, [ref]);
  return p;
}

// aparece al entrar a la pantalla (texto de borroso a nítido)
function useAparece() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return undefined;
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && e.target.classList.add('visto')), { threshold: 0.18 });
    el.querySelectorAll('.rz-aparece').forEach((x) => io.observe(x));
    return () => io.disconnect();
  });
  return ref;
}

function Intro() {
  const [fuera, setFuera] = useState(() => { try { return sessionStorage.getItem('demo_clinica_intro') === '1'; } catch { return false; } });
  useEffect(() => {
    if (fuera) return undefined;
    const t = setTimeout(() => { setFuera(true); try { sessionStorage.setItem('demo_clinica_intro', '1'); } catch { /* sin almacenamiento */ } }, 2300);
    return () => clearTimeout(t);
  }, [fuera]);
  if (fuera) return null;
  return (
    <div className="rz-intro" aria-hidden="true">
      <p className="rz-intro-marca">{'Raíz'.split('').map((l, i) => <span key={i} style={{ animationDelay: `${0.15 + i * 0.09}s` }}>{l}</span>)}</p>
      <p className="rz-intro-lema">clínica integral · Puebla</p>
    </div>
  );
}

function Cabeza({ solo, alAgendar }) {
  const ir = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  const ref = useRef(null);
  const [oscuro, setOscuro] = useState(false);
  // sobre el manifiesto y el pie (fondo tinta) la marca y el menú se aclaran
  useEffect(() => {
    let raf = 0;
    const ver = () => {
      raf = 0;
      const y = (ref.current?.getBoundingClientRect().top || 0) + 40;
      setOscuro([...document.querySelectorAll('.rz-oscuro')].some((el) => { const r = el.getBoundingClientRect(); return r.top <= y && r.bottom >= y; }));
    };
    const pedir = () => { if (!raf) raf = requestAnimationFrame(ver); };
    pedir();
    window.addEventListener('scroll', pedir, { passive: true });
    return () => { window.removeEventListener('scroll', pedir); cancelAnimationFrame(raf); };
  }, []);
  return (
    <header ref={ref} className={`rz-cab ${oscuro ? 'oscuro' : ''}`}>
      <a className="rz-marca" href="#rz-arriba" onClick={(ev) => { ev.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
        Raíz<i>.</i>
      </a>
      <nav>
        <button type="button" onClick={() => ir('rz-visita')}>Tu visita</button>
        <button type="button" onClick={() => ir('rz-equipo')}>{solo ? 'Tu doctor' : 'Equipo'}</button>
        <button type="button" onClick={() => ir('rz-precios')}>Precios</button>
        <button type="button" className="rz-cab-agendar" onClick={alAgendar}>Agendar</button>
      </nav>
    </header>
  );
}

function Portada({ esp, solo, alCambiar }) {
  const ref = useRef(null);
  const p = useAvance(ref);
  const { Obj, fondo, titulo, pasos } = ESCENA[esp];
  const intro = 1 - tramo(p, 0.04, 0.12);
  return (
    <section ref={ref} className="rz-portada" id="rz-arriba">
      <div className="rz-fijo">
        <p className="rz-fondo" aria-hidden="true" style={{ transform: `translate(${12 - p * 60}%, -50%)` }}>{fondo}</p>
        <div className="rz-escenario"><Obj key={esp} p={p} /></div>
        <div className="rz-titulo" style={{ opacity: intro, transform: `translateY(${(1 - intro) * -30}px)`, filter: `blur(${(1 - intro) * 8}px)` }}>
          <p className="rz-pre">{solo ? doctorDe(esp).nombre : NEGOCIO.completo} · Puebla</p>
          <h1>{titulo}</h1>
        </div>
        {pasos.map((x, i) => {
          const v = Math.min(tramo(p, x.a, x.a + 0.06), 1 - tramo(p, x.b - 0.06, x.b));
          return (
            <div key={i} className={`rz-beat ${i % 2 ? 'der' : ''}`} style={{ opacity: v, filter: `blur(${(1 - v) * 10}px)`, transform: `translateY(${(1 - v) * 24}px)` }}>
              <h2>{x.t}</h2><p>{x.s}</p>
            </div>
          );
        })}
        {!solo && (
          <div className="rz-selector" role="group" aria-label="Especialidad">
            {['nut', 'med', 'den'].map((k) => (
              <button key={k} type="button" className={k === esp ? 'on' : ''} style={{ '--c': especialidad(k).color }} onClick={() => alCambiar(k)}>
                {k === 'nut' ? 'Nutrición' : k === 'med' ? 'Médico general' : 'Dentista'}
              </button>
            ))}
          </div>
        )}
        <div className="rz-progreso" aria-hidden="true"><i style={{ transform: `scaleX(${p})` }} /></div>
        <p className="rz-baja" style={{ opacity: intro }}>Baja despacio</p>
      </div>
    </section>
  );
}

function Manifiesto() {
  const ref = useRef(null);
  const p = useAvance(ref);
  const palabras = MANIFIESTO.split(' ');
  return (
    <section ref={ref} className="rz-manifiesto rz-oscuro">
      <div className="rz-fijo-centro">
        <p>{palabras.map((w, i) => {
          const v = tramo(p * 1.25, i / palabras.length, (i + 2.5) / palabras.length);
          const clave = /teléfono|contigo|semana/.test(w);
          return <span key={i} className={clave ? 'clave' : ''} style={{ opacity: 0.12 + v * 0.88, filter: `blur(${(1 - v) * 6}px)` }}>{w} </span>;
        })}</p>
      </div>
    </section>
  );
}

function Visita({ esp }) {
  const lista = useMemo(() => pantallas(esp), [esp]);
  const [i, setI] = useState(0);
  const pasosRef = useRef([]);
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) setI(+e.target.dataset.i); }), { rootMargin: window.innerWidth < 820 ? '-66% 0px -18% 0px' : '-45% 0px -45% 0px' });
    pasosRef.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [lista]);
  return (
    <section className="rz-visita" id="rz-visita">
      <div className="rz-visita-cab">
        <p className="rz-pre">Tu primera visita</p>
        <h2 className="rz-h2">Así se siente, <em>antes</em> de llegar.</h2>
      </div>
      <div className="rz-visita-cuerpo">
        <div className="rz-pasos">
          {lista.map((x, j) => (
            <div key={x.n} ref={(el) => { pasosRef.current[j] = el; }} data-i={j} className={`rz-paso ${j === i ? 'on' : ''}`}>
              <span>{x.n} · {x.k}</span><h3>{x.t}</h3><p>{x.s}</p>
            </div>
          ))}
        </div>
        <div className="rz-tel-fijo">
          <div className="rz-tel">
            <div className="rz-tel-isla" />
            {lista.map((x, j) => <div key={x.n} className={`rz-pant ${j === i ? 'on' : j < i ? 'antes' : ''}`}>{x.tel}</div>)}
          </div>
          <div className="rz-tel-puntos">{lista.map((x, j) => <i key={x.n} className={j === i ? 'on' : ''} />)}</div>
        </div>
      </div>
    </section>
  );
}

const BIO = {
  andrea: 'Arma tu plan con lo que te gusta comer, lo que hay en tu súper y lo que puedes gastar. Cero dietas de revista.',
  emilio: 'Consulta sin prisa. Te explica qué tienes con palabras normales y te vas con tu receta en el teléfono.',
  paula: 'Primero te enseña tu boca diente por diente. Luego, un presupuesto claro que puedes pagar en abonos.',
};
const FOTO_DOC = { andrea: 'doc-andrea', emilio: 'doc-navarro', paula: 'doc-rios' };

function Equipo({ esp, solo, alElegir }) {
  const ref = useAparece();
  const lista = solo ? [doctorDe(esp)] : DOCTORES;
  return (
    <section ref={ref} className={`rz-equipo ${solo ? 'solo' : ''}`} id="rz-equipo">
      <div className="rz-aparece">
        <p className="rz-pre">{solo ? 'Quién te atiende' : 'El equipo'}</p>
        <h2 className="rz-h2">{solo ? <>Una persona, no un <em>turno</em>.</> : <>Tres especialistas, <em>un</em> expediente.</>}</h2>
      </div>
      <div className="rz-docs">
        {lista.map((d, i) => (
          <button key={d.id} type="button" className={`rz-doc rz-aparece ${d.esp === esp ? 'actual' : ''}`} style={{ '--c': especialidad(d.esp).color, transitionDelay: `${i * 0.12}s` }} onClick={() => alElegir(d.esp)}>
            <span className="rz-doc-foto">
              <img src={`${F}${FOTO_DOC[d.id]}.webp`} alt={d.nombre} loading="lazy" onError={(ev) => { ev.currentTarget.style.visibility = 'hidden'; }} />
              <span className="rz-doc-ini">{d.iniciales}</span>
            </span>
            <span className="rz-doc-esp">{especialidad(d.esp).nombre}</span>
            <span className="rz-doc-nombre">{d.nombre}</span>
            <span className="rz-doc-bio">{BIO[d.id]}</span>
            <span className="rz-doc-ced">Cédula profesional {d.cedula} · {d.consultorio}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function Precios({ esp, solo }) {
  const ref = useAparece();
  const grupos = solo ? [esp] : ['nut', 'med', 'den'];
  return (
    <section ref={ref} className="rz-precios" id="rz-precios">
      <div className="rz-aparece">
        <p className="rz-pre">Cuánto cuesta</p>
        <h2 className="rz-h2">Sin <em>sorpresas</em>.</h2>
      </div>
      {grupos.map((g) => (
        <div key={g} className="rz-grupo rz-aparece" style={{ '--c': especialidad(g).color }}>
          {!solo && <p className="rz-grupo-t">{especialidad(g).nombre}</p>}
          {SERVICIOS.filter((s) => s.esp === g && s.precio > 0).map((s) => (
            <div key={s.id} className="rz-precio"><div><b>{s.nombre}</b><span>{s.nota} · {s.min} min</span></div><strong>{peso(s.precio)}</strong></div>
          ))}
          {g === 'nut' && PAQUETES.map((q) => (
            <div key={q.id} className="rz-precio paquete"><div><b>{q.nombre}</b><span>{q.nota || `Ahorras ${peso(q.ahorro)}`}</span></div><strong>{peso(q.precio)}{q.mensual ? <small> /mes</small> : null}</strong></div>
          ))}
          {g === 'den' && <div className="rz-precio"><div><b>Tratamientos</b><span>Resinas, endodoncia, coronas: presupuesto por escrito en tu valoración</span></div><strong>en abonos</strong></div>}
        </div>
      ))}
    </section>
  );
}

function Agenda({ esp, solo, alCambiar, alVer }) {
  const e = useClinica();
  const doc = doctorDe(esp);
  const servs = SERVICIOS.filter((s) => s.esp === esp && s.precio > 0 && !s.virtual);
  const [serv, setServ] = useState(servs[0].id);
  const [dia, setDia] = useState(null);
  const [hora, setHora] = useState(null);
  const [nombre, setNombre] = useState('');
  const [tel, setTel] = useState('');
  const [hecha, setHecha] = useState(null);
  const [error, setError] = useState('');
  const sv = SERVICIOS.find((s) => s.id === serv) || servs[0];
  const dias = useMemo(() => {
    const out = [];
    for (let d = 0; out.length < 7 && d < 14; d += 1) { const t = inicioDia(d); if (bloquesDelDia(t).length) out.push(t); }
    return out;
  }, []);
  const libres = dia ? espacios(e, doc.id, dia, sv.min, 30) : [];
  const listo = hora && nombre.trim().length > 2 && tel.replace(/\D/g, '').length >= 10;
  const enviar = (ev) => {
    ev.preventDefault();
    if (!listo) return;
    const r = agendar({ doc: doc.id, serv: sv.id, inicio: hora, origen: 'web', nombreNuevo: nombre.trim(), telNuevo: tel });
    if (r?.error) { setError('Ese horario se acaba de ocupar. Elige otro.'); setHora(null); return; }
    setHecha({ nombre: nombre.trim().split(' ')[0], cuando: hora, sv });
  };
  const fecha = (t) => mayuscula(new Date(t).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }).replace('.', ''));
  return (
    <section className="rz-agenda" id="rz-agenda" style={{ '--c': especialidad(esp).color }}>
      <div className="rz-agenda-izq">
        <p className="rz-pre">Agenda</p>
        <h2 className="rz-h2">¿Empezamos <em>esta semana</em>?</h2>
        <p className="rz-agenda-nota">Horarios reales de {doc.nombre}. La cita que hagas aquí aparece al instante en la agenda de recepción.</p>
        {!solo && (
          <div className="rz-agenda-esp">
            {['nut', 'med', 'den'].map((k) => <button key={k} type="button" className={k === esp ? 'on' : ''} style={{ '--c': especialidad(k).color }} onClick={() => alCambiar(k, false)}>{especialidad(k).corto}</button>)}
          </div>
        )}
      </div>
      <div className="rz-agenda-der">
        {hecha ? (
          <div className="rz-hecha">
            <p className="rz-pre">Cita agendada</p>
            <p className="rz-hecha-t">Listo, <em>{hecha.nombre}</em>.</p>
            <p className="rz-hecha-cuando">{mayuscula(new Date(hecha.cuando).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }))} · {horaDe(hecha.cuando)}</p>
            <p>{hecha.sv.nombre} con {doc.nombre}. Te escribimos por WhatsApp un día antes para confirmar.</p>
            <div className="rz-hecha-demo">
              <span>En la demo:</span> tu cita ya está en la agenda, marcada <b>En línea</b>.
              <button type="button" onClick={() => alVer('recepcion')}>Verla como Recepción →</button>
            </div>
            <button type="button" className="rz-link" onClick={() => { setHecha(null); setHora(null); setNombre(''); setTel(''); }}>Agendar otra</button>
          </div>
        ) : (
          <form onSubmit={enviar}>
            <p className="rz-paso-f"><span>1</span>¿Qué necesitas?</p>
            <div className="rz-servs">
              {servs.map((s) => (
                <button key={s.id} type="button" className={s.id === serv ? 'on' : ''} onClick={() => { setServ(s.id); setHora(null); }}>
                  <b>{s.nombre}</b><span>{s.min} min · {peso(s.precio)}</span>
                </button>
              ))}
            </div>
            <p className="rz-paso-f"><span>2</span>¿Cuándo?</p>
            <div className="rz-dias">
              {dias.map((t) => <button key={t} type="button" className={t === dia ? 'on' : ''} onClick={() => { setDia(t); setHora(null); setError(''); }}>{fecha(t)}</button>)}
            </div>
            {dia && (
              <div className="rz-horas">
                {libres.length ? libres.map((t) => <button key={t} type="button" className={t === hora ? 'on' : ''} onClick={() => setHora(t)}>{horaDe(t)}</button>)
                  : <p className="rz-vacio">Ese día ya está lleno. Prueba otro.</p>}
              </div>
            )}
            {error && <p className="rz-error">{error}</p>}
            <p className="rz-paso-f"><span>3</span>¿A nombre de quién?</p>
            <div className="rz-datos">
              <label><span>Nombre</span><input value={nombre} onChange={(ev) => setNombre(ev.target.value)} placeholder="Tu nombre completo" autoComplete="name" /></label>
              <label><span>WhatsApp</span><input value={tel} onChange={(ev) => setTel(ev.target.value)} placeholder="222 000 0000" inputMode="tel" autoComplete="tel" /></label>
            </div>
            <button type="submit" className="rz-agendar" disabled={!listo}>
              {hora ? `Agendar ${fecha(hora)} · ${horaDe(hora)}` : 'Elige un horario'}
            </button>
            <p className="rz-letra">Sin anticipo. Si no puedes llegar, cancelas desde el WhatsApp.</p>
          </form>
        )}
      </div>
    </section>
  );
}

function Pie({ solo, esp }) {
  return (
    <footer className="rz-pie rz-oscuro">
      <div className="rz-pie-datos">
        <div><span>Dónde</span><p>{NEGOCIO.direccion}</p></div>
        <div><span>Horario</span><p>Lunes a viernes 9–14 y 16–19 h<br />Sábado 9–14 h</p></div>
        <div><span>WhatsApp</span><p>{NEGOCIO.whatsapp}</p></div>
        <div><span>{solo ? 'Especialidad' : 'Especialidades'}</span><p>{solo ? especialidad(esp).nombre : 'Nutrición · Medicina general · Odontología'}</p></div>
      </div>
      <p className="rz-pie-marca" aria-hidden="true">Raíz</p>
      <p className="rz-pie-aviso">Clínica de ejemplo para la demostración · por KaiZen</p>
    </footer>
  );
}

export default function Sitio({ alVer }) {
  const inicial = useMemo(() => ALIAS[new URLSearchParams(window.location.search).get('para')] || null, []);
  const solo = !!inicial;
  const [esp, setEsp] = useState(inicial || 'nut');
  const [velo, setVelo] = useState(false);
  const raiz = useRef(null);

  useLayoutEffect(() => {
    const color = especialidad(esp);
    raiz.current?.style.setProperty('--rz-ac', color.color);
    raiz.current?.style.setProperty('--rz-ac-suave', color.suave);
  }, [esp]);

  // cambiar de especialidad: velo corto, cambia y regresa arriba de la portada
  const cambiar = useCallback((k, arriba = true) => {
    if (k === esp) return;
    if (!arriba) { setEsp(k); return; }
    setVelo(true);
    setTimeout(() => {
      setEsp(k);
      window.scrollTo({ top: 0 });
      setTimeout(() => setVelo(false), 60);
    }, 420);
  }, [esp]);

  const alAgendar = () => document.getElementById('rz-agenda')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div ref={raiz} className="rz">
      <Intro />
      <div className={`rz-velo ${velo ? 'on' : ''}`} aria-hidden="true" />
      <Cabeza solo={solo} alAgendar={alAgendar} />
      <Portada esp={esp} solo={solo} alCambiar={cambiar} />
      <Manifiesto />
      <Visita esp={esp} />
      <Equipo esp={esp} solo={solo} alElegir={(k) => cambiar(k)} />
      <Precios esp={esp} solo={solo} />
      <Agenda key={esp} esp={esp} solo={solo} alCambiar={cambiar} alVer={alVer} />
      <Pie solo={solo} esp={esp} />
    </div>
  );
}
