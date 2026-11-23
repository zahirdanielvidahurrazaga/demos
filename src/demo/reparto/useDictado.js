/**
 * Escuchar el pedido.
 *
 * Usa el reconocedor de voz del propio navegador: no se manda audio a ningún
 * servicio nuestro ni cuesta por uso. A cambio, no está en todos lados —por eso
 * `hayDictado` se exporta aparte y el botón simplemente no aparece donde no sirve.
 *
 * Lo que se oye NO se guarda: se convierte a cantidades en la pantalla y se
 * revisa con los ojos antes de guardar. El micrófono no decide nada solo.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

const Reconocedor = typeof window !== 'undefined'
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : null

export const hayDictado = !!Reconocedor

const AVISOS = {
  'not-allowed': 'El teléfono no dio permiso del micrófono. Actívalo en los ajustes del navegador.',
  'service-not-allowed': 'Este navegador no deja usar el micrófono aquí. Escríbelo a mano.',
  'network': 'El dictado necesita internet. Sin señal, escribe las cantidades.',
  'audio-capture': 'No se encontró micrófono.',
}

export function useDictado({ onFrase, idioma = 'es-MX' } = {}) {
  const [escuchando, setEscuchando] = useState(false)
  const [parcial, setParcial] = useState('')
  const [aviso, setAviso] = useState('')

  const rec = useRef(null)
  const sigue = useRef(false)      // el usuario todavía no ha dicho "listo"
  const reinicios = useRef(0)
  const frase = useRef(onFrase)

  useEffect(() => { frase.current = onFrase })

  const parar = useCallback(() => {
    sigue.current = false
    setEscuchando(false)
    setParcial('')
    try { rec.current?.stop() } catch { /* ya estaba detenido */ }
  }, [])

  const empezar = useCallback(() => {
    if (!Reconocedor || sigue.current) return

    const r = new Reconocedor()
    r.lang = idioma
    r.continuous = true
    r.interimResults = true
    r.maxAlternatives = 1

    r.onresult = e => {
      let enCurso = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const trozo = e.results[i][0].transcript
        if (e.results[i].isFinal) frase.current?.(trozo)
        else enCurso += trozo
      }
      setParcial(enCurso)
    }

    r.onerror = e => {
      if (e.error === 'no-speech' || e.error === 'aborted') return   // callarse no es un error
      sigue.current = false
      setEscuchando(false)
      setAviso(AVISOS[e.error] || 'No se pudo escuchar. Escríbelo a mano.')
    }

    // Safari corta la escucha en cada pausa. Mientras el usuario no diga "listo"
    // se vuelve a abrir, con tope por si el navegador la rechaza en bucle.
    r.onend = () => {
      if (!sigue.current) { setEscuchando(false); setParcial(''); return }
      if (++reinicios.current > 40) { sigue.current = false; setEscuchando(false); return }
      try { r.start() } catch { sigue.current = false; setEscuchando(false) }
    }

    rec.current = r
    sigue.current = true
    reinicios.current = 0
    setAviso('')
    setParcial('')
    try { r.start(); setEscuchando(true) } catch { sigue.current = false }
  }, [idioma])

  useEffect(() => () => {
    sigue.current = false
    try { rec.current?.abort() } catch { /* sin micrófono abierto */ }
  }, [])

  return { escuchando, parcial, aviso, empezar, parar, alternar: () => (sigue.current ? parar() : empezar()) }
}
