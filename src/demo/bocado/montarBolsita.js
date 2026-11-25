import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// ─────────────────────────────────────────────────────────────────────────────
// LA BOLSITA EN 3D (19-nov-2026) — el personaje del logo, vivo. Three.js puro
// (sin react-three-fiber) para montarlo en cualquier contenedor:
//   const quitar = montarBolsita(div, { girar: true, alGuardar });
// Saluda, brinca, parpadea, sus ojos siguen el cursor, suelta corazones y si
// la tocas da un brinco con vuelta. Se pausa fuera de pantalla y respeta
// "reducir movimiento". El trazo oscuro es el mismo del logo (contorno).
// ─────────────────────────────────────────────────────────────────────────────

// paleta "helecho" (19-nov): trazo ceylanite, tallo albahaca, hojas plaza, doblez kiwi
const C = { olivo: 0x526531, carbon: 0x30401C, salvia: 0xA9B985, masa: 0xDCE7BE, tomate: 0xE2553B, papel: 0xFFFFFB };
const quieto = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Papel: fibras muy suaves para que no se vea plástico.
function texturaPapel() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#808080'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) {
    const v = 110 + Math.random() * 40;
    x.fillStyle = `rgba(${v},${v},${v},.35)`;
    x.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 3, 1);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2);
  return t;
}

// Caja redondeada que se angosta hacia arriba (la bolsa del logo es trapecio).
function cajaTrapecio(w, h, d, r, angosta = 0.06) {
  const g = new RoundedBoxGeometry(w, h, d, 5, r);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) / h + 0.5; // 0 abajo → 1 arriba
    p.setX(i, p.getX(i) * (1 - angosta * y));
  }
  g.computeVertexNormals();
  return g;
}

export function montarBolsita(caja, { girar = true, fondoTransparente = true, orbitar = true, movimiento = false } = {}) {
  const lento = !movimiento && quieto();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: fondoTransparente, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.touchAction = 'pan-y';
  caja.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const entorno = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = entorno;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0.9, 1.9, 8.6);

  // orbitar:false = sin arrastre (la anfitriona flota encima de la página y no debe robarse el scroll del dedo)
  const controls = new OrbitControls(camera, renderer.domElement);
  if (!orbitar) { controls.enabled = false; renderer.domElement.style.touchAction = 'pan-y'; }
  controls.target.set(0, 1.35, 0);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.enableZoom = false; // la rueda baja la página
  controls.minPolarAngle = 0.4; controls.maxPolarAngle = 1.6;
  // quieta, se balancea de frente; si la giras, espera 4 s y vuelve sola
  let tocando = false, reanudar;
  controls.addEventListener('start', () => { tocando = true; clearTimeout(reanudar); });
  controls.addEventListener('end', () => { reanudar = setTimeout(() => { tocando = false; }, 4000); });
  const vistaInicial = camera.position.clone();

  scene.add(new THREE.HemisphereLight(0xffffff, 0x758850, 1.2));
  const sol = new THREE.DirectionalLight(0xfff4e4, 2.2); sol.position.set(3, 5, 4); scene.add(sol);
  const contra = new THREE.DirectionalLight(0xeaf2c6, 1.3); contra.position.set(-3.5, 3, -4); scene.add(contra);

  const desechables = [];
  const guarda = (o) => { desechables.push(o); return o; };
  const mat = (color, r = 0.85, extra = {}) => guarda(new THREE.MeshStandardMaterial({ color, roughness: r, metalness: 0, ...extra }));
  const linea = guarda(new THREE.MeshBasicMaterial({ color: C.carbon, side: THREE.BackSide }));
  const oscuro = mat(C.carbon, 0.5);
  const fibras = guarda(texturaPapel());
  const papel = mat(C.papel, 0.92, { bumpMap: fibras, bumpScale: 0.6 });
  const papelDoblez = mat(C.masa, 0.92, { bumpMap: fibras, bumpScale: 0.6 });

  const conContorno = (geo, geoBorde, material) => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(guarda(geo), material));
    g.add(new THREE.Mesh(guarda(geoBorde), linea));
    return g;
  };
  const tubo = (puntos, radio = 0.046, material = oscuro) =>
    new THREE.Mesh(guarda(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(puntos.map((p) => new THREE.Vector3(...p))), 48, radio, 14, false)), material);
  const esfera = (r, material, borde = 0.028) => conContorno(new THREE.SphereGeometry(r, 32, 24), new THREE.SphereGeometry(r + borde, 32, 24), material);

  const mono = new THREE.Group(); scene.add(mono);
  const cuerpo = new THREE.Group(); mono.add(cuerpo);

  // ── la bolsa
  const W = 1.34, H = 1.36, D = 0.86, Y0 = 0.34, T = 0.035;
  const bolsa = conContorno(cajaTrapecio(W, H, D, 0.07), cajaTrapecio(W + T * 2, H + T * 2, D + T * 2, 0.07 + T), papel);
  bolsa.position.y = Y0 + H / 2; cuerpo.add(bolsa);
  const anchoArriba = W * (1 - 0.06);
  const doblez = conContorno(new RoundedBoxGeometry(anchoArriba + 0.06, 0.27, D + 0.06, 5, 0.05), new RoundedBoxGeometry(anchoArriba + 0.06 + T * 2, 0.27 + T * 2, D + 0.06 + T * 2, 5, 0.05 + T), papelDoblez);
  doblez.position.y = Y0 + H - 0.1; cuerpo.add(doblez);

  // borde cortado en picos, en los cuatro lados
  const pico = guarda(new THREE.ConeGeometry(0.066, 0.075, 4));
  const yPico = Y0 + H + 0.067;
  const ponPico = (x, z) => { const m = new THREE.Mesh(pico, papelDoblez); m.position.set(x, yPico, z); m.rotation.y = Math.PI / 4; cuerpo.add(m); };
  const aw = anchoArriba + 0.06, ad = D + 0.06;
  for (let i = 0; i < 11; i++) { const x = -aw / 2 + aw * (i + 0.5) / 11; ponPico(x, ad / 2 - 0.02); ponPico(x, -ad / 2 + 0.02); }
  for (let i = 1; i < 6; i++) { const z = -ad / 2 + ad * i / 6; ponPico(aw / 2 - 0.02, z); ponPico(-aw / 2 + 0.02, z); }

  // pliegues del papel (frente y lados)
  const pliegue = mat(0xc9cbb6, 0.9);
  for (const s of [-1, 1]) {
    cuerpo.add(tubo([[s * 0.52, Y0 + 0.1, D / 2 + 0.004], [s * 0.48, Y0 + H - 0.3, D / 2 + 0.004]], 0.008, pliegue));
    cuerpo.add(tubo([[s * (W / 2 + 0.004), Y0 + 0.1, 0], [s * (anchoArriba / 2 + 0.004), Y0 + H - 0.3, 0]], 0.008, pliegue));
  }

  // ── la cara (lienzo: mismo trazo que el logo; los ojos miran al cursor)
  const lienzo = document.createElement('canvas'); lienzo.width = lienzo.height = 512;
  const cx = lienzo.getContext('2d');
  const texCara = guarda(new THREE.CanvasTexture(lienzo)); texCara.colorSpace = THREE.SRGBColorSpace; texCara.anisotropy = 8;
  const mirada = { x: 0, y: 0, ax: 0, ay: 0 };
  let ojosCerrados = false, sonrisa = 0; // sonrisa 0 normal · 1 boca abierta (al tocarla)
  function pintarCara() {
    cx.clearRect(0, 0, 512, 512);
    cx.fillStyle = '#30401C'; cx.strokeStyle = '#30401C'; cx.lineCap = 'round';
    const dx = mirada.ax * 9, dy = mirada.ay * 7;
    for (const x of [196, 316]) {
      if (ojosCerrados) { cx.lineWidth = 16; cx.beginPath(); cx.moveTo(x - 24, 200); cx.quadraticCurveTo(x, 214, x + 24, 200); cx.stroke(); }
      else {
        cx.beginPath(); cx.ellipse(x + dx, 196 + dy, 25, 30, 0, 0, Math.PI * 2); cx.fill();
        cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(x + dx + 8, 185 + dy, 9, 0, Math.PI * 2); cx.fill(); cx.fillStyle = '#30401C';
      }
    }
    if (sonrisa > 0.05) {
      cx.beginPath(); cx.moveTo(204, 258); cx.quadraticCurveTo(256, 258 + 92 * sonrisa, 308, 258); cx.closePath();
      cx.fillStyle = '#30401C'; cx.fill();
      cx.fillStyle = '#E2553B'; cx.beginPath(); cx.ellipse(256, 262 + 46 * sonrisa, 22, 12 * sonrisa, 0, 0, Math.PI * 2); cx.fill();
    } else {
      cx.lineWidth = 20; cx.beginPath(); cx.moveTo(200, 262); cx.quadraticCurveTo(256, 322, 312, 262); cx.stroke();
    }
    cx.fillStyle = 'rgba(226,85,59,.4)';
    for (const x of [134, 378]) { cx.beginPath(); cx.ellipse(x, 270, 32, 22, 0, 0, Math.PI * 2); cx.fill(); }
    // sello de hoja (empaque biodegradable)
    cx.save(); cx.translate(392, 420); cx.rotate(-0.35);
    cx.fillStyle = '#A9B985'; cx.strokeStyle = '#30401C'; cx.lineWidth = 9; cx.lineJoin = 'round';
    cx.beginPath(); cx.moveTo(0, 0); cx.bezierCurveTo(14, -40, 62, -44, 74, -28); cx.bezierCurveTo(62, 6, 24, 18, 0, 0); cx.closePath(); cx.fill(); cx.stroke();
    cx.lineWidth = 5; cx.beginPath(); cx.moveTo(8, -4); cx.quadraticCurveTo(36, -18, 64, -26); cx.stroke();
    cx.restore();
    texCara.needsUpdate = true;
  }
  pintarCara();
  const cara = new THREE.Mesh(guarda(new THREE.PlaneGeometry(1.28, 1.28)), mat(0xffffff, 0.9, { map: texCara, transparent: true }));
  cara.position.set(0, Y0 + 0.6, D / 2 + 0.004); cuerpo.add(cara);

  // ── el brote
  const brote = new THREE.Group(); brote.position.set(0, Y0 + H + 0.02, 0); cuerpo.add(brote);
  const verde = mat(C.olivo, 0.6);
  brote.add(tubo([[0, -0.08, 0], [-0.01, 0.2, 0], [0.03, 0.38, 0], [0.09, 0.52, 0]], 0.038, verde));
  function hoja(largo, ancho) {
    const s = new THREE.Shape();
    s.moveTo(0, 0); s.bezierCurveTo(largo * 0.3, ancho, largo * 0.8, ancho, largo, 0); s.bezierCurveTo(largo * 0.8, -ancho * 0.7, largo * 0.3, -ancho * 0.8, 0, 0);
    const opts = { depth: 0.03, bevelEnabled: true, bevelThickness: 0.022, bevelSize: 0.016, bevelSegments: 4, curveSegments: 24 };
    const g = guarda(new THREE.ExtrudeGeometry(s, opts)); g.translate(0, 0, -0.015);
    const sb = new THREE.Shape(); const k = 0.03;
    sb.moveTo(-k, 0); sb.bezierCurveTo(largo * 0.3, ancho + k, largo * 0.8, ancho + k, largo + k * 1.4, 0); sb.bezierCurveTo(largo * 0.8, -ancho * 0.7 - k, largo * 0.3, -ancho * 0.8 - k, -k, 0);
    const gb = guarda(new THREE.ExtrudeGeometry(sb, { ...opts, depth: 0.05 })); gb.translate(0, 0, -0.025);
    const grupo = new THREE.Group();
    grupo.add(new THREE.Mesh(g, mat(C.salvia, 0.7)));
    grupo.add(new THREE.Mesh(gb, linea));
    grupo.add(tubo([[0.03, 0, 0.04], [largo * 0.5, ancho * 0.12, 0.045], [largo * 0.85, 0, 0.04]], 0.009, verde));
    return grupo;
  }
  const hoja1 = hoja(0.46, 0.2); hoja1.position.set(0.09, 0.52, 0); hoja1.rotation.set(0, -0.25, 0.55); brote.add(hoja1);
  const hoja2 = hoja(0.4, 0.17); hoja2.position.set(-0.005, 0.24, 0); hoja2.rotation.set(0, 0.25, Math.PI - 0.5); brote.add(hoja2);

  // ── brazos: uno en la cintura, otro saluda con guante y pulgar
  const yHombro = Y0 + 0.74;
  cuerpo.add(tubo([[-W / 2 + 0.02, yHombro, 0.05], [-W / 2 - 0.3, yHombro - 0.14, 0.1], [-W / 2 - 0.2, yHombro - 0.38, 0.12], [-W / 2 + 0.03, yHombro - 0.34, 0.1]]));
  const brazo = new THREE.Group(); brazo.position.set(W / 2 - 0.03, yHombro + 0.02, 0.05); cuerpo.add(brazo);
  brazo.add(tubo([[0, 0, 0], [0.3, 0.06, 0.02], [0.42, 0.34, 0.04], [0.42, 0.56, 0.04]]));
  const guante = mat(C.papel, 0.85);
  const mano = esfera(0.12, guante); mano.position.set(0.42, 0.66, 0.04); mano.scale.set(1, 1.12, 0.9); brazo.add(mano);
  const pulgar = esfera(0.05, guante, 0.024); pulgar.position.set(0.3, 0.63, 0.06); brazo.add(pulgar);

  // ── piernas con zapatitos
  const piernas = [];
  for (const s of [-1, 1]) {
    const p = new THREE.Group(); p.position.set(s * 0.25, Y0 + 0.02, 0); mono.add(p);
    p.add(tubo([[0, 0, 0], [s * 0.01, -0.14, 0], [s * 0.02, -0.27, 0]]));
    const zapato = new THREE.Mesh(guarda(new THREE.SphereGeometry(0.12, 24, 16)), oscuro);
    zapato.scale.set(1.15, 0.55, 1.5); zapato.position.set(s * 0.04, -0.275, 0.07); p.add(zapato);
    piernas.push(p);
  }

  // ── corazones que salen de la mano y suben
  const forma = new THREE.Shape();
  forma.moveTo(0, -0.3); forma.bezierCurveTo(-0.05, -0.22, -0.42, -0.02, -0.4, 0.2); forma.bezierCurveTo(-0.38, 0.4, -0.1, 0.42, 0, 0.22);
  forma.bezierCurveTo(0.1, 0.42, 0.38, 0.4, 0.4, 0.2); forma.bezierCurveTo(0.42, -0.02, 0.05, -0.22, 0, -0.3);
  const geoCorazon = guarda(new THREE.ExtrudeGeometry(forma, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 5, curveSegments: 24 }));
  geoCorazon.center();
  const corazones = Array.from({ length: 4 }, (_, i) => {
    const m = new THREE.Mesh(geoCorazon, mat(C.tomate, 0.4, { transparent: true }));
    m.userData = { fase: i / 4, lado: (i % 2 ? 1 : -1) * (0.06 + 0.04 * i), esc: i % 2 ? 0.2 : 0.3 };
    scene.add(m); return m;
  });

  // ── sombra suave
  const ls = document.createElement('canvas'); ls.width = ls.height = 256;
  const sc = ls.getContext('2d'); const gr = sc.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(30,35,20,.42)'); gr.addColorStop(0.55, 'rgba(30,35,20,.15)'); gr.addColorStop(1, 'rgba(30,35,20,0)');
  sc.fillStyle = gr; sc.fillRect(0, 0, 256, 256);
  const texSombra = guarda(new THREE.CanvasTexture(ls));
  const sombra = new THREE.Mesh(guarda(new THREE.PlaneGeometry(2.6, 1.9)), guarda(new THREE.MeshBasicMaterial({ map: texSombra, transparent: true, depthWrite: false })));
  sombra.rotation.x = -Math.PI / 2; sombra.position.y = 0.001; scene.add(sombra);

  // ── interacción: mirar al cursor y brincar al tocarla
  const ray = new THREE.Raycaster(); const ptr = new THREE.Vector2();
  let salto = -1; // segundos desde que la tocaste (−1 = nada)
  let pose = 'saluda'; let brazoZ = 0; // 'saluda' (mueve la mano) · 'senala' (brazo extendido) · 'quieta'
  let miradaFija = null;
  const alMover = (ev) => {
    if (miradaFija) return;
    const r = caja.getBoundingClientRect();
    mirada.x = THREE.MathUtils.clamp(((ev.clientX - r.left) / r.width - 0.5) * 2.2, -1, 1);
    mirada.y = THREE.MathUtils.clamp(((ev.clientY - r.top) / r.height - 0.42) * 2.2, -1, 1);
  };
  let abajo = null;
  // Sin OrbitControls (orbitar:false) se gira arrastrando DE LADO: con touch-action pan-y
  // el navegador se queda el arrastre vertical (scroll) y nos da el horizontal.
  let giroU = 0, velU = 0, arrastra = false, ultX = 0;
  const alArrastrar = (ev) => {
    if (!arrastra) return;
    const dx = ev.clientX - ultX; ultX = ev.clientX;
    velU = dx * 0.012; giroU += velU;
  };
  const finArrastre = () => { arrastra = false; };
  if (!orbitar) {
    renderer.domElement.addEventListener('pointerdown', (ev) => { arrastra = true; ultX = ev.clientX; velU = 0; });
    window.addEventListener('pointermove', alArrastrar, { passive: true });
    window.addEventListener('pointerup', finArrastre);
    window.addEventListener('pointercancel', finArrastre);
  }
  const alBajar = (ev) => { abajo = [ev.clientX, ev.clientY]; };
  const alSoltar = (ev) => {
    if (!abajo || Math.hypot(ev.clientX - abajo[0], ev.clientY - abajo[1]) > 6) return;
    const r = renderer.domElement.getBoundingClientRect();
    ptr.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    if (ray.intersectObject(mono, true).length) salto = 0;
  };
  window.addEventListener('pointermove', alMover, { passive: true });
  renderer.domElement.addEventListener('pointerdown', alBajar);
  renderer.domElement.addEventListener('pointerup', alSoltar);

  // ── animación
  let t = 0, ultimo = performance.now(), proxParpadeo = 2.2, visible = true, vivo = true, entrada = lento ? 1 : 0, raf = 0;
  const rebote = (x) => { const c1 = 1.70158 * 1.3, c3 = c1 + 1; return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2; };
  function cuadro(ahora) {
    if (!vivo) return;
    raf = requestAnimationFrame(cuadro);
    const dt = Math.min((ahora - ultimo) / 1000, 0.05); ultimo = ahora;
    if (!visible) return;
    t += lento ? 0 : dt;

    // entra de un salto
    if (entrada < 1) entrada = Math.min(1, entrada + dt / 0.9);
    const e = rebote(entrada);
    mono.scale.setScalar(Math.max(0.001, e));

    const brinco = Math.abs(Math.sin(t * 2.2));
    let sy = brinco * 0.045, giro = 0;
    if (salto >= 0) {
      salto += dt; const k = Math.min(salto / 0.8, 1);
      sy += Math.sin(k * Math.PI) * 0.55; giro = k * Math.PI * 2;
      sonrisa = Math.sin(k * Math.PI);
      if (k >= 1) { salto = -1; sonrisa = 0; }
    }
    cuerpo.position.y = sy;
    cuerpo.rotation.y = giro;
    cuerpo.scale.set(1 + (1 - brinco) * 0.012, 1 - (1 - brinco) * 0.018, 1);
    piernas.forEach((p, i) => { p.position.y = Y0 + 0.02 + (salto >= 0 ? sy * 0.9 : 0); p.rotation.x = salto >= 0 ? 0 : Math.sin(t * 2.2 + i * Math.PI) * 0.05; });
    mono.rotation.z = Math.sin(t * 1.1) * 0.025;
    // al soltar sigue un poco por inercia y luego regresa sola de frente
    if (!arrastra) { velU *= Math.exp(-dt * 4); giroU += velU; if (Math.abs(velU) < 0.003) giroU *= Math.exp(-dt * 1.4); }
    if (girar) mono.rotation.y = Math.sin(t * 0.45) * 0.45 + giroU;
    else mono.rotation.y = giroU;
    if (!tocando && girar) camera.position.lerp(vistaInicial, 1 - Math.exp(-dt * 1.5));
    const metaBrazo = pose === 'saluda' ? Math.sin(t * 6) * 0.32 - 0.05 : pose === 'senala' ? -1.05 + Math.sin(t * 3) * 0.06 : -0.35;
    brazoZ += (metaBrazo - brazoZ) * Math.min(1, dt * (pose === 'saluda' ? 20 : 6));
    brazo.rotation.z = brazoZ;
    if (miradaFija) { mirada.x = miradaFija[0]; mirada.y = miradaFija[1]; }
    brote.rotation.z = Math.sin(t * 2.6) * 0.07;
    hoja1.rotation.x = Math.sin(t * 3.1) * 0.12;
    hoja2.rotation.x = Math.sin(t * 2.7 + 1) * 0.12;
    sombra.scale.setScalar(1 - brinco * 0.05 - (salto >= 0 ? sy * 0.6 : 0));

    // los corazones nacen junto a la mano, suben, se mecen y se desvanecen
    const manoMundo = mano.getWorldPosition(new THREE.Vector3());
    corazones.forEach((c) => {
      const f = (t * 0.32 + c.userData.fase) % 1;
      c.position.set(manoMundo.x + 0.1 + c.userData.lado + Math.sin(f * 7) * 0.06, manoMundo.y + 0.12 + f * 0.75, manoMundo.z);
      c.scale.setScalar(c.userData.esc * Math.min(1, f * 6) * e);
      c.material.opacity = f < 0.75 ? 1 : 1 - (f - 0.75) / 0.25;
      c.rotation.y = Math.sin(t * 1.6 + c.userData.fase * 6) * 0.6;
      c.visible = !lento;
    });

    // mirada suave
    mirada.ax += (mirada.x - mirada.ax) * Math.min(1, dt * 8);
    mirada.ay += (mirada.y - mirada.ay) * Math.min(1, dt * 8);
    if (t > proxParpadeo && !lento) { ojosCerrados = true; setTimeout(() => { ojosCerrados = false; }, 130); proxParpadeo = t + 2.4 + Math.random() * 2.5; }
    pintarCara();

    controls.update();
    renderer.render(scene, camera);
  }

  const medir = () => {
    const w = caja.clientWidth || 1, h = caja.clientHeight || 1;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    // en vertical se aleja para que quepa entera
    camera.zoom = Math.min(1, (w / h) * 1.15); camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(medir); ro.observe(caja); medir();
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(([en]) => { visible = en.isIntersecting; ultimo = performance.now(); }) : null;
  io?.observe(caja);
  raf = requestAnimationFrame(cuadro);

  return {
    foto: () => { renderer.render(scene, camera); return renderer.domElement.toDataURL('image/png'); },
    pausar: (si) => { visible = !si; },
    pose: (p) => { pose = p; },
    brincar: () => { if (salto < 0) salto = 0; },
    // mirar(x, y) con x/y de −1 a 1; mirar(null) = vuelve a seguir el cursor
    mirar: (x, y) => { miradaFija = x == null ? null : [x, y]; },
    quitar: () => {
      vivo = false; cancelAnimationFrame(raf); clearTimeout(reanudar);
      ro.disconnect(); io?.disconnect();
      window.removeEventListener('pointermove', alMover);
      window.removeEventListener('pointermove', alArrastrar);
      window.removeEventListener('pointerup', finArrastre);
      window.removeEventListener('pointercancel', finArrastre);
      controls.dispose();
      desechables.forEach((d) => d.dispose?.());
      entorno.dispose(); pmrem.dispose();
      renderer.dispose(); renderer.domElement.remove();
    },
  };
}
