'use strict';

/* =============================================
   STATE
   ============================================= */
const state = {
  originalData: null,   // ImageData of original upload
  currentData:  null,   // ImageData of last applied state
  fileName: 'untitled',
  fileFormat: 'image/png',
  imgWidth: 0,
  imgHeight: 0,
  transform: { rotation: 0, scale: 100, moveX: 0, moveY: 0 },
};

/* =============================================
   DOM REFS
   ============================================= */
const canvas      = document.getElementById('mainCanvas');
const ctx         = canvas.getContext('2d');
const placeholder = document.getElementById('canvasPlaceholder');

const fileInput   = document.getElementById('fileInput');

// Adjustments
const slBrightness = document.getElementById('slBrightness');
const slContrast   = document.getElementById('slContrast');
const slRed        = document.getElementById('slRed');
const slGreen      = document.getElementById('slGreen');
const slBlue       = document.getElementById('slBlue');
const slAlpha      = document.getElementById('slAlpha');
const slGradient   = document.getElementById('slGradient');
const gradColor1   = document.getElementById('gradColor1');
const gradColor2   = document.getElementById('gradColor2');

// Transform
const slRotation   = document.getElementById('slRotation');
const slScale      = document.getElementById('slScale');
const moveX        = document.getElementById('moveX');
const moveY        = document.getElementById('moveY');

// Freq sliders & buttons
const slFreqIntensity = document.getElementById('slFreqIntensity');
const slHough         = document.getElementById('slHough');

// Noise
const slNoiseIntensity = document.getElementById('slNoiseIntensity');

// Custom
const slCrystallize = document.getElementById('slCrystallize');
const slVignette    = document.getElementById('slVignette');

// Info bar
const infoFilename   = document.getElementById('infoFilename');
const infoOutFormat  = document.getElementById('infoOutFormat');
const infoQuality    = document.getElementById('infoQuality');
const infoQualityVal = document.getElementById('infoQualityVal');

/* =============================================
   HELPERS
   ============================================= */
const clamp = (v, lo = 0, hi = 255) => Math.max(lo, Math.min(hi, v));

function showToast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2200);
}

function updateVal(inputEl, display, transform = v => v) {
  const el = document.getElementById(display);
  if (!el) return;
  el.textContent = transform(parseFloat(inputEl.value));
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return {r, g, b};
}

/** Deep copy ImageData */
function copyImageData(src) {
  return new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
}

/** Get working copy from current canvas state */
function getCanvasData() {
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/** Put image data back */
function putData(imgData) {
  ctx.putImageData(imgData, 0, 0);
}

/** Save current canvas state as the new "current" */
function commitState() {
  state.currentData = getCanvasData();
}

/** Restore from currentData */
function restoreCurrent() {
  if (state.currentData) {
    ctx.putImageData(state.currentData, 0, 0);
  }
}

function updateInfoBar() {
  document.getElementById('infoDimensions').textContent = `${state.imgWidth} × ${state.imgHeight} px`;
  document.getElementById('infoScale').textContent = slScale.value + '%';
  const fmt = infoOutFormat.value.split('/')[1].toUpperCase();
  document.getElementById('infoFormat').textContent = fmt;
  document.getElementById('infoFormat').textContent = fmt;
  // Estimate weight
  const offscreen = document.createElement('canvas');
  offscreen.width = canvas.width; offscreen.height = canvas.height;
  offscreen.getContext('2d').drawImage(canvas,0,0);
  const dataURL = offscreen.toDataURL(infoOutFormat.value, parseFloat(infoQuality.value));
  const bytes = Math.round(dataURL.length * 0.75);
  let sizeStr = bytes > 1024*1024 ? (bytes/1024/1024).toFixed(2)+' MB' : (bytes/1024).toFixed(1)+' KB';
  document.getElementById('infoWeight').textContent = sizeStr;
}

/* =============================================
   SLIDER LIVE LABELS
   ============================================= */
function bindSlider(slider, display, fmt = v=>v) {
  slider.addEventListener('input', () => updateVal(slider, display, fmt));
}
bindSlider(slBrightness, 'valBrightness');
bindSlider(slContrast, 'valContrast', v => (v/100).toFixed(2));
bindSlider(slRed, 'valRed');
bindSlider(slGreen, 'valGreen');
bindSlider(slBlue, 'valBlue');
bindSlider(slAlpha, 'valAlpha');
bindSlider(slGradient, 'valGradient');
bindSlider(slRotation, 'valRotation', v => v+'°');
bindSlider(slScale, 'valScale', v => v+'%');
bindSlider(slFreqIntensity, 'valFreqIntensity');
bindSlider(slHough, 'valHough');
bindSlider(slNoiseIntensity, 'valNoiseIntensity');
bindSlider(slCrystallize, 'valCrystallize');
bindSlider(slVignette, 'valVignette');
infoQuality.addEventListener('input', () => {
  document.getElementById('infoQualityVal').textContent = parseFloat(infoQuality.value).toFixed(2);
});
slScale.addEventListener('input', updateInfoBar);

/* =============================================
   COLLAPSE GROUPS
   ============================================= */
document.querySelectorAll('.group-header').forEach(header => {
  const targetId = header.dataset.toggle;
  const body = document.getElementById(targetId);
  header.addEventListener('click', () => {
    const hidden = body.classList.toggle('hidden');
    header.classList.toggle('collapsed', hidden);
  });
});

/* =============================================
   FILE LOAD
   ============================================= */
fileInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  state.fileName = file.name.replace(/\.[^/.]+$/, '');
  infoFilename.value = state.fileName;
  document.getElementById('infoFormat').textContent = file.type.split('/')[1].toUpperCase();

  const img = new Image();
  img.onload = () => {
    canvas.width  = img.width;
    canvas.height = img.height;
    state.imgWidth  = img.width;
    state.imgHeight = img.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    state.originalData = getCanvasData();
    state.currentData  = copyImageData(state.originalData);
    placeholder.classList.add('hidden');
    canvas.classList.add('visible');
    resetSliders();
    updateInfoBar();
    showToast('Image loaded — ' + img.width + '×' + img.height);
    URL.revokeObjectURL(img.src);
  };
  img.src = URL.createObjectURL(file);
});

function resetSliders() {
  slBrightness.value = 0;   updateVal(slBrightness, 'valBrightness');
  slContrast.value   = 100; updateVal(slContrast, 'valContrast', v=>(v/100).toFixed(2));
  slRed.value = 0;    updateVal(slRed, 'valRed');
  slGreen.value = 0;  updateVal(slGreen, 'valGreen');
  slBlue.value = 0;   updateVal(slBlue, 'valBlue');
  slAlpha.value = 255; updateVal(slAlpha, 'valAlpha');
  slGradient.value = 0; updateVal(slGradient, 'valGradient');
  slRotation.value = 0; updateVal(slRotation, 'valRotation', v=>v+'°');
  slScale.value = 100; updateVal(slScale, 'valScale', v=>v+'%');
  moveX.value = 0; moveY.value = 0;
}

/* =============================================
   RESET
   ============================================= */
document.getElementById('btnReset').addEventListener('click', () => {
  if (!state.originalData) return;
  canvas.width  = state.originalData.width;
  canvas.height = state.originalData.height;
  state.imgWidth  = state.originalData.width;
  state.imgHeight = state.originalData.height;
  ctx.putImageData(state.originalData, 0, 0);
  state.currentData = copyImageData(state.originalData);
  resetSliders();
  updateInfoBar();
  showToast('Reset to original');
});

/* =============================================
   ADJUSTMENTS APPLY
   ============================================= */
document.getElementById('btnApplyAdjust').addEventListener('click', () => {
  if (!state.currentData) return;
  restoreCurrent();
  const imgData = getCanvasData();
  const data = imgData.data;
  const brightness = parseInt(slBrightness.value);
  const contrast   = parseInt(slContrast.value) / 100;
  const dr = parseInt(slRed.value);
  const dg = parseInt(slGreen.value);
  const db = parseInt(slBlue.value);
  const alpha   = parseInt(slAlpha.value);
  const gradOpacity = parseInt(slGradient.value) / 100;

  // Apply per-pixel RGBA + brightness + contrast
  for (let i = 0; i < data.length; i += 4) {
    data[i]   = clamp((data[i]   - 128) * contrast + 128 + brightness + dr);
    data[i+1] = clamp((data[i+1] - 128) * contrast + 128 + brightness + dg);
    data[i+2] = clamp((data[i+2] - 128) * contrast + 128 + brightness + db);
    data[i+3] = clamp(Math.round(data[i+3] * (alpha / 255)));
  }

  // Gradient overlay
  if (gradOpacity > 0) {
    const c1 = hexToRgb(gradColor1.value);
    const c2 = hexToRgb(gradColor2.value);
    const h  = imgData.height;
    for (let y = 0; y < h; y++) {
      const t = y / (h - 1);
      const gr = Math.round(c1.r + (c2.r - c1.r) * t);
      const gg = Math.round(c1.g + (c2.g - c1.g) * t);
      const gb = Math.round(c1.b + (c2.b - c1.b) * t);
      for (let x = 0; x < imgData.width; x++) {
        const idx = (y * imgData.width + x) * 4;
        data[idx]   = clamp(Math.round(data[idx]   * (1 - gradOpacity) + gr * gradOpacity));
        data[idx+1] = clamp(Math.round(data[idx+1] * (1 - gradOpacity) + gg * gradOpacity));
        data[idx+2] = clamp(Math.round(data[idx+2] * (1 - gradOpacity) + gb * gradOpacity));
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  commitState();
  updateInfoBar();
  showToast('Adjustments applied');
});

/* =============================================
   TRANSFORM APPLY
   ============================================= */
document.getElementById('btnApplyTransform').addEventListener('click', () => {
  if (!state.currentData) return;

  const angle = (parseFloat(slRotation.value) * Math.PI) / 180;
  const scale = parseFloat(slScale.value) / 100;
  const tx    = parseInt(moveX.value) || 0;
  const ty    = parseInt(moveY.value) || 0;

  const sw = state.currentData.width;
  const sh = state.currentData.height;

  // Compute output size to fit rotated image
  const cos = Math.abs(Math.cos(angle));
  const sin = Math.abs(Math.sin(angle));
  const newW = Math.round((sw * cos + sh * sin) * scale);
  const newH = Math.round((sw * sin + sh * cos) * scale);

  const offscreen = document.createElement('canvas');
  offscreen.width  = newW;
  offscreen.height = newH;
  const octx = offscreen.getContext('2d');

  // Draw the currentData into a temp canvas
  const tempC = document.createElement('canvas');
  tempC.width = sw; tempC.height = sh;
  tempC.getContext('2d').putImageData(state.currentData, 0, 0);

  octx.translate(newW/2 + tx, newH/2 + ty);
  octx.rotate(angle);
  octx.scale(scale, scale);
  octx.drawImage(tempC, -sw/2, -sh/2);

  canvas.width  = newW;
  canvas.height = newH;
  state.imgWidth  = newW;
  state.imgHeight = newH;
  ctx.drawImage(offscreen, 0, 0);
  commitState();
  updateInfoBar();
  showToast(`Rotated ${slRotation.value}° | Scale ${slScale.value}% | Move (${tx},${ty})`);
});

/* =============================================
   CONVOLUTION ENGINE
   ============================================= */
function applyKernel(kernel, repeat = 1) {
  if (!state.currentData) return;
  restoreCurrent();
  let imgData = getCanvasData();

  for (let iter = 0; iter < repeat; iter++) {
    const data   = imgData.data;
    const copy   = new Uint8ClampedArray(data);
    const w      = imgData.width;
    const h      = imgData.height;
    const size   = kernel.length;
    const half   = Math.floor(size / 2);

    let kernelSum = 0;
    for (let ky = 0; ky < size; ky++)
      for (let kx = 0; kx < size; kx++)
        kernelSum += kernel[ky][kx];
    const divisor = kernelSum !== 0 ? kernelSum : 1;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        let r = 0, g = 0, b = 0;
        for (let ky = 0; ky < size; ky++) {
          for (let kx = 0; kx < size; kx++) {
            const py = Math.min(h - 1, Math.max(0, y + ky - half));
            const px = Math.min(w - 1, Math.max(0, x + kx - half));
            const ii = (py * w + px) * 4;
            const weight = kernel[ky][kx];
            r += copy[ii]   * weight;
            g += copy[ii+1] * weight;
            b += copy[ii+2] * weight;
          }
        }
        data[i]   = clamp(Math.round(r / divisor));
        data[i+1] = clamp(Math.round(g / divisor));
        data[i+2] = clamp(Math.round(b / divisor));
      }
    }
    imgData = new ImageData(new Uint8ClampedArray(data), w, h);
  }
  ctx.putImageData(imgData, 0, 0);
  commitState();
  updateInfoBar();
}

/* =============================================
   FREQUENCY FILTER KERNELS
   ============================================= */
const KERNELS = {
  lowPass: [
    [1,2,1],
    [2,4,2],
    [1,2,1]
  ],
  highPass: [
    [ 0,-1, 0],
    [-1, 5,-1],
    [ 0,-1, 0]
  ],
  bandPass: [  // LoG approximation
    [ 0, 0,-1, 0, 0],
    [ 0,-1,-2,-1, 0],
    [-1,-2,16,-2,-1],
    [ 0,-1,-2,-1, 0],
    [ 0, 0,-1, 0, 0]
  ],
  notch: [   // Sharpen with centre suppression
    [-1,-1,-1],
    [-1, 9,-1],
    [-1,-1,-1]
  ],
  emboss: [
    [-2,-1, 0],
    [-1, 1, 1],
    [ 0, 1, 2]
  ],
  edge: [
    [-1,-1,-1],
    [-1, 8,-1],
    [-1,-1,-1]
  ],
};

function getRepeat() { return Math.max(1, parseInt(slFreqIntensity.value)); }

document.getElementById('btnLowPass').addEventListener('click', () => {
  applyKernel(KERNELS.lowPass, getRepeat()); showToast('Low-Pass applied'); });
document.getElementById('btnHighPass').addEventListener('click', () => {
  applyKernel(KERNELS.highPass, getRepeat()); showToast('High-Pass applied'); });
document.getElementById('btnBandPass').addEventListener('click', () => {
  applyKernel(KERNELS.bandPass, getRepeat()); showToast('Band-Pass applied'); });
document.getElementById('btnNotch').addEventListener('click', () => {
  applyKernel(KERNELS.notch, getRepeat()); showToast('Notch filter applied'); });
document.getElementById('btnEmboss').addEventListener('click', () => {
  applyKernel(KERNELS.emboss, getRepeat()); showToast('Emboss applied'); });
document.getElementById('btnEdge').addEventListener('click', () => {
  applyKernel(KERNELS.edge, getRepeat()); showToast('Edge Detection applied'); });

/* =============================================
   HOUGH EDGE (simplified Canny-style threshold)
   ============================================= */
document.getElementById('btnHough').addEventListener('click', () => {
  if (!state.currentData) return;
  restoreCurrent();
  const imgData = getCanvasData();
  const data = imgData.data;
  const w = imgData.width, h = imgData.height;
  const threshold = parseInt(slHough.value);

  // Step 1: Grayscale + Sobel edges
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    gray[i] = 0.299 * data[i*4] + 0.587 * data[i*4+1] + 0.114 * data[i*4+2];
  }
  const sobel = new Float32Array(w * h);
  const Gx = [[-1,0,1],[-2,0,2],[-1,0,1]];
  const Gy = [[-1,-2,-1],[0,0,0],[1,2,1]];
  for (let y = 1; y < h-1; y++) {
    for (let x = 1; x < w-1; x++) {
      let gx = 0, gy = 0;
      for (let ky = 0; ky < 3; ky++) {
        for (let kx = 0; kx < 3; kx++) {
          const px = x + kx - 1, py = y + ky - 1;
          const v = gray[py * w + px];
          gx += v * Gx[ky][kx];
          gy += v * Gy[ky][kx];
        }
      }
      sobel[y * w + x] = Math.sqrt(gx*gx + gy*gy);
    }
  }
  // Step 2: Threshold → black/white edge map
  for (let i = 0; i < w * h; i++) {
    const edge = sobel[i] > threshold ? 255 : 0;
    data[i*4]   = edge;
    data[i*4+1] = edge;
    data[i*4+2] = edge;
    data[i*4+3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);
  commitState();
  updateInfoBar();
  showToast('Hough Edge Detection applied');
});

/* =============================================
   NOISE FUNCTIONS
   ============================================= */

// Gaussian Noise
document.getElementById('btnGaussNoise').addEventListener('click', () => {
  if (!state.currentData) return;
  restoreCurrent();
  const imgData = getCanvasData();
  const data = imgData.data;
  const intensity = parseInt(slNoiseIntensity.value);
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 2 * intensity;
    data[i]   = clamp(data[i]   + noise);
    data[i+1] = clamp(data[i+1] + noise);
    data[i+2] = clamp(data[i+2] + noise);
  }
  ctx.putImageData(imgData, 0, 0);
  commitState(); updateInfoBar();
  showToast('Gaussian Noise applied');
});

// Salt & Pepper
document.getElementById('btnSaltPepper').addEventListener('click', () => {
  if (!state.currentData) return;
  restoreCurrent();
  const imgData = getCanvasData();
  const data = imgData.data;
  const prob = parseInt(slNoiseIntensity.value) / 1000;
  for (let i = 0; i < data.length; i += 4) {
    if (Math.random() < prob) {
      const v = Math.random() < 0.5 ? 0 : 255;
      data[i] = data[i+1] = data[i+2] = v;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  commitState(); updateInfoBar();
  showToast('Salt & Pepper applied');
});

// Average Blur
document.getElementById('btnBlur').addEventListener('click', () => {
  const n = Math.max(1, Math.round(parseInt(slNoiseIntensity.value) / 20));
  const k = [];
  for (let i = 0; i < 3; i++) k.push([1,1,1]);
  applyKernel(k, n);
  showToast('Average Blur applied');
});

// Median Filter
document.getElementById('btnMedian').addEventListener('click', () => {
  if (!state.currentData) return;
  restoreCurrent();
  const imgData = getCanvasData();
  const data = imgData.data;
  const copy = new Uint8ClampedArray(data);
  const w = imgData.width, h = imgData.height;
  const passes = Math.max(1, Math.round(parseInt(slNoiseIntensity.value) / 25));

  for (let pass = 0; pass < passes; pass++) {
    const src = pass === 0 ? copy : new Uint8ClampedArray(data);
    for (let y = 1; y < h-1; y++) {
      for (let x = 1; x < w-1; x++) {
        const vr = [], vg = [], vb = [];
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const ii = ((y+ky)*w+(x+kx))*4;
            vr.push(src[ii]); vg.push(src[ii+1]); vb.push(src[ii+2]);
          }
        }
        vr.sort((a,b)=>a-b); vg.sort((a,b)=>a-b); vb.sort((a,b)=>a-b);
        const idx = (y*w+x)*4;
        data[idx]   = vr[4];
        data[idx+1] = vg[4];
        data[idx+2] = vb[4];
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);
  commitState(); updateInfoBar();
  showToast('Median Filter applied');
});

/* =============================================
   CUSTOM FILTER 1 — CRYSTALLIZE (Pixelate mosaic)
   ============================================= */
document.getElementById('btnCrystallize').addEventListener('click', () => {
  if (!state.currentData) return;
  restoreCurrent();
  const imgData = getCanvasData();
  const data = imgData.data;
  const w = imgData.width, h = imgData.height;
  const blockSize = Math.max(2, parseInt(slCrystallize.value));

  for (let y = 0; y < h; y += blockSize) {
    for (let x = 0; x < w; x += blockSize) {
      let r = 0, g = 0, b = 0, count = 0;
      for (let dy = 0; dy < blockSize && y+dy < h; dy++) {
        for (let dx = 0; dx < blockSize && x+dx < w; dx++) {
          const i = ((y+dy)*w+(x+dx))*4;
          r += data[i]; g += data[i+1]; b += data[i+2];
          count++;
        }
      }
      const ar = Math.round(r/count), ag = Math.round(g/count), ab = Math.round(b/count);
      for (let dy = 0; dy < blockSize && y+dy < h; dy++) {
        for (let dx = 0; dx < blockSize && x+dx < w; dx++) {
          const i = ((y+dy)*w+(x+dx))*4;
          data[i] = ar; data[i+1] = ag; data[i+2] = ab;
        }
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);
  commitState(); updateInfoBar();
  showToast('Crystallize applied');
});

/* =============================================
   CUSTOM FILTER 2 — VIGNETTE
   ============================================= */
document.getElementById('btnVignette').addEventListener('click', () => {
  if (!state.currentData) return;
  restoreCurrent();
  const imgData = getCanvasData();
  const data = imgData.data;
  const w = imgData.width, h = imgData.height;
  const strength = parseInt(slVignette.value) / 100;
  const cx = w / 2, cy = h / 2;
  const maxDist = Math.sqrt(cx*cx + cy*cy);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dist = Math.sqrt((x-cx)*(x-cx)+(y-cy)*(y-cy));
      const vig = 1 - Math.pow(dist / maxDist, 2) * strength;
      const i = (y * w + x) * 4;
      data[i]   = clamp(Math.round(data[i]   * vig));
      data[i+1] = clamp(Math.round(data[i+1] * vig));
      data[i+2] = clamp(Math.round(data[i+2] * vig));
    }
  }
  ctx.putImageData(imgData, 0, 0);
  commitState(); updateInfoBar();
  showToast('Vignette applied');
});

/* =============================================
   DOWNLOAD
   ============================================= */
document.getElementById('btnDownload').addEventListener('click', () => {
  if (!state.currentData) { showToast('No image to export'); return; }

  const mimeType = infoOutFormat.value;
  const quality  = parseFloat(infoQuality.value);
  const filename = (infoFilename.value || 'untitled').trim();

  const extMap = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
  const ext    = extMap[mimeType] || 'png';

  const exportCanvas = document.createElement('canvas');
  exportCanvas.width  = canvas.width;
  exportCanvas.height = canvas.height;
  exportCanvas.getContext('2d').drawImage(canvas, 0, 0);

  exportCanvas.toBlob(blob => {
    if (!blob) { showToast('Export failed'); return; }
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = `${filename}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(`Exported as ${filename}.${ext}`);
  }, mimeType, mimeType === 'image/png' ? undefined : quality);
});

/* =============================================
   INFO BAR live updates
   ============================================= */
infoOutFormat.addEventListener('change', updateInfoBar);
infoQuality.addEventListener('input', updateInfoBar);

/* =============================================
   INIT: Trigger info bar on load
   ============================================= */
updateInfoBar();
