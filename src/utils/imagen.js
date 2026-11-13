/**
 * Recorta al centro y reduce una imagen a un cuadrado de `lado` px.
 * Devuelve un data URL JPEG ligero (≈10–20 KB) apto para guardarse en el navegador.
 */
export function reducirImagen(archivo, lado = 192) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader()
    lector.onerror = () => reject(new Error('No se pudo leer la imagen.'))
    lector.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('El archivo no es una imagen válida.'))
      img.onload = () => {
        const min = Math.min(img.width, img.height)
        const canvas = document.createElement('canvas')
        canvas.width = lado
        canvas.height = lado
        canvas
          .getContext('2d')
          .drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, lado, lado)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = lector.result
    }
    lector.readAsDataURL(archivo)
  })
}
