import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ─────────────────────────────────────────────────────────────────────────────
// EL LOCAL EN 3D (17-nov-2026) — la MISMA escena del video
// (~/Developer/buenbocado-video/src/escenas/Local.tsx), pero viva: se gira con
// el dedo/ratón y cada ZONA lleva la cámara volando a su vista. Sin fotos
// generadas (Zahir: "se ven muy de IA"). Paleta olivo pastel.
// Medidas en metros: local de 12 × 9; el frente (calle) está en +z.
// Se carga con lazy() desde Expo.jsx (three pesa ~600 KB).
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  olivo: '#5E6B3F', olivoOsc: '#4E5934', tomate: '#E2553B', masa: '#EEF0E2', crema: '#F4F5EA',
  salvia: '#D8DFA8', carbon: '#2E3320', roble: '#D2B48A', fondo: '#CDD2AE',
};

// Las zonas (vista de cámara + texto) viven en zonasLocal.js para que Expo
// las lea sin cargar three.js.

const CON_BOLSA = [1, 2, 4, 6, 7, 9, 11];
const celda = (n) => { const r = Math.floor((n - 1) / 4); const c = (n - 1) % 4; return [-1.8 + c * 1.2, 2.5 - r * 0.8]; };
const suavizar = (actual, meta, dt, vel = 3.2) => actual + (meta - actual) * (1 - Math.exp(-dt * vel));

function texturaTexto(texto, { color = C.carbon, peso = 800, tam = 150, fuente = 'Bricolage Grotesque', w = 256, h = 256 } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = color; x.font = `${peso} ${tam}px '${fuente}', sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(texto, w / 2, h / 2 + tam * 0.04);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
function texturaEtiqueta() {
  const c = document.createElement('canvas'); c.width = 560; c.height = 240;
  const x = c.getContext('2d');
  x.fillStyle = C.masa; x.fillRect(0, 0, 560, 240);
  x.fillStyle = C.carbon; x.font = "800 74px 'Bricolage Grotesque', sans-serif"; x.fillText('Ana R.', 34, 104);
  x.fillStyle = C.tomate; x.textAlign = 'right'; x.fillText('13:00', 526, 104);
  x.textAlign = 'left'; x.fillStyle = '#6f7258'; x.font = "500 38px 'Inter', sans-serif"; x.fillText('Bowl mediterráneo', 34, 164);
  x.fillStyle = C.olivo; x.font = "700 38px 'Inter', sans-serif"; x.fillText('casilla 04', 34, 212);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

function Caja({ pos, tam, color, sombra = true, rugoso = 0.85 }) {
  return (
    <mesh position={pos} castShadow={sombra} receiveShadow>
      <boxGeometry args={tam} />
      <meshStandardMaterial color={color} roughness={rugoso} />
    </mesh>
  );
}
function Logo3D({ pos, r, fondo, rot = [0, 0, 0] }) {
  return (
    <group position={pos} rotation={rot}>
      <mesh><circleGeometry args={[r, 64]} /><meshStandardMaterial color={C.tomate} roughness={0.6} /></mesh>
      <mesh position={[0, 0, 0.01]}><circleGeometry args={[r * 0.5, 48]} /><meshStandardMaterial color={fondo} roughness={0.8} /></mesh>
      {[[0.86, 0.64, 0.3], [1.05, 0.27, 0.25], [0.59, 0.91, 0.25]].map(([x, y, rr], i) => (
        <mesh key={i} position={[x * r, y * r, 0.02]}><circleGeometry args={[rr * r, 32]} /><meshStandardMaterial color={fondo} roughness={0.8} /></mesh>
      ))}
    </group>
  );
}
function Bolsa({ esc = 1, etiqueta }) {
  const cuerpo = useMemo(() => {
    const f = new THREE.Shape();
    f.moveTo(-0.2, 0); f.lineTo(0.2, 0); f.lineTo(0.2, 0.8); f.lineTo(0.04, 1.02); f.lineTo(-0.04, 1.02); f.lineTo(-0.2, 0.8); f.closePath();
    const g = new THREE.ExtrudeGeometry(f, { depth: 0.72, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2 });
    g.translate(0, 0, -0.36); g.rotateY(Math.PI / 2);
    return g;
  }, []);
  return (
    <group scale={esc}>
      <mesh geometry={cuerpo} castShadow receiveShadow><meshStandardMaterial color="#C9A77A" roughness={0.96} /></mesh>
      <mesh position={[0, 0.955, 0.075]} rotation={[-0.63, 0, 0]} castShadow><boxGeometry args={[0.745, 0.17, 0.02]} /><meshStandardMaterial color="#B8956A" roughness={0.96} /></mesh>
      <mesh position={[0, 0.54, 0.214]}><circleGeometry args={[0.185, 48]} /><meshStandardMaterial color={C.crema} roughness={0.8} /></mesh>
      <Logo3D pos={[0, 0.54, 0.218]} r={0.125} fondo={C.crema} />
      {etiqueta && <mesh position={[0, 0.2, 0.214]}><planeGeometry args={[0.47, 0.2]} /><meshStandardMaterial map={etiqueta} roughness={0.9} /></mesh>}
    </group>
  );
}
function Persona({ pos, mandil, color = '#F1EEDF' }) {
  return (
    <group position={pos}>
      <mesh position={[0, 0.72, 0]} castShadow><capsuleGeometry args={[0.2, 0.75, 6, 16]} /><meshStandardMaterial color={color} roughness={0.9} /></mesh>
      {mandil && <mesh position={[0, 0.66, 0.13]} castShadow><boxGeometry args={[0.36, 0.62, 0.16]} /><meshStandardMaterial color={C.olivo} roughness={0.9} /></mesh>}
      <mesh position={[0, 1.5, 0]} castShadow><sphereGeometry args={[0.17, 24, 24]} /><meshStandardMaterial color="#C99A78" roughness={0.9} /></mesh>
      <mesh position={[0, 1.56, -0.03]} scale={[1.06, 0.8, 1.06]}><sphereGeometry args={[0.17, 24, 16, 0, Math.PI * 2, 0, Math.PI / 1.7]} /><meshStandardMaterial color="#3a2a20" roughness={0.9} /></mesh>
    </group>
  );
}
function Planta({ pos, esc = 1 }) {
  return (
    <group position={pos} scale={esc}>
      <mesh position={[0, 0.25, 0]} castShadow><cylinderGeometry args={[0.24, 0.19, 0.5, 20]} /><meshStandardMaterial color="#EDEBDD" /></mesh>
      <mesh position={[0, 0.85, 0]} castShadow><icosahedronGeometry args={[0.45, 1]} /><meshStandardMaterial color="#7F9A5A" roughness={0.9} flatShading /></mesh>
      <mesh position={[0.2, 1.15, 0.1]} castShadow><icosahedronGeometry args={[0.28, 1]} /><meshStandardMaterial color="#9DB262" roughness={0.9} flatShading /></mesh>
    </group>
  );
}

// Cámara que vuela a la zona elegida; si la persona arrastra, manda ella.
function Camara({ zona, controles }) {
  const { camera, gl } = useThree();
  const vuela = useRef(true);
  const meta = useMemo(() => ({ pos: new THREE.Vector3(...zona.pos), mira: new THREE.Vector3(...zona.mira) }), [zona]);
  useEffect(() => { vuela.current = true; }, [zona]);
  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement);
    c.enableDamping = true; c.dampingFactor = 0.08; c.enablePan = false;
    c.minDistance = 2.5; c.maxDistance = 30; c.maxPolarAngle = Math.PI * 0.49;
    c.target.set(...zona.mira);
    c.addEventListener('start', () => { vuela.current = false; });
    controles.current = c;
    return () => c.dispose();
  }, [camera, gl]);   // eslint-disable-line react-hooks/exhaustive-deps
  useFrame((_, dt) => {
    const c = controles.current; if (!c) return;
    if (vuela.current) {
      const k = 1 - Math.exp(-Math.min(dt, 0.05) * 2.6);
      camera.position.lerp(meta.pos, k); c.target.lerp(meta.mira, k);
      if (camera.position.distanceTo(meta.pos) < 0.02 && c.target.distanceTo(meta.mira) < 0.02) vuela.current = false;
    }
    c.update();
  });
  return null;
}

function Escena({ zona, texturas }) {
  const fachada = useRef(); const luz04 = useRef(); const brillo04 = useRef(); const bolsa04 = useRef(); const camino = useRef();
  const toldo = useRef(); const clienta = useRef();
  const s = useRef({ abre: zona.abre, casilla: 0, camino: 0 });
  const [x4, y4] = celda(4);
  const tramos = [[[0.5, 4.3], [0.5, 1.4]], [[0.5, 1.4], [1.9, 1.0]], [[1.9, 1.0], [-0.5, 1.6]], [[-0.5, 1.6], [-0.5, 4.3]]];

  useFrame((_, dtCrudo) => {
    const dt = Math.min(dtCrudo, 0.05); const v = s.current;
    v.abre = suavizar(v.abre, zona.abre, dt, 2.4);
    v.casilla = suavizar(v.casilla, zona.casilla ? 1 : 0, dt, 2.2);
    v.camino = zona.id === 'corte' ? Math.min(1, v.camino + dt * 0.45) : 0;
    if (fachada.current) { fachada.current.scale.y = Math.max(0.02, 1 - v.abre * 0.95); fachada.current.position.z = v.abre * 0.4; }
    if (toldo.current) toldo.current.visible = v.abre < 0.35;
    if (clienta.current) clienta.current.visible = zona.id === 'corte' && v.abre > 0.5;
    if (brillo04.current) { brillo04.current.material.opacity = v.casilla * 0.9; brillo04.current.material.emissiveIntensity = v.casilla * 0.6; }
    if (luz04.current) luz04.current.intensity = v.casilla * 1.4;
    if (bolsa04.current) { bolsa04.current.position.z = v.casilla * 0.7; bolsa04.current.position.y = y4 - 0.37 + v.casilla * 0.12; bolsa04.current.rotation.y = v.casilla * -0.35; }
    if (camino.current) camino.current.children.forEach((m, i) => {
      const k = Math.max(0, Math.min(1, v.camino * 4 - i));
      const [a, b] = tramos[i];
      m.visible = k > 0;
      const fx = a[0] + (b[0] - a[0]) * k; const fz = a[1] + (b[1] - a[1]) * k;
      const largo = Math.max(0.01, Math.hypot(fx - a[0], fz - a[1]));
      m.position.set((a[0] + fx) / 2, 0.09, (a[1] + fz) / 2);
      m.scale.z = largo + 0.12;
    });
  });

  return (
    <>
      <color attach="background" args={[C.fondo]} />
      <fog attach="fog" args={[C.fondo, 26, 58]} />
      <hemisphereLight args={['#fbfcf2', '#d6dabd', 1.6]} />
      <directionalLight position={[9, 16, 11]} intensity={1.7} color="#fff6e2" castShadow
        shadow-mapSize={[2048, 2048]} shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={16} shadow-camera-bottom={-16}
        shadow-camera-near={1} shadow-camera-far={60} shadow-bias={-0.0004} shadow-normalBias={0.05} />

      {/* piso, banqueta y muros (sin techo) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 6]} receiveShadow><planeGeometry args={[120, 90]} /><meshStandardMaterial color="#D6DABF" roughness={1} /></mesh>
      <Caja pos={[0, 0.03, 0]} tam={[12, 0.06, 9]} color="#CFD1C0" sombra={false} />
      <Caja pos={[0, 1.8, -4.6]} tam={[12.4, 3.6, 0.2]} color={C.masa} />
      <Caja pos={[-6.1, 1.8, 0]} tam={[0.2, 3.6, 9.4]} color={C.masa} />
      <Caja pos={[6.1, 1.8, 0]} tam={[0.2, 3.6, 9.4]} color={C.masa} />

      {/* fachada: baja en la vista en corte */}
      <group ref={fachada}>
        <Caja pos={[-4.3, 1.8, 4.6]} tam={[3.6, 3.6, 0.2]} color="#CDD3AE" rugoso={0.15} sombra={false} />
        <Caja pos={[4.3, 1.8, 4.6]} tam={[3.6, 3.6, 0.2]} color="#CDD3AE" rugoso={0.15} sombra={false} />
        <Caja pos={[0, 4.15, 4.65]} tam={[12.4, 1.1, 0.35]} color={C.olivo} />
        {[-6.1, 6.1].map((x) => <Caja key={x} pos={[x, 1.8, 4.65]} tam={[0.25, 3.7, 0.35]} color={C.olivo} />)}
        {[-2.4, 2.4].map((x) => <Caja key={x} pos={[x, 1.8, 4.65]} tam={[0.16, 3.6, 0.3]} color={C.olivo} />)}
        <Logo3D pos={[-3.4, 4.15, 4.84]} r={0.36} fondo={C.olivo} />
        {texturas && <mesh position={[0.3, 4.15, 4.84]}><planeGeometry args={[5.8, 0.9]} /><meshBasicMaterial map={texturas.letrero} transparent /></mesh>}
      </group>
      <group ref={toldo}>
        <mesh position={[0, 3.25, 5.45]} rotation={[0.28, 0, 0]} castShadow><boxGeometry args={[5.0, 0.08, 1.7]} /><meshStandardMaterial color={C.olivoOsc} roughness={0.8} /></mesh>
      </group>

      {/* pared de casillas */}
      <Caja pos={[0, 0.07, 1.0]} tam={[6.4, 0.02, 2.6]} color="#D9C39C" sombra={false} />
      <Caja pos={[0, 0.25, 0]} tam={[4.86, 0.5, 0.62]} color="#C4A57A" />
      <Caja pos={[0, 1.7, -0.28]} tam={[4.86, 2.46, 0.05]} color="#B79568" />
      {[0.5, 1.3, 2.1, 2.9].map((y) => <Caja key={y} pos={[0, y, 0]} tam={[4.86, 0.06, 0.62]} color={C.roble} />)}
      {[-2.4, -1.2, 0, 1.2, 2.4].map((x) => <Caja key={x} pos={[x, 1.7, 0]} tam={[0.06, 2.46, 0.62]} color={C.roble} />)}
      {Array.from({ length: 12 }, (_, i) => {
        const n = i + 1; const [x, y] = celda(n);
        return (
          <group key={n}>
            {texturas && <mesh position={[x - 0.36, y + 0.27, 0.32]}><planeGeometry args={[0.3, 0.19]} /><meshBasicMaterial map={texturas.numeros[i]} transparent /></mesh>}
            {n === 4 && <mesh ref={brillo04} position={[x, y, -0.24]}><planeGeometry args={[1.12, 0.72]} /><meshStandardMaterial color={C.salvia} emissive={C.salvia} emissiveIntensity={0} transparent opacity={0} /></mesh>}
            {CON_BOLSA.includes(n) && (
              <group ref={n === 4 ? bolsa04 : undefined} position={[x + 0.08, y - 0.37, 0]} rotation={[0, n === 4 ? 0 : (n % 3 - 1) * 0.12, 0]}>
                <Bolsa esc={0.56} etiqueta={n === 4 ? texturas?.etiqueta : null} />
              </group>
            )}
          </group>
        );
      })}
      <pointLight ref={luz04} position={[x4, y4, 1.0]} color="#F4F7C8" intensity={0} distance={3} />
      {[-1.5, 0, 1.5].map((x) => (
        <group key={x} position={[x, 3.5, 0.5]}>
          <mesh position={[0, 0.55, 0]}><cylinderGeometry args={[0.012, 0.012, 1.1, 6]} /><meshStandardMaterial color="#2a2a2a" /></mesh>
          <mesh castShadow><coneGeometry args={[0.3, 0.3, 28, 1, true]} /><meshStandardMaterial color={C.tomate} side={THREE.DoubleSide} roughness={0.5} /></mesh>
        </group>
      ))}

      {/* mostrador */}
      <Caja pos={[4.3, 0.55, 1.4]} tam={[2.3, 1.1, 0.9]} color={C.roble} />
      <Caja pos={[4.3, 1.13, 1.4]} tam={[2.4, 0.06, 1.0]} color="#E2CBA4" />
      <mesh position={[4.0, 1.32, 1.5]} rotation={[-0.5, 0.2, 0]} castShadow><boxGeometry args={[0.5, 0.34, 0.03]} /><meshStandardMaterial color="#22262a" roughness={0.3} /></mesh>
      <Persona pos={[4.4, 0, 0.6]} mandil />
      <Logo3D pos={[5.98, 2.2, 1.6]} r={0.85} fondo={C.masa} rot={[0, -Math.PI / 2, 0]} />

      {/* cocina a la vista */}
      <Caja pos={[0.8, 1.9, -4.45]} tam={[9.6, 2.6, 0.08]} color="#7A8656" rugoso={0.35} sombra={false} />
      <Caja pos={[0.8, 0.5, -3.2]} tam={[8.6, 1.0, 0.9]} color="#C8CCC4" rugoso={0.35} />
      <Caja pos={[0.8, 1.03, -3.2]} tam={[8.7, 0.06, 1.0]} color="#DDE0D8" rugoso={0.25} />
      {[-2.2, -1.2, -0.2, 0.8, 1.8, 2.8].map((x, i) => <mesh key={x} position={[x, 1.12, -3.2]} castShadow><cylinderGeometry args={[0.22, 0.16, 0.14, 24]} /><meshStandardMaterial color={[C.crema, C.salvia, C.tomate, C.crema, '#E9C98A', '#7F9A5A'][i]} /></mesh>)}
      <Persona pos={[-0.6, 0, -3.95]} mandil /><Persona pos={[2.2, 0, -3.95]} mandil />
      <mesh position={[0.8, 1.8, -2.3]}><boxGeometry args={[9.6, 3.0, 0.05]} /><meshStandardMaterial color="#E6EBDA" transparent opacity={0.22} roughness={0.1} /></mesh>
      <Caja pos={[-4.9, 1.8, -3.3]} tam={[2.2, 3.6, 2.4]} color="#ECECDE" />
      <Caja pos={[0.8, 3.05, -3.4]} tam={[5.2, 0.5, 1.1]} color="#C8CCC4" rugoso={0.3} />
      {[2.0, 2.55].map((y) => <Caja key={y} pos={[0.8, y, -4.3]} tam={[7.6, 0.05, 0.3]} color={C.roble} />)}
      {Array.from({ length: 12 }, (_, i) => <mesh key={i} position={[-2.5 + (i % 6) * 1.25, i < 6 ? 2.1 : 2.65, -4.3]} castShadow><cylinderGeometry args={[0.16, 0.11, 0.12, 20]} /><meshStandardMaterial color={i % 3 ? C.crema : '#E9C98A'} /></mesh>)}

      {/* barra junto al ventanal */}
      <Caja pos={[-5.45, 1.05, 1.2]} tam={[0.7, 0.07, 5.2]} color={C.roble} />
      <Caja pos={[-5.7, 0.52, 1.2]} tam={[0.12, 1.04, 5.0]} color="#C4A57A" />
      {[-0.8, 0.2, 1.2, 2.2, 3.2].map((z) => (
        <group key={z} position={[-4.75, 0, z]}>
          <mesh position={[0, 0.74, 0]} castShadow><cylinderGeometry args={[0.2, 0.2, 0.06, 24]} /><meshStandardMaterial color={C.roble} /></mesh>
          <mesh position={[0, 0.37, 0]}><cylinderGeometry args={[0.025, 0.025, 0.74, 8]} /><meshStandardMaterial color="#2a2a2a" /></mesh>
        </group>
      ))}
      <Persona pos={[-4.7, 0.3, 1.2]} color="#C7D3E0" />
      <Planta pos={[-2.9, 0, 0.3]} /><Planta pos={[5.2, 0, 3.6]} esc={1.2} /><Planta pos={[-5.2, 0, 3.9]} esc={0.9} />

      {/* banqueta, calle y jardineras */}
      <Caja pos={[0, 0.02, 7.2]} tam={[30, 0.1, 5]} color="#DADCC9" sombra={false} />
      <Caja pos={[0, 0.0, 9.8]} tam={[30, 0.16, 0.3]} color="#C9CCB6" sombra={false} />
      {[-4.3, 4.3].map((x) => (
        <group key={x} position={[x, 0, 5.5]}>
          <Caja pos={[0, 0.3, 0]} tam={[3.0, 0.6, 0.7]} color="#EDEBDD" />
          {[-1, 0, 1].map((k) => <mesh key={k} position={[k * 0.9, 0.85, 0]} castShadow><icosahedronGeometry args={[0.42, 1]} /><meshStandardMaterial color={k ? '#8FA85B' : '#A9BC63'} roughness={0.9} flatShading /></mesh>)}
        </group>
      ))}
      <group ref={clienta}><Persona pos={[0.9, 0, 1.9]} color="#E7D3C3" /></group>

      {/* recorrido del cliente (vista en corte) */}
      <group ref={camino}>
        {tramos.map(([a, b], i) => (
          <mesh key={i} rotation={[0, Math.atan2(b[0] - a[0], b[1] - a[1]), 0]} visible={false}>
            <boxGeometry args={[0.12, 0.03, 1]} />
            <meshStandardMaterial color={C.tomate} emissive={C.tomate} emissiveIntensity={0.4} />
          </mesh>
        ))}
      </group>
    </>
  );
}

export default function Local3D({ zona }) {
  const controles = useRef(null);
  const [texturas, setTexturas] = useState(null);
  const caja = useRef(null);
  const [visible, setVisible] = useState(true);

  // Las texturas de texto esperan a que carguen las letras de la marca.
  useEffect(() => {
    let vivo = true;
    (document.fonts?.ready || Promise.resolve()).then(() => {
      if (!vivo) return;
      setTexturas({
        numeros: Array.from({ length: 12 }, (_, i) => texturaTexto(String(i + 1).padStart(2, '0'), { color: '#3B2F22', tam: 150, w: 256, h: 160 })),
        letrero: texturaTexto('el buen bocado', { color: C.masa, tam: 120, w: 1280, h: 200 }),
        etiqueta: texturaEtiqueta(),
      });
    });
    return () => { vivo = false; };
  }, []);

  // Fuera de pantalla no se dibuja (ahorra batería).
  useEffect(() => {
    const el = caja.current; if (!el || !('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver(([en]) => setVisible(en.isIntersecting), { rootMargin: '120px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={caja} className="bx-lienzo">
      <Canvas shadows dpr={[1, 2]} frameloop={visible ? 'always' : 'never'} gl={{ antialias: true }}
        camera={{ position: zona.pos, fov: 38, near: 0.1, far: 200 }}>
        <Camara zona={zona} controles={controles} />
        <Escena zona={zona} texturas={texturas} />
      </Canvas>
    </div>
  );
}
