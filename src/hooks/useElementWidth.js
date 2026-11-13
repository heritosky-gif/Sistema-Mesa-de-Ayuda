import { useEffect, useRef, useState } from 'react'

// Mide el ancho de un contenedor para que las gráficas SVG sean responsivas
export default function useElementWidth(initial = 480) {
  const ref = useRef(null)
  const [width, setWidth] = useState(initial)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return [ref, width]
}
