import { useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// ─────────────────────────────────────────────────────────────────────────────
// La inmersión del resto de la página (1-nov-2026, pedido de Zahir: "ya hay
// inmersión en el hero, tenerla en el resto, sin otro render"). Todo va con
// el scroll y nada con movimiento reducido:
// "Que se sienta como una presentación, viva", con una transición DISTINTA
// en cada paso (repetir la de la hoja en todas no le gustó) y las tomas del
// render de protagonistas:
// · recorrido → cifras: la hoja de piedra sube sobre el último cuadro, que se
//   aleja y se oscurece (`.re-panel`; pasar el fondo de azul a piedra se veía
//   gris a la mitad);
// · cifras → sala: la sala corre en un recuadro chico que se abre hasta
//   llenar la pantalla, y al llenarla sube su texto;
// · amenidades: la sección se pega y la galería corre de lado;
// · barrio: entra como un círculo que se abre desde el punto del edificio;
// · rótulos gigantes por sección (`Rotulo`), cada uno con su entrada:
//   sube · abre desde el centro · enfoca · deriva;
// · pantalla de carga cuyas tres columnas suben (idea adaptada de
//   pyzhevsky.estate, sin copiarla; la retícula de líneas NO le gustó);
// · cierre: la ventana de la cocina corre detrás y se acerca despacio;
// · los titulares entran palabra por palabra (`Palabras.jsx`);
// · las fotos entran desenfocadas y se enfocan, y se mueven más lento
//   que la página
//   (`--re-par` en cada `[data-par]`, así sirve aunque la foto se cambie);
// · las cifras cuentan, la torre se llena piso por piso desde abajo, las
//   rutas del mapa se dibujan y las listas entran de una en una.
// ─────────────────────────────────────────────────────────────────────────────

export function useInmersion(raiz) {
  useLayoutEffect(() => {
    const mm = gsap.matchMedia(raiz.current);
    const hoja = raiz.current.querySelector('.re-panel');

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // el último cuadro del recorrido se aleja y se oscurece mientras sube
      // la hoja
      gsap.fromTo('.re-viaje[data-toma="recorrido"] .re-pegado', { scale: 1, opacity: 1 }, {
        scale: 0.94, opacity: 0.45, ease: 'none',
        scrollTrigger: { trigger: hoja, start: 'top bottom', end: 'top top', scrub: true },
      });

      // la sala: recuadro → pantalla completa, luego el texto
      const tl = gsap.timeline({ scrollTrigger: { trigger: '.re-sala', start: 'top top', end: 'bottom bottom', scrub: true } });
      tl.fromTo('.re-sala-marco', { clipPath: 'inset(26% 32% 26% 32%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.inOut', duration: 0.6 })
        .fromTo('.re-sala-marco .re-toma', { scale: 1.35 }, { scale: 1, ease: 'power2.inOut', duration: 0.6 }, 0)
        .fromTo('.re-sala-txt > *', { opacity: 0, y: 40 }, { opacity: 1, y: 0, stagger: 0.06, duration: 0.25 }, 0.62)
        .to({}, { duration: 0.15 });

      // amenidades de lado: el alto de la sección = lo que corre la pista
      // más una pantalla
      const amen = raiz.current.querySelector('.re-amen');
      const pista = raiz.current.querySelector('.re-amen-pista');
      const corre = () => Math.max(0, pista.scrollWidth - document.documentElement.clientWidth);
      const altoAmen = () => { amen.style.height = `${corre() + window.innerHeight}px`; };
      altoAmen();
      gsap.to(pista, {
        x: () => -corre(), ease: 'none',
        scrollTrigger: { trigger: amen, start: 'top top', end: 'bottom bottom', scrub: true, invalidateOnRefresh: true, onRefreshInit: altoAmen },
      });

      gsap.fromTo('.re-barrio', { clipPath: 'circle(0% at 28% 62%)' }, {
        clipPath: 'circle(150% at 28% 62%)', ease: 'power1.in',
        scrollTrigger: { trigger: '.re-barrio', start: 'top bottom', end: 'top 15%', scrub: true },
      });

      gsap.fromTo('.re-pie-cta .re-toma', { scale: 1.15 }, {
        scale: 1, ease: 'none',
        scrollTrigger: { trigger: '.re-pie', start: 'top bottom', end: 'top top', scrub: true },
      });

      gsap.utils.toArray('.re-revela').forEach((t) => {
        gsap.from(t.querySelectorAll('.re-pal > span'), {
          yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.045,
          scrollTrigger: { trigger: t, start: 'top 86%' },
        });
      });

      gsap.utils.toArray('[data-par]').forEach((s) => {
        ScrollTrigger.create({
          trigger: s, start: 'top bottom', end: 'bottom top',
          onUpdate: (st) => s.style.setProperty('--re-par', ((st.progress - 0.5) * 16).toFixed(2)),
        });
      });
      // las fotos entran desenfocadas y se enfocan al llegar
      gsap.utils.toArray('.re-descubre').forEach((f) => {
        gsap.fromTo(f, { filter: 'blur(18px)', opacity: 0.4 }, {
          filter: 'blur(0px)', opacity: 1, ease: 'none',
          scrollTrigger: { trigger: f, start: 'top 95%', end: 'top 45%', scrub: true },
        });
      });

      // rótulos gigantes, cada uno entra distinto
      const letras = (r) => r.querySelectorAll(':scope > span > span');
      gsap.utils.toArray('.re-rotulo.sube').forEach((r) => {
        gsap.from(letras(r), {
          yPercent: 105, duration: 1.2, ease: 'expo.out', stagger: 0.04,
          scrollTrigger: { trigger: r, start: 'top 88%' },
        });
      });
      gsap.utils.toArray('.re-rotulo.abre').forEach((r) => {
        // todas salen juntas del centro y se reparten a lo ancho
        gsap.from(r.children, {
          x: (i, el) => r.clientWidth / 2 - el.offsetLeft - el.offsetWidth / 2, opacity: 0, ease: 'power2.out',
          scrollTrigger: { trigger: r, start: 'top 95%', end: 'top 45%', scrub: true },
        });
      });
      gsap.utils.toArray('.re-rotulo.enfoca').forEach((r) => {
        gsap.from(letras(r), {
          opacity: 0, filter: 'blur(14px)', duration: 1.4, ease: 'power2.out', stagger: { each: 0.08, from: 'random' },
          scrollTrigger: { trigger: r, start: 'top 85%' },
        });
      });
      gsap.utils.toArray('.re-rotulo.deriva').forEach((r) => {
        // cada letra a su velocidad, se alinean al llegar
        gsap.fromTo(r.children, { y: (i) => [70, -40, 30, -60, 50, -20][i % 6] }, {
          y: 0, ease: 'none',
          scrollTrigger: { trigger: r, start: 'top bottom', end: 'top 35%', scrub: true },
        });
      });

      gsap.utils.toArray('.re-cifras dt[data-n]').forEach((dt) => {
        const fin = Number(dt.dataset.n);
        const o = { n: 0 };
        gsap.to(o, {
          n: fin, duration: 1.6, ease: 'power3.out',
          onUpdate: () => { dt.textContent = Math.round(o.n); },
          scrollTrigger: { trigger: dt, start: 'top 90%' },
        });
      });

      gsap.from('.re-piso', {
        opacity: 0, x: -14, duration: 0.5, ease: 'power2.out', stagger: { each: 0.025, from: 'end' },
        scrollTrigger: { trigger: '.re-torre', start: 'top 75%' },
      });

      gsap.fromTo('.re-mapa .ruta', { strokeDashoffset: 1 }, {
        strokeDashoffset: 0, ease: 'none', stagger: 0.15,
        scrollTrigger: { trigger: '.re-mapa', start: 'top 80%', end: 'center 45%', scrub: true },
      });

      ScrollTrigger.batch('.re-cifras dl > div, .re-trayectos li', {
        start: 'top 92%',
        onEnter: (els) => gsap.from(els, { opacity: 0, y: 28, duration: 0.9, ease: 'power3.out', stagger: 0.08 }),
      });
      return () => { amen.style.height = ''; };
    });
    return () => mm.revert();
  }, [raiz]);
}
