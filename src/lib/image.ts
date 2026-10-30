/** Lee un archivo de imagen como data URL, validando tipo y tamaño. */
export function readImage(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('Utiliza una imagen JPG, PNG o WebP.');
  if (file.size > 2 * 1024 * 1024) throw new Error('La imagen debe pesar menos de 2 MB.');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(file);
  });
}
