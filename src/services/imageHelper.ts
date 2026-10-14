/**
 * Converts any image file/data to pure high-contrast black & white (monochrome)
 * suitable for thermal printers (1-bit dither / thresholding)
 */
export async function convertImageToMonochrome(
  imageSource: File | string,
  threshold = 128
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // Max dimension to keep size performant
      const maxDim = 800;
      let width = img.width;
      let height = img.height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Fill white background (handles transparent PNGs)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Draw original image
      ctx.drawImage(img, 0, 0, width, height);

      // Get pixels and convert to strict black and white
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;

      for (let i = 0; i < data.length; i += 4) {
        // Luminance calculation
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        if (a < 60) {
          // Transparent -> White
          data[i] = 255;
          data[i + 1] = 255;
          data[i + 2] = 255;
          data[i + 3] = 255;
        } else {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          const mono = gray < threshold ? 0 : 255;
          data[i] = mono;
          data[i + 1] = mono;
          data[i + 2] = mono;
          data[i + 3] = 255;
        }
      }

      ctx.putImageData(imgData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = (e) => reject(e);

    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(imageSource);
    }
  });
}
