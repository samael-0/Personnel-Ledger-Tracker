export async function decodeQrFromImage(file: File): Promise<string | null> {
  const { default: jsQR } = await import("jsqr");

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        resolve(null);
        return;
      }

      ctx.drawImage(img, 0, 0, img.width, img.height);
      try {
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        if (code && code.data) {
          resolve(code.data);
          return;
        }

        // Try with inversion
        const codeInverted = jsQR(
          imageData.data,
          imageData.width,
          imageData.height,
          {
            inversionAttempts: "onlyInvert",
          }
        );
        resolve(codeInverted?.data || null);
      } catch (e) {
        console.warn("QR decode error:", e);
        resolve(null);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };

    img.src = url;
  });
}
