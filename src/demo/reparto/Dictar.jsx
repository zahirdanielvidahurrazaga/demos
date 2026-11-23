import { Mic, Square } from 'lucide-react';
import { hayDictado, useDictado } from './useDictado';

// Botón de dictado. Lo que se oye NO se guarda solo: cada frase completa llega
// a `alFrase` y la pantalla la convierte en cajas para revisarlas con los ojos.
export default function Dictar({ alFrase, ejemplo, etiqueta = 'Dictar' }) {
  const { escuchando, parcial, aviso, alternar } = useDictado({ onFrase: alFrase });
  if (!hayDictado) return <p className="rp-dictado-no">Este navegador no deja dictar. En Chrome o en el celular sí.</p>;
  return (
    <div className={`rp-dictado ${escuchando ? 'activo' : ''}`}>
      <button type="button" className="rp-mic" onClick={alternar} aria-pressed={escuchando}>
        <span className="rp-mic-ico">{escuchando ? <Square size={16} fill="currentColor" /> : <Mic size={20} />}</span>
        <span className="rp-mic-txt">
          <strong>{escuchando ? 'Escuchando… toca al terminar' : etiqueta}</strong>
          <small>{escuchando ? (parcial || 'Habla normal, como en un audio') : ejemplo}</small>
        </span>
        {escuchando && <span className="rp-ondas" aria-hidden="true"><i /><i /><i /><i /></span>}
      </button>
      {aviso && <p className="rp-entendi falta">{aviso}</p>}
    </div>
  );
}
