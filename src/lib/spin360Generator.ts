/**
 * 360° Product Turntable Frame Generator
 * Synthesizes smooth, realistic multi-angle rotation frames (16 frames across 360°)
 * from a single product image or multiple uploaded angle photos.
 */

export interface Spin360Result {
  frames: string[]; // 16 data URLs from 0° to 360°
  angles: number[]; // [0, 22.5, 45, ..., 337.5]
}

export async function generate360FramesFromImage(
  sourceImage: string,
  additionalImages: string[] = []
): Promise<Spin360Result> {
  const FRAME_COUNT = 16;
  const stepAngle = 360 / FRAME_COUNT;
  const angles = Array.from({ length: FRAME_COUNT }, (_, i) => i * stepAngle);

  // Load primary image
  const primaryImg = await loadImage(sourceImage);
  
  // Load additional images if provided
  const extraImgs: HTMLImageElement[] = [];
  for (const src of additionalImages) {
    try {
      if (src && src.startsWith('data:image')) {
        const img = await loadImage(src);
        extraImgs.push(img);
      }
    } catch {
      // ignore individual failures
    }
  }

  const canvasWidth = 640;
  const canvasHeight = 640;
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not create 2D canvas context');

  const frames: string[] = [];

  // Determine scaling to fit nicely in 640x640 with margin
  const maxDim = 500;
  let targetWidth = primaryImg.naturalWidth || primaryImg.width;
  let targetHeight = primaryImg.naturalHeight || primaryImg.height;
  const scale = Math.min(maxDim / targetWidth, maxDim / targetHeight);
  targetWidth = Math.round(targetWidth * scale);
  targetHeight = Math.round(targetHeight * scale);

  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2 - 10;

  for (let i = 0; i < FRAME_COUNT; i++) {
    const angleDeg = angles[i];
    const angleRad = (angleDeg * Math.PI) / 180;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // 1. Soft rotating contact floor shadow
    ctx.save();
    const shadowY = cy + targetHeight / 2 + 15;
    const shadowWidth = targetWidth * 0.45 * (0.8 + 0.2 * Math.abs(Math.sin(angleRad)));
    const shadowHeight = 16 * (0.7 + 0.3 * Math.abs(Math.cos(angleRad)));
    const shadowX = cx + Math.sin(angleRad) * 8;

    const shadowGrad = ctx.createRadialGradient(
      shadowX, shadowY, 2,
      shadowX, shadowY, shadowWidth
    );
    shadowGrad.addColorStop(0, 'rgba(15, 23, 42, 0.28)');
    shadowGrad.addColorStop(0.5, 'rgba(15, 23, 42, 0.12)');
    shadowGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');

    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(shadowX, shadowY, shadowWidth, shadowHeight, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Select image source if multiple angle photos exist
    let activeImg = primaryImg;
    if (extraImgs.length > 0) {
      const allSources = [primaryImg, ...extraImgs];
      // Distribute available images across key azimuths
      const slot = Math.floor((i / FRAME_COUNT) * allSources.length);
      activeImg = allSources[slot] || primaryImg;
    }

    // 3. 3D Turntable projection
    ctx.save();
    ctx.translate(cx, cy);

    // Horizontal perspective cos curve
    const cosAngle = Math.cos(angleRad);
    const sinAngle = Math.sin(angleRad);

    // Perspective foreshortening: scale horizontal axis
    // Clamp minimum width to 0.12 to simulate 3D object thickness at side profiles (90° and 270°)
    let horizScale = cosAngle;
    const isRearView = cosAngle < 0;
    const absCos = Math.abs(cosAngle);
    const effectiveScale = Math.max(0.14, absCos) * (isRearView ? -1 : 1);

    // Vertical pitch bobbing (subtle 3D wobble/presence as it turns)
    const ySkew = sinAngle * 0.03;
    const yShift = -Math.abs(sinAngle) * 5;

    ctx.transform(
      effectiveScale,
      ySkew,
      0,
      1 - Math.abs(sinAngle) * 0.03,
      sinAngle * 10,
      yShift
    );

    // Draw the product image
    ctx.drawImage(
      activeImg,
      -targetWidth / 2,
      -targetHeight / 2,
      targetWidth,
      targetHeight
    );

    // 4. Lighting & Shading Pass based on rotational azimuth
    // Key light is fixed at top-left (-45°), so as the product turns, illumination moves
    ctx.globalCompositeOperation = 'source-atop';

    if (isRearView) {
      // Rear shading overlay (representing rear profile and ambient depth)
      const rearGrad = ctx.createLinearGradient(
        -targetWidth / 2, -targetHeight / 2,
        targetWidth / 2, targetHeight / 2
      );
      rearGrad.addColorStop(0, 'rgba(30, 41, 59, 0.22)');
      rearGrad.addColorStop(0.5, 'rgba(15, 23, 42, 0.16)');
      rearGrad.addColorStop(1, 'rgba(15, 23, 42, 0.30)');
      ctx.fillStyle = rearGrad;
      ctx.fillRect(-targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
    } else {
      // Directional gleam & lighting gradient
      const lightX = -sinAngle * (targetWidth / 2);
      const lightGrad = ctx.createLinearGradient(
        lightX - targetWidth * 0.4, 0,
        lightX + targetWidth * 0.6, 0
      );
      lightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
      lightGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.0)');
      lightGrad.addColorStop(1, 'rgba(0, 0, 0, 0.12)');
      ctx.fillStyle = lightGrad;
      ctx.fillRect(-targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
    }

    ctx.restore();

    // Export frame
    frames.push(canvas.toDataURL('image/jpeg', 0.86));
  }

  return { frames, angles };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}
