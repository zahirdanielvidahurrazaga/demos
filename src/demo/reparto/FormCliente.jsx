import { useEffect, useState } from 'react';
import { PRODUCTOS, REPARTIDORES, guardarCliente, restaurante } from './datos';
import { Contador, Hoja, Segmentos, avisarListo } from './comun';

const CADA = [2, 3, 5, 7, 15];
const VACIO = { nombre: '', persona: '', tel: '', direccion: '', zona: '', cada: 5, rep: REPARTIDORES[0].id, tipico: {} };

// Alta o edición de un restaurante. `id` = editar; `sugerido` = datos para prellenar un alta.
export default function FormCliente({ abierta, id, sugerido, alCerrar, alGuardar }) {
  const [f, setF] = useState(VACIO);
  const [todas, setTodas] = useState(false);

  useEffect(() => {
    if (!abierta) return;
    const r = id && restaurante(id);
    setF(r ? { ...VACIO, ...r, tipico: { ...r.tipico } } : { ...VACIO, ...(sugerido || {}) });
    setTodas(false);
  }, [abierta, id, sugerido]);

  const poner = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const listo = f.nombre.trim() && f.persona.trim();
  const visibles = todas ? PRODUCTOS : PRODUCTOS.filter((p, i) => i < 4 || f.tipico[p.id]);

  function guardar() {
    const nuevo = guardarCliente({ ...f, nombre: f.nombre.trim(), persona: f.persona.trim() });
    avisarListo(id ? 'Cliente actualizado' : `${f.nombre.trim()} dado de alta`);
    alGuardar?.(nuevo);
    alCerrar();
  }

  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo={id ? 'Editar cliente' : 'Nuevo cliente'}
      pie={<button type="button" className="rp-btn lleno grande" disabled={!listo} onClick={guardar}>{id ? 'Guardar cambios' : 'Dar de alta'}</button>}>
      <div className="rp-form">
        <label><span>Nombre del negocio</span><input value={f.nombre} onChange={(e) => poner('nombre', e.target.value)} placeholder="Ej. Bar La Esquina" autoFocus={!id} /></label>
        <div className="rp-dos">
          <label><span>Quién te pide</span><input value={f.persona} onChange={(e) => poner('persona', e.target.value)} placeholder="Ej. Pepe" /></label>
          <label><span>WhatsApp</span><input value={f.tel} onChange={(e) => poner('tel', e.target.value)} inputMode="tel" placeholder="222 000 0000" /></label>
        </div>
        <label><span>Dirección</span><input value={f.direccion} onChange={(e) => poner('direccion', e.target.value)} placeholder="Calle, número y colonia" /></label>
        <label><span>Zona</span><input value={f.zona} onChange={(e) => poner('zona', e.target.value)} placeholder="Ej. Centro, Cholula…" /></label>

        <p className="rp-rotulo">¿Cada cuántos días te pide?</p>
        <Segmentos valor={f.cada} alCambiar={(v) => poner('cada', v)} opciones={CADA.map((n) => ({ id: n, etiqueta: `${n} d` }))} />
        <p className="rp-pista">Con esto te avisamos si deja de pedirte.</p>

        <p className="rp-rotulo">Lo lleva normalmente</p>
        <Segmentos valor={f.rep} alCambiar={(v) => poner('rep', v)} opciones={REPARTIDORES.map((r) => ({ id: r.id, etiqueta: r.nombre }))} />

        <p className="rp-rotulo">Lo que pide siempre <em>(opcional)</em></p>
        <ul className="rp-items">
          {visibles.map((p) => (
            <li key={p.id}><div><strong>{p.nombre}</strong><span>{p.detalle}</span></div>
              <Contador valor={f.tipico[p.id] || 0} alCambiar={(v) => setF((x) => ({ ...x, tipico: { ...x.tipico, [p.id]: v } }))} /></li>
          ))}
        </ul>
        {!todas && <button type="button" className="rp-enlace" onClick={() => setTodas(true)}>Ver todas las cervezas</button>}
      </div>
    </Hoja>
  );
}
