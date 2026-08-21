const copyImagePixels = async (src: string) => {
  const response = await fetch(src, { mode: 'cors', credentials: 'omit' });

  if (!response.ok) {
    throw new Error('Failed to load image');
  }

  const blob = await response.blob();
  const type = blob.type.startsWith('image/') ? blob.type : 'image/png';

  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
    await navigator.clipboard.writeText(src);
    return 'url';
  }

  try {
    await navigator.clipboard.write([new ClipboardItem({ [type]: blob })]);
    return 'image';
  } catch {
    if (type !== 'image/png') {
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement('canvas');

      canvas.width = bitmap.width;
      canvas.height = bitmap.height;

      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('Canvas unavailable');

      ctx.drawImage(bitmap, 0, 0);

      const pngBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((next) => {
          if (next) resolve(next);
          else reject(new Error('Could not encode png'));
        }, 'image/png');
      });

      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': pngBlob })
      ]);

      return 'image';
    }

    await navigator.clipboard.writeText(src);
    return 'url';
  }
};

export { copyImagePixels };
